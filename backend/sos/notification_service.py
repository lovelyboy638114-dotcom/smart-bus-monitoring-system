from abc import ABC, abstractmethod
from datetime import datetime
import logging
from flask import Flask
from models import db
from sos.models import NotificationLog, DeliveryStatus

logger = logging.getLogger("safebus-notifications")

class NotifierStrategy(ABC):
    @abstractmethod
    def send_notification(self, app_context, sos_id: str, payload: dict):
        """
        Send notification. Executes inside app context to write logs to DB.
        """
        pass

class AdminNotifierStrategy(NotifierStrategy):
    def send_notification(self, app_context, sos_id: str, payload: dict):
        with app_context:
            try:
                # Mock sending Socket.IO real-time notification to administrators
                logger.info(f"[Mock Admin Notification] Dispatched Emergency SOS warning for ID: {sos_id}")
                
                # Write status log
                log = NotificationLog(
                    sos_id=sos_id,
                    recipient_type="Admin",
                    recipient_name="Fleet Dispatch Command Center",
                    delivery_method="SocketIO",
                    status=DeliveryStatus.SENT,
                    sent_at=datetime.utcnow()
                )
                db.session.add(log)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to log Admin notification: {e}")

class PoliceNotifierStrategy(NotifierStrategy):
    def send_notification(self, app_context, sos_id: str, payload: dict):
        with app_context:
            try:
                station_name = payload.get("station_name", "Local Police Station")
                phone = payload.get("phone", "100")
                link = payload.get("maps_link", "")
                
                logger.info(f"[Mock Police Dispatch] Contacting nearest station '{station_name}' at {phone} for SOS: {sos_id}. Maps Route: {link}")
                
                log = NotificationLog(
                    sos_id=sos_id,
                    recipient_type="Police",
                    recipient_name=station_name,
                    delivery_method="MockEmail/API",
                    status=DeliveryStatus.SENT,
                    sent_at=datetime.utcnow()
                )
                db.session.add(log)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to log Police notification: {e}")

class ParentNotifierStrategy(NotifierStrategy):
    def send_notification(self, app_context, sos_id: str, payload: dict):
        with app_context:
            try:
                parent_phone = payload.get("phone", "+91 99999 99999")
                parent_name = payload.get("parent_name", "Parent")
                msg = payload.get("message", "Controlled safety warning update.")
                
                logger.info(f"[Mock Parent Alert] SMS sent to {parent_name} ({parent_phone}): '{msg}'")
                
                log = NotificationLog(
                    sos_id=sos_id,
                    recipient_type="Parent",
                    recipient_name=parent_name,
                    delivery_method="MockSMS",
                    status=DeliveryStatus.SENT,
                    sent_at=datetime.utcnow()
                )
                db.session.add(log)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to log Parent notification: {e}")

class EmailNotifierStrategy(NotifierStrategy):
    def send_notification(self, app_context, sos_id: str, payload: dict):
        # Stub class for email notification
        logger.info(f"[Stub Email Notifier] Email notifier placeholder triggered for SOS: {sos_id}")

class SmsNotifierStrategy(NotifierStrategy):
    def send_notification(self, app_context, sos_id: str, payload: dict):
        # Stub class for SMS notification
        logger.info(f"[Stub SMS Notifier] SMS notifier placeholder triggered for SOS: {sos_id}")

class PushNotifierStrategy(NotifierStrategy):
    def send_notification(self, app_context, sos_id: str, payload: dict):
        # Stub class for Push notification
        logger.info(f"[Stub Push Notifier] Push notifier placeholder triggered for SOS: {sos_id}")
