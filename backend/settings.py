from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MINIO_ENDPOINT: str
    MINIO_BUCKET: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    POSTGRES_DSN: str
    JWT_SECRET: str

    class Config:
        env_file = ".env"

settings = Settings()
