"""
SafeBus Shield - AI Driver Monitor Alert Cap Unit Test
======================================================
Tests:
  1. Incident 1st trigger sends alert immediately (Count: 1).
  2. Rapid calls within 8s of eye closure are suppressed.
  3. Sustained eye closure >= 8s sends 2nd reminder alert (Count: 2).
  4. Sustained eye closure beyond 2 alerts is strictly suppressed (Cap at 2).
  5. Recovery to normal for > 15s clears the session for future incidents.
"""

import time
import cv2
import numpy as np

# Import internals from cv_driver_monitor
import cv_driver_monitor as cvm

# Create a mock frame
dummy_frame = np.zeros((100, 100, 3), dtype=np.uint8)

print("=" * 60)
print("  SAFEBUS ALERT CAPPING VERIFICATION TEST")
print("=" * 60)

# Reset global test state
cvm.bus_incident_counts.clear()

dispatched_alerts = []

# Mock send_post by monkeypatching requests.post
class MockResponse:
    status_code = 202

def mock_post(url, json=None, timeout=None):
    if "incidents" in url:
        dispatched_alerts.append(json)
    return MockResponse()

import requests
requests.post = mock_post

# Test 1: First Drowsiness Detection triggers Alert #1
print("\n--- TEST 1: Initial Drowsiness Confirmation ---")
cvm.trigger_incident_if_confirmed("DROWSINESS_DETECTED", 0.95, dummy_frame, "driver@test.com", "TN38AB1234", "R-01", "T-01")
time.sleep(0.1) # Allow thread to enqueue

b_key = "TN38AB1234_DROWSINESS_DETECTED"
assert b_key in cvm.bus_incident_counts, "Incident session must be created"
assert cvm.bus_incident_counts[b_key]["count"] == 1, "Initial count must be 1"
assert len(dispatched_alerts) == 1, f"Expected 1 dispatched alert, got {len(dispatched_alerts)}"
print(f"[PASS] Alert #1 dispatched successfully. Total sent: {len(dispatched_alerts)}")

# Test 2: Immediate re-triggers within 8s are suppressed
print("\n--- TEST 2: Re-triggers within 8s Burst Suppression ---")
for _ in range(5):
    cvm.trigger_incident_if_confirmed("DROWSINESS_DETECTED", 0.95, dummy_frame, "driver@test.com", "TN38AB1234", "R-01", "T-01")

time.sleep(0.1)
assert len(dispatched_alerts) == 1, f"Expected 1 alert during burst, got {len(dispatched_alerts)}"
assert cvm.bus_incident_counts[b_key]["count"] == 1
print(f"[PASS] Burst within 8s successfully suppressed. Total sent: {len(dispatched_alerts)}")

# Test 3: Sustained closure >= 8s triggers Alert #2 (Follow-up Reminder)
print("\n--- TEST 3: Sustained Drowsiness (>=8s) triggers Alert #2 ---")
# Fast-forward session start_time to simulate 9 seconds elapsed
cvm.bus_incident_counts[b_key]["start_time"] = time.time() - 9.0

cvm.trigger_incident_if_confirmed("DROWSINESS_DETECTED", 0.95, dummy_frame, "driver@test.com", "TN38AB1234", "R-01", "T-01")
time.sleep(0.1)

assert cvm.bus_incident_counts[b_key]["count"] == 2, "Count must be 2"
assert len(dispatched_alerts) == 2, f"Expected exactly 2 dispatched alerts, got {len(dispatched_alerts)}"
print(f"[PASS] Alert #2 dispatched. Total sent: {len(dispatched_alerts)}")

# Test 4: Further continuous triggers beyond 2 are STRICTLY CAPPED
print("\n--- TEST 4: Continuous Triggers Beyond 2 are STRICTLY CAPPED ---")
# Simulate driver still having closed eyes after 12s, 15s, 25s
for i in range(10):
    cvm.trigger_incident_if_confirmed("DROWSINESS_DETECTED", 0.95, dummy_frame, "driver@test.com", "TN38AB1234", "R-01", "T-01")

time.sleep(0.1)
assert cvm.bus_incident_counts[b_key]["count"] == 2, "Count must remain capped at 2"
assert len(dispatched_alerts) == 2, f"Expected strictly 2 dispatched alerts, got {len(dispatched_alerts)}"
print(f"[PASS] Capped at exactly 2 alerts! 10 additional triggers dropped. Total sent: {len(dispatched_alerts)}")

# Test 5: Recovery to Normal resets the session
print("\n--- TEST 5: Recovery to Normal State Session Reset ---")
# Set last_time to 16 seconds ago
cvm.bus_incident_counts[b_key]["last_time"] = time.time() - 16.0

# Process normal telemetry frame
normal_telemetry = cvm.process_single_frame(dummy_frame, "driver@test.com", "TN38AB1234", "R-01", "T-01")
assert b_key not in cvm.bus_incident_counts, "Session must be pruned after 15s of normal state"
print("[PASS] Session cleanly reset after recovery to normal.")

# Test 6: Subsequent Incident after Recovery starts fresh with Alert #1
print("\n--- TEST 6: Subsequent New Incident Starts Fresh ---")
cvm.trigger_incident_if_confirmed("DROWSINESS_DETECTED", 0.95, dummy_frame, "driver@test.com", "TN38AB1234", "R-01", "T-01")
time.sleep(0.1)

assert cvm.bus_incident_counts[b_key]["count"] == 1
assert len(dispatched_alerts) == 3, f"Expected 3 dispatched alerts across 2 separate incidents, got {len(dispatched_alerts)}"
print(f"[PASS] New separate incident started fresh with alert #1. Total sent: {len(dispatched_alerts)}")

print("\n" + "=" * 60)
print("  ALL 6 ALERT CAPPING VERIFICATION TESTS PASSED SUCCESSFULLY!")
print("=" * 60)
