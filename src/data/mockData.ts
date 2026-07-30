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

// Students Lists
export const studentsList: Student[] = [
  // Bus 1 Students
  { id: "ST001", name: "Arjun", assignedBus: "Bus 1", pickupStop: "Gandhipuram Bus Stand", attendance: "Present", parentContact: "+91 98450 12301", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Arjun" },
  { id: "ST002", name: "Kavin", assignedBus: "Bus 1", pickupStop: "RS Puram", attendance: "Present", parentContact: "+91 98450 12302", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Kavin" },
  { id: "ST003", name: "Rahul", assignedBus: "Bus 1", pickupStop: "Saibaba Colony", attendance: "Present", parentContact: "+91 98450 12303", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul" },
  { id: "ST004", name: "Harish", assignedBus: "Bus 1", pickupStop: "Vadavalli", attendance: "Present", parentContact: "+91 98450 12304", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Harish" },
  { id: "ST005", name: "Sanjay", assignedBus: "Bus 1", pickupStop: "Thudiyalur", attendance: "Late", parentContact: "+91 98450 12305", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sanjay" },
  { id: "ST006", name: "Vignesh", assignedBus: "Bus 1", pickupStop: "Kavundampalayam", attendance: "Present", parentContact: "+91 98450 12306", status: "Waiting", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Vignesh" },
  { id: "ST007", name: "Praveen", assignedBus: "Bus 1", pickupStop: "GN Mills", attendance: "Not Checked In", parentContact: "+91 98450 12307", status: "Waiting", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Praveen" },

  // Bus 2 Students
  { id: "ST008", name: "Dinesh", assignedBus: "Bus 2", pickupStop: "Hope College", attendance: "Present", parentContact: "+91 98450 12308", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Dinesh" },
  { id: "ST009", name: "Naveen", assignedBus: "Bus 2", pickupStop: "Peelamedu", attendance: "Present", parentContact: "+91 98450 12309", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Naveen" },
  { id: "ST010", name: "Ajay", assignedBus: "Bus 2", pickupStop: "Singanallur", attendance: "Absent", parentContact: "+91 98450 12310", status: "Not Boarded", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Ajay" },
  { id: "ST011", name: "Bharath", assignedBus: "Bus 2", pickupStop: "Chinniyampalayam", attendance: "Present", parentContact: "+91 98450 12311", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Bharath" },
  { id: "ST012", name: "Manoj", assignedBus: "Bus 2", pickupStop: "Neelambur", attendance: "Present", parentContact: "+91 98450 12312", status: "Waiting", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Manoj" },
  { id: "ST013", name: "Vishal", assignedBus: "Bus 2", pickupStop: "Kalapatti", attendance: "Not Checked In", parentContact: "+91 98450 12313", status: "Waiting", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Vishal" },
  { id: "ST014", name: "Surya", assignedBus: "Bus 2", pickupStop: "Saravanampatti", attendance: "Present", parentContact: "+91 98450 12314", status: "Waiting", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Surya" },

  // Bus 3 Students
  { id: "ST015", name: "Karthik", assignedBus: "Bus 3", pickupStop: "Ukkadam Bus Stand", attendance: "Present", parentContact: "+91 98450 12315", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Karthik" },
  { id: "ST016", name: "Akash", assignedBus: "Bus 3", pickupStop: "Town Hall", attendance: "Present", parentContact: "+91 98450 12316", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Akash" },
  { id: "ST017", name: "Gokul", assignedBus: "Bus 3", pickupStop: "Podanur", attendance: "Present", parentContact: "+91 98450 12317", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Gokul" },
  { id: "ST018", name: "Nithin", assignedBus: "Bus 3", pickupStop: "Sundarapuram", attendance: "Present", parentContact: "+91 98450 12318", status: "On Board", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Nithin" },
  { id: "ST019", name: "Ramesh", assignedBus: "Bus 3", pickupStop: "Kuniyamuthur", attendance: "Late", parentContact: "+91 98450 12319", status: "Waiting", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Ramesh" },
  { id: "ST020", name: "Saran", assignedBus: "Bus 3", pickupStop: "Eachanari", attendance: "Present", parentContact: "+91 98450 12320", status: "Waiting", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Saran" },
  { id: "ST021", name: "Ashwin", assignedBus: "Bus 3", pickupStop: "Madukkarai", attendance: "Present", parentContact: "+91 98450 12321", status: "Waiting", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Ashwin" }
];

// Drivers List
export const driversList: Driver[] = [
  { name: "Murugan", phone: "+91 94432 10001", licenseNumber: "DL-TN38AB2021M", busNumber: "Bus 1", experience: 12, avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Murugan" },
  { name: "Suresh", phone: "+91 94432 10002", licenseNumber: "DL-TN38CD2022S", busNumber: "Bus 2", experience: 9, avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Suresh" },
  { name: "Ravi", phone: "+91 94432 10003", licenseNumber: "DL-TN38EP2018R", busNumber: "Bus 3", experience: 15, avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Ravi" }
];

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

// Compile Buses Details
export const busesList: Bus[] = [
  {
    id: "Bus 1",
    driverName: "Murugan",
    routeNumber: "R-01 (North Loop)",
    status: "Running",
    speed: 48,
    eta: "14 mins",
    battery: 92,
    currentStopIndex: 2,
    path: interpolatePath(bus1Stops),
    stops: bus1Stops,
    color: "#2563eb", // Blue
    students: studentsList.filter(s => s.assignedBus === "Bus 1")
  },
  {
    id: "Bus 2",
    driverName: "Suresh",
    routeNumber: "R-02 (East Loop)",
    status: "Running",
    speed: 52,
    eta: "18 mins",
    battery: 88,
    currentStopIndex: 1,
    path: interpolatePath(bus2Stops),
    stops: bus2Stops,
    color: "#16a34a", // Green
    students: studentsList.filter(s => s.assignedBus === "Bus 2")
  },
  {
    id: "Bus 3",
    driverName: "Ravi",
    routeNumber: "R-03 (South Loop)",
    status: "Running",
    speed: 38,
    eta: "22 mins",
    battery: 95,
    currentStopIndex: 3,
    path: interpolatePath(bus3Stops),
    stops: bus3Stops,
    color: "#dc2626", // Red
    students: studentsList.filter(s => s.assignedBus === "Bus 3")
  }
];

// Initial Live System Alerts Logs
export const initialNotifications = [
  { id: "1", message: "Bus 1 reached Gandhipuram stop on schedule.", type: "success" as const, timestamp: "09:10 AM" },
  { id: "2", message: "Bus 2 reached Peelamedu stop on schedule.", type: "success" as const, timestamp: "09:12 AM" },
  { id: "3", message: "Bus 3 approaching Eachanari Junction.", type: "info" as const, timestamp: "09:14 AM" },
  { id: "4", message: "Student ST001 (Arjun) checked in and boarded Bus 1.", type: "info" as const, timestamp: "09:15 AM" },
  { id: "5", message: "Overspeed warning triggered for Bus 2 (52 km/h in 40 zone).", type: "warning" as const, timestamp: "09:16 AM" }
];
