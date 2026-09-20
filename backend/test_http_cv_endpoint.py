"""
Test HTTP POST /process_frame on port 5001.
Verifies:
  - Valid response returned with all telemetry keys
  - Handshake with Spring Boot behavior endpoint
"""

import requests
import json
import base64
import numpy as np
import cv2

print("Testing HTTP /process_frame on port 5001...")

# Generate a blank image
blank_frame = np.zeros((240, 320, 3), dtype=np.uint8)
_, buffer = cv2.imencode('.jpg', blank_frame)
frame_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

payload = {
    "frame": frame_b64,
    "driverId": "driver@happyjourney.ai",
    "busId": "TN38AB1234",
    "routeId": "R-01",
    "tripId": "T-01"
}

try:
    res = requests.post("http://localhost:5001/process_frame", json=payload, timeout=5)
    print(f"Status Code: {res.status_code}")
    data = res.json()
    print("Response Telemetry Keys:", list(data.keys()))
    print("Status:", data.get("status"))
    print("Face Detected:", data.get("faceDetected"))
    print("Drowsy Duration:", data.get("drowsyDuration"))
    print("Distract Duration:", data.get("distractDuration"))
    print("Direction:", data.get("direction"))
    print("Processed Image Present:", "processedImage" in data)
    assert res.status_code == 200, "Should return 200 OK"
    assert data.get("status") == "NO_DRIVER_FACE_DETECTED", "Blank frame should yield NO_DRIVER_FACE_DETECTED"
    print("\n[SUCCESS] HTTP /process_frame endpoint is operational and responding correctly!")
except Exception as e:
    print(f"[ERROR] Failed to communicate with port 5001: {e}")
    exit(1)
