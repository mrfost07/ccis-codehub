@echo off
echo ========================================
echo Starting CCIS CodeHub Application
echo ========================================
echo.

:: Start Backend
echo Starting Backend Server...
start "CCIS Backend" cmd /k "cd backend && venv\Scripts\activate && python manage.py runserver"

:: Wait a moment for backend to start
timeout /t 3 /nobreak > nul

:: Start Frontend
echo Starting Frontend Server...
start "CCIS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Application Started!
echo ========================================
echo.
echo Backend running at: http://localhost:8000
echo Frontend running at: http://localhost:5173
echo.
echo Admin Login:
echo Email: fostanesmarkrenier@gmail.com
echo Password: Admin@123
echo.
echo Press any key to exit...
pause > nul
