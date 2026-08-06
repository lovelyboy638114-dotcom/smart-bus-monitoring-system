from flask import Blueprint, jsonify, request
from models import db
from sos.models import SosAlert, SosStatus, SosSeverity, SosAuditLog, PoliceStation, NotificationLog
from sos.services import create_sos, acknowledge_sos, resolve_sos
from sos.utils import format_datetime_hms
from sos.distance_provider import HaversineProvider
import logging

logger = logging.getLogger("safebus-sos-routes")

sos_blueprint = Blueprint('sos', __name__)

# To emit WebSocket updates, we can import socketio from startup.py
# or import it lazily to avoid circular imports.
def emit_sos_update(event_name, data):
    try:
        from sos.startup import socketio
        socketio.emit(event_name, data)
        logger.info(f"[SocketIO Broadcast] Emitted event '{event_name}' successfully.")
    except Exception as e:
        logger.error(f"Failed to emit socket update: {e}")

@sos_blueprint.route('/v1/sos', methods=['POST'])
def trigger_sos_api():
    """
    Driver triggers a critical SOS emergency.
    """
    data = request.json
    try:
        alert = create_sos(data)
        
        # Format response payload
        res_data = {
            "status": "success",
            "message": "Emergency SOS alert triggered successfully.",
            "sos": {
                "sos_id": alert.sos_id,
                "bus_id": alert.bus_id,
                "driver_name": alert.driver_name,
                "latitude": alert.latitude,
                "longitude": alert.longitude,
                "speed": alert.speed,
                "route": alert.route_name,
                "emergency_type": alert.emergency_type,
                "status": alert.status.value,
                "severity": alert.severity.value,
                "time": format_datetime_hms(alert.created_at)
            }
        }
        
        # Broadcast to Admin Dashboards instantly
        emit_sos_update("sos_alert_received", res_data["sos"])
        
        return jsonify(res_data), 201
    except ValueError as val_err:
        return jsonify({"status": "error", "message": str(val_err)}), 409
    except Exception as err:
        logger.error(f"Failed to create SOS: {err}")
        return jsonify({"status": "error", "message": "SOS creation failed."}), 500

@sos_blueprint.route('/v1/sos/active', methods=['GET'])
def get_active_sos():
    """
    Fetches all active, unresolved SOS alerts.
    """
    try:
        active_statuses = [SosStatus.CREATED, SosStatus.POLICE_NOTIFIED, SosStatus.ADMIN_ACKNOWLEDGED]
        alerts = db.session.query(SosAlert).filter(
            SosAlert.status.in_(active_statuses),
            SosAlert.deleted_at.is_(None)
        ).all()
        
        res = []
        for a in alerts:
            # Fetch closest police station details if assigned
            police_details = None
            if a.police_station_id:
                ps = db.session.query(PoliceStation).filter(PoliceStation.id == a.police_station_id).first()
                if ps:
                    police_details = {
                        "name": ps.station_name,
                        "phone": ps.phone,
                        "email": ps.email,
                        "address": ps.address
                    }
                    
            # Fetch timeline audit trails
            audits = db.session.query(SosAuditLog).filter(SosAuditLog.sos_id == a.sos_id).order_by(SosAuditLog.timestamp.asc()).all()
            timeline = [{
                "time": format_datetime_hms(x.timestamp),
                "action": x.action,
                "performed_by": x.performed_by,
                "remarks": x.remarks
            } for x in audits]
            
            res.append({
                "sos_id": a.sos_id,
                "bus_id": a.bus_id,
                "driver_name": a.driver_name,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "speed": a.speed,
                "route": a.route_name,
                "emergency_type": a.emergency_type,
                "status": a.status.value,
                "severity": a.severity.value,
                "time": format_datetime_hms(a.created_at),
                "police_station": police_details,
                "timeline": timeline,
                "parent_notified": a.parent_notified,
                "admin_notified": a.admin_notified
            })
        return jsonify(res)
    except Exception as e:
        logger.error(f"Failed to fetch active alerts: {e}")
        return jsonify([]), 500

