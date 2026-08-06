import sys
import os
import traceback
import threading
import time

os.environ["GEOCODING_PROVIDER"] = "offline"
os.environ["TESTING"] = "true"
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import app, db, and test case
from app import app, db
from tests.test_bus_assignment import TestBusAssignmentSystem

def watchdog():
    time.sleep(8)
    trace_file = "trace.txt"
    print(f"\n!!! WATCHDOG TRIGGERED !!! Writing stack traces to {trace_file}", flush=True)
    try:
        with open(trace_file, "w", encoding="utf-8") as f:
            f.write("=== Watchdog Stack Trace Dump ===\n")
            for thread_id, frame in sys._current_frames().items():
                f.write(f"\nThread ID: {thread_id}\n")
                traceback.print_stack(frame, file=f)
            f.flush()
        print("!!! Trace written. Exiting process. !!!", flush=True)
    except Exception as e:
        print(f"Watchdog dump failed: {e}", flush=True)
    os._exit(1)

if __name__ == "__main__":
    t = threading.Thread(target=watchdog, daemon=True)
    t.start()

    app.config['TESTING'] = True
    
    test_instance = TestBusAssignmentSystem()
    test_methods = [m for m in dir(test_instance) if m.startswith('test_')]
    print(f"Discovered test methods: {test_methods}", flush=True)
    
    failed = False
    for m in test_methods:
        print(f"\n================ Running {m} ================", flush=True)
        test_instance.setUp()
        try:
            method = getattr(test_instance, m)
            method()
            print(f"SUCCESS: {m}", flush=True)
        except Exception as e:
            print(f"FAILED: {m}", flush=True)
            traceback.print_exc()
            failed = True
        finally:
            test_instance.tearDown()
            
    print(f"\nTest run finished. Status: {'FAILED' if failed else 'PASSED'}", flush=True)
    os._exit(1 if failed else 0)
