import math

class DistanceService:
    @staticmethod
    def haversine_distance_meters(lat1, lon1, lat2, lon2):
        """
        Calculates the great-circle distance between two points on the Earth's surface
        using the Haversine formula. Returns distance in meters.
        """
        R = 6371000.0  # Earth's radius in meters
        
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        
        a = (math.sin(dphi / 2.0) ** 2 +
             math.cos(phi1) * math.cos(phi2) *
             math.sin(dlam / 2.0) ** 2)
             
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c
