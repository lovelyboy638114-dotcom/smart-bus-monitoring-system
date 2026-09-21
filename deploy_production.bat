@echo off
title SafeBus AI - Production Build and Deploy Console
echo ===================================================================
echo     SafeBus AI - Enterprise Smart Bus Fleet System
echo     Zero-Error Production Build and Deployment Console
echo ===================================================================
echo.

echo [Step 1/4] Auditing and Building Frontend (Vite/React)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed! Please inspect logs above.
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Frontend production build completed successfully into dist/!
echo.

echo [Step 2/4] Compiling and Packaging Spring Boot Microservices...
cd backend-springboot
call .\mvnw.cmd test-compile
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Maven backend compilation failed! Please inspect logs above.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] All 10 Spring Boot modules compiled cleanly!
cd ..
echo.

echo [Step 3/4] Validating Python AI Computer Vision Engine...
py -3.13 -m py_compile backend\cv_driver_monitor.py backend\bus_simulator.py backend\camera_source.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python syntax validation failed!
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Python Computer Vision modules verified cleanly!
echo.

echo [Step 4/4] Starting Full Production Microservices Stack...
call start_all_backend_services.bat

echo.
echo ===================================================================
echo   SafeBus AI Deployment Launched Successfully!
echo   API Gateway:     http://localhost:8080
echo   Eureka Server:   http://localhost:8761
echo   Python AI CV:    http://localhost:5001/health
echo   Frontend App:    http://localhost:5173
echo ===================================================================
echo.
pause
