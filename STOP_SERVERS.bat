@echo off
title CCIS-CodeHub - Stop Servers
color 0C

echo.
echo ========================================================
echo           Stopping CCIS-CodeHub Servers
echo ========================================================
echo.

REM Kill Python (Backend)
echo [1/2] Stopping Backend Server...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *CCIS*" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend stopped
) else (
    echo [INFO] Backend was not running
)

REM Kill Node (Frontend)
echo [2/2] Stopping Frontend Server...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *CCIS*" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend stopped
) else (
    echo [INFO] Frontend was not running
)

echo.
echo ========================================================
echo           All Servers Stopped
echo ========================================================
echo.
timeout /t 3
exit
