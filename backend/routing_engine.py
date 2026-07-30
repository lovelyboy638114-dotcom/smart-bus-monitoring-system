from geopy.distance import geodesic

class RoutingEngine:
    def __init__(self):
        # Coordinates mapped to Chennai locations (Anna Nagar, KK Nagar, vadapalani, Nungambakkam School)
        self.routes = {
            "TN38AB1234": [
                (13.0850, 80.2101),  # Anna Nagar Depot
                (13.0820, 80.2120),  # Anna Nagar Roundtana
                (13.0780, 80.2150),  # Aminjikarai
                (13.0720, 80.2220),  # Kilpauk
                (13.0650, 80.2300),  # Chetpet
                (13.0569, 80.2425)   # School Campus (Nungambakkam)
            ],
            "TN38CD5678": [
                (13.0373, 80.1943),  # KK Nagar Depot
                (13.0420, 80.2020),  # Ashok Nagar
                (13.0470, 80.2150),  # West Mambalam
                (13.0520, 80.2250),  # Kodambakkam
                (13.0569, 80.2425)   # School Campus (Nungambakkam)
            ],
            "TN38EP9012": [
                (13.0513, 80.2088),  # Vadapalani Depot
                (13.0550, 80.2180),  # Saligramam
                (13.0530, 80.2280),  # T Nagar
                (13.0569, 80.2425)   # School Campus (Nungambakkam)
            ]
        }

    def check_route_deviation(self, bus_id, bus_lat, bus_lng):
        """
        Calculates the minimum distance from the bus location to its planned route.
        Returns:
        (is_deviated: bool, min_distance_meters: float)
        """
        route_points = self.routes.get(bus_id)
        if not route_points:
            return False, 0.0
            
        bus_coords = (bus_lat, bus_lng)
        min_distance = float('inf')
        
        # Calculate distance to every point along the path and take the minimum
        # For intermediate points, we check distance to route checkpoints
        for checkpoint in route_points:
            dist = geodesic(bus_coords, checkpoint).meters
            if dist < min_distance:
                min_distance = dist
                
        # If the minimum distance is greater than 200 meters, trigger deviation alarm
        is_deviated = min_distance > 200.0
        
        return is_deviated, min_distance

# Test execution block
if __name__ == "__main__":
    engine = RoutingEngine()
    # Test point close to Chetpet on Route A (TN38AB1234)
    print("Near route path check:", engine.check_route_deviation("TN38AB1234", 13.0652, 80.2301))
    # Test point deviated from Chetpet (approx 400m away)
    print("Deviated check (offset):", engine.check_route_deviation("TN38AB1234", 13.0680, 80.2330))
