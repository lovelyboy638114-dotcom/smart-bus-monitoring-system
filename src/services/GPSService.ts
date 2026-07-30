import { Coordinate } from '../types';

/**
 * Computes the Haversine distance in kilometers between two GPS coordinates.
 */
export const getDistanceKm = (c1: Coordinate, c2: Coordinate): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Checks if a bus has deviated from its planned route.
 * Returns true if the distance to the nearest point on the path exceeds the threshold (in km).
 */
export const checkRouteDeviation = (
  currentPos: Coordinate,
  plannedPath: Coordinate[],
  thresholdKm = 0.2
): { isDeviated: boolean; nearestPointIndex: number; distance: number } => {
  if (plannedPath.length === 0) {
    return { isDeviated: false, nearestPointIndex: -1, distance: 0 };
  }

  let minDistance = Infinity;
  let nearestIndex = -1;

  for (let i = 0; i < plannedPath.length; i++) {
    const dist = getDistanceKm(currentPos, plannedPath[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestIndex = i;
    }
  }

  return {
    isDeviated: minDistance > thresholdKm,
    nearestPointIndex: nearestIndex,
    distance: minDistance,
  };
};

/**
 * Calculates the bearing (heading angle) in degrees between two GPS coordinates.
 */
export const calculateBearing = (c1: Coordinate, c2: Coordinate): number => {
  const lat1 = (c1.lat * Math.PI) / 180;
  const lat2 = (c2.lat * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360; // Normalizes bearing to 0-360 degrees
};
