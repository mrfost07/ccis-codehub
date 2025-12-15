@echo off
echo =========================================
echo   CCIS-CodeHub Complete Application
echo =========================================
echo.
echo Starting both Backend and Frontend...
echo.

REM Start Backend
echo [1/2] Starting Backend Server (Django)...
cd backend
start "CCIS Backend" cmd /k "python manage.py runserver"
timeout /t 3 >nul

REM Start Frontend  
echo [2/2] Starting Frontend Server (React)...
cd ..\frontend
start "CCIS Frontend" cmd /k "npm run dev"
timeout /t 5 >nul

echo.
echo =========================================
echo   Application Started Successfully!
echo =========================================
echo.
echo BACKEND API:     http://localhost:8000
echo FRONTEND APP:    http://127.0.0.1:3000
echo                  http://localhost:3000
echo.
echo Admin Panel:     http://localhost:8000/admin/
echo API Docs:        http://localhost:8000/api/schema/swagger-ui/
echo.
echo =========================================
echo Opening the application in browser...
echo =========================================
timeout /t 3 >nul
start http://127.0.0.1:3000

echo.
echo Press any key to close this window (servers will keep running)...
pause >nul
