@echo off
title Stop All SafeBus Services
echo ====================================================
echo   Terminating all active SafeBus Services...
echo ====================================================
echo.
echo Stopping Java Spring Boot services...
taskkill /f /im java.exe 2>nul
taskkill /f /im javaw.exe 2>nul

echo Stopping Python Computer Vision services...
taskkill /f /im python.exe 2>nul
taskkill /f /im py.exe 2>nul

echo.
echo ====================================================
echo   All backend processes terminated successfully!
echo ====================================================
pause
