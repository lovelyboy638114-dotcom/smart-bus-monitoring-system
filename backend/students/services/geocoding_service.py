import os
import time
import re
from models import Stop

# Simple in-memory cache to prevent redundant API calls
_geocode_cache = {}

class GeocodingService:
    @staticmethod
    def geocode(address, db_session=None):
        """
        Geocodes a text address into a tuple of (latitude, longitude).
        If the configured online provider fails, falls back to offline database keyword matching.
        """
        if not address:
            return None

        # Clean address
        address_clean = address.strip()
        if address_clean in _geocode_cache:
            print(f"[Geocoder] Cache hit for address: {address_clean}")
            return _geocode_cache[address_clean]

        provider = os.getenv("GEOCODING_PROVIDER", "openstreetmap").lower()
        print(f"[Geocoder] Geocoding address: '{address_clean}' with provider: '{provider}'")
        api_key = os.getenv("GEOCODING_API_KEY", "")

        coords = None
        retries = 2
        
        # 1. Attempt Online Geocoding
        if provider != "offline":
            for attempt in range(retries):
                try:
                    if provider == "google" and api_key:
                        from geopy.geocoders import GoogleV3
                        geolocator = GoogleV3(api_key=api_key)
                        location = geolocator.geocode(address_clean, timeout=5)
                        if location:
                            coords = (location.latitude, location.longitude)
                            break
                    elif provider == "mapbox" and api_key:
                        from geopy.geocoders import Mapbox
                        geolocator = Mapbox(api_key=api_key)
                        location = geolocator.geocode(address_clean, timeout=5)
                        if location:
                            coords = (location.latitude, location.longitude)
                            break
                    else: # Default: openstreetmap (Nominatim)
                        from geopy.geocoders import Nominatim
                        # Use a custom user agent as required by OSM policy
                        geolocator = Nominatim(user_agent="safebus_ai_geocoder_prod")
                        location = geolocator.geocode(address_clean, timeout=5)
                        if location:
                            coords = (location.latitude, location.longitude)
                            break
                except Exception as e:
                    print(f"[Geocoder] Online geocoding attempt {attempt + 1} failed: {e}")
                    time.sleep(1)

        # 2. If online geocoding fails, fallback to Offline Keyword Matching
        if not coords:
            print(f"[Geocoder] Online lookup failed for '{address_clean}'. Engaging offline matching...")
            coords = GeocodingService._offline_fallback_match(address_clean, db_session)

        if coords:
            _geocode_cache[address_clean] = coords
            print(f"[Geocoder] Geocoded '{address_clean}' to: {coords}")
            return coords

        print(f"[Geocoder] Critical: Geocoding failed completely for address: '{address_clean}'")
        return None

    @staticmethod
    def _offline_fallback_match(address, db_session):
        """
        Fallback pattern matching against configured stops names and stop addresses.
        Splits address into tokens and finds stops that match keywords like city, locality, pin.
        """
        if not db_session:
            return None

        # Clean address tokens (extract alphanumeric tokens longer than 2 chars)
        tokens = [t.lower() for t in re.findall(r'\w+', address) if len(t) > 2]
        if not tokens:
            return None

        # Fetch all stops
        stops = db_session.query(Stop).all()
        best_stop = None
        max_matches = 0

        for stop in stops:
            stop_searchable = f"{stop.name} {stop.address or ''}".lower()
            match_count = sum(1 for token in tokens if token in stop_searchable)
            
            if match_count > max_matches:
                max_matches = match_count
                best_stop = stop

        # If we have at least one keyword match, return the nearest stop's coordinates
        if best_stop and max_matches > 0:
            print(f"[Geocoder-Offline] Match found stop: '{best_stop.name}' with {max_matches} token overlaps.")
            return (best_stop.latitude, best_stop.longitude)

        return None
