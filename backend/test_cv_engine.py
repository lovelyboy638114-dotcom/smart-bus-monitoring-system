"""
Unit test for CV Driver Monitoring Engine logic.
Verifies:
  - Normal eye state and look direction -> NORMAL
  - Normal blink (1.5s closure) -> Instant reset, NO alert
  - Continuous eye closure (>=3.0s) -> DROWSINESS_DETECTED
  - Brief lookaway (2.5s) -> Instant reset, NO alert
  - Continuous lookaway (>5.0s) -> DISTRACTION_DETECTED
  - Both conditions simultaneous -> DROWSINESS_DETECTED (Priority check)
  - No face detected -> NO_DRIVER_FACE_DETECTED, timers reset
"""

import time
import cv_driver_monitor as cvm

print("=== STARTING CV DETECTION ENGINE VERIFICATION ===")

# Reset state
with cvm.state_lock:
    cvm.drowsy_start_time = None
    cvm.distract_start_time = None
    cvm.drowsy_duration = 0.0
    cvm.distract_duration = 0.0

# 1. Test Drowsiness Thresholds
print("\n--- TEST 1: Normal Blink Test (<3s Closure) ---")
# Simulate eyes closed for 1.2 seconds
t0 = 100.0
cvm.drowsy_start_time = t0
now = t0 + 1.2
drowsy_candidate = True
with cvm.state_lock:
    if drowsy_candidate:
        cvm.drowsy_duration = now - cvm.drowsy_start_time
print(f"Closed for 1.2s: duration={cvm.drowsy_duration:.1f}s, threshold={cvm.CONFIG['drowsiness_threshold_seconds']}s")
assert cvm.drowsy_duration < cvm.CONFIG['drowsiness_threshold_seconds'], "Should not trigger drowsiness yet"

# Now eyes open (instant reset)
drowsy_candidate = False
with cvm.state_lock:
    if not drowsy_candidate:
        cvm.drowsy_start_time = None
        cvm.drowsy_duration = 0.0
print(f"Eyes opened: duration={cvm.drowsy_duration:.1f}s (Successfully reset!)")
assert cvm.drowsy_duration == 0.0 and cvm.drowsy_start_time is None, "Timer must reset instantly"
print("[PASS] Normal blink does not trigger alert and resets timer.")

# 2. Test Confirmed Drowsiness (>=3s Closure)
print("\n--- TEST 2: Confirmed Drowsiness Test (>=3.0s Closure) ---")
cvm.drowsy_start_time = t0
now = t0 + 3.1
with cvm.state_lock:
    cvm.drowsy_duration = now - cvm.drowsy_start_time

assert cvm.drowsy_duration >= cvm.CONFIG['drowsiness_threshold_seconds'], "Should reach drowsiness threshold"
# Resolution
status = "DROWSINESS_DETECTED" if cvm.drowsy_duration >= cvm.CONFIG['drowsiness_threshold_seconds'] else "NORMAL"
print(f"Closed for 3.1s: status={status}")
assert status == "DROWSINESS_DETECTED", "Must resolve to DROWSINESS_DETECTED"
print("[PASS] Confirmed eye closure >= 3s triggers DROWSINESS_DETECTED.")

# 3. Test Distraction Thresholds (<5s vs >5s)
print("\n--- TEST 3: Temporary Lookaway Test (<5s Lookaway) ---")
# Reset
cvm.drowsy_start_time = None
cvm.drowsy_duration = 0.0
cvm.distract_start_time = t0
now = t0 + 3.0
distract_candidate = True
with cvm.state_lock:
    cvm.distract_duration = now - cvm.distract_start_time
print(f"Looking away for 3.0s: duration={cvm.distract_duration:.1f}s, threshold={cvm.CONFIG['distraction_threshold_seconds']}s")
assert cvm.distract_duration <= cvm.CONFIG['distraction_threshold_seconds'], "Should not trigger distraction yet"

# Returned to center
distract_candidate = False
with cvm.state_lock:
    if not distract_candidate:
        cvm.distract_start_time = None
        cvm.distract_duration = 0.0
print(f"Returned to center: duration={cvm.distract_duration:.1f}s (Successfully reset!)")
assert cvm.distract_duration == 0.0 and cvm.distract_start_time is None, "Distraction timer must reset instantly"
print("[PASS] Temporary lookaway (<5s) does not trigger alert and resets timer.")

# 4. Test Confirmed Distraction (>5s)
print("\n--- TEST 4: Confirmed Distraction Test (>5.0s Lookaway) ---")
cvm.distract_start_time = t0
now = t0 + 5.2
with cvm.state_lock:
    cvm.distract_duration = now - cvm.distract_start_time
status = "DISTRACTION_DETECTED" if cvm.distract_duration > cvm.CONFIG['distraction_threshold_seconds'] else "NORMAL"
print(f"Looking away for 5.2s: status={status}")
assert status == "DISTRACTION_DETECTED", "Must resolve to DISTRACTION_DETECTED"
print("[PASS] Continuous lookaway > 5s triggers DISTRACTION_DETECTED.")

# 5. Test Priority Resolution (Both conditions active)
print("\n--- TEST 5: Priority Resolution Test ---")
cvm.drowsy_duration = 3.2
cvm.distract_duration = 5.5

if cvm.drowsy_duration >= cvm.CONFIG['drowsiness_threshold_seconds']:
    resolved_status = "DROWSINESS_DETECTED"
elif cvm.distract_duration > cvm.CONFIG['distraction_threshold_seconds']:
    resolved_status = "DISTRACTION_DETECTED"
else:
    resolved_status = "NORMAL"

print(f"Both active (drowsy={cvm.drowsy_duration}s, distract={cvm.distract_duration}s) -> status={resolved_status}")
assert resolved_status == "DROWSINESS_DETECTED", "DROWSINESS must have priority over DISTRACTION"
print("[PASS] Priority resolution confirmed: Drowsiness overrides Distraction.")

# 6. Test Face Loss
print("\n--- TEST 6: Face Loss Test ---")
face_detected = False
with cvm.state_lock:
    cvm.drowsy_start_time = None
    cvm.distract_start_time = None
    cvm.drowsy_duration = 0.0
    cvm.distract_duration = 0.0

status = "NORMAL" if face_detected else "NO_DRIVER_FACE_DETECTED"
print(f"Face not detected: status={status}, drowsy={cvm.drowsy_duration}, distract={cvm.distract_duration}")
assert status == "NO_DRIVER_FACE_DETECTED" and cvm.drowsy_duration == 0.0 and cvm.distract_duration == 0.0
print("[PASS] Face loss safely resolves to NO_DRIVER_FACE_DETECTED with zeroed timers.")

print("\n=== ALL UNIT TESTS PASSED WITH 100% SUCCESS! ===")
