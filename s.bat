# start-all-services-complete.ps1

Write-Host "=== 启动所有服务 ===" -ForegroundColor Cyan

# 配置路径
$minioPath = "D:\minio"
$nginxPath = "D:\nginx"
$backendPath = "D:\research-data-platform\backend"

# 1. 启动 MinIO
Write-Host "`n[1/4] 启动 MinIO..." -ForegroundColor Yellow
$minioProcess = Get-Process minio -ErrorAction SilentlyContinue
if (-not $minioProcess) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$minioPath'; .\minio.exe server .\data --console-address ':9001'" -WindowStyle Minimized
    Write-Host "✓ MinIO 启动中 (端口 9000, 控制台 9001)" -ForegroundColor Green
    Start-Sleep -Seconds 3
} else {
    Write-Host "✓ MinIO 已运行" -ForegroundColor Green
}

# 2. 创建 settings.py（如果不存在）
Write-Host "`n[2/4] 检查后端配置..." -ForegroundColor Yellow
if (-not (Test-Path "$backendPath\settings.py")) {
    @"
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MINIO_ENDPOINT: str = "http://localhost:9000"
    MINIO_BUCKET: str = "research-data"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    POSTGRES_DSN: str = "postgresql://user:pass@localhost:5432/db"
    JWT_SECRET: str = "dev-secret-key"
    
    class Config:
        env_file = ".env"

settings = Settings()
"@ | Out-File -FilePath "$backendPath\settings.py" -Encoding UTF8
    Write-Host "✓ settings.py 已创建" -ForegroundColor Green
}

# 3. 启动 FastAPI
Write-Host "`n[3/4] 启动 FastAPI..." -ForegroundColor Yellow
$backendProcess = Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*uvicorn*"
}
if (-not $backendProcess) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Minimized
    Write-Host "✓ FastAPI 启动中 (端口 8000)" -ForegroundColor Green
    Start-Sleep -Seconds 5
} else {
    Write-Host "✓ FastAPI 已运行" -ForegroundColor Green
}

# 4. 启动 Nginx
Write-Host "`n[4/4] 启动 Nginx..." -ForegroundColor Yellow
$nginxProcess = Get-Process nginx -ErrorAction SilentlyContinue
if (-not $nginxProcess) {
    Start-Process "$nginxPath\nginx.exe" -WorkingDirectory $nginxPath
    Write-Host "✓ Nginx 启动中 (端口 80)" -ForegroundColor Green
} else {
    Write-Host "✓ Nginx 已运行" -ForegroundColor Green
}

# 验证服务
Start-Sleep -Seconds 3
Write-Host "`n=== 服务验证 ===" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/healthz" -TimeoutSec 5
    Write-Host "✓ FastAPI (8000): 运行正常" -ForegroundColor Green
} catch {
    Write-Host "✗ FastAPI (8000): $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n外部访问: https://app.cjznjcsys.xin" -ForegroundColor Cyan
Write-Host "本地访问: http://localhost" -ForegroundColor Cyan
Write-Host "API 文档: http://localhost:8000/docs" -ForegroundColor Cyan