@echo off
chcp 65001 >nul
echo =====================================
echo   长江三峡实验室 - 完整启动
echo =====================================
echo.

echo [1/4] 启动 Nginx...
cd C:\nginx-1.29.3
start "Nginx" cmd /k "nginx.exe"
timeout /t 2 >nul

echo [2/4] 启动后端 API...
cd D:\research-data-platform\backend
start "Backend" cmd /k "python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 3 >nul

echo [3/4] 启动 MinIO...
start "MinIO" cmd /k "cd /d D:\minio && set MINIO_ROOT_USER=minioadmin && set MINIO_ROOT_PASSWORD=minioadmin && minio.exe server D:\minio-data --console-address :9001"
timeout /t 3 >nul

echo [4/4] 启动 Cloudflare Tunnel...
start "Cloudflare" cmd /k "cloudflared tunnel run"
timeout /t 5 >nul

echo.
echo =====================================
echo   所有服务已启动！
echo =====================================
echo.
echo 本地访问: http://localhost
echo 外网访问: https://app.cjznjcsys.xin
echo API文档: http://localhost:8000/docs
echo MinIO控制台: http://localhost:9001
echo.
echo 提示: 关闭所有命令窗口即可停止服务
echo.

pause