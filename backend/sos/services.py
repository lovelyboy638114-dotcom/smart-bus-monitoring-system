from datetime import datetime
import logging
from flask import request
from models import db
from sos.models import SosAlert, SosStatus, SosSeverity, SosAuditLog, NotificationLog, PoliceStation
from sos.distance_provider import HaversineProvider
from sos.queue import add_notification_job

logger = logging.getLogger("safebus-sos-services")

def generate_sos_id() -> str:
    """
    Generates a unique SOS ID format: SOSYYYYMMDDnnnn (e.g., SOS202607300001).
    """
    today_str = datetime.utcnow().strftime("%Y%m%d")
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    count = db.session.query(SosAlert).filter(SosAlert.created_at >= today_start).count()
    return f"SOS{today_str}{str(count + 1).zfill(4)}"

def create_sos(data: dict) -> SosAlert:
    """
    Creates a new SOS emergency alert. Enforces rate limits and active duplication checks.
    Calculates closest police station and enqueues async notifier worker tasks.
    """
    bus_id = data.get("busId")
    lat = float(data.get("latitude"))
    lng = float(data.get("longitude"))
    speed = int(data.get("speed", 0))
    route_name = data.get("route", "Unknown Route")
    emergency_type = data.get("emergency_type", "General Emergency")
    driver_id = data.get("driver_id", "driver@happyjourney.ai")
    driver_name = data.get("driver_name", "Unknown Driver")
    is_test = bool(data.get("is_test", False))
    severity_val = data.get("severity", "CRITICAL")
    
    # 1. Duplication Check
    active_statuses = [SosStatus.CREATED, SosStatus.POLICE_NOTIFIED, SosStatus.ADMIN_ACKNOWLEDGED]
    active_sos = db.session.query(SosAlert).filter(
        SosAlert.bus_id == bus_id,
        SosAlert.status.in_(active_statuses),
        SosAlert.deleted_at.is_(None)
    ).first()
    
    if active_sos:
        raise ValueError(f"SOS alert already active for bus {bus_id}")
        
    # 2. Rate Limiting Check (max 1 trigger per 30 seconds)
    latest_alert = db.session.query(SosAlert).filter(
        SosAlert.bus_id == bus_id
    ).order_by(SosAlert.created_at.desc()).first()
    
    if latest_alert:
        elapsed = (datetime.utcnow() - latest_alert.created_at).total_seconds()
        if elapsed < 30:
            raise ValueError(f"Rate limit exceeded. Try again in {int(30 - elapsed)} seconds.")
            
    # Generate unique ID
    sos_id = generate_sos_id()
    
    # Build ORM alert
    alert = SosAlert(
        sos_id=sos_id,
        bus_id=bus_id,
        driver_id=driver_id,
        driver_name=driver_name,
        latitude=lat,
        longitude=lng,
        speed=speed,
        route_name=route_name,
        emergency_type=emergency_type,
        status=SosStatus.CREATED,
        severity=SosSeverity[severity_val],
        is_test=is_test,
        created_at=datetime.utcnow()
    )
    db.session.add(alert)
    db.session.commit()
    
    # Write Audit entry
    log_audit(sos_id, "Emergency Created", driver_name, f"Driver triggered Emergency SOS: [{emergency_type}]")
    
    # Enqueue Admin Notification
    add_notification_job(sos_id, "ADMIN", {
        "busId": bus_id,
        "driverName": driver_name,
        "latitude": lat,
        "longitude": lng,
        "speed": speed,
        "route": route_name,
        "time": alert.created_at.strftime("%I:%M:%S %p"),
        "severity": severity_val
    })
    
    # 3. Locate closest Police Station using Haversine
    stations = db.session.query(PoliceStation).all()
    closest_station = None
    min_distance = float('inf')
    
    distance_solver = HaversineProvider()
    
    for station in stations:
        dist = distance_solver.calculate_distance(lat, lng, station.latitude, station.longitude)
        if dist < min_distance:
            min_distance = dist
            closest_station = station
            
    if closest_station:
        alert.police_station_id = closest_station.id
        db.session.commit()
        
        log_audit(sos_id, "Nearest Police Identified", "System Router", 
                  f"Nearest station: '{closest_station.station_name}' identified at {round(min_distance, 2)}km.")
        
        # Enqueue Police Notification Job
        osm_link = f"https://www.openstreetmap.org/?mlat={lat}&mlon={lng}#map=17/{lat}/{lng}"
        add_notification_job(sos_id, "POLICE", {
            "station_name": closest_station.station_name,
            "phone": closest_station.phone,
            "email": closest_station.email,
            "maps_link": osm_link,
            "busId": bus_id,
            "driverName": driver_name,
            "latitude": lat,
            "longitude": lng,
            "time": alert.created_at.strftime("%I:%M:%S %p")
        })
        
        # Update Status to POLICE_NOTIFIED
        alert.status = SosStatus.POLICE_NOTIFIED
        db.session.commit()
        log_audit(sos_id, "Police Notification Enqueued", "System Router", "Police dispatch task added to worker queue.")
        
    return alert

