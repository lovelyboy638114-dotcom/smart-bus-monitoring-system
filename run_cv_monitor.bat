@echo off
title SafeBus AI - CV Driver Monitor Node
echo ====================================================
echo Starting SafeBus AI Driver Behavior CV Monitor...
echo ====================================================
echo.
echo Select Mode:
echo [1] Run in Service Mode (Default - processes browser webcam feeds on Port 5001)
echo [2] Run in Standalone Mode (Captures webcam directly from Python GUI)
echo.
set /p mode="Enter choice (1 or 2): "

cd backend
if "%mode%"=="2" (
    echo Starting CV Monitor in Standalone Mode...
    py -u cv_driver_monitor.py
) else (
    echo Starting CV Monitor in Service Mode...
    py -u cv_driver_monitor.py --service
)
pause
