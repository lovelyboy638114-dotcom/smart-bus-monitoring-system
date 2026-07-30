export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Stop {
  name: string;
  lat: number;
  lng: number;
  studentsWaiting: number;
  pickupTime: string;
}

export interface Student {
  id: string;
  name: string;
  assignedBus: string;
  pickupStop: string;
  attendance: 'Present' | 'Absent' | 'Late' | 'Not Checked In';
  parentContact: string;
  status: 'Waiting' | 'On Board' | 'Dropped' | 'Not Boarded';
  avatarUrl: string;
}

export interface Driver {
  name: string;
  phone: string;
  licenseNumber: string;
  busNumber: string;
  experience: number;
  avatarUrl: string;
}

export interface Bus {
  id: string;
  driverName: string;
  routeNumber: string;
  status: 'Running' | 'Stopped' | 'Delayed';
  speed: number; // km/h
  eta: string; // e.g. "12 mins"
  battery: number; // %
  currentStopIndex: number;
  path: Coordinate[];
  stops: Stop[];
  color: string;
  students: Student[];
  currentLocation?: Coordinate;
  heading?: number;
  sos?: boolean;
  deviation?: boolean;
}

export interface SystemNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}
