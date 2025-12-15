@echo off
echo ================================================
echo   CCIS-CodeHub - Starting Backend Server
echo ================================================
echo.

cd backend

echo Checking Django...
python manage.py check
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Django check failed!
    pause
    exit /b 1
)

echo.
echo Starting Django backend server on port 8000...
echo.
echo Backend will be available at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

python manage.py runserver 8000
