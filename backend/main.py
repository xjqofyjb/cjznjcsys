from fastapi import FastAPI, Query, HTTPException, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import boto3
from settings import settings
from uuid import uuid4
from datetime import datetime
import json

app = FastAPI(title="Research Data Platform API", version="0.5.0")

# CORS 配置
origins = [
    "https://app.cjznjcsys.xin",
    "https://api.cjznjcsys.xin",
    "http://app.cjznjcsys.xin",
    "http://api.cjznjcsys.xin",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ---------- MinIO(S3) 客户端 ----------
s3 = boto3.client(
    "s3",
    endpoint_url=settings.MINIO_ENDPOINT,
    aws_access_key_id=settings.MINIO_ACCESS_KEY,
    aws_secret_access_key=settings.MINIO_SECRET_KEY,
)


# ---------- 工具函数 ----------
def get_user_from_token(authorization: Optional[str] = None) -> Optional[str]:
    """从 token 获取用户名（简化版，实际应使用 JWT）"""
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0] == "Bearer":
        return parts[1].replace("demo-token-123-", "")
    return None


def parse_metadata_from_key(key: str) -> dict:
    """从对象 key 解析基本信息"""
    parts = key.split("/")
    if len(parts) >= 3:
        dataset_id = parts[0]
        version = parts[1]
        filename = parts[2] if len(parts) == 3 else "/".join(parts[2:])
        return {
            "datasetId": dataset_id,
            "version": version,
            "filename": filename
        }
    return {}


async def get_metadata_content(key: str) -> Optional[dict]:
    """尝试读取同目录下的 metadata.json"""
    try:
        parts = key.rsplit("/", 1)
        if len(parts) == 2:
            prefix = parts[0]
            metadata_key = f"{prefix}/metadata.json"
            try:
                response = s3.get_object(Bucket=settings.MINIO_BUCKET, Key=metadata_key)
                content = response['Body'].read().decode('utf-8')
                return json.loads(content)
            except:
                metadata_key = f"{prefix}/index.json"
                response = s3.get_object(Bucket=settings.MINIO_BUCKET, Key=metadata_key)
                content = response['Body'].read().decode('utf-8')
                return json.loads(content)
    except:
        pass
    return None


# ---------- 认证接口 ----------
class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    token: str
    user: str


@app.post("/auth/login", response_model=LoginOut)
def login(data: LoginIn):
    """用户登录（简化版）"""
    if not data.username or not data.password:
        raise HTTPException(400, "Missing credentials")

    if data.username and data.password:
        return {
            "token": f"demo-token-123-{data.username}",
            "user": data.username
        }

    raise HTTPException(401, "Invalid credentials")


# ---------- 分片上传接口 ----------
class InitOut(BaseModel):
    key: str
    uploadId: str


@app.get("/uploads/part-url")
def get_part_url(
        key: str = Query(...),
        uploadId: str = Query(...),
        partNumber: int = Query(..., ge=1),
        authorization: Optional[str] = Header(None)
):
    """获取分片上传的预签名URL（前端直传MinIO）"""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(401, "Unauthorized")

    try:
        url = s3.generate_presigned_url(
            'upload_part',
            Params={
                'Bucket': settings.MINIO_BUCKET,
                'Key': key,
                'UploadId': uploadId,
                'PartNumber': partNumber
            },
            ExpiresIn=3600  # 1小时有效
        )

        # 如果配置了外部MinIO地址，替换内部地址
        # 这样前端可以直接访问
        if hasattr(settings, 'MINIO_EXTERNAL_ENDPOINT') and settings.MINIO_EXTERNAL_ENDPOINT:
            url = url.replace(settings.MINIO_ENDPOINT, settings.MINIO_EXTERNAL_ENDPOINT)

        return {"url": url}
    except Exception as e:
        raise HTTPException(500, f"Failed to generate presigned URL: {str(e)}")


@app.post("/uploads/init", response_model=InitOut)
def init_upload(
        filename: str,
        dataset_id: int,
        version: str,
        lab_id: Optional[str] = Query(None),
        title: Optional[str] = Query(None),
        authorization: Optional[str] = Header(None)
):
    """初始化分片上传"""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(401, "Unauthorized")

    # 生成唯一的 key 前缀
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid4().hex[:8]
    prefix = f"{dataset_id}/{version}/{timestamp}_{unique_id}"
    key = f"{prefix}/{filename}"

    resp = s3.create_multipart_upload(Bucket=settings.MINIO_BUCKET, Key=key)

    # 保存 metadata
    try:
        metadata = {
            "title": title or filename,
            "uploader": user,
            "labId": lab_id,
            "createdAt": datetime.now().isoformat(),
            "datasetId": str(dataset_id),
            "version": version,
            "filename": filename
        }
        metadata_key = f"{prefix}/metadata.json"
        s3.put_object(
            Bucket=settings.MINIO_BUCKET,
            Key=metadata_key,
            Body=json.dumps(metadata, ensure_ascii=False),
            ContentType="application/json"
        )
    except Exception as e:
        print(f"Warning: Failed to save metadata: {e}")

    return {"key": key, "uploadId": resp["UploadId"]}


