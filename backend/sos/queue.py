import queue

# Thread-safe in-memory task queue
notification_queue = queue.Queue()

def add_notification_job(sos_id: str, job_type: str, payload: dict):
    """
    Enqueues a notification job for asynchronous worker thread processing.
    """
    job = {
        "sos_id": sos_id,
        "type": job_type,  # 'ADMIN', 'POLICE', 'PARENT'
        "payload": payload
    }
    notification_queue.put(job)
