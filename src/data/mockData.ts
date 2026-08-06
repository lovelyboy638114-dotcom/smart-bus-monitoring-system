import { Bus, Driver, Student, Stop, Coordinate } from '../types';

export const SCHOOL_LOCATION: Coordinate = {
  lat: 10.8801,
  lng: 77.0224
};

export const SCHOOL_NAME = "Karpagam College of Engineering";
export const SCHOOL_ADDRESS = "Othakkalmandapam, Coimbatore";

// Helper function to interpolate coordinates for smooth animation
export const interpolatePath = (coords: Coordinate[], steps = 40): Coordinate[] => {
  const path: Coordinate[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const start = coords[i];
    const end = coords[i + 1];
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      path.push({
        lat: start.lat + (end.lat - start.lat) * t,
        lng: start.lng + (end.lng - start.lng) * t
      });
    }
  }
  path.push(coords[coords.length - 1]);
  return path;
};


// Stops Configuration
export const bus1Stops: Stop[] = [
  { name: "Gandhipuram Bus Stand", lat: 11.0168, lng: 76.9674, studentsWaiting: 1, pickupTime: "07:30 AM" },
  { name: "RS Puram", lat: 11.0088, lng: 76.9498, studentsWaiting: 1, pickupTime: "07:45 AM" },
  { name: "Saibaba Colony", lat: 11.0275, lng: 76.9427, studentsWaiting: 1, pickupTime: "08:00 AM" },
  { name: "Vadavalli", lat: 11.0394, lng: 76.9002, studentsWaiting: 1, pickupTime: "08:15 AM" },
  { name: "Thudiyalur", lat: 11.0820, lng: 76.9410, studentsWaiting: 1, pickupTime: "08:30 AM" },
  { name: "Kavundampalayam", lat: 11.0505, lng: 76.9514, studentsWaiting: 1, pickupTime: "08:45 AM" },
  { name: "GN Mills", lat: 11.0570, lng: 76.9445, studentsWaiting: 1, pickupTime: "09:00 AM" },
  { name: "Karpagam College of Engineering", lat: 10.8801, lng: 77.0224, studentsWaiting: 0, pickupTime: "09:20 AM" }
];

export const bus2Stops: Stop[] = [
  { name: "Hope College", lat: 11.0270, lng: 77.0288, studentsWaiting: 1, pickupTime: "07:30 AM" },
  { name: "Peelamedu", lat: 11.0312, lng: 77.0364, studentsWaiting: 1, pickupTime: "07:45 AM" },
  { name: "Singanallur", lat: 10.9985, lng: 77.0273, studentsWaiting: 1, pickupTime: "08:00 AM" },
  { name: "Chinniyampalayam", lat: 11.0205, lng: 77.0488, studentsWaiting: 1, pickupTime: "08:15 AM" },
  { name: "Neelambur", lat: 11.0405, lng: 77.0910, studentsWaiting: 1, pickupTime: "08:30 AM" },
  { name: "Kalapatti", lat: 11.0695, lng: 77.0398, studentsWaiting: 1, pickupTime: "08:45 AM" },
  { name: "Saravanampatti", lat: 11.0825, lng: 76.9994, studentsWaiting: 1, pickupTime: "09:00 AM" },
  { name: "Karpagam College of Engineering", lat: 10.8801, lng: 77.0224, studentsWaiting: 0, pickupTime: "09:20 AM" }
];

export const bus3Stops: Stop[] = [
  { name: "Ukkadam Bus Stand", lat: 10.9925, lng: 76.9616, studentsWaiting: 1, pickupTime: "07:30 AM" },
  { name: "Town Hall", lat: 10.9968, lng: 76.9635, studentsWaiting: 1, pickupTime: "07:45 AM" },
  { name: "Podanur", lat: 10.9725, lng: 76.9715, studentsWaiting: 1, pickupTime: "08:00 AM" },
  { name: "Sundarapuram", lat: 10.9595, lng: 76.9755, studentsWaiting: 1, pickupTime: "08:15 AM" },
  { name: "Kuniyamuthur", lat: 10.9788, lng: 76.9552, studentsWaiting: 1, pickupTime: "08:30 AM" },
  { name: "Eachanari", lat: 10.9060, lng: 76.9865, studentsWaiting: 1, pickupTime: "08:45 AM" },
  { name: "Madukkarai", lat: 10.9055, lng: 76.9550, studentsWaiting: 1, pickupTime: "09:00 AM" },
  { name: "Karpagam College of Engineering", lat: 10.8801, lng: 77.0224, studentsWaiting: 0, pickupTime: "09:20 AM" }
];