class PartUploadResponse(BaseModel):
    ETag: str
    PartNumber: int


@app.post("/uploads/upload-part", response_model=PartUploadResponse)
async def upload_part(
        key: str = Query(...),
        uploadId: str = Query(...),
        partNumber: int = Query(..., ge=1),
        file: UploadFile = File(...),
        authorization: Optional[str] = Header(None)
):
    """直接上传分片数据到 MinIO（通过后端代理）"""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(401, "Unauthorized")

    try:
        content = await file.read()

        response = s3.upload_part(
            Bucket=settings.MINIO_BUCKET,
            Key=key,
            UploadId=uploadId,
            PartNumber=partNumber,
            Body=content
        )

        etag = response.get('ETag', '').strip('"')
        return {"ETag": etag, "PartNumber": partNumber}

    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")


class Part(BaseModel):
    ETag: str
    PartNumber: int


class CompleteIn(BaseModel):
    key: str
    uploadId: str
    parts: List[Part]


@app.post("/uploads/complete")
def complete_upload(data: CompleteIn):
    """完成分片上传"""
    s3.complete_multipart_upload(
        Bucket=settings.MINIO_BUCKET,
        Key=data.key,
        MultipartUpload={"Parts": [p.model_dump() for p in data.parts]},
        UploadId=data.uploadId,
    )
    return {"ok": True}


# ---------- 我的数据列表接口 ----------
class FileInfo(BaseModel):
    name: str
    size: int


class DataRecord(BaseModel):
    id: str
    type: str
    title: str
    uploader: str
    datasetId: str
    version: str
    fileCount: int
    totalSize: int
    createdAt: str
    files: List[str]
    prefix: str
    labId: Optional[str] = None  # 新增实验室ID


@app.get("/uploads/my-data")
async def get_my_data(
        authorization: Optional[str] = Header(None),
        type_filter: Optional[str] = Query(None, alias="type"),
        lab_id: Optional[str] = Query(None, alias="labId")  # 新增：按实验室过滤
):
    """获取当前用户上传的数据列表"""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(401, "Unauthorized")

    try:
        response = s3.list_objects_v2(Bucket=settings.MINIO_BUCKET)

        if 'Contents' not in response:
            return []

        # 按目录分组
        directories = {}
        for obj in response['Contents']:
            key = obj['Key']

            parts = key.split('/')
            if len(parts) < 3:
                continue

            # 前缀作为唯一标识：dataset_id/version/timestamp_uuid
            prefix = '/'.join(parts[:3])

            if prefix not in directories:
                directories[prefix] = {
                    'files': [],
                    'total_size': 0,
                    'earliest_time': obj['LastModified'],
                    'datasetId': parts[0],
                    'version': parts[1],
                }

            # 跳过 metadata.json
            if parts[-1] == 'metadata.json':
                continue

            directories[prefix]['files'].append({
                'name': parts[-1] if len(parts) > 3 else key,
                'size': obj['Size']
            })
            directories[prefix]['total_size'] += obj['Size']

            if obj['LastModified'] < directories[prefix]['earliest_time']:
                directories[prefix]['earliest_time'] = obj['LastModified']

        # 构建返回数据
        records = []
        for prefix, info in directories.items():
            # 尝试获取 metadata
            metadata_key = f"{prefix}/metadata.json"
            metadata = None
            try:
                response = s3.get_object(Bucket=settings.MINIO_BUCKET, Key=metadata_key)
                content = response['Body'].read().decode('utf-8')
                metadata = json.loads(content)
            except:
                pass

            # 确定类型和标题
            dataset_id_int = int(info['datasetId']) if info['datasetId'].isdigit() else 0

            if dataset_id_int >= 200:
                record_type = "survey"
                default_title = "问卷数据"
            elif dataset_id_int >= 100:
                record_type = "code"
                default_title = "程序代码"
            else:
                record_type = "data"
                default_title = "科研数据"

            # 从 metadata 获取信息
            if metadata:
                title = metadata.get('title', default_title)
                uploader = metadata.get('uploader', user)
                created_at = metadata.get('createdAt', info['earliest_time'].isoformat())
                record_lab_id = metadata.get('labId')
            else:
                title = default_title
                uploader = user
                created_at = info['earliest_time'].isoformat()
                record_lab_id = None

            # 应用过滤
            if type_filter and record_type != type_filter:
                continue

            # 按实验室过滤
            if lab_id and record_lab_id != lab_id:
                continue

            record = DataRecord(
                id=prefix.replace('/', '_'),
                type=record_type,
                title=title,
                uploader=uploader,
                datasetId=info['datasetId'],
                version=info['version'],
                fileCount=len(info['files']),
                totalSize=info['total_size'],
                createdAt=created_at,
                files=[f['name'] for f in info['files']],
                prefix=prefix,
                labId=record_lab_id
            )
            records.append(record)

        # 按创建时间倒序排序
        records.sort(key=lambda x: x.createdAt, reverse=True)

        return records

    except Exception as e:
        raise HTTPException(500, f"Failed to list data: {str(e)}")


