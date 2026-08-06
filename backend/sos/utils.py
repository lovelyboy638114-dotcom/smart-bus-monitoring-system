from datetime import datetime

def format_datetime_hms(dt: datetime) -> str:
    """
    Format datetime into standard HH:MM:SS format.
    """
    if not dt:
        return ""
    return dt.strftime("%I:%M:%S %p")

def build_osm_tracking_link(lat: float, lng: float) -> str:
    """
    Builds a clickable link for Leaflet/OSM map overlays.
    """
    return f"https://www.openstreetmap.org/?mlat={lat}&mlon={lng}#map=17/{lat}/{lng}"

def calculate_time_difference_seconds(start: datetime, end: datetime) -> float:
    """
    Returns time difference in seconds between two points.
    """
    if not start or not end:
        return 0.0
    return (end - start).total_seconds()
