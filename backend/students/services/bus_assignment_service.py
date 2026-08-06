from datetime import datetime
from models import db, Student, Bus, Route, Stop, Alert
from students.services.geocoding_service import GeocodingService
from students.services.distance_service import DistanceService

class BusAssignmentService:
    @staticmethod
    def assign_bus_to_student(student, session):
        """
        Intelligently finds and assigns the closest route, stop, and bus based on student address.
        Executes within the student registration database transaction.
        """
        print(f"[BusAssignment] Initiating automatic assignment for student: {student.name} ({student.id})")
        
        # Step 1: Validate address
        if not student.address or not student.address.strip():
            print("[BusAssignment] Address is empty. Setting status to PENDING.")
            student.assignment_status = 'BUS_PENDING'
            student.status = 'BUS_PENDING'
            BusAssignmentService._log_admin_alert(
                session, 
                f"Student {student.name} ({student.id}) has no address specified. Manual assignment required.",
                "Medium"
            )
            return False

        # Step 2: Geocode address
        coords = GeocodingService.geocode(student.address, db_session=session)
        if not coords:
            print(f"[BusAssignment] Geocoding failed for address: '{student.address}'. Setting status to PENDING.")
            student.assignment_status = 'BUS_PENDING'
            student.status = 'BUS_PENDING'
            BusAssignmentService._log_admin_alert(
                session,
                f"Geocoding failed for Student {student.name} ({student.id}) address: '{student.address}'. Manual review required.",
                "Medium"
            )
            return False

        stu_lat, stu_lng = coords

        # Step 3: Load active pickup stops
        stops = session.query(Stop).all()
        if not stops:
            print("[BusAssignment] No stops configured in database. Setting status to PENDING.")
            student.assignment_status = 'BUS_PENDING'
            student.status = 'BUS_PENDING'
            BusAssignmentService._log_admin_alert(
                session,
                f"No database stops found for automatic assignment of student {student.name}.",
                "High"
            )
            return False

        # Step 4: Calculate distance to every stop and Step 5: Find nearest stop
        nearest_stop = None
        min_distance = float('inf')

        for stop in stops:
            distance = DistanceService.haversine_distance_meters(stu_lat, stu_lng, stop.latitude, stop.longitude)
            if distance < min_distance:
                min_distance = distance
                nearest_stop = stop

        if not nearest_stop or not nearest_stop.route_id:
            print("[BusAssignment] Nearest stop is invalid or not mapped to a route. Setting status to PENDING.")
            student.assignment_status = 'BUS_PENDING'
            student.status = 'BUS_PENDING'
            BusAssignmentService._log_admin_alert(
                session,
                f"Nearest stop for Student {student.name} is not mapped to any route.",
                "High"
            )
            return False

        print(f"[BusAssignment] Nearest stop identified: '{nearest_stop.name}' ({min_distance:.1f} m away) on Route: '{nearest_stop.route_id}'")

        # Step 6: Resolve Route and Step 7: Load buses serving that route
        route_id = nearest_stop.route_id
        route = session.query(Route).filter(Route.id == route_id).first()
        
        buses = session.query(Bus).filter(
            Bus.route_id == route_id,
            Bus.is_active == True
        ).all()

        if not buses:
            print(f"[BusAssignment] No active buses found serving route '{route_id}'. Setting status to PENDING.")
            student.assignment_status = 'BUS_PENDING'
            student.status = 'BUS_PENDING'
            BusAssignmentService._log_admin_alert(
                session,
                f"No active buses available on Route '{route_id}' for student {student.name}.",
                "High"
            )
            return False

        # Step 8: Sort buses by capacity availability and lowest occupancy
        bus_occupancy = []
        for bus in buses:
            # Dynamic occupancy query
            occupancy = session.query(Student).filter(
                Student.busId == bus.id,
                Student.student_status == 'ACTIVE'
            ).count()
            
            capacity = bus.capacity or 40
            has_capacity = occupancy < capacity
            bus_occupancy.append((bus, occupancy, has_capacity))

        # Sort: Has capacity first (descending Boolean), then lowest occupancy (ascending Int)
        bus_occupancy.sort(key=lambda item: (not item[2], item[1]))

        selected_bus = None
        for bus, occupancy, has_capacity in bus_occupancy:
            if has_capacity:
                selected_bus = bus
                break

        # Step 9: Assign Bus & Update database fields
        if selected_bus:
            student.busId = selected_bus.id
            student.route_id = route_id
            student.pickup_stop_id = str(nearest_stop.id)
            student.pickup_distance = min_distance
            student.assignment_status = 'ASSIGNED'
            student.status = 'Not Started'
            student.assigned_at = datetime.utcnow()
            session.flush() # Force flush to sync database state inside the transaction
            print(f"[BusAssignment] Successfully assigned Student '{student.name}' to Bus '{selected_bus.id}' at Stop '{nearest_stop.name}'")
            return True
        else:
            print(f"[BusAssignment] All buses serving Route '{route_id}' are at capacity. Setting status to PENDING.")
            student.assignment_status = 'BUS_PENDING'
            student.status = 'BUS_PENDING'
            BusAssignmentService._log_admin_alert(
                session,
                f"Bus Assignment Failure: Route '{route_id}' buses are full. Student {student.name} ({student.id}) is pending.",
                "High"
            )
            return False

    @staticmethod
    def _log_admin_alert(session, message, severity):
        """
        Creates an administrative safety/system alert in the database.
        """
        time_str = datetime.now().strftime("%I:%M %p")
        alert = Alert(
            type="Auto Bus Assignment",
            severity=severity,
            bus=None,
            driver=message,
            time=time_str,
            resolved=0
        )
        session.add(alert)
        try:
            session.flush()
        except Exception as e:
            print(f"[BusAssignment] Failed to log admin alert: {e}")
