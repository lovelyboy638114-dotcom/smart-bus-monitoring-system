import requests
import json
import time

BASE_URL = "http://localhost:5000"

def test_endpoint(name, method, path, payload=None):
    url = f"{BASE_URL}{path}"
    start = time.time()
    try:
        if method == "GET":
            res = requests.get(url, timeout=5)
        elif method == "POST":
            res = requests.post(url, json=payload, timeout=5)
        duration = (time.time() - start) * 1000
        
        status_ok = (res.status_code == 200)
        # Some endpoints might return other codes for validation, but for these tests 200 is typical.
        
        # Verify JSON
        try:
            data = res.json()
            is_json = True
        except:
            data = None
            is_json = False
            
        return {
            "name": name,
            "status_code": res.status_code,
            "is_json": is_json,
            "duration_ms": round(duration, 1),
            "status": "PASS" if (status_ok and is_json) else "FAIL"
        }
    except Exception as e:
        return {
            "name": name,
            "status_code": "ERROR",
            "is_json": False,
            "duration_ms": 0,
            "status": f"FAIL ({e})"
        }

def main():
    print("Initializing API Regression & Compatibility Suite...")
    time.sleep(1) # Wait for server stability
    
    tests = [
        # 1. Login Authentication (using seed credentials driver@happyjourney.ai / driver123)
        ("POST /api/login", "POST", "/api/login", {"username": "driver@happyjourney.ai", "password": "driver123", "role": "driver"}),
        # 2. Get Buses
        ("GET /api/buses", "GET", "/api/buses"),
        # 3. Get Bus Location Coordinates
        ("GET /api/buses/location", "GET", "/api/buses/location"),
        # 4. Get Students list
        ("GET /api/students", "GET", "/api/students"),
        # 5. Get Active Alerts log
        ("GET /api/alerts", "GET", "/api/alerts"),
        # 6. Resolve Alert warning
        ("POST /api/alerts/resolve", "POST", "/api/alerts/resolve", {"id": 1}),
        # 7. Post Driver Message
        ("POST /api/driver/messages", "POST", "/api/driver/messages", {"studentId": "ST001", "studentName": "Rahul Kumar", "status": "coming", "message": "Announce msg", "timestamp": "08:15 AM"}),
        # 8. Get Driver Messages
        ("GET /api/driver/messages", "GET", "/api/driver/messages"),
        # 9. Post Parent Complaint
        ("POST /api/admin/complaints", "POST", "/api/admin/complaints", {"parentName": "Rajesh Kumar", "studentName": "Rahul Kumar", "driverName": "Ramesh Kumar", "busId": "Bus 1", "complaintText": "Delayed stop check", "timestamp": "08:20 AM"}),
        # 10. Get Complaints Log
        ("GET /api/admin/complaints", "GET", "/api/admin/complaints"),
        # 11. Post Telemetry coordinates
        ("POST /api/telemetry", "POST", "/api/telemetry", {"busId": "TN38AB1234", "latitude": 13.0850, "longitude": 80.2101, "speed": 35, "acceleration": 0.05}),
        # 12. Get webcam driver behavior caches
        ("GET /api/driver/behavior", "GET", "/api/driver/behavior"),
        # 13. Forgot password reset (reset same credentials for test repeatability)
        ("POST /api/forgot-password", "POST", "/api/forgot-password", {"role": "driver", "username": "driver@happyjourney.ai", "newPassword": "driver123"})
    ]
    
    results = []
    for name, method, path, *payload in tests:
        payload_data = payload[0] if payload else None
        res = test_endpoint(name, method, path, payload_data)
        results.append(res)
        print(f"Tested {name} -> Status: {res['status']} ({res['duration_ms']}ms)")
        
    # Generate API Compatibility Report markdown output
    print("\n" + "="*60)
    print("           API COMPATIBILITY & REGRESSION REPORT")
    print("="*60)
    print(f"{'Endpoint Name':<30} | {'Status Code':<11} | {'Response type':<13} | {'Latency':<8} | {'Status'}")
    print("-"*75)
    all_ok = True
    for r in results:
        resp_type = "JSON" if r["is_json"] else "TEXT/HTML"
        duration_str = f"{r['duration_ms']}ms"
        print(f"{r['name']:<30} | {r['status_code']:<11} | {resp_type:<13} | {duration_str:<8} | {r['status']}")
        if r["status"] != "PASS":
            all_ok = False
            
    print("="*60)
    if all_ok:
        print("     ALL Endpoints PASSED COMPATIBILITY REGRESSION CHECKS!")
    else:
        print("     COMPATIBILITY VERIFICATION FAILED (REGRESSIONS FOUND)")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
