import logging
from apscheduler.schedulers.background import BackgroundScheduler
from sos.escalation_service import check_unacknowledged_alerts

logger = logging.getLogger("safebus-scheduler")
scheduler = BackgroundScheduler()

def start_escalation_scheduler(app):
    """
    Initializes and starts APScheduler to execute alert audits.
    """
    # Check every 30 seconds
    scheduler.add_job(
        func=check_unacknowledged_alerts,
        trigger="interval",
        seconds=30,
        args=[app],
        id="check_sos_escalation",
        replace_existing=True
    )
    
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler background escalation checks successfully initialized.")
    return scheduler