@sos_blueprint.route('/v1/sos/history', methods=['GET'])
def get_sos_history():
    """
    Fetches all historically resolved alerts.
    """
    try:
        alerts = db.session.query(SosAlert).filter(
            SosAlert.status == SosStatus.RESOLVED,
            SosAlert.deleted_at.is_(None)
        ).order_by(SosAlert.resolved_at.desc()).all()
        
        res = []
        for a in alerts:
            res.append({
                "sos_id": a.sos_id,
                "bus_id": a.bus_id,
                "driver_name": a.driver_name,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "speed": a.speed,
                "route": a.route_name,
                "emergency_type": a.emergency_type,
                "status": a.status.value,
                "severity": a.severity.value,
                "time": format_datetime_hms(a.created_at),
                "resolved_by": a.resolved_by,
                "resolved_at": format_datetime_hms(a.resolved_at),
                "remarks": a.remarks
            })
        return jsonify(res)
    except Exception as e:
        logger.error(f"Failed to fetch history: {e}")
        return jsonify([]), 500

@sos_blueprint.route('/v1/sos/statistics', methods=['GET'])
def get_sos_statistics():
    """
    Calculates operational control statistics for the admin dashboard.
    """
    try:
        total_alerts = db.session.query(SosAlert).filter(SosAlert.deleted_at.is_(None)).count()
        active_count = db.session.query(SosAlert).filter(
            SosAlert.status.in_([SosStatus.CREATED, SosStatus.POLICE_NOTIFIED, SosStatus.ADMIN_ACKNOWLEDGED]),
            SosAlert.deleted_at.is_(None)
        ).count()
        resolved_count = db.session.query(SosAlert).filter(
            SosAlert.status == SosStatus.RESOLVED,
            SosAlert.deleted_at.is_(None)
        ).count()
        
        # Calculate Average Acknowledgment Time (created_at to acknowledged_at)
        ack_alerts = db.session.query(SosAlert).filter(
            SosAlert.acknowledged_at.isnot(None),
            SosAlert.deleted_at.is_(None)
        ).all()
        
        avg_ack_s = 0.0
        if ack_alerts:
            total_ack_s = sum([(x.acknowledged_at - x.created_at).total_seconds() for x in ack_alerts])
            avg_ack_s = total_ack_s / len(ack_alerts)
            
        # Calculate Average Resolution Time (created_at to resolved_at)
        res_alerts = db.session.query(SosAlert).filter(
            SosAlert.resolved_at.isnot(None),
            SosAlert.deleted_at.is_(None)
        ).all()
        
        avg_res_s = 0.0
        if res_alerts:
            total_res_s = sum([(x.resolved_at - x.created_at).total_seconds() for x in res_alerts])
            avg_res_s = total_res_s / len(res_alerts)
            
        # Count by severity
        severities = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
        severity_counts = {s: db.session.query(SosAlert).filter(
            SosAlert.severity == SosSeverity[s],
            SosAlert.deleted_at.is_(None)
        ).count() for s in severities}
        
        # Count by Route
        routes_data = db.session.query(SosAlert.route_name, db.func.count(SosAlert.id)).filter(
            SosAlert.deleted_at.is_(None)
        ).group_by(SosAlert.route_name).all()
        route_breakdowns = {r[0] if r[0] else "Unknown": r[1] for r in routes_data}
        
        return jsonify({
            "total_alerts": total_alerts,
            "active_alerts": active_count,
            "resolved_alerts": resolved_count,
            "avg_acknowledgment_time_seconds": round(avg_ack_s, 1),
            "avg_resolution_time_seconds": round(avg_res_s, 1),
            "severity_counts": severity_counts,
            "route_counts": route_breakdowns
        })
    except Exception as e:
        logger.error(f"Failed to fetch stats: {e}")
        return jsonify({}), 500

@sos_blueprint.route('/v1/sos/<id>', methods=['GET'])
def get_sos_detail(id):
    """
    Fetches detail log on a single SOS record.
    """
    try:
        a = db.session.query(SosAlert).filter(
            SosAlert.sos_id == id,
            SosAlert.deleted_at.is_(None)
        ).first()
        
        if not a:
            return jsonify({"status": "error", "message": "Alert not found"}), 404
            
        return jsonify({
            "sos_id": a.sos_id,
            "bus_id": a.bus_id,
            "driver_name": a.driver_name,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "speed": a.speed,
            "route": a.route_name,
            "emergency_type": a.emergency_type,
            "status": a.status.value,
            "severity": a.severity.value,
            "time": format_datetime_hms(a.created_at)
        })
    except Exception as e:
        logger.error(f"Failed to fetch detail: {e}")
        return jsonify({}), 500

@sos_blueprint.route('/v1/sos/<id>/acknowledge', methods=['POST'])
def acknowledge_sos_api(id):
    """
    Admin acknowledges active emergency warning.
    """
    # Role checking: check headers or mock parameters
    user = request.json.get("username", "Admin Command Panel")
    
    # Track request context details for audit log security
    ip = request.remote_addr or "127.0.0.1"
    ua = request.user_agent.string or "Unknown User Agent"
    device = "Desktop Monitor"
    if "Mobile" in ua:
        device = "Mobile App"
    elif "Tablet" in ua:
        device = "Tablet App"
        
    try:
        alert = acknowledge_sos(id, user, ip, ua, device)
        
        # Broadcast to SocketIO clients
        emit_sos_update("sos_alert_acknowledged", {
            "sos_id": alert.sos_id,
            "acknowledged_by": alert.acknowledged_by,
            "time": format_datetime_hms(alert.acknowledged_at)
        })
        
        return jsonify({"status": "success", "message": "Emergency SOS acknowledged."})
    except FileNotFoundError as fnf:
        return jsonify({"status": "error", "message": str(fnf)}), 404
    except Exception as err:
        logger.error(f"Acknowledge API failed: {err}")
        return jsonify({"status": "error", "message": "Acknowledge failed."}), 500

@sos_blueprint.route('/v1/sos/<id>/resolve', methods=['POST'])
def resolve_sos_api(id):
    """
    Admin resolves active emergency incident.
    """
    user = request.json.get("username", "Admin Command Panel")
    remarks = request.json.get("remarks")
    
    try:
        alert = resolve_sos(id, user, remarks)
        
        # Broadcast to SocketIO clients
        emit_sos_update("sos_alert_resolved", {
            "sos_id": alert.sos_id,
            "resolved_by": alert.resolved_by,
            "time": format_datetime_hms(alert.resolved_at),
            "remarks": alert.remarks
        })
        
        return jsonify({"status": "success", "message": "Emergency SOS resolved."})
    except ValueError as val_err:
        return jsonify({"status": "error", "message": str(val_err)}), 400
    except FileNotFoundError as fnf:
        return jsonify({"status": "error", "message": str(fnf)}), 404
    except Exception as err:
        logger.error(f"Resolve API failed: {err}")
        return jsonify({"status": "error", "message": "Resolve failed."}), 500

@sos_blueprint.route('/police/nearest', methods=['GET'])
def get_nearest_police():
    """
    Helper endpoint to query nearest police station.
    """
    lat = float(request.args.get("latitude", 10.8801))
    lng = float(request.args.get("longitude", 77.0224))
    
    try:
        stations = db.session.query(PoliceStation).all()
        if not stations:
            return jsonify({"status": "error", "message": "No police stations seeded"}), 404
            
        solver = HaversineProvider()
        closest = None
        min_d = float('inf')
        for s in stations:
            d = solver.calculate_distance(lat, lng, s.latitude, s.longitude)
            if d < min_d:
                min_d = d
                closest = s
                
        return jsonify({
            "station_name": closest.station_name,
            "phone": closest.phone,
            "email": closest.email,
            "address": closest.address,
            "distance_km": round(min_d, 2)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
