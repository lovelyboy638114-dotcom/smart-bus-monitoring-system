import unittest
import sys
import os

# Set environment
os.environ["GEOCODING_PROVIDER"] = "offline"
os.environ["TESTING"] = "true"

# Add parent dir
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if __name__ == "__main__":
    suite = unittest.defaultTestLoader.discover('backend/tests', pattern='test_bus_assignment.py')
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    import os
    os._exit(not result.wasSuccessful())
