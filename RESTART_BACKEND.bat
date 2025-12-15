@echo off
echo ========================================
echo Restarting Backend Server
echo ========================================
echo.
echo Step 1: Stopping any running Django processes...
taskkill /F /IM python.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Step 2: Clearing Python cache...
cd backend
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"

echo.
echo Step 3: Starting Django development server...
echo.
python manage.py runserver

pause