# ---------- 文件列表接口（兼容旧版）----------
@app.get("/files/list")
async def list_files(
        prefix: str = "",
        authorization: Optional[str] = Header(None)
):
    """列出指定前缀的文件"""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(401, "Unauthorized")

    try:
        response = s3.list_objects_v2(
            Bucket=settings.MINIO_BUCKET,
            Prefix=prefix
        )

        if 'Contents' not in response:
            return []

        files = [
            {
                "key": obj['Key'],
                "size": obj['Size'],
                "lastModified": obj['LastModified'].isoformat()
            }
            for obj in response['Contents']
        ]
        return files

    except Exception as e:
        raise HTTPException(500, f"Failed to list files: {str(e)}")


# ---------- 健康检查 ----------
@app.get("/healthz")
def healthz():
    """健康检查接口"""
    try:
        s3.head_bucket(Bucket=settings.MINIO_BUCKET)
        return {"ok": True, "message": "Service is healthy"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------- 公开数据集列表接口 ----------
class DatasetInfo(BaseModel):
    id: str
    title: str
    lab: Optional[str] = None
    labName: Optional[str] = None
    uploader: str
    datasetId: str
    version: str
    fileCount: int
    totalSize: int
    createdAt: str
    files: List[str]
    prefix: str


@app.get("/datasets", response_model=List[DatasetInfo])
async def get_datasets(
    lab: Optional[str] = Query(None, description="按实验室key过滤，如 lab-water")
):
    """获取所有公开数据集列表（无需登录）"""
    try:
        response = s3.list_objects_v2(Bucket=settings.MINIO_BUCKET)

        if 'Contents' not in response:
            return []

        # 按目录分组
        directories = {}
        for obj in response['Contents']:
            key = obj['Key']

            parts = key.split('/')
            if len(parts) < 3:
                continue

            # 前缀作为唯一标识：dataset_id/version/timestamp_uuid
            prefix = '/'.join(parts[:3])

            if prefix not in directories:
                directories[prefix] = {
                    'files': [],
                    'total_size': 0,
                    'earliest_time': obj['LastModified'],
                    'datasetId': parts[0],
                    'version': parts[1],
                }

            # 跳过 metadata.json
            if parts[-1] == 'metadata.json':
                continue

            directories[prefix]['files'].append({
                'name': parts[-1] if len(parts) > 3 else key,
                'size': obj['Size']
            })
            directories[prefix]['total_size'] += obj['Size']

            if obj['LastModified'] < directories[prefix]['earliest_time']:
                directories[prefix]['earliest_time'] = obj['LastModified']

        # 构建返回数据
        records = []
        for prefix, info in directories.items():
            # 尝试获取 metadata
            metadata_key = f"{prefix}/metadata.json"
            metadata = None
            try:
                resp = s3.get_object(Bucket=settings.MINIO_BUCKET, Key=metadata_key)
                content = resp['Body'].read().decode('utf-8')
                metadata = json.loads(content)
            except:
                pass

            # 从 metadata 获取信息
            if metadata:
                title = metadata.get('title', '未命名数据集')
                uploader = metadata.get('uploader', '未知')
                created_at = metadata.get('createdAt', info['earliest_time'].isoformat())
                # 支持两种字段名: lab 或 labId
                record_lab = metadata.get('lab') or metadata.get('labId')
                record_lab_name = metadata.get('labName', '')
            else:
                title = '未命名数据集'
                uploader = '未知'
                created_at = info['earliest_time'].isoformat()
                record_lab = None
                record_lab_name = ''

            # 按实验室过滤
            if lab and record_lab != lab:
                continue

            record = DatasetInfo(
                id=prefix.replace('/', '_'),
                title=title,
                lab=record_lab,
                labName=record_lab_name,
                uploader=uploader,
                datasetId=info['datasetId'],
                version=info['version'],
                fileCount=len(info['files']),
                totalSize=info['total_size'],
                createdAt=created_at,
                files=[f['name'] for f in info['files']],
                prefix=prefix
            )
            records.append(record)

        # 按创建时间倒序排序
        records.sort(key=lambda x: x.createdAt, reverse=True)

        return records

    except Exception as e:
        raise HTTPException(500, f"Failed to list datasets: {str(e)}")


# ---------- 根路径 ----------
@app.get("/")
def root():
    return {
        "service": "Research Data Platform API",
        "version": "0.5.0",
        "status": "running",
        "upload_method": "proxy"
    }