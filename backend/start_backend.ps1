Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SafeBus Shield Backend Automated Bootstrapper" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Check Python via 'py' command
if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        Write-Error "Python is not installed or not in your PATH. Please install Python 3.9+ to continue."
        Exit
    }
    # Fallback to python if 'py' is missing
    $pyCmd = "python"
} else {
    $pyCmd = "py"
}

# 2. Install dependencies
Write-Host "`n[Step 1] Installing libraries via pip..." -ForegroundColor Yellow
Start-Process powershell -Wait -NoNewWindow -ArgumentList "-Command", "$pyCmd -m pip install --upgrade pip"
Start-Process powershell -Wait -NoNewWindow -ArgumentList "-Command", "$pyCmd -m pip install -r requirements.txt"

# 3. Initialize SQLite DB schema
Write-Host "`n[Step 2] Initializing SQLite database schema..." -ForegroundColor Yellow
Start-Process powershell -Wait -NoNewWindow -ArgumentList "-Command", "$pyCmd database.py"

# 4. Prompt to launch
Write-Host "`n[Step 3] Booting Flask Telemetry Server & MQTT Listener..." -ForegroundColor Yellow
Write-Host "Starting Flask on http://localhost:5000" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$pyCmd app.py"

# 5. Starting GPS Bus Simulator
Write-Host "`n[Step 4] Starting Telemetry Bus GPS Node Simulator..." -ForegroundColor Yellow
Write-Host "Broadcasting speed and G-force coordinates every 10 seconds..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$pyCmd bus_simulator.py"

# 6. Starting AI Webcam Driver Monitor
Write-Host "`n[Step 5] Launching AI Computer Vision Driver Monitor Node..." -ForegroundColor Yellow
Write-Host "Activating webcam to track blinks, yawns, and distraction..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$pyCmd cv_driver_monitor.py"

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "  Backend running! Open the React app in your browser." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
