@echo off
title CCIS-CodeHub - Development Servers
color 0A
cd /d "%~dp0"

echo.
echo ========================================================
echo           CCIS-CodeHub Development Launcher
echo ========================================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Python not found! Install Python 3.8+
    pause
    exit /b 1
)

REM Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js not found! Install Node.js 16+
    pause
    exit /b 1
)

REM Clean up old processes
echo [1/5] Cleaning up old processes...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *CCIS*" >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *CCIS*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start Backend
echo [2/5] Starting Django Backend...
cd backend
start "CCIS Backend Server" cmd /k "color 0B && title CCIS Backend && echo ========================================= && echo    Django Backend Server && echo    http://localhost:8000 && echo ========================================= && echo. && python manage.py runserver"
cd ..
timeout /t 3 /nobreak >nul

REM Start Frontend  
echo [3/5] Starting React Frontend...
cd frontend
start "CCIS Frontend Server" cmd /k "color 0D && title CCIS Frontend && echo ========================================= && echo    React Frontend Server && echo    http://localhost:5173 && echo ========================================= && echo. && npm run dev"
cd ..
timeout /t 5 /nobreak >nul

REM Open browser
echo [4/5] Opening browser...
start http://localhost:5173
timeout /t 2 /nobreak >nul

echo [5/5] DONE!
echo.
echo ========================================================
echo          ALL SERVERS STARTED SUCCESSFULLY!
echo ========================================================
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8000
echo   Admin:     http://localhost:8000/admin
echo.
echo ========================================================
echo.
echo [INFO] Backend runs in BLUE window
echo [INFO] Frontend runs in PURPLE window  
echo [INFO] Keep those windows open
echo [INFO] This window monitors servers
echo.
echo Press Ctrl+C to stop monitoring
echo ========================================================
echo.

:monitor
timeout /t 30 /nobreak >nul
echo [%time%] Servers running...
goto monitor
