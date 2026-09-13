@echo off
title Burst2Gif - Automated Integrity Tests
echo ============================================================
echo   Burst2Gif Automated Integrity Tests
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"
set "PYTHON_CMD=python"
if exist "%ROOT_DIR%backend\venv\Scripts\python.exe" (
    set "PYTHON_CMD=%ROOT_DIR%backend\venv\Scripts\python.exe"
)

echo [1/2] Running backend unit and API tests...
cd /d "%ROOT_DIR%backend"
%PYTHON_CMD% -m unittest discover tests -v
if errorlevel 1 (
    echo.
    echo ============================================================
    echo   [FAILED] Backend tests failed!
    echo ============================================================
    pause
    exit /b 1
)
echo [1/2] Backend tests passed!
echo.

echo [2/2] Checking frontend TypeScript and reference integrity...
cd /d "%ROOT_DIR%frontend"
call npm test
if errorlevel 1 (
    echo.
    echo ============================================================
    echo   [FAILED] Frontend type / reference checks failed!
    echo ============================================================
    pause
    exit /b 1
)
echo [2/2] Frontend integrity checks passed!
echo.

echo ============================================================
echo   [SUCCESS] All backend and frontend tests passed!
echo ============================================================
echo.
pause
