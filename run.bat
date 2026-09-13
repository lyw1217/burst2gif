@echo off
title Burst2Gif
echo ============================================================
echo   Starting Burst2Gif...
echo   Local Web Server: http://localhost:8000
echo ============================================================
echo.

cd /d "%~dp0backend"

if not exist "venv\Scripts\python.exe" (
    echo [SETUP] Python virtual environment not found. Setting up venv...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Python is not installed or not found in system PATH.
        echo Please install Python 3.10 or higher.
        pause
        exit /b 1
    )
    echo [SETUP] Installing required Python packages...
    .\venv\Scripts\pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install requirements.
        pause
        exit /b 1
    )
    echo [SETUP] Setup completed successfully!
    echo.
)

echo Opening browser at http://localhost:8000 ...
start "" http://localhost:8000

echo Starting backend server on http://127.0.0.1:8000 ...
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
if errorlevel 1 pause
