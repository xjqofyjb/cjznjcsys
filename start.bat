@echo off
setlocal enableextensions enabledelayedexpansion

echo.
echo ==============================================
echo   Research Data Platform - 一键启动 (Windows)
echo ==============================================
echo.

REM ----------------- 定位 Python -----------------
set "PYEXE="
for %%P in (py,python,python3) do (
  where %%P >nul 2>nul && (set "PYEXE=%%P" & goto :GOT_PY)
)
:GOT_PY
if "%PYEXE%"=="" (
  echo [ERROR] 未找到 Python，請先安裝 Python 3.x
  pause
  exit /b 1
)

REM ----------------- 后端准备 -----------------
if not exist backend\ (
  echo [ERROR] 未找到 backend\ 目录，请检查项目结构
  pause
  exit /b 1
)
if not exist backend\main.py (
  echo [ERROR] 未找到 backend\main.py，請確認入口文件名與路徑
  pause
  exit /b 1
)

if not exist backend\.venv (
  echo [INFO] 建立 Python 虚拟环境 backend\.venv ...
  %PYEXE% -m venv backend\.venv
)

call backend\.venv\Scripts\activate.bat

if exist backend\requirements.txt (
  echo [INFO] 安装后端依赖（requirements.txt）...
  python -m pip install --upgrade pip
  python -m pip install -r backend\requirements.txt
) else (
  echo [WARN] 未找到 backend\requirements.txt，跳过依赖安装
)

REM ----------------- 启动后端 -----------------
echo [START] 后端：Uvicorn http://127.0.0.1:8000
start "backend" cmd /k "cd /d backend && %PYEXE% -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

REM ----------------- 前端准备 -----------------
set "FRONT="
if exist research-data-frontend\package.json set "FRONT=research-data-frontend"
if exist frontend\package.json set "FRONT=frontend"

if "%FRONT%"=="" (
  echo [ERROR] 未找到前端目錄（research-data-frontend 或 frontend）
  goto :END
)

pushd "%FRONT%"
if not exist node_modules (
  echo [INFO] 安装前端依赖（npm install）...
  call npm install
)

REM 传递后端地址给 Vite
set "VITE_API_BASE=http://127.0.0.1:8000"

echo [START] 前端：Vite Dev Server（会自动打开）...
start "frontend" cmd /k "set VITE_API_BASE=%VITE_API_BASE% && npm run dev -- --host"

popd

echo.
echo ----------------------------------------------
echo  前端启动端口一般是 http://localhost:5173
echo  后端接口       http://127.0.0.1:8000
echo ----------------------------------------------
echo.

:END
endlocal
