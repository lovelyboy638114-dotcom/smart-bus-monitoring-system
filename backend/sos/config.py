import os

# Feature flags loaded from environment variables
ENABLE_SOS_SYSTEM = os.getenv("ENABLE_SOS_SYSTEM", "true").lower() == "true"
SOS_POLL_INTERVAL = int(os.getenv("SOS_POLL_INTERVAL", "3"))
SOS_CANCEL_WINDOW = int(os.getenv("SOS_CANCEL_WINDOW", "5"))
SOS_ESCALATION_SECONDS = int(os.getenv("SOS_ESCALATION_SECONDS", "60"))
ENABLE_PARENT_NOTIFICATION = os.getenv("ENABLE_PARENT_NOTIFICATION", "true").lower() == "true"
ENABLE_POLICE_NOTIFICATION = os.getenv("ENABLE_POLICE_NOTIFICATION", "true").lower() == "true"
