from abc import ABC, abstractmethod
import math

class DistanceProvider(ABC):
    @abstractmethod
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Calculate distance between two coordinates in kilometers.
        """
        pass

class HaversineProvider(DistanceProvider):
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Haversine formula to compute straight-line distance.
        """
        R = 6371.0 # Earth radius in kilometers
        
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        
        a = (math.sin(dlat / 2) ** 2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

class GoogleRoutesProvider(DistanceProvider):
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Placeholder for route-based travel distance from Google Routes API.
        """
        # Fallback to straight-line distance for simulation
        fallback = HaversineProvider()
        return fallback.calculate_distance(lat1, lng1, lat2, lng2)

class MapplsProvider(DistanceProvider):
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Placeholder for route-based travel distance from Mappls Distance Matrix API.
        """
        fallback = HaversineProvider()
        return fallback.calculate_distance(lat1, lng1, lat2, lng2)

class OpenRouteServiceProvider(DistanceProvider):
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Placeholder for route-based travel distance from OpenRouteService.
        """
        fallback = HaversineProvider()
        return fallback.calculate_distance(lat1, lng1, lat2, lng2)
