@echo off
echo Starting CCIS-CodeHub Backend...
cd backend
call venv\Scripts\activate
echo.
echo Backend starting at http://localhost:8000
echo Admin Panel: http://localhost:8000/admin
echo API Docs: http://localhost:8000/api/schema/swagger-ui/
echo.
echo Login: fostanesmarkrenier@gmail.com / Admin@123
echo.
python manage.py runserver
pause
