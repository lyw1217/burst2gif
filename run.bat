@echo off
title Burst2Gif
echo ============================================================
echo   Starting Burst2Gif...
echo   Local Web Server: http://localhost:8000
echo ============================================================
echo.

cd /d "%~dp0backend"

if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Python venv not found. Please check backend setup.
    pause
    exit /b 1
)

echo Opening browser at http://localhost:8000 ...
start "" http://localhost:8000

echo Starting backend server on http://127.0.0.1:8000 ...
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000

pause
