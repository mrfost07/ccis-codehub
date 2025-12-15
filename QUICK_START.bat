@echo off
title CCIS-CodeHub - Quick Start
color 0A

REM Change to script directory
cd /d "%~dp0"

echo.
echo ========================================================
echo           CCIS-CodeHub - Quick Start
echo ========================================================
echo.
echo Starting development environment...
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [X] Python not found! Install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [X] Node.js not found! Install Node.js first.
    pause
    exit /b 1
)

REM Clean up any existing servers
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *CCIS*" >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *CCIS*" >nul 2>&1

REM Start Backend (Django)
echo [1/2] Starting Backend...
cd backend
start "CCIS Backend" cmd /c "color 0B && title CCIS Backend && python manage.py runserver"
cd ..

REM Wait for backend
timeout /t 3 /nobreak >nul

REM Start Frontend (React)
echo [2/2] Starting Frontend...
cd frontend
start "CCIS Frontend" cmd /c "color 0D && title CCIS Frontend && npm run dev"
cd ..

REM Wait for frontend
timeout /t 5 /nobreak >nul

REM Open browser
echo.
echo [*] Opening browser...
start http://localhost:5173

echo.
echo ========================================================
echo   READY! Application opened in browser
echo ========================================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   Admin:    http://localhost:8000/admin
echo.
echo Backend and Frontend are running in separate windows.
echo Close those windows to stop the servers.
echo.
echo This window can be closed now.
echo ========================================================
echo.
timeout /t 5
exit
