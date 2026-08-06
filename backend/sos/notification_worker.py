import threading
import logging
from sos.queue import notification_queue
from sos.notification_service import AdminNotifierStrategy, PoliceNotifierStrategy, ParentNotifierStrategy

logger = logging.getLogger("safebus-worker")

def process_queue(app):
    """
    Background worker loop that dequeues jobs and dispatches alerts using Notifier strategies.
    """
    app_context = app.app_context()
    
    admin_notifier = AdminNotifierStrategy()
    police_notifier = PoliceNotifierStrategy()
    parent_notifier = ParentNotifierStrategy()
    
    while True:
        try:
            job = notification_queue.get()
            sos_id = job["sos_id"]
            job_type = job["type"]
            payload = job["payload"]
            
            logger.info(f"[Notification Worker] Dequeued job of type '{job_type}' for SOS ID: {sos_id}")
            
            if job_type == 'ADMIN':
                admin_notifier.send_notification(app_context, sos_id, payload)
            elif job_type == 'POLICE':
                police_notifier.send_notification(app_context, sos_id, payload)
            elif job_type == 'PARENT':
                parent_notifier.send_notification(app_context, sos_id, payload)
                
            notification_queue.task_done()
        except Exception as e:
            logger.error(f"[Worker Error] Processing job failed: {e}")

def start_worker_thread(app):
    """
    Spawns the background worker thread.
    """
    worker = threading.Thread(target=process_queue, args=(app,), daemon=True)
    worker.start()
    logger.info("Asynchronous Notification worker thread successfully started.")
    return worker
