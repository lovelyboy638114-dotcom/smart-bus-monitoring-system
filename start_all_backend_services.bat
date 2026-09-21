@echo off
title Start SafeBus Microservices Console
echo ====================================================
echo   SafeBus Microservices Launcher Console
echo ====================================================
echo.

cd backend-springboot

echo [1/8] Starting Eureka Discovery Server (Port 8761)...
start "Eureka Discovery Server" cmd /c ".\mvnw.cmd spring-boot:run -pl eureka-server"
echo Waiting for Eureka to initialize...
timeout /t 12

echo [2/8] Starting Spring Config Server (Port 8888)...
start "Spring Config Server" cmd /c ".\mvnw.cmd spring-boot:run -pl config-server"
echo Waiting for Config Server to initialize...
timeout /t 10

echo [3/8] Starting API Gateway (Port 8080)...
start "API Gateway" cmd /c ".\mvnw.cmd spring-boot:run -pl api-gateway"
timeout /t 5

echo [4/8] Starting Authentication Service (Port 8081)...
start "Authentication Service" cmd /c ".\mvnw.cmd spring-boot:run -pl auth-service"

echo [5/8] Starting Student Service (Port 8082)...
start "Student Service" cmd /c ".\mvnw.cmd spring-boot:run -pl student-service"

echo [6/8] Starting Transport Service (Port 8083)...
start "Transport Service" cmd /c ".\mvnw.cmd spring-boot:run -pl transport-service"

echo [7/9] Starting Notification Service (Port 8086)...
start "Notification Service" cmd /c ".\mvnw.cmd spring-boot:run -pl notification-service"

echo [8/9] Starting Attendance Service (Port 8084)...
start "Attendance Service" cmd /c ".\mvnw.cmd spring-boot:run -pl attendance-service"

cd ..
echo [9/9] Starting Python AI CV Driver Monitor (Port 5001)...
start "Python CV Driver Monitor" cmd /c "py -u backend\cv_driver_monitor.py --service"

echo.
echo ====================================================
echo   All 9 SafeBus AI Backends launched successfully!
echo ====================================================
pause

