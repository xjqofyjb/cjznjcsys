from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    MINIO_ENDPOINT: str
    MINIO_BUCKET: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    POSTGRES_DSN: str
    JWT_SECRET: str

    # 可选：MinIO 外部访问地址（用于生成前端可访问的预签名URL）
    # 如果前端无法直接访问 MINIO_ENDPOINT，需要配置此项
    # 例如：https://minio.cjznjcsys.xin
    MINIO_EXTERNAL_ENDPOINT: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()