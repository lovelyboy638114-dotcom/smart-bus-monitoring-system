from datetime import datetime
import logging
from models import db
from sos.models import SosAlert, SosStatus, SosAuditLog

logger = logging.getLogger("safebus-escalation")

def check_unacknowledged_alerts(app):
    """
    Scans for unresolved, unacknowledged SOS alerts and triggers progressive escalations
    at 60s, 120s, and 180s thresholds.
    """
    with app.app_context():
        try:
            # Fetch active alerts in CREATED or POLICE_NOTIFIED status
            unack_statuses = [SosStatus.CREATED, SosStatus.POLICE_NOTIFIED]
            active_alerts = db.session.query(SosAlert).filter(
                SosAlert.status.in_(unack_statuses),
                SosAlert.deleted_at.is_(None)
            ).all()
            
            now = datetime.utcnow()
            
            for alert in active_alerts:
                elapsed_seconds = (now - alert.created_at).total_seconds()
                
                # Level 3: 180 seconds threshold
                if elapsed_seconds >= 180:
                    action_str = "Escalated to Level 3 (Transport Manager Notified)"
                    if not has_audit_logged(alert.sos_id, action_str):
                        trigger_escalation(alert, action_str, "Alert unresolved for 180s. Escalating to Transport Director.")
                
                # Level 2: 120 seconds threshold
                elif elapsed_seconds >= 120:
                    action_str = "Escalated to Level 2 (Principal Notified)"
                    if not has_audit_logged(alert.sos_id, action_str):
                        trigger_escalation(alert, action_str, "Alert unresolved for 120s. Escalating to School Principal.")
                
                # Level 1: 60 seconds threshold
                elif elapsed_seconds >= 60:
                    action_str = "Escalated to Level 1 (Secondary Admin Notified)"
                    if not has_audit_logged(alert.sos_id, action_str):
                        trigger_escalation(alert, action_str, "Alert unresolved for 60s. Escalating to Secondary Admin dispatcher.")
                        
        except Exception as e:
            logger.error(f"[Escalation Scheduler Error] Failed to scan alerts: {e}")

def has_audit_logged(sos_id: str, action: str) -> bool:
    """
    Checks if an escalation step has already been logged.
    """
    log = db.session.query(SosAuditLog).filter(
        SosAuditLog.sos_id == sos_id,
        SosAuditLog.action == action
    ).first()
    return log is not None

def trigger_escalation(alert: SosAlert, action: str, remarks: str):
    """
    Logs the escalation in the database audit logs.
    """
    logger.warning(f"[Escalation Triggered] SOS ID: {alert.sos_id} -> {action}")
    
    # Write audit entry
    log = SosAuditLog(
        sos_id=alert.sos_id,
        action=action,
        performed_by="System Scheduler (APScheduler)",
        timestamp=datetime.utcnow(),
        remarks=remarks
    )
    db.session.add(log)
    db.session.commit()
