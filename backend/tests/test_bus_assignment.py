import unittest
import sys
import os
from datetime import datetime

# Add parent directory to path so we can import the modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import Student, Bus, Route, Stop
from students.models import Parent
from students.services.geocoding_service import GeocodingService
from students.services.distance_service import DistanceService
from students.services.bus_assignment_service import BusAssignmentService
from students.services.parent_link_service import ParentLinkService

class TestBusAssignmentSystem(unittest.TestCase):
    def setUp(self):
        print("[TestSetup] Start setUp")
        # Configure app for testing
        app.config['TESTING'] = True
        os.environ["GEOCODING_PROVIDER"] = "offline"
        self.client = app.test_client()
        self.app_context = app.app_context()
        self.app_context.__enter__()
        print("[TestSetup] Context entered")
        
        print("[TestSetup] No begin_nested, using default session transaction")
 
        # Seed test routes and stops within the transaction boundary
        self.route1 = Route(id="TEST-R1", name="Test Route North")
        self.route2 = Route(id="TEST-R2", name="Test Route East")
        db.session.add_all([self.route1, self.route2])
        db.session.flush()
        print("[TestSetup] routes flushed")
 
        # Stop A: Unique North Pole coordinates
        self.stopA = Stop(name="TestNorthStop", latitude=45.0, longitude=45.0, address="NorthPoleAddress", route_id="TEST-R1")
        # Stop B: Unique East Pole coordinates
        self.stopB = Stop(name="TestEastStop", latitude=46.0, longitude=46.0, address="EastPoleAddress", route_id="TEST-R2")
        db.session.add_all([self.stopA, self.stopB])
        db.session.flush()
        print("[TestSetup] stops flushed")
 
        # Seed buses
        self.bus1 = Bus(id="TEST-BUS1", name="Test Bus 1", route="Test Route North", driver="Driver A", capacity=2, route_id="TEST-R1", is_active=True)
        self.bus2 = Bus(id="TEST-BUS2", name="Test Bus 2", route="Test Route North", driver="Driver B", capacity=2, route_id="TEST-R1", is_active=True)
        self.bus3 = Bus(id="TEST-BUS3", name="Test Bus 3", route="Test Route East", driver="Driver C", capacity=10, route_id="TEST-R2", is_active=True)
        db.session.add_all([self.bus1, self.bus2, self.bus3])
        db.session.flush()
        print("[TestSetup] buses flushed")

    def tearDown(self):
        print("[TestTeardown] Start tearDown")
        try:
            # Delete test students
            db.session.query(Student).filter(
                (Student.id.like("S_FILL_%")) |
                (Student.id.like("STU_%")) |
                (Student.id.in_(["S1", "S2", "S3", "S_PEND"]))
            ).delete(synchronize_session=False)

            # Delete test buses
            db.session.query(Bus).filter(Bus.id.like("TEST-BUS%")).delete(synchronize_session=False)

            # Delete test stops
            db.session.query(Stop).filter(Stop.name.like("Test%")).delete(synchronize_session=False)

            # Delete test routes
            db.session.query(Route).filter(Route.id.like("TEST-R%")).delete(synchronize_session=False)

            # Delete test parents
            db.session.query(Parent).filter(Parent.email == "john@doe.com").delete(synchronize_session=False)

            # Commit cleanup
            db.session.commit()
            print("[TestTeardown] Committed cleanup successfully")
        except Exception as e:
            print(f"[TestTeardown] Cleanup error: {e}")
            db.session.rollback()
        finally:
            db.session.remove()
            self.app_context.__exit__(None, None, None)

    def test_haversine_distance(self):
        # Distance to self coordinates should be 0
        dist = DistanceService.haversine_distance_meters(11.0168, 76.9674, 11.0168, 76.9674)
        self.assertEqual(dist, 0.0)

        # Distance from Gandhipuram to Hope College (approx 6.7km)
        dist2 = DistanceService.haversine_distance_meters(11.0168, 76.9674, 11.0270, 77.0288)
        self.assertTrue(6000 < dist2 < 7500)

    def test_offline_geocoding_fallback(self):
        # Test offline geocoding token matching for stop A
        coords = GeocodingService.geocode("Near NorthPoleAddress", db_session=db.session)
        self.assertIsNotNone(coords)
        self.assertAlmostEqual(coords[0], 45.0)
        self.assertAlmostEqual(coords[1], 45.0)

    def test_successful_closest_assignment(self):
        student = Student(
            id="STU_TEST_A",
            name="Alice",
            rollNo="123",
            class_name="10",
            address="Near NorthPoleAddress" # Matches stop A via token
        )
        db.session.add(student)
        success = BusAssignmentService.assign_bus_to_student(student, db.session)
        self.assertTrue(success)
        self.assertEqual(student.busId, "TEST-BUS1")
        self.assertEqual(student.route_id, "TEST-R1")
        self.assertEqual(student.pickup_stop_id, str(self.stopA.id))
        self.assertEqual(student.assignment_status, "ASSIGNED")

    def test_capacity_overflow_rollover(self):
        print("[test_capacity_overflow_rollover] Start")
        # Set bus 1 capacity to 1 for this test
        self.bus1.capacity = 1
        db.session.add(self.bus1)
        db.session.flush()
        
        # 1. Fill bus 1 capacity (capacity = 1)
        s1 = Student(id="STU_TEST_S1", name="Student 1", rollNo="R1", class_name="10", address="NorthPoleAddress", student_status="ACTIVE")
        s2 = Student(id="STU_TEST_S2", name="Student 2", rollNo="R2", class_name="10", address="NorthPoleAddress", student_status="ACTIVE")
        print("[test_capacity_overflow_rollover] Students created")
        
        db.session.add(s1)
        db.session.flush()
        print("[test_capacity_overflow_rollover] s1 flushed")
        
        db.session.add(s2)
        db.session.flush()
        print("[test_capacity_overflow_rollover] s2 flushed")

        # Run assignments for s1, s2
        BusAssignmentService.assign_bus_to_student(s1, db.session)
        BusAssignmentService.assign_bus_to_student(s2, db.session)

        # 3. Third student near stop A should rollover to bus 2
        s3 = Student(id="STU_TEST_S3", name="Student 3", rollNo="R3", class_name="10", address="NorthPoleAddress", student_status="ACTIVE")
        db.session.add(s3)
        db.session.flush()
        success = BusAssignmentService.assign_bus_to_student(s3, db.session)
        self.assertTrue(success)
        self.assertEqual(s3.busId, "TEST-BUS2")

    def test_all_buses_full_triggers_pending(self):
        # Fill both bus 1 (cap 2) and bus 2 (cap 2)
        for i in range(4):
            s = Student(id=f"S_FILL_{i}", name=f"Fill {i}", rollNo=f"R_FILL_{i}", class_name="10", address="NorthPoleAddress", student_status="ACTIVE")
            db.session.add(s)
            db.session.flush()
            BusAssignmentService.assign_bus_to_student(s, db.session)

        # 5th student should trigger BUS_PENDING status
        s_pending = Student(id="S_PEND", name="Pending Stud", rollNo="R_PEND", class_name="10", address="NorthPoleAddress", student_status="ACTIVE")
        db.session.add(s_pending)
        success = BusAssignmentService.assign_bus_to_student(s_pending, db.session)
        self.assertFalse(success)
        self.assertEqual(s_pending.assignment_status, "BUS_PENDING")
        self.assertEqual(s_pending.status, "BUS_PENDING")

    def test_parent_creation_and_linking(self):
        """
        Verify that registering a student with a new parent creates the Parent profile,
        and subsequent registrations with the same contact info reuse it.
        """
        # Create a new parent
        p1 = ParentLinkService.create_parent(
            father_name="John Doe",
            mother_name="Mary Doe",
            phone="+1-555-1234",
            email="john@doe.com",
            address="Coimbatore",
            username="johndoe",
            password_hash="pbkdf2:sha256...",
            session=db.session
        )
        self.assertIsNotNone(p1.id)
        
        # Link student 1
        stu1 = Student(id="STU_PARENT_1", name="Kid One", rollNo="K1", class_name="10", student_status="ACTIVE")
        db.session.add(stu1)
        ParentLinkService.link_student_to_parent(stu1, p1, db.session)
        self.assertEqual(stu1.parent_id, p1.id)

        # Lookup by same email
        p_lookup = ParentLinkService.find_existing_parent(phone=None, email="john@doe.com", session=db.session)
        self.assertEqual(p_lookup.id, p1.id)

        # Link student 2 to the same parent
        stu2 = Student(id="STU_PARENT_2", name="Kid Two", rollNo="K2", class_name="10", student_status="ACTIVE")
        db.session.add(stu2)
        ParentLinkService.link_student_to_parent(stu2, p_lookup, db.session)
        
        # Retrieve children
        children = ParentLinkService.get_children(p1.id, db.session)
        self.assertEqual(len(children), 2)
        self.assertEqual(children[0].id, "STU_PARENT_1")
        self.assertEqual(children[1].id, "STU_PARENT_2")