def acknowledge_sos(sos_id: str, admin_user: str, ip: str, user_agent: str, device: str) -> SosAlert:
    """
    Sets alert status to ADMIN_ACKNOWLEDGED and enqueues parent notification mock task.
    """
    alert = db.session.query(SosAlert).filter(
        SosAlert.sos_id == sos_id,
        SosAlert.deleted_at.is_(None)
    ).first()
    
    if not alert:
        raise FileNotFoundError(f"SOS Alert {sos_id} not found.")
        
    alert.status = SosStatus.ADMIN_ACKNOWLEDGED
    alert.acknowledged_by = admin_user
    alert.acknowledged_at = datetime.utcnow()
    db.session.commit()
    
    # Log Audit with security details
    log_audit(sos_id, "Admin Acknowledged", admin_user, 
              f"Admin acknowledged emergency from IP={ip}, User-Agent={user_agent}, Device={device}.",
              ip, user_agent, device)
              
    # Enqueue Parent Notification ONLY after Admin acknowledgment
    # In a real system, we'd query the students on board this bus to notify parents.
    # For simulation, notify mock parent details.
    add_notification_job(sos_id, "PARENT", {
        "parent_name": "Rajesh Kumar",
        "phone": "+91 98450 12303",
        "message": f"The school has reported an emergency involving your child's bus {alert.bus_id}. Authorities have been informed. Please wait for official updates."
    })
    
    return alert

def resolve_sos(sos_id: str, admin_user: str, remarks: str) -> SosAlert:
    """
    Resolves active SOS alert, logging resolution remarks.
    """
    alert = db.session.query(SosAlert).filter(
        SosAlert.sos_id == sos_id,
        SosAlert.deleted_at.is_(None)
    ).first()
    
    if not alert:
        raise FileNotFoundError(f"SOS Alert {sos_id} not found.")
        
    if not remarks:
        raise ValueError("Remarks are required to resolve an active SOS emergency.")
        
    alert.status = SosStatus.RESOLVED
    alert.resolved_by = admin_user
    alert.resolved_at = datetime.utcnow()
    alert.remarks = remarks
    db.session.commit()
    
    log_audit(sos_id, "Admin Resolved", admin_user, f"Incident resolved. Resolution remarks: '{remarks}'")
    return alert

def log_audit(sos_id: str, action: str, performed_by: str, remarks: str = None, ip: str = None, ua: str = None, dev: str = None):
    """
    Writes a structured audit logging trace record.
    """
    log = SosAuditLog(
        sos_id=sos_id,
        action=action,
        performed_by=performed_by,
        timestamp=datetime.utcnow(),
        remarks=remarks,
        ip_address=ip,
        user_agent=ua,
        device=dev
    )
    db.session.add(log)
    db.session.commit()
