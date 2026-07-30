export interface BusLocationResponse {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  status: 'Running' | 'Stopped' | 'Delayed';
  sos?: boolean;
}

/**
 * Service to request real-time bus locations from the telematics backend API.
 */
export const fetchBusesLocation = async (): Promise<BusLocationResponse[]> => {
  const response = await fetch("http://localhost:5000/api/buses/location");
  if (!response.ok) {
    throw new Error("Backend server is offline or returned an error.");
  }
  return response.json();
};
