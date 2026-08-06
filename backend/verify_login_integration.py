import requests
import json

def test_login(username, password, role):
    url = "http://localhost:5000/api/login"
    payload = {
        "username": username,
        "password": password,
        "role": role
    }
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Login Attempt: {role} ({username})")
        print(f"  Status Code: {response.status_code}")
        print(f"  Response: {response.text}")
        print("-" * 50)
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing login for {username}: {e}")
        print("-" * 50)
        return False

if __name__ == "__main__":
    print("Testing migrated login credentials:")
    print("=" * 50)
    
    # 1. Admin login
    test_login("admin.admin@happyjourney.ai", "admin@ADMIN123", "admin")
    
    # 2. Driver login
    test_login("rameshdr001.driver@happyjourney.ai", "Ramesh@DR001", "driver")
    
    # 3. Parent login
    test_login("sureshr003.parent@happyjourney.ai", "Suresh@R003", "parent")
    
    # 4. Student login (Vijaya)
    test_login("vijayar003.student@happyjourney.ai", "Vijaya@R003", "student")
