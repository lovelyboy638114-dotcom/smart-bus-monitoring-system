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


// Stops Configuration matching SafeBus Database Routes
// Route A (Ukkadam Loop) - Bus TN38AB1234
export const bus1Stops: Stop[] = [
  { name: "Ukkadam Bus Stand", lat: 10.9925, lng: 76.9616, studentsWaiting: 1, pickupTime: "07:30 AM" },
  { name: "Sundarapuram", lat: 10.9595, lng: 76.9755, studentsWaiting: 1, pickupTime: "07:45 AM" },
  { name: "Eachanari", lat: 10.9060, lng: 76.9865, studentsWaiting: 1, pickupTime: "08:00 AM" },
  { name: "Karpagam Signal", lat: 10.8985, lng: 76.9950, studentsWaiting: 1, pickupTime: "08:15 AM" },
  { name: "Malumichampatti", lat: 10.8872, lng: 77.0015, studentsWaiting: 1, pickupTime: "08:30 AM" },
  { name: "Othakalmandapam", lat: 10.8750, lng: 77.0120, studentsWaiting: 2, pickupTime: "08:45 AM" },
  { name: "Karpagam College of Engineering", lat: 10.8801, lng: 77.0224, studentsWaiting: 0, pickupTime: "09:00 AM" }
];

// Route B (Pollachi Loop) - Bus TN38CD5678
export const bus2Stops: Stop[] = [
  { name: "Pollachi Bus Stand", lat: 10.6580, lng: 77.0090, studentsWaiting: 1, pickupTime: "07:15 AM" },
  { name: "Achipatti", lat: 10.6850, lng: 77.0125, studentsWaiting: 1, pickupTime: "07:30 AM" },
  { name: "Kovilpalayam", lat: 10.7250, lng: 77.0160, studentsWaiting: 1, pickupTime: "07:45 AM" },
  { name: "Thamaraikulam", lat: 10.7600, lng: 77.0180, studentsWaiting: 1, pickupTime: "08:00 AM" },
  { name: "Kinathukadavu", lat: 10.8170, lng: 77.0205, studentsWaiting: 1, pickupTime: "08:15 AM" },
  { name: "Millgate", lat: 10.8450, lng: 77.0215, studentsWaiting: 1, pickupTime: "08:30 AM" },
  { name: "Myleripalayam", lat: 10.8650, lng: 77.0220, studentsWaiting: 1, pickupTime: "08:45 AM" },
  { name: "Karpagam College of Engineering", lat: 10.8801, lng: 77.0224, studentsWaiting: 0, pickupTime: "09:00 AM" }
];

// Route C (Singanallur Loop) - Bus TN38EP9012
export const bus3Stops: Stop[] = [
  { name: "Singanallur", lat: 10.9985, lng: 77.0273, studentsWaiting: 1, pickupTime: "07:20 AM" },
  { name: "Ondipudur", lat: 10.9940, lng: 77.0580, studentsWaiting: 1, pickupTime: "07:35 AM" },
  { name: "Pattanam Pirivu", lat: 10.9650, lng: 77.0650, studentsWaiting: 1, pickupTime: "07:50 AM" },
  { name: "Chinthamanipudur", lat: 10.9420, lng: 77.0610, studentsWaiting: 1, pickupTime: "08:10 AM" },
  { name: "Chettipalayam", lat: 10.9020, lng: 77.0420, studentsWaiting: 2, pickupTime: "08:30 AM" },
  { name: "Karpagam College of Engineering", lat: 10.8801, lng: 77.0224, studentsWaiting: 0, pickupTime: "09:00 AM" }
];


