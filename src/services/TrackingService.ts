import { API_BASE_URL } from '../config';

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
  const response = await fetch(`${API_BASE_URL}/api/v1/buses/location`);
  if (!response.ok) {
    throw new Error("Backend server is offline or returned an error.");
  }
  return response.json();
};
