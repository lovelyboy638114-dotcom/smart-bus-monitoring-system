import unittest
import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

class TestSOSRegression(unittest.TestCase):
    
    def test_sos_entire_lifecycle(self):
        """
        Tests the complete lifecycle of an SOS emergency incident:
        Trigger -> Duplicate blocking -> Active feed audit -> Acknowledge -> Resolve.
        """
        # Test coordinates (Karpagam College of Engineering)
        payload = {
            "busId": "Bus 100",
            "latitude": 10.8801,
            "longitude": 77.0224,
            "speed": 40,
            "route": "Route Test",
            "emergency_type": "Medical Emergency Onboard",
            "driver_name": "Test Driver",
            "is_test": True
        }
        
        # 1. Trigger SOS Alert
        print("\n[Test 1] Dispatching Emergency SOS...")
        res = requests.post(f"{BASE_URL}/v1/sos", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], "success")
        
        sos_id = data["sos"]["sos_id"]
        print(f"-> Created Alert ID: {sos_id}")
        
        # 2. Prevent Duplicate SOS (expected 409 Conflict)
        print("[Test 2] Testing duplicate warning protection...")
        res_dup = requests.post(f"{BASE_URL}/v1/sos", json=payload)
        self.assertEqual(res_dup.status_code, 409)
        print("-> Blocked duplicate SOS successfully (409 Conflict).")
        
        # 3. Audit Active Alert Feed
        print("[Test 3] Fetching active emergencies...")
        res_act = requests.get(f"{BASE_URL}/v1/sos/active")
        self.assertEqual(res_act.status_code, 200)
        active_list = res_act.json()
        found = any([x["sos_id"] == sos_id for x in active_list])
        self.assertTrue(found)
        print(f"-> Found alert {sos_id} in active emergencies list.")
        
        # 4. Acknowledge SOS Alert
        print("[Test 4] Admin Acknowledges SOS...")
        res_ack = requests.post(f"{BASE_URL}/v1/sos/{sos_id}/acknowledge", json={
            "username": "Admin Auditor"
        })
        self.assertEqual(res_ack.status_code, 200)
        print("-> Acknowledged successfully.")
        
        # 5. Resolve SOS Alert without remarks validation check (expected 400 Bad Request)
        print("[Test 5] Resolving SOS without remarks...")
        res_res_bad = requests.post(f"{BASE_URL}/v1/sos/{sos_id}/resolve", json={
            "username": "Admin Auditor",
            "remarks": ""
        })
        self.assertEqual(res_res_bad.status_code, 400)
        print("-> Blocked empty resolution successfully (400 Bad Request).")
        
        # 6. Resolve SOS Alert with remarks
        print("[Test 6] Resolving SOS with valid remarks...")
        res_res_ok = requests.post(f"{BASE_URL}/v1/sos/{sos_id}/resolve", json={
            "username": "Admin Auditor",
            "remarks": "Test resolved successfully. Simulation completed."
        })
        self.assertEqual(res_res_ok.status_code, 200)
        print("-> Resolved successfully.")
        
        # 7. Audit Historical Database Log
        print("[Test 7] Auditing historical database archive...")
        res_hist = requests.get(f"{BASE_URL}/v1/sos/history")
        self.assertEqual(res_hist.status_code, 200)
        history_list = res_hist.json()
        found_hist = any([x["sos_id"] == sos_id for x in history_list])
        self.assertTrue(found_hist)
        print(f"-> Found alert {sos_id} in historical archive.")
        
        # 8. Check statistics aggregator
        print("[Test 8] Fetching response efficiency statistics...")
        res_stats = requests.get(f"{BASE_URL}/v1/sos/statistics")
        self.assertEqual(res_stats.status_code, 200)
        stats = res_stats.json()
        self.assertIn("total_alerts", stats)
        self.assertIn("avg_acknowledgment_time_seconds", stats)
        print(f"-> Total alerts logged today: {stats['total_alerts']}")
        
    def test_nearest_police_station(self):
        """
        Tests geofencing nearest police station selection using Haversine providers.
        """
        print("\n[Test 9] Fetching closest police station details...")
        # Coordinates close to Othakkalmandapam
        res = requests.get(f"{BASE_URL}/police/nearest?latitude=10.8801&longitude=77.0224")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["station_name"], "Othakkalmandapam Police Station")
        print(f"-> Closest station selected: {data['station_name']} ({data['distance_km']}km away)")

if __name__ == "__main__":
    unittest.main()
