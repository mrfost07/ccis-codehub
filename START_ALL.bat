@echo off
echo ========================================
echo    CCIS-CodeHub - Starting All Services
echo ========================================
echo.
echo Starting Backend Server...
start "CCIS Backend" cmd /k "cd backend && venv\Scripts\activate && python manage.py runserver"
echo Backend starting at: http://localhost:8000
echo.
timeout /t 3 /nobreak > nul
echo Starting Frontend Server...
start "CCIS Frontend" cmd /k "cd frontend && node_modules\.bin\vite"
echo Frontend starting at: http://localhost:3001
echo.
echo ========================================
echo    All Services Starting...
echo ========================================
echo.
echo URLs:
echo - Frontend:    http://localhost:3001
echo - Backend API: http://localhost:8000/api
echo - Admin Panel: http://localhost:8000/admin
echo.
echo Credentials:
echo - Email: fostanesmarkrenier@gmail.com
echo - Password: Admin@123
echo.
echo Press any key to exit this window...
pause > nul
