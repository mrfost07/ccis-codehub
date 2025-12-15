@echo off
echo Starting CCIS-CodeHub Frontend...
cd frontend
echo.
echo Frontend will start at http://localhost:3000 or next available port
echo.
call node_modules\.bin\vite
pause
