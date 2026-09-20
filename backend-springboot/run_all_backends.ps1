Write-Host "=== Launching SafeBus Spring Boot & CV Backends ===" -ForegroundColor Cyan

$baseDir = "C:\Users\sathish\OneDrive\Desktop\Projects\smart Bus Monitoring System"
$backendDir = "$baseDir\backend-springboot"

# 1. Eureka Server
Write-Host "[1/9] Starting Eureka Server (8761)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$backendDir`" && .\mvnw.cmd spring-boot:run -pl eureka-server" -NoNewWindow
Start-Sleep -Seconds 12

# 2. Config Server
Write-Host "[2/9] Starting Config Server (8888)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$backendDir`" && .\mvnw.cmd spring-boot:run -pl config-server" -NoNewWindow
Start-Sleep -Seconds 12

# 3. API Gateway
Write-Host "[3/9] Starting API Gateway (8080)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$backendDir`" && .\mvnw.cmd spring-boot:run -pl api-gateway" -NoNewWindow
Start-Sleep -Seconds 8

# 4. Auth Service
Write-Host "[4/9] Starting Auth Service (8081)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$backendDir`" && .\mvnw.cmd spring-boot:run -pl auth-service" -NoNewWindow

# 5. Student Service
Write-Host "[5/9] Starting Student Service (8082)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$backendDir`" && .\mvnw.cmd spring-boot:run -pl student-service" -NoNewWindow

# 6. Transport Service
Write-Host "[6/9] Starting Transport Service (8083)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$backendDir`" && .\mvnw.cmd spring-boot:run -pl transport-service" -NoNewWindow

# 7. Notification Service
Write-Host "[7/9] Starting Notification Service (8086)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$backendDir`" && .\mvnw.cmd spring-boot:run -pl notification-service" -NoNewWindow

# 8. Attendance Service
Write-Host "[8/9] Starting Attendance Service (8084)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$backendDir`" && .\mvnw.cmd spring-boot:run -pl attendance-service" -NoNewWindow

# 9. Python CV Driver Monitor
Write-Host "[9/9] Starting Python CV Driver Monitor (5001)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$baseDir`" && py -u backend\cv_driver_monitor.py --service" -NoNewWindow

Write-Host "All processes initiated! Waiting for ports to be ready..." -ForegroundColor Green
$expectedPorts = @(8761, 8888, 8080, 8081, 8082, 8083, 8084, 8086, 5001)

$maxRetries = 40
for ($i = 1; $i -le $maxRetries; $i++) {
    Start-Sleep -Seconds 3
    $active = Get-NetTCPConnection -LocalPort $expectedPorts -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' } | Select-Object -ExpandProperty LocalPort -Unique
    $missing = $expectedPorts | Where-Object { $_ -notin $active }
    Write-Host "[$i/$maxRetries] Listening: $(if ($active) { $active -join ', ' } else { 'None' }) | Pending: $(if ($missing) { $missing -join ', ' } else { 'None' })"
    if ($missing.Count -eq 0) {
        Write-Host ">>> ALL BACKEND SERVICES ARE UP AND LISTENING! <<<" -ForegroundColor Green
        break
    }
}

while ($true) {
    Start-Sleep -Seconds 3600
}
