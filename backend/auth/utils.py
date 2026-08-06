import re
from flask import request

def get_client_ip():
    """
    Extract the real client IP, considering proxies.
    """
    if request.headers.getlist("X-Forwarded-For"):
        return request.headers.getlist("X-Forwarded-For")[0].split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"

def parse_user_agent():
    """
    Parse browser and device info from the User-Agent header.
    """
    ua_string = request.headers.get("User-Agent", "Unknown")
    
    # Simple device classification
    if "Mobile" in ua_string or "Android" in ua_string or "iPhone" in ua_string:
        device = "Mobile"
    elif "Tablet" in ua_string or "iPad" in ua_string:
        device = "Tablet"
    else:
        device = "Desktop"
        
    # Simple browser classification
    browser = "Unknown"
    if "Chrome" in ua_string:
        browser = "Chrome"
    elif "Safari" in ua_string:
        browser = "Safari"
    elif "Firefox" in ua_string:
        browser = "Firefox"
    elif "Edge" in ua_string:
        browser = "Edge"
    elif "MSIE" in ua_string or "Trident" in ua_string:
        browser = "IE"
        
    return {
        "device": device,
        "browser": f"{browser} ({ua_string[:50]}...)" if browser != "Unknown" else ua_string[:100]
    }
