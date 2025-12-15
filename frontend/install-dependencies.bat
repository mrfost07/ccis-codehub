@echo off
echo =========================================
echo   Installing Frontend Dependencies
echo =========================================
echo.

cd "C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\frontend"

echo Installing react-syntax-highlighter...
npm install react-syntax-highlighter --save

echo Installing type definitions...
npm install @types/react-syntax-highlighter --save-dev

echo.
echo =========================================
echo   Dependencies Installed!
echo =========================================
echo.
echo Now restart your development server:
echo   npm run dev
echo.
pause
