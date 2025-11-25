from fastapi import FastAPI, Query, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import boto3
from settings import settings
from uuid import uuid4
from datetime import datetime
import json

app = FastAPI(title="Research Data Platform API", version="0.2.0")

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
    expose_headers=["*"],  # 添加这行
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
    # 简化处理：token 格式为 "Bearer username"
    # 实际应该验证 JWT token
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
        # 尝试读取 metadata 文件
        parts = key.rsplit("/", 1)
        if len(parts) == 2:
            prefix = parts[0]
            metadata_key = f"{prefix}/metadata.json"
            try:
                response = s3.get_object(Bucket=settings.MINIO_BUCKET, Key=metadata_key)
                content = response['Body'].read().decode('utf-8')
                return json.loads(content)
            except:
                # 如果没有 metadata.json，尝试其他命名
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
    
    # TODO: 实际应该验证用户名密码
    # 简化处理：任何非空用户名密码都通过
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

@app.post("/uploads/init", response_model=InitOut)
def init_upload(
    filename: str, 
    dataset_id: int, 
    version: str,
    authorization: Optional[str] = Header(None)
):
    """初始化分片上传"""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(401, "Unauthorized")
    
    # 生成唯一的 key
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    key = f"{dataset_id}/{version}/{timestamp}_{uuid4().hex[:8]}_{filename}"
    
    resp = s3.create_multipart_upload(Bucket=settings.MINIO_BUCKET, Key=key)
    return {"key": key, "uploadId": resp["UploadId"]}

class PartUrlOut(BaseModel):
    url: str

@app.get("/uploads/part-url", response_model=PartUrlOut)
def get_part_url(
    key: str = Query(...),
    uploadId: str = Query(...),
    partNumber: int = Query(..., ge=1),
):
    """获取分片上传的预签名 URL"""
    url = s3.generate_presigned_url(
        ClientMethod="upload_part",
        Params={
            "Bucket": settings.MINIO_BUCKET,
            "Key": key,
            "UploadId": uploadId,
            "PartNumber": partNumber,
        },
        ExpiresIn=3600,
    )
    return {"url": url}

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
    type: str  # data, code, survey
    title: str
    uploader: str
    datasetId: str
    version: str
    fileCount: int
    totalSize: int
    createdAt: str
    files: List[str]
    prefix: str  # 对象前缀

@app.get("/uploads/my-data")
async def get_my_data(
    authorization: Optional[str] = Header(None),
    type_filter: Optional[str] = Query(None, alias="type")
):
    """获取当前用户上传的数据列表"""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(401, "Unauthorized")
    
    try:
        # 列出所有对象
        response = s3.list_objects_v2(Bucket=settings.MINIO_BUCKET)
        
        if 'Contents' not in response:
            return []
        
        # 按目录分组
        directories = {}
        for obj in response['Contents']:
            key = obj['Key']
            
            # 解析路径: dataset_id/version/timestamp_uuid_...
            parts = key.split('/')
            if len(parts) < 3:
                continue
            
            # 前缀作为唯一标识
            prefix = '/'.join(parts[:3])  # dataset_id/version/timestamp_uuid
            
            if prefix not in directories:
                directories[prefix] = {
                    'files': [],
                    'total_size': 0,
                    'earliest_time': obj['LastModified'],
                    'datasetId': parts[0],
                    'version': parts[1],
                }
            
            directories[prefix]['files'].append({
                'name': parts[-1] if len(parts) > 3 else key,
                'size': obj['Size']
            })
            directories[prefix]['total_size'] += obj['Size']
            
            # 记录最早的修改时间
            if obj['LastModified'] < directories[prefix]['earliest_time']:
                directories[prefix]['earliest_time'] = obj['LastModified']
        
        # 构建返回数据
        records = []
        for prefix, info in directories.items():
            # 尝试获取 metadata
            metadata = await get_metadata_content(prefix + "/metadata.json")
            
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
            
            # 从 metadata 获取信息（如果存在）
            if metadata:
                title = metadata.get('title', default_title)
                uploader = metadata.get('uploader', user)
                created_at = metadata.get('createdAt', info['earliest_time'].isoformat())
            else:
                title = default_title
                uploader = user
                created_at = info['earliest_time'].isoformat()
            
            # 应用类型筛选
            if type_filter and record_type != type_filter:
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
                prefix=prefix
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

# ---------- 根路径 ----------
@app.get("/")
def root():
    return {
        "service": "Research Data Platform API",
        "version": "0.2.0",
        "status": "running"
    }