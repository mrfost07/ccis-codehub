@echo off
echo =====================================
echo   CCIS-CodeHub Frontend Server Fix
echo =====================================
echo.

echo Cleaning up old processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo Starting frontend with network access enabled...
echo.

REM Try different approaches
echo Method 1: Starting with default config...
call npm run dev

REM If that doesn't work, user can try:
echo.
echo If you still can't access localhost:3000, try:
echo   1. Press Ctrl+C to stop
echo   2. Run: npm run dev:host
echo   3. Or run: npm run dev:network
echo.
echo Alternative URLs to try:
echo   - http://127.0.0.1:3000
echo   - http://localhost:3000
echo   - http://[::1]:3000
echo.
