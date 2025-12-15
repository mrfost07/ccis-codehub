@echo off
echo ========================================
echo Installing Rich Text Editor Packages
echo ========================================
echo.

cd /d "%~dp0frontend"

echo Current directory: %CD%
echo.

echo Installing react-quill and quill...
call npm install react-quill quill --save

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start the frontend: npm run dev
echo 2. Go to Admin Dashboard ^> Learning Admin ^> Create Module
echo 3. Use the new rich text editor with slides!
echo.
pause
