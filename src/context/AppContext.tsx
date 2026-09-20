import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Coordinate, Bus, Student, Stop, SystemNotification } from '../types';
import { io } from 'socket.io-client';
import { 
  interpolatePath, 
  SCHOOL_LOCATION,
  bus1Stops,
  bus2Stops,
  bus3Stops
} from '../data/mockData';
import { getDistanceKm, checkRouteDeviation, calculateBearing } from '../services/GPSService';
import { API_BASE_URL } from '../config';

interface AppContextType {
  buses: Bus[];
  setBuses: React.Dispatch<React.SetStateAction<Bus[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  notifications: SystemNotification[];
  simTime: string;
  userRole: string | null;
  setUserRole: (role: string | null, customFullName?: string) => void;
  user: { username: string; role: string; fullName: string } | null;
  setUser: React.Dispatch<React.SetStateAction<{ username: string; role: string; fullName: string } | null>>;
  parentSelfStudentId: string;
  setParentSelfStudentId: (id: string) => void;
  triggerNotification: (
    message: string, 
    type: 'info' | 'warning' | 'error' | 'success',
    meta?: {
      id?: string;
      targetRole?: 'ALL' | 'ADMIN' | 'PARENT' | 'DRIVER';
      category?: 'ATTENDANCE' | 'ATTENDANCE_SUMMARY' | 'BUS_ARRIVAL' | 'DRIVER_INCIDENT' | 'DRIVER_ANALYSIS' | 'SOS' | 'OPERATIONAL';
      studentId?: string;
      busId?: string;
      whatsappUrl?: string;
      parentPhone?: string;
    }
  ) => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  resetSimulation: () => void;
  driverMessages: any[];
  setDriverMessages: React.Dispatch<React.SetStateAction<any[]>>;
  driverComplaints: any[];
  setDriverComplaints: React.Dispatch<React.SetStateAction<any[]>>;
  sendDriverMessage: (studentId: string, studentName: string, status: string, message: string) => void;
  submitComplaint: (parentName: string, studentName: string, driverName: string, busId: string, complaintText: string) => void;
  handleStudentBoarding: (studentId: string, boardingType: string, skipApi?: boolean) => void;
  updateStudentProfile: (studentId: string, profileData: { bloodGroup: string, address: string, medicalNotes: string }) => Promise<void>;
  
  // Live Tracking Fields
  selectedBusId: string | null;
  setSelectedBusId: (id: string | null) => void;
  toggleBusDeviation: (busId: string) => void;
  updateBusTripStatus: (busId: string, status: 'Running' | 'Stopped' | 'Delayed' | 'On Route' | 'Idle') => void;
  toggleBusSOS: (busId: string) => void;
  
  // SOS Emergency Fields
  activeSOSAlerts: any[];
  sosStatistics: any;
  triggerSOSAlert: (payload: any) => Promise<any>;
  acknowledgeSOSAlert: (sosId: string) => Promise<void>;
  resolveSOSAlert: (sosId: string, remarks: string) => Promise<void>;

  // Driver Behavior & Status
  driverBehavior: any;
  allDriverBehaviors: Record<string, any>;
  backendConnected: boolean;
  socketConnected: boolean;
  advanceLocalBusSimulation: (busId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Simulation schedule parameters
const BUS_SCHEDULES = {
  "Bus 1": { startMin: 7 * 60 + 20, arriveMin: 8 * 60 + 3 },
  "Bus 2": { startMin: 7 * 60 + 22, arriveMin: 8 * 60 + 5 },
  "Bus 3": { startMin: 7 * 60 + 25, arriveMin: 8 * 60 + 8 }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & Profile States
  const [user, setUser] = useState<{ username: string; role: string; fullName: string } | null>(() => {
    const token = localStorage.getItem('safebus_token');
    const role = localStorage.getItem('safebus_user_role');
    const username = localStorage.getItem('safebus_user_username');
    const fullName = localStorage.getItem('safebus_user_fullname') || '';
    if (token && role && username) {
      return { username, role: role.toUpperCase(), fullName };
    }
    return null;
  });

  const userRole = user?.role ? user.role.toUpperCase() : null;

  const setUserRole = (role: string | null, customFullName?: string) => {
    if (role) {
      const username = localStorage.getItem('safebus_user_username') || '';
      const fullName = customFullName !== undefined ? customFullName : (localStorage.getItem('safebus_user_fullname') || '');
      const updatedRole = role.toUpperCase();
      if (customFullName) {
        localStorage.setItem('safebus_user_fullname', customFullName);
      }
      setUser({ username, role: updatedRole, fullName });
      localStorage.setItem('safebus_user_role', updatedRole);
    } else {
      setUser(null);
      localStorage.removeItem('safebus_user_role');
      localStorage.removeItem('safebus_user_username');
      localStorage.removeItem('safebus_token');
      localStorage.removeItem('safebus_user_fullname');
      localStorage.removeItem('safebus_parent_id');
      localStorage.removeItem('safebus_user_phone');
    }
  };
  const [parentSelfStudentId, setParentSelfStudentId] = useState<string>("");

  // Telematics States
  const [buses, setBuses] = useState<Bus[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Ref to track driver incident sessions and enforce STRICT MAX 2 notifications per incident
  const driverIncidentTrackerRef = useRef<Record<string, { count: number; firstTime: number; lastTime: number }>>({});

  // Automatically purge any stale NORMAL or ATTENTIVE notifications from state,
  // strictly cap existing drowsiness notifications to maximum 2 per bus,
  // and purge parent notifications if current role is DRIVER!
  useEffect(() => {
    setNotifications(prev => {
      const busDrowsyCount: Record<string, number> = {};
      return prev.filter(n => {
        const up = (n.message || '').toUpperCase();
        if (up.includes("NORMAL") || up.includes("ATTENTIVE") || up.includes("NO DRIVER FACE")) {
          return false;
        }
        if (userRole === 'DRIVER') {
          if (
            n.targetRole === 'PARENT' ||
            n.category === 'ATTENDANCE' ||
            n.category === 'ATTENDANCE_SUMMARY' ||
            up.includes("PARENT NOTIFICATION") ||
            up.includes("HAS BOARDED") ||
            up.includes("REACHED SCHOOL") ||
            up.includes("DROPPED AT") ||
            up.includes("ATTENDANCE:") ||
            up.includes("STRENGTH:") ||
            up.includes("WHATSAPP")
          ) {
            return false;
          }
        }
        if (n.category === 'DRIVER_INCIDENT' || up.includes("DROWSINESS") || up.includes("DROWSY")) {
          const bId = n.busId || 'TN38AB1234';
          busDrowsyCount[bId] = (busDrowsyCount[bId] || 0) + 1;
          if (busDrowsyCount[bId] > 2) {
            return false; // Drop any historical bloated logs beyond 2!
          }
        }
        return true;
      });
    });
  }, [userRole]);

  // Driver Behavior & Backend Status States
  const [driverBehavior, setDriverBehavior] = useState<any>({
    drowsiness: false,
    yawning: false,
    distraction: false,
    mobileUsage: false,
    smoking: false,
    seatbelt: true,
    safetyScore: 95
  });
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [allDriverBehaviors, setAllDriverBehaviors] = useState<Record<string, any>>({});
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  const mapDbBusToFrontendBus = (dbBus: any, allStudents: Student[]): Bus => {
    let stops = bus1Stops;
    let color = "#2563eb"; // Blue for Route A (Ukkadam)
    let routeNumber = dbBus.route || "Route A (Ukkadam)";
    
    if (dbBus.id === "TN38AB1234" || dbBus.id === "Bus 1") {
      stops = bus1Stops; // Route A (Ukkadam Loop)
      color = "#2563eb"; // Blue
      routeNumber = dbBus.route || "Route A (Ukkadam)";
    } else if (dbBus.id === "TN38CD5678" || dbBus.id === "Bus 2") {
      stops = bus2Stops; // Route B (Pollachi Loop)
      color = "#16a34a"; // Green
      routeNumber = dbBus.route || "Route B (Pollachi)";
    } else if (dbBus.id === "TN38EP9012" || dbBus.id === "Bus 3") {
      stops = bus3Stops; // Route C (Singanallur Loop)
      color = "#dc2626"; // Red
      routeNumber = dbBus.route || "Route C (Singanallur)";
    }
    
    const path = interpolatePath(stops);
    const busStudents = allStudents.filter(s =>
      s.assignedBus === dbBus.id ||
      s.busId === dbBus.id ||
      s.assignedBus === (dbBus.id === "TN38AB1234" ? "Bus 1" : dbBus.id === "TN38CD5678" ? "Bus 2" : "Bus 3")
    );

    return {
      id: dbBus.id,
      driverName: dbBus.driver,
      routeNumber: routeNumber,
      status: (dbBus.status === "On Route" ? "Running" : dbBus.status) as any || "Stopped",
      speed: dbBus.speed || 0,
      eta: dbBus.eta || "--",
      battery: 92,
      currentStopIndex: dbBus.currentStopIndex || 0,
      path: path,
      stops: stops,
      color: color,
      students: busStudents,
      deviation: Boolean(dbBus.deviation),
      sos: Boolean(dbBus.sos),
      currentLocation: dbBus.latitude && dbBus.longitude ? { lat: dbBus.latitude, lng: dbBus.longitude } : undefined,
      heading: dbBus.heading || 0
    };
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('safebus_token');
        const role = localStorage.getItem('safebus_user_role');
        let currentParentId = localStorage.getItem('safebus_parent_id');
        let currentParentPhone = localStorage.getItem('safebus_user_phone');

        if (role?.toLowerCase() === 'parent' && token && (!currentParentId || !currentParentPhone)) {
          try {
            const parentRes = await fetch(`${API_BASE_URL}/api/v1/students/parent/profile`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            const parentJson = await parentRes.json();
            if (parentRes.ok && parentJson.success && parentJson.data) {
              const parent = parentJson.data;
              localStorage.setItem('safebus_parent_id', String(parent.id));
              localStorage.setItem('safebus_user_phone', parent.phone);
              currentParentId = String(parent.id);
              currentParentPhone = parent.phone;
              console.log("[AppContext] Restored Parent Profile details. ID:", parent.id);
            }
          } catch (err) {
            console.error("[AppContext] Failed to restore parent profile details:", err);
          }
        }

        const studentsRes = await fetch(`${API_BASE_URL}/api/v1/students`);
        const studentsData = await studentsRes.json();
        
        let mappedStudents: Student[] = [];
        if (Array.isArray(studentsData)) {
          const busIdMapping: Record<string, string> = {
            "TN38AB1234": "Bus 1",
            "TN38CD5678": "Bus 2",
            "TN38EP9012": "Bus 3"
          };
          const stopNamesMapping: Record<string, string> = {
            // New database stops (IDs 118-138)
            "118": "Ukkadam Bus Stand",
            "119": "Sundarapuram",
            "120": "Eachanari",
            "121": "Karpagam Signal",
            "122": "Malumichampatti",
            "123": "Othakalmandapam",
            "124": "Karpagam College of Engineering",
            "125": "Pollachi Bus Stand",
            "126": "Achipatti",
            "127": "Kovilpalayam",
            "128": "Thamaraikulam",
            "129": "Kinathukadavu",
            "130": "Millgate",
            "131": "Myleripalayam",
            "132": "Karpagam College of Engineering",
            "133": "Singanallur",
            "134": "Ondipudur",
            "135": "Pattanam Pirivu",
            "136": "Chinthamanipudur",
            "137": "Chettipalayam",
            "138": "Karpagam College of Engineering",
            // Legacy fallbacks
            "1": "Gandhipuram Bus Stand",
            "2": "RS Puram",
            "3": "Saibaba Colony",
            "4": "Vadavalli",
            "5": "Thudiyalur",
            "6": "Kavundampalayam",
            "7": "GN Mills",
            "8": "Hope College",
            "9": "Peelamedu",
            "10": "Singanallur",
            "11": "Chinniyampalayam",
            "12": "Neelambur",
            "13": "Kalapatti",
            "14": "Saravanampatti",
            "15": "Ukkadam Bus Stand",
            "16": "Town Hall",
            "17": "Podanur",
            "18": "Sundarapuram",
            "19": "Kuniyamuthur",
            "20": "Eachanari",
            "21": "Madukkarai"
          };

          mappedStudents = studentsData.map((s: any) => ({
            id: s.id,
            name: s.name,
            rollNo: s.rollNo || s.id,
            busId: s.busId || s.bus_id || "",
            assignedBus: busIdMapping[s.busId] || s.busId || "Bus 1",
            pickupStop: stopNamesMapping[String(s.pickupStopId)] || stopNamesMapping[String(s.pickup_stop_id)] || s.address || s.pickupStopId || s.pickup_stop_id || "Ukkadam Bus Stand",
            attendance: (s.boarded === 1 || s.boarded === true || s.boardedReturn === 1 || s.boardedReturn === true || s.status === 'Present' || s.status === 'On Board') ? "Present" : "Absent",
            morningAttendance: (s.boarded === 1 || s.boarded === true || s.status === 'On Board' || s.reachedSchool === 1 || s.reachedSchool === true) ? "Present" : "Absent",
            returnAttendance: (s.boardedReturn === 1 || s.boardedReturn === true || s.status === 'Returning' || s.reachedHome === 1 || s.reachedHome === true) ? "Present" : "Absent",
            parentContact: s.parentPhone || "",
            parentName: s.parentName || "",
            parentId: s.parentId,
            status: s.status || (s.boarded === 1 || s.boarded === true ? 'Present' : 'Absent'),
            avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.name}`,
            bloodGroup: s.bloodGroup || "",
            address: s.address || "",
            medicalNotes: s.medicalNotes || "",
            school_email: s.schoolEmail || s.school_email || "",
            class: s.className || s.class || "Grade 10",
            id_card_front_path: s.idCardFrontPath || s.id_card_front_path,
            id_card_back_path: s.idCardBackPath || s.id_card_back_path,
            id_card_pdf_path: s.idCardPdfPath || s.id_card_pdf_path,
            id_card_version: s.idCardVersion || s.id_card_version,
            id_card_status: s.idCardStatus || s.id_card_status,
            pickup_distance: s.pickupDistance !== undefined ? s.pickupDistance : s.pickup_distance,
            assignment_status: s.assignmentStatus || s.assignment_status,
            assigned_at: s.assignedAt || s.assigned_at,
            boarded: s.boarded === 1 || s.boarded === true,
            boardedTime: s.boardedTime,
            reachedSchool: s.reachedSchool === 1 || s.reachedSchool === true,
            boardedReturn: s.boardedReturn === 1 || s.boardedReturn === true,
            returnBoardedTime: s.returnBoardedTime || null,
            reachedHome: s.reachedHome === 1 || s.reachedHome === true,
          }));
          setStudents(mappedStudents);
          
          // Auto-initialize parentSelfStudentId for logged-in parents
          const pId = currentParentId || localStorage.getItem('safebus_parent_id');
          const pPhone = currentParentPhone || localStorage.getItem('safebus_user_phone');
          const children = mappedStudents.filter(s => {
            if (pId && s.parentId === Number(pId)) return true;
            if (pPhone && s.parentContact && s.parentContact.replace(/\s+/g, '') === pPhone.replace(/\s+/g, '')) return true;
            return false;
          });
          if (children.length > 0) {
            setParentSelfStudentId(children[0].id);
          }
        }

        const busesRes = await fetch(`${API_BASE_URL}/api/v1/buses`);
        const busesData = await busesRes.json();
        if (Array.isArray(busesData)) {
          setBuses(busesData.map((b: any) => mapDbBusToFrontendBus(b, mappedStudents)));
        }
      } catch (err) {
        console.error("Failed to load initial database records: ", err);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (userRole?.toLowerCase() === 'parent' && students.length > 0) {
      const parentId = localStorage.getItem('safebus_parent_id');
      const parentPhone = localStorage.getItem('safebus_user_phone');
      
      let child = null;
      if (parentId) {
        child = students.find(s => s.parentId === Number(parentId));
      }
      if (!child && parentPhone) {
        child = students.find(s => s.parentContact && s.parentContact.replace(/\s+/g, '') === parentPhone.replace(/\s+/g, ''));
      }
      
      if (child) {
        setParentSelfStudentId(child.id);
      }
    }
  }, [userRole, students]);

  const [selectedBusId, setSelectedBusId] = useState<string | null>("all");
  const [isTrackingLive, setIsTrackingLive] = useState<boolean>(false);
  
  // Simulation Clock (starts at 7:18 AM)
  const [simMinutes, setSimMinutes] = useState<number>(7 * 60 + 18);
  const [simTime, setSimTime] = useState<string>("07:18 AM");

  // Sub-modules state
  const [driverMessages, setDriverMessages] = useState<any[]>([]);
  const [driverComplaints, setDriverComplaints] = useState<any[]>([]);

  // Simulation ref flags to prevent duplicate triggers
  const alertsSentRef = useRef<Record<string, boolean>>({});
  const studentsRef = useRef(students);
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  // SOS Emergency Response system states and functions
  const [activeSOSAlerts, setActiveSOSAlerts] = useState<any[]>([]);
  const [sosStatistics, setSosStatistics] = useState<any>(null);
  const socketRef = useRef<any>(null);

  // play dynamic alarm sound using Web Audio Context to bypass file loading requirements
  const playEmergencyAlarmSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(600, ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(900, ctx.currentTime + 1.0);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(500, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 2.0);
      osc2.stop(ctx.currentTime + 2.0);
    } catch (e) {
      console.error("Audio context sound playback restricted: ", e);
    }
  };

  const fetchActiveSOS = () => {
    fetch(`${API_BASE_URL}/api/v1/sos/active`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActiveSOSAlerts(data);
        }
      })
      .catch(err => console.error("Active alerts sync failure: ", err));
  };

  const fetchSOSStats = () => {
    fetch(`${API_BASE_URL}/api/v1/sos/statistics`)
      .then(res => res.json())
      .then(data => {
        setSosStatistics(data);
      })
      .catch(err => console.error("Stats sync failure: ", err));
  };

  const triggerSOSAlert = async (payload: any) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/sos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to trigger emergency SOS.");
    }
    fetchActiveSOS();
    fetchSOSStats();
    return data.sos;
  };

  const acknowledgeSOSAlert = async (sosId: string) => {
    const username = localStorage.getItem("safebus_username") || "Admin Portal";
    const res = await fetch(`${API_BASE_URL}/api/v1/sos/${sosId}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to acknowledge SOS.");
    }
    fetchActiveSOS();
    fetchSOSStats();
  };

  const resolveSOSAlert = async (sosId: string, remarks: string) => {
    const username = localStorage.getItem("safebus_username") || "Admin Portal";
    const res = await fetch(`${API_BASE_URL}/api/v1/sos/${sosId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, remarks })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to resolve SOS.");
    }
    fetchActiveSOS();
    fetchSOSStats();
  };

  // Helper to convert minutes from midnight to formatted AM/PM string
  const formatSimTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const dispHours = hours % 12 === 0 ? 12 : hours % 12;
    const dispMins = mins < 10 ? `0${mins}` : mins;
    return `${dispHours < 10 ? `0${dispHours}` : dispHours}:${dispMins} ${ampm}`;
  };

  // Trigger notification logs with role & category scope enforcement
  const triggerNotification = (
    message: string, 
    type: 'info' | 'warning' | 'error' | 'success',
    meta?: {
      id?: string;
      targetRole?: 'ALL' | 'ADMIN' | 'PARENT' | 'DRIVER';
      category?: 'ATTENDANCE' | 'ATTENDANCE_SUMMARY' | 'BUS_ARRIVAL' | 'DRIVER_INCIDENT' | 'DRIVER_ANALYSIS' | 'SOS' | 'OPERATIONAL';
      studentId?: string;
      busId?: string;
      whatsappUrl?: string;
      parentPhone?: string;
    }
  ) => {
    let category = meta?.category;
    let targetRole = meta?.targetRole;

    const upperMsg = message.toUpperCase();

    // CRITICAL: Normal detections and attentiveness must NEVER generate notifications!
    if (upperMsg.includes("NORMAL") || upperMsg.includes("ATTENTIVE") || upperMsg.includes("NO DRIVER FACE")) {
      return;
    }

    if (!category) {
      if (upperMsg.includes("DRIVER ALERT") || upperMsg.includes("DROWSY") || upperMsg.includes("FATIGUE") || upperMsg.includes("DISTRACT")) {
        category = 'DRIVER_INCIDENT';
        targetRole = 'ADMIN';
      } else if (upperMsg.includes("SOS") || upperMsg.includes("EMERGENCY")) {
        category = 'SOS';
        targetRole = targetRole || 'ADMIN';
      } else if (upperMsg.includes("ATTENDANCE:") || upperMsg.includes("STRENGTH:")) {
        category = 'ATTENDANCE_SUMMARY';
        targetRole = targetRole || 'ADMIN';
      } else if (upperMsg.includes("ATTENDANCE") || upperMsg.includes("BOARDED") || upperMsg.includes("DROPPED") || upperMsg.includes("REACHED SCHOOL")) {
        category = 'ATTENDANCE';
      } else if (upperMsg.includes("ARRIVED AT") || upperMsg.includes("ARRIVING") || upperMsg.includes("APPROXIMATELY") || upperMsg.includes("KM AWAY")) {
        category = 'BUS_ARRIVAL';
      } else {
        category = 'OPERATIONAL';
      }
    }

    // Driver alerts are strictly and exclusively for ADMIN ONLY:
    if (category === 'DRIVER_INCIDENT' || category === 'DRIVER_ANALYSIS') {
      if (userRole !== 'ADMIN') {
        return;
      }
    }

    // STRICT USER REQUIREMENT: "for just one time drowzeness detection 9 notification had came this much is not required just 2 notification is enough"
    // Enforce STRICT MAX 2 notifications per continuous driver incident session per bus
    let resolvedNotifId = meta?.id;
    if (category === 'DRIVER_INCIDENT') {
      const busKey = meta?.busId || 'TN38AB1234';
      const isDistract = upperMsg.includes('DISTRACT') || upperMsg.includes('AWAY');
      const incType = isDistract ? 'DISTRACTION' : 'DROWSINESS';
      const sessionKey = `${busKey}-${incType}`;
      const now = Date.now();
      const session = driverIncidentTrackerRef.current[sessionKey];

      if (!session || (now - session.lastTime > 45000)) {
        // Notification #1: Initial Alert on buzzer activation
        driverIncidentTrackerRef.current[sessionKey] = {
          count: 1,
          firstTime: now,
          lastTime: now
        };
        resolvedNotifId = `driver-alert-${busKey}-${incType.toLowerCase()}-1`;
      } else if (session.count === 1) {
        // Notification #2: Follow-up Reminder only after at least 5s of persisting condition
        if (now - session.firstTime >= 5000) {
          session.count = 2;
          session.lastTime = now;
          resolvedNotifId = `driver-alert-${busKey}-${incType.toLowerCase()}-2`;
        } else {
          // Less than 5 seconds since #1; drop duplicate burst
          return;
        }
      } else {
        // session.count >= 2: STRICT USER CONSTRAINT: "just 2 notification is enough"
        // Suppress any 3rd, 4th, ... 9th notification!
        session.lastTime = now;
        return;
      }
    }

    // Strict Parent Security Gate:
    // If current user is PARENT, suppress all driver incidents, driver analysis, SOS, aggregate summaries, and attendance for other children
    if (userRole === 'PARENT') {
      if (category === 'DRIVER_INCIDENT' || category === 'DRIVER_ANALYSIS' || category === 'SOS' || category === 'ATTENDANCE_SUMMARY' || category === 'OPERATIONAL' || targetRole === 'ADMIN' || targetRole === 'DRIVER') {
        return;
      }
      if (upperMsg.includes("DRIVER") || upperMsg.includes("DROWSY") || upperMsg.includes("FATIGUE") || upperMsg.includes("DISTRACT") || upperMsg.includes("SOS EMERGENCY") || upperMsg.includes("CRITICAL SOS") || upperMsg.includes("ATTENDANCE:") || upperMsg.includes("STRENGTH:")) {
        return;
      }
      if (category === 'ATTENDANCE' && meta?.studentId) {
        const pId = localStorage.getItem('safebus_parent_id');
        const pPhone = localStorage.getItem('safebus_user_phone');
        const isChild = (studentsRef.current || students).some(s =>
          s.id === meta.studentId && (
            (pId && String(s.parentId) === String(pId)) ||
            (pPhone && s.parentContact && s.parentContact.replace(/\s+/g, '') === pPhone.replace(/\s+/g, '')) ||
            s.id === parentSelfStudentId
          )
        );
        if (!isChild) return;
      }
    }

    // Strict Admin Gate:
    // If current user is ADMIN, suppress individual student attendance notifications (only show aggregate summaries)
    if (userRole === 'ADMIN') {
      if (category === 'ATTENDANCE' && meta?.studentId && category !== 'ATTENDANCE_SUMMARY') {
        return;
      }
      if (targetRole === 'PARENT') {
        return;
      }
    }

    // Strict Driver Gate:
    // User Requirement: "in driver dashboarsd parent notification is comming this parent notification should not come to driver"
    // Drivers must NEVER receive parent notifications (boarding alerts, student reaches school, attendance summaries, parent WhatsApp notices)
    if (userRole === 'DRIVER') {
      if (
        targetRole === 'PARENT' ||
        category === 'ATTENDANCE' ||
        category === 'ATTENDANCE_SUMMARY'
      ) {
        return;
      }
      if (
        upperMsg.includes("PARENT NOTIFICATION") ||
        upperMsg.includes("HAS BOARDED") ||
        upperMsg.includes("REACHED SCHOOL") ||
        upperMsg.includes("DROPPED AT") ||
        upperMsg.includes("ATTENDANCE:") ||
        upperMsg.includes("STRENGTH:") ||
        upperMsg.includes("WHATSAPP")
      ) {
        return;
      }
    }

    const timeStr = formatSimTime(simMinutes);
    const notifId = resolvedNotifId || meta?.id || (category === 'ATTENDANCE_SUMMARY' && meta?.busId ? `summary-${meta.busId}` : String(Date.now() + Math.random()));

    const newNotif: SystemNotification = {
      id: notifId,
      message,
      type,
      timestamp: timeStr,
      targetRole: targetRole || 'ALL',
      category,
      studentId: meta?.studentId,
      busId: meta?.busId,
      whatsappUrl: meta?.whatsappUrl,
      parentPhone: meta?.parentPhone
    };

    setNotifications(prev => {
      // Upsert: if notification with same id exists (e.g. aggregate summary), update it in place
      const existingIdx = prev.findIndex(n => n.id === notifId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          message,
          type,
          timestamp: timeStr,
          busId: meta?.busId || updated[existingIdx].busId
        };
        return updated;
      }
      return [newNotif, ...prev];
    });
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Reset Simulation back to starting coordinates and time
  const resetSimulation = () => {
    setSimMinutes(7 * 60 + 18);
    setSimTime("07:18 AM");
    // Fetch fresh copy of students and buses from backend
    fetch(`${API_BASE_URL}/api/v1/students`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const busIdMapping: Record<string, string> = {
            "TN38AB1234": "Bus 1",
            "TN38CD5678": "Bus 2",
            "TN38EP9012": "Bus 3"
          };
          const stopNamesMapping: Record<string, string> = {
            // New database stops (IDs 118-138)
            "118": "Ukkadam Bus Stand",
            "119": "Sundarapuram",
            "120": "Eachanari",
            "121": "Karpagam Signal",
            "122": "Malumichampatti",
            "123": "Othakalmandapam",
            "124": "Karpagam College of Engineering",
            "125": "Pollachi Bus Stand",
            "126": "Achipatti",
            "127": "Kovilpalayam",
            "128": "Thamaraikulam",
            "129": "Kinathukadavu",
            "130": "Millgate",
            "131": "Myleripalayam",
            "132": "Karpagam College of Engineering",
            "133": "Singanallur",
            "134": "Ondipudur",
            "135": "Pattanam Pirivu",
            "136": "Chinthamanipudur",
            "137": "Chettipalayam",
            "138": "Karpagam College of Engineering",
            // Legacy fallbacks
            "1": "Gandhipuram Bus Stand",
            "2": "RS Puram",
            "3": "Saibaba Colony",
            "4": "Vadavalli",
            "5": "Thudiyalur",
            "6": "Kavundampalayam",
            "7": "GN Mills",
            "8": "Hope College",
            "9": "Peelamedu",
            "10": "Singanallur",
            "11": "Chinniyampalayam",
            "12": "Neelambur",
            "13": "Kalapatti",
            "14": "Saravanampatti",
            "15": "Ukkadam Bus Stand",
            "16": "Town Hall",
            "17": "Podanur",
            "18": "Sundarapuram",
            "19": "Kuniyamuthur",
            "20": "Eachanari",
            "21": "Madukkarai"
          };
          const mapped = data.map((s: any) => ({
            id: s.id,
            name: s.name,
            rollNo: s.rollNo || s.id,
            busId: s.busId || s.bus_id || "",
            assignedBus: busIdMapping[s.busId] || s.busId || "Bus 1",
            pickupStop: stopNamesMapping[String(s.pickupStopId)] || stopNamesMapping[String(s.pickup_stop_id)] || s.address || s.pickupStopId || s.pickup_stop_id || "Ukkadam Bus Stand",
            attendance: 'Not Checked In',
            parentContact: s.parentPhone || "",
            parentName: s.parentName || "",
            parentId: s.parentId,
            status: s.status || 'Waiting',
            avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.name}`,
            bloodGroup: s.bloodGroup || "",
            address: s.address || "",
            medicalNotes: s.medicalNotes || "",
            school_email: s.schoolEmail || s.school_email || "",
            class: s.className || s.class || "Grade 10",
            id_card_front_path: s.idCardFrontPath || s.id_card_front_path,
            id_card_back_path: s.idCardBackPath || s.id_card_back_path,
            id_card_pdf_path: s.idCardPdfPath || s.id_card_pdf_path,
            id_card_version: s.idCardVersion || s.id_card_version,
            id_card_status: s.idCardStatus || s.id_card_status,
            pickup_distance: s.pickupDistance !== undefined ? s.pickupDistance : s.pickup_distance,
            assignment_status: s.assignmentStatus || s.assignment_status,
            boarded: s.boarded === 1 || s.boarded === true,
            boardedTime: s.boardedTime,
            reachedSchool: s.reachedSchool === 1 || s.reachedSchool === true,
            boardedReturn: s.boardedReturn === 1 || s.boardedReturn === true,
            returnBoardedTime: s.returnBoardedTime || null,
            reachedHome: s.reachedHome === 1 || s.reachedHome === true,
            morningAttendance: (s.boarded === 1 || s.boarded === true || s.reachedSchool === 1 || s.reachedSchool === true) ? 'Present' : 'Absent',
            returnAttendance: (s.boardedReturn === 1 || s.boardedReturn === true || s.reachedHome === 1 || s.reachedHome === true) ? 'Present' : 'Absent',
          }));
          setStudents(mapped);

          fetch(`${API_BASE_URL}/api/v1/buses`)
            .then(res => res.json())
            .then(busesData => {
              if (Array.isArray(busesData)) {
                setBuses(busesData.map((b: any) => mapDbBusToFrontendBus(b, mapped)));
              }
            });
        }
      })
      .catch(err => console.error("Failed to fetch students/buses in AppContext reset:", err));

    setNotifications([]);
    alertsSentRef.current = {};
    setDriverMessages([]);
    setDriverComplaints([]);
    triggerNotification("Simulation restarted successfully. Next run starts at 07:20 AM.", "info");
  };

  // Parent updates Gateway
  const sendDriverMessage = (studentId: string, studentName: string, status: string, message: string) => {
    const newMessage = {
      id: Date.now(),
      studentId,
      studentName,
      status,
      message,
      timestamp: formatSimTime(simMinutes)
    };
    setDriverMessages(prev => [newMessage, ...prev]);
    triggerNotification(`Parent announced update: ${studentName} is ${status}.`, "info");
  };

  const submitComplaint = (parentName: string, studentName: string, driverName: string, busId: string, complaintText: string) => {
    const newComplaint = {
      id: Date.now(),
      parentName,
      studentName,
      driverName,
      busId,
      complaintText,
      timestamp: formatSimTime(simMinutes),
      status: "Pending"
    };
    setDriverComplaints(prev => [newComplaint, ...prev]);
    triggerNotification(`New driver complaint logged regarding ${driverName}.`, "warning");
  };

  const handleStudentBoarding = async (studentId: string, boardingType: string, skipApi: boolean = false) => {
    const scanTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isMorningScan = boardingType === 'boarded' || boardingType === 'Boarded' || boardingType === 'reachedSchool' || boardingType === 'ReachedSchool' || boardingType === 'Arrived';
    const isReturnScan = boardingType === 'boardedReturn' || boardingType === 'BoardedReturn' || boardingType === 'reachedHome' || boardingType === 'ReachedHome' || boardingType === 'HomeDropped';

    // 1. Update local React state immediately for snappy UI response
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        if (boardingType === 'boarded' || boardingType === 'Boarded') {
          return { 
            ...s, 
            boarded: true, 
            boardedTime: scanTimeStr, 
            status: 'On Board', 
            attendance: 'Present',
            morningAttendance: 'Present' 
          };
        } else if (boardingType === 'reachedSchool' || boardingType === 'ReachedSchool' || boardingType === 'Arrived') {
          return { 
            ...s, 
            reachedSchool: true, 
            status: 'Reached School',
            morningAttendance: 'Present' 
          };
        } else if (boardingType === 'boardedReturn' || boardingType === 'BoardedReturn') {
          return { 
            ...s, 
            boardedReturn: true, 
            returnBoardedTime: scanTimeStr,
            status: 'Returning',
            returnAttendance: 'Present'
          };
        } else if (boardingType === 'reachedHome' || boardingType === 'ReachedHome' || boardingType === 'HomeDropped') {
          return { 
            ...s, 
            reachedHome: true, 
            status: 'Reached Home',
            returnAttendance: 'Present'
          };
        }
      }
      return s;
    }));

    // 2. Resolve target student details to construct the API request payload
    const student = (studentsRef.current || students).find(s => s.id === studentId);
    if (!student) return;

    // Dispatched parent notification messages (strictly targeted to PARENT)
    if (boardingType === 'boarded' || boardingType === 'Boarded') {
      triggerNotification(`🔔 Parent Notification: ${student.name} has boarded the morning bus at ${scanTimeStr}.`, "success", { targetRole: 'PARENT', category: 'ATTENDANCE', studentId: student.id, busId: student.assignedBus });
    } else if (boardingType === 'reachedSchool' || boardingType === 'ReachedSchool' || boardingType === 'Arrived') {
      triggerNotification(`🔔 Parent Notification: ${student.name} has reached school safely.`, "success", { targetRole: 'PARENT', category: 'ATTENDANCE', studentId: student.id, busId: student.assignedBus });
    } else if (boardingType === 'boardedReturn' || boardingType === 'BoardedReturn') {
      triggerNotification(`🔔 Parent Notification: ${student.name} has boarded the bus for the afternoon return journey at ${scanTimeStr}.`, "info", { targetRole: 'PARENT', category: 'ATTENDANCE', studentId: student.id, busId: student.assignedBus });
    } else if (boardingType === 'reachedHome' || boardingType === 'ReachedHome' || boardingType === 'HomeDropped') {
      triggerNotification(`🔔 Parent Notification: ${student.name} has been dropped at the assigned stop and reached home safely.`, "success", { targetRole: 'PARENT', category: 'ATTENDANCE', studentId: student.id, busId: student.assignedBus });
    }

    const busIdMapping: Record<string, string> = {
      "Bus 1": "TN38AB1234",
      "Bus 2": "TN38CD5678",
      "Bus 3": "TN38EP9012"
    };
    const realBusId = busIdMapping[student.assignedBus] || student.assignedBus || "TN38AB1234";

    // Aggregated attendance summary strictly for ADMIN:
    // Format: "Bus [Bus Number] [Shift] attendance: [Present Count]/[Total Count] students present (Strength: [Total], Present: [Present], Absent: [Absent])"
    const currentStudentsList = (studentsRef.current || students);
    const busStudents = currentStudentsList.filter(s => 
      s.assignedBus === student.assignedBus || 
      s.busId === student.assignedBus || 
      s.assignedBus === realBusId || 
      s.busId === realBusId
    );
    const totalBusCount = busStudents.length;

    let presentBusCount = 0;
    let shiftLabel = "Shift";
    if (isMorningScan) {
      shiftLabel = "Morning";
      presentBusCount = busStudents.filter(s => 
        s.id === studentId || s.boarded === true || s.morningAttendance === 'Present' || s.status === 'On Board' || s.status === 'Reached School'
      ).length;
    } else {
      shiftLabel = "Evening Return";
      presentBusCount = busStudents.filter(s => 
        s.id === studentId || s.boardedReturn === true || s.returnAttendance === 'Present' || s.status === 'Returning' || s.status === 'Reached Home'
      ).length;
    }
    const absentBusCount = Math.max(0, totalBusCount - presentBusCount);

    const summaryMsg = `Bus ${realBusId} ${shiftLabel} attendance: ${presentBusCount}/${totalBusCount} students present (Strength: ${totalBusCount}, Present: ${presentBusCount}, Absent: ${absentBusCount})`;
    triggerNotification(summaryMsg, "info", {
      targetRole: 'ADMIN',
      category: 'ATTENDANCE_SUMMARY',
      busId: realBusId
    });

    let apiAttendanceType = 'Boarded';
    if (boardingType === 'reachedSchool' || boardingType === 'ReachedSchool' || boardingType === 'Arrived') {
      apiAttendanceType = 'Arrived';
    } else if (boardingType === 'boardedReturn' || boardingType === 'BoardedReturn') {
      apiAttendanceType = 'ReturnBoarded';
    } else if (boardingType === 'reachedHome' || boardingType === 'ReachedHome' || boardingType === 'HomeDropped') {
      apiAttendanceType = 'HomeDropped';
    }

    const scanReq = {
      studentId: student.id,
      busId: realBusId,
      attendanceType: apiAttendanceType,
      scanDate: new Date().toISOString().split('T')[0],
      scanTime: scanTimeStr,
      latitude: 10.8801,
      longitude: 77.0224,
      driverName: 'Murugan',
      tripId: 'TRIP-01'
    };

    // 3. Post to backend attendance scan endpoint to persist
    try {
      await fetch(`${API_BASE_URL}/api/v1/attendance/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanReq)
      });
    } catch (err) {
      console.error("[AppContext] Failed to persist boarding scan to attendance-service:", err);
    }

    // 4. Synchronize with student-service to ensure immediate database consistency
    try {
      await fetch(`${API_BASE_URL}/api/v1/students/${student.id}/board?boardingType=${encodeURIComponent(boardingType)}&scanTime=${encodeURIComponent(scanTimeStr)}`, {
        method: 'PUT'
      });
    } catch (err) {
      console.error("[AppContext] Failed to synchronize boarding to student-service:", err);
    }
  };

  const updateStudentProfile = async (
    studentId: string,
    profileData: { bloodGroup: string; address: string; medicalNotes: string }
  ) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/students/${studentId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        setStudents(prev => prev.map(s => {
          if (s.id === studentId) {
            return {
              ...s,
              bloodGroup: profileData.bloodGroup,
              address: profileData.address,
              medicalNotes: profileData.medicalNotes
            };
          }
          return s;
        }));
        triggerNotification(`✅ Profile details updated successfully.`, "success");
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update student profile.');
      }
    } catch (err: any) {
      console.error("[AppContext] Failed to update student profile:", err);
      triggerNotification(`❌ ${err.message || 'Failed to update profile details.'}`, "error");
    }
  };

  // Toggle route deviation
  const toggleBusDeviation = (busId: string) => {
    setBuses(prev => prev.map(b => {
      if (b.id === busId) {
        const nextDev = !b.deviation;
        if (nextDev) {
          triggerNotification(`⚠️ Alert: ${busId} has deviated from the planned route!`, "error");
        } else {
          triggerNotification(`✅ ${busId} is back on the planned route.`, "success");
        }
        return { ...b, deviation: nextDev };
      }
      return b;
    }));
  };

  // Update trip status
  const updateBusTripStatus = (busId: string, status: 'Running' | 'Stopped' | 'Delayed' | 'On Route' | 'Idle') => {
    const mappedStatus = (status === 'On Route' || status === 'Idle') 
      ? (status === 'On Route' ? 'Running' : 'Stopped') 
      : status as 'Running' | 'Stopped' | 'Delayed';

    setBuses(prev => prev.map(b => {
      if (b.id === busId) {
        triggerNotification(`🚌 ${busId} status updated to: ${status}`, "info");
        const isIdle = mappedStatus === 'Stopped';
        return { 
          ...b, 
          status: mappedStatus, 
          speed: mappedStatus === 'Running' ? 35 : 0,
          isLocallySimulating: isIdle ? false : b.isLocallySimulating
        };
      }
      return b;
    }));
  };

  // Toggle SOS Active status
  const toggleBusSOS = (busId: string) => {
    setBuses(prev => prev.map(b => {
      if (b.id === busId) {
        const nextSos = !b.sos;
        if (nextSos) {
          const currentPos = b.currentLocation || b.path[b.currentStopIndex];
          triggerNotification(`🚨 SOS EMERGENCY ALERT: ${busId} driver pressed emergency SOS button! Location: ${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}`, "error");
        } else {
          triggerNotification(`✅ SOS Emergency cleared for ${busId}.`, "success");
        }
        return { ...b, sos: nextSos };
      }
      return b;
    }));
  };

  // Simulation Clock Tick Loop: 1 minute simulation time advances every 2 seconds
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setSimMinutes(prev => {
        const nextMin = prev + 1;
        setSimTime(formatSimTime(nextMin));
        return nextMin;
      });
    }, 2000);

    return () => clearInterval(clockInterval);
  }, []);

  // Coordinates movement is driven purely by the backend telemetry processor and live location API polling.

  // Poll live driver behavior from Flask server to sync CV warnings
  useEffect(() => {
    let offlineLogged = false;

    const pollInterval = setInterval(() => {
      fetch(`${API_BASE_URL}/api/v1/driver/behavior`)
        .then(res => {
          if (!res.ok) throw new Error("Backend unavailable");
          return res.json();
        })
        .then(data => {
          if (data) {
            setBackendConnected(true);
            offlineLogged = false;

            // Normalize: if backend returns a single behavior object (legacy), convert to map
            const behaviorsMap = data.drowsiness !== undefined ? { "Bus 1": data } : data;
            setAllDriverBehaviors(behaviorsMap);

            // Update main driverBehavior state with Bus 1 or the first available bus
            const activeBusBehavior = behaviorsMap["TN38AB1234"] || behaviorsMap["Bus 1"] || Object.values(behaviorsMap)[0] || {};
            setDriverBehavior(activeBusBehavior);

            // Loop through all bus behavior states to update status mapping
            Object.entries(behaviorsMap).forEach(([busId, busData]: [string, any]) => {
              // Telemetry is logged continuously. Warning notifications are handled strictly via WebSocket DRIVER_INCIDENT events.
            });
          }
        })
        .catch(() => {
          setBackendConnected(false);
          if (!offlineLogged) {
            console.log("[SafeBus Context] Flask API server is currently offline. Operating in local simulation mode.");
            offlineLogged = true;
          }
        });
    }, 4000); // 4-second poll interval to conserve resources when server is offline

    return () => clearInterval(pollInterval);
  }, []);

  // Poll live GPS tracking locations from Flask/Spring backend API
  useEffect(() => {
    let offlineLogged = false;

    const pollTracking = setInterval(() => {
      fetch(`${API_BASE_URL}/api/v1/buses/location`)
        .then(res => {
          if (!res.ok) throw new Error("API server offline");
          return res.json();
        })
        .then((data: any[]) => {
          if (Array.isArray(data) && data.length > 0) {
            setIsTrackingLive(true);
            offlineLogged = false;

            setBuses(prevBuses => 
              prevBuses.map(bus => {
                if (bus.isLocallySimulating) return bus;
                const liveData = data.find(d => d.id === bus.id || d.name === bus.id);
                if (!liveData) return bus;

                const newLoc = { lat: liveData.latitude, lng: liveData.longitude };
                const prevLoc = bus.currentLocation || bus.path[bus.currentStopIndex];

                // Calculate bearing rotation dynamically
                const calculatedHeading = prevLoc ? calculateBearing(prevLoc, newLoc) : liveData.heading || 0;

                // Geofence Route Deviation Check
                const devCheck = checkRouteDeviation(newLoc, bus.path, 0.2);
                const wasDeviated = bus.deviation || false;
                const isDeviated = devCheck.isDeviated;

                if (isDeviated && !wasDeviated) {
                  triggerNotification(`⚠️ Alert: ${bus.id} has deviated from the planned route!`, "error");
                } else if (!isDeviated && wasDeviated) {
                  triggerNotification(`✅ ${bus.id} is back on the planned route.`, "success");
                }

                // Check 2 km geofence proximity alerts for NEXT stop (parent-targeted alerts)
                const nextStopIndexInStops = Math.min(bus.stops.length - 1, Math.ceil(bus.currentStopIndex / 40));
                const nextScheduledStop = bus.stops[nextStopIndexInStops];
                if (nextScheduledStop) {
                  const distToNextStop = getDistanceKm(newLoc, { lat: nextScheduledStop.lat, lng: nextScheduledStop.lng });
                  const proximityKey = `${bus.id}-near-2km-${nextScheduledStop.name}`;

                  if (distToNextStop <= 2.0 && distToNextStop > 0.1 && !alertsSentRef.current[proximityKey]) {
                    alertsSentRef.current[proximityKey] = true;

                    // Find students assigned specifically to this next stop on this bus
                    const currentStudentsList = studentsRef.current || [];
                    const targetStudents = currentStudentsList.filter(s => s.assignedBus === bus.id && s.pickupStop === nextScheduledStop.name);
                    const studentNames = targetStudents.map(s => s.name).join(', ');
                    const currentSpeed = liveData.speed || bus.speed || 35;
                    const estArrivalMins = Math.max(1, Math.round((distToNextStop / currentSpeed) * 65));

                    if (targetStudents.length > 0) {
                      triggerNotification(
                        `🔔 Parent Notification (${studentNames}): Your child's school bus ${bus.id} is approximately ${distToNextStop.toFixed(1)} km away from ${nextScheduledStop.name} and is expected to arrive in about ${estArrivalMins} minutes.`,
                        "warning"
                      );
                    }
                  }
                }

                return {
                  ...bus,
                  currentLocation: newLoc,
                  heading: calculatedHeading,
                  speed: liveData.speed,
                  status: liveData.status || bus.status,
                  deviation: isDeviated,
                  sos: liveData.sos !== undefined ? liveData.sos : bus.sos
                };
              })
            );
          }
        })
        .catch(() => {
          setIsTrackingLive(false);
          if (!offlineLogged) {
            console.log("[SafeBus Tracking] Live GPS endpoint offline. Operating in local simulation mode.");
            offlineLogged = true;
          }
        });
    }, 4000); // Poll locations every 4 seconds

    return () => clearInterval(pollTracking);
  }, []);

  // Native WebSockets event registrations effect
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any;

    const connectWs = () => {
      try {
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let wsUrl = "";
        if (API_BASE_URL.startsWith("http")) {
          wsUrl = API_BASE_URL.replace(/^http/, "ws") + "/ws";
        } else {
          wsUrl = `${wsProto}//${window.location.host}/ws`;
        }
        const token = localStorage.getItem('safebus_token') || 'anonymous';
        const roleQuery = userRole || (user?.role ? user.role.toUpperCase() : 'UNKNOWN');
        const userQuery = user?.username || '';
        wsUrl += `?token=${encodeURIComponent(token)}&role=${encodeURIComponent(roleQuery)}&username=${encodeURIComponent(userQuery)}`;

        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log(`[WebSocket] Connected to notification gateway as role=${roleQuery}.`);
          setSocketConnected(true);
        };
        
        ws.onclose = () => {
          console.log("[WebSocket] Disconnected from backend notification gateway. Retrying in 5s...");
          setSocketConnected(false);
          reconnectTimeout = setTimeout(connectWs, 5000);
        };
        
        ws.onerror = (err) => {
          console.error("[WebSocket] Connection error:", err);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            console.log("[WebSocket] Received message:", msg);
            
            if (msg.type === "SOS") {
              const newSos = msg.payload;
              // Secondary defense: strictly drop SOS if role is PARENT
              if (userRole !== 'PARENT') {
                triggerNotification(
                  `🚨 CRITICAL SOS RECEIVED: Bus ${newSos.busId} reports ${newSos.emergencyType || 'Emergency'}!`, 
                  "error",
                  { targetRole: 'ADMIN', category: 'SOS', busId: newSos.busId }
                );
                playEmergencyAlarmSound();
                fetchActiveSOS();
                fetchSOSStats();
              }
            } else if (msg.type === "DRIVER_INCIDENT") {
              const incident = msg.payload || {};
              // Driver incident notifications must strictly and exclusively reach the Central ADMIN
              if (userRole === 'ADMIN') {
                const rawType = incident.incidentType || incident.incident_type || incident.type || incident.status || incident.event || '';
                const alertType = String(rawType).toUpperCase();

                // STRICT REQUIREMENT: Normal detection must NEVER generate notifications!
                if (!alertType || alertType === 'NORMAL' || alertType === 'ATTENTIVE' || alertType === 'UNKNOWN' 
                    || alertType === 'NO_DRIVER_FACE_DETECTED' || alertType === 'SAFE' || alertType === 'OK') {
                  // Suppress normal detection updates
                } else {
                  // If buzzer rings only, notification should come to admin
                  const isDistraction = alertType.includes('DISTRACT') || alertType.includes('AWAY');
                  const alertLabel = isDistraction ? 'distraction' : 'drowsiness';
                  triggerNotification(
                    `🚨 Driver ${alertLabel} alert — buzzer activated (${incident.busId || 'Bus 1'}).`, 
                    "error",
                    { targetRole: 'ADMIN', category: 'DRIVER_INCIDENT', busId: incident.busId }
                  );
                }
              }
            } else if (msg.type === "DRIVER_TELEMETRY") {
              const telemetry = msg.payload;
              if (telemetry && telemetry.busId) {
                const busKey = telemetry.busId;
                const status = (telemetry.status || '').toUpperCase();
                // If driver returned to normal for >= 15 seconds, reset incident session for future events
                if (status === 'NORMAL' || status === 'ATTENTIVE' || status === 'OK' || status === 'SAFE') {
                  const now = Date.now();
                  const dKey = `${busKey}-DROWSINESS`;
                  const disKey = `${busKey}-DISTRACTION`;
                  if (driverIncidentTrackerRef.current[dKey] && (now - driverIncidentTrackerRef.current[dKey].lastTime > 15000)) {
                    delete driverIncidentTrackerRef.current[dKey];
                  }
                  if (driverIncidentTrackerRef.current[disKey] && (now - driverIncidentTrackerRef.current[disKey].lastTime > 15000)) {
                    delete driverIncidentTrackerRef.current[disKey];
                  }
                }

                setAllDriverBehaviors(prev => ({
                  ...prev,
                  [telemetry.busId]: telemetry
                }));
                const activeBusId = "TN38AB1234";
                if (telemetry.busId === activeBusId || telemetry.busId === "Bus 1") {
                  setDriverBehavior(telemetry);
                }
              }
            } else if (msg.type === "ATTENDANCE") {
              const attendance = msg.payload;
              setStudents(prev => prev.map(s => {
                if (s.id === attendance.studentId) {
                  const type = attendance.attendanceType;
                  if (type === 'Boarded' || type === 'boarded' || type === 'BOARDED') {
                    return { ...s, boarded: true, boardedTime: attendance.scanTime || 'now', status: 'On Board', attendance: 'Present' };
                  } else if (type === 'Arrived' || type === 'reachedSchool' || type === 'ReachedSchool' || type === 'Dropped') {
                    return { ...s, reachedSchool: true, status: 'Dropped' };
                  }
                }
                return s;
              }));
              const allStds = studentsRef.current || students;
              const targetStudent = allStds.find(s => s.id === attendance.studentId);
              const studentName = targetStudent ? targetStudent.name : `Student ${attendance.studentId}`;

              if (userRole === 'ADMIN') {
                // Admin receives aggregate summary per bus only - NO individual student notifications
                const targetBusId = attendance.busId || (targetStudent ? targetStudent.assignedBus : "TN38AB1234");
                const busStudents = allStds.filter(s => 
                  s.assignedBus === targetBusId || 
                  s.busId === targetBusId ||
                  (targetBusId === "TN38AB1234" && s.assignedBus === "Bus 1") ||
                  (targetBusId === "Bus 1" && s.busId === "TN38AB1234")
                );
                const total = busStudents.length || 20;
                const present = busStudents.filter(s => 
                  s.id === attendance.studentId || 
                  s.boarded || 
                  s.status === 'On Board' || 
                  s.status === 'Present' || 
                  s.attendance === 'Present' ||
                  s.status === 'Reached School' ||
                  s.status === 'Returning' ||
                  s.status === 'Reached Home'
                ).length;
                const absent = Math.max(0, total - present);
                const summaryMsg = `Bus ${targetBusId} attendance: ${present}/${total} students present (Strength: ${total}, Present: ${present}, Absent: ${absent})`;

                triggerNotification(summaryMsg, "info", {
                  targetRole: 'ADMIN',
                  category: 'ATTENDANCE_SUMMARY',
                  busId: targetBusId
                });
              } else if (userRole === 'PARENT') {
                // Parent receives notification ONLY if this is their child
                const pId = localStorage.getItem('safebus_parent_id');
                const pPhone = localStorage.getItem('safebus_user_phone');
                const isChild = allStds.some(s => 
                  s.id === attendance.studentId && (
                    (pId && String(s.parentId) === String(pId)) ||
                    (pPhone && s.parentContact && s.parentContact.replace(/\s+/g, '') === pPhone.replace(/\s+/g, '')) ||
                    s.id === parentSelfStudentId
                  )
                );

                if (isChild) {
                  triggerNotification(`🔔 Attendance Update: Your child ${studentName} has ${attendance.attendanceType}!`, "success", {
                    targetRole: 'PARENT',
                    category: 'ATTENDANCE',
                    studentId: attendance.studentId,
                    busId: attendance.busId
                  });
                }
              }
            } else if (msg.type === "ID_CARD") {
              const progressUpdate = msg.payload;
              setStudents(prevStudents => prevStudents.map(s => {
                if (s.id === progressUpdate.studentId) {
                  return {
                    ...s,
                    id_card_generation_stage: progressUpdate.stage,
                    id_card_status: progressUpdate.status || s.id_card_status,
                    id_card_version: progressUpdate.version || s.id_card_version,
                    id_card_front_path: progressUpdate.front_path || s.id_card_front_path,
                    id_card_back_path: progressUpdate.back_path || s.id_card_back_path,
                    id_card_pdf_path: progressUpdate.pdf_path || s.id_card_pdf_path,
                  };
                }
                return s;
              }));
              if (progressUpdate.stage === "COMPLETED" || progressUpdate.stage === "GENERATED") {
                triggerNotification(`🎉 Student ID Card generation completed for student ${progressUpdate.studentId}!`, "success", { targetRole: 'ALL', category: 'ATTENDANCE', studentId: progressUpdate.studentId });
              } else if (progressUpdate.stage === "FAILED") {
                triggerNotification(`❌ Student ID Card generation failed for student ${progressUpdate.studentId}.`, "error", { targetRole: 'ADMIN', category: 'OPERATIONAL', studentId: progressUpdate.studentId });
              }
            } else if (msg.type === "BUS_LOCATION" || msg.type === "BUS_TELEMETRY") {
              const telemetry = msg.payload;
              if (telemetry && (telemetry.latitude !== undefined && telemetry.longitude !== undefined)) {
                const rawBusId = telemetry.busId || telemetry.id || "TN38AB1234";
                const busId = rawBusId === "1" ? "TN38AB1234" : rawBusId === "2" ? "TN38CD5678" : rawBusId === "3" ? "TN38EP9012" : rawBusId;

                setBuses(prevBuses => prevBuses.map(b => {
                  if (b.id === busId || b.id === rawBusId || 
                     (busId === "TN38AB1234" && b.id === "Bus 1") || 
                     (busId === "TN38CD5678" && b.id === "Bus 2") || 
                     (busId === "TN38EP9012" && b.id === "Bus 3")) {
                    const prevPos = b.currentLocation || b.path[b.currentStopIndex] || b.path[0];
                    const newPos = { lat: Number(telemetry.latitude), lng: Number(telemetry.longitude) };
                    let heading = telemetry.heading || b.heading || 0;
                    if (!telemetry.heading && prevPos) {
                      try {
                        heading = calculateBearing(prevPos, newPos);
                      } catch (e) {}
                    }
                    return {
                      ...b,
                      currentLocation: newPos,
                      speed: telemetry.speed !== undefined ? Number(telemetry.speed) : b.speed,
                      status: (telemetry.status === "On Route" ? "Running" : telemetry.status) || "Running",
                      heading: heading
                    };
                  }
                  return b;
                }));
              }
            } else if (msg.type === "BUS_APPROACHING" || msg.type === "BUS_ARRIVAL") {
              const notif = msg.payload || {};
              const defaultText = `🔔 Approaching Alert: Bus ${notif.busId || ''} is approximately ${Number(notif.distanceKm || 2).toFixed(1)} km away and expected in ${notif.etaMinutes || 5} mins!`;
              const message = notif.message || defaultText;

              triggerNotification(message, "warning", {
                targetRole: 'ALL',
                category: 'BUS_ARRIVAL',
                busId: notif.busId,
                studentId: notif.studentId,
                whatsappUrl: notif.whatsappUrl,
                parentPhone: notif.parentPhone
              });
            }
          } catch (e) {
            console.error("[WebSocket] Failed to parse message:", e);
          }
        };
      } catch (e) {
        console.error("[WebSocket] Init failure: ", e);
      }
    };

    connectWs();
    
    return () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [userRole, user?.username]);

  // Fallback active alerts periodic check effect
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;

    fetchActiveSOS();
    fetchSOSStats();
    
    const interval = setInterval(() => {
      fetchActiveSOS();
      fetchSOSStats();
    }, 10000); // Poll every 10 seconds (instead of 3s) only for Admins
    
    return () => clearInterval(interval);
  }, [user]);

  const advanceLocalBusSimulation = (busId: string) => {
    setBuses(prevBuses => {
      const bus = prevBuses.find(b => b.id === busId);
      if (!bus) return prevBuses;

      const nextIndex = (bus.currentStopIndex + 2) % bus.path.length;
      const newLoc = bus.path[nextIndex];
      const prevLoc = bus.currentLocation || bus.path[bus.currentStopIndex];
      
      let calculatedHeading = bus.heading || 0;
      try {
        calculatedHeading = prevLoc ? calculateBearing(prevLoc, newLoc) : bus.heading || 0;
      } catch (e) {}

      // Geofence check for next stop
      const nextStopIndexInStops = Math.min(bus.stops.length - 1, Math.ceil(nextIndex / 40));
      const nextScheduledStop = bus.stops[nextStopIndexInStops];
      
      if (nextScheduledStop) {
        const distToNextStop = getDistanceKm(newLoc, { lat: nextScheduledStop.lat, lng: nextScheduledStop.lng });
        const proximityKey = `${bus.id}-near-2km-${nextScheduledStop.name}`;

        if (distToNextStop <= 2.0 && distToNextStop > 0.1 && !alertsSentRef.current[proximityKey]) {
          alertsSentRef.current[proximityKey] = true;

          // Find students assigned specifically to this next stop on this bus
          const targetStudents = students.filter(s => s.assignedBus === bus.id && s.pickupStop === nextScheduledStop.name);
          const studentNames = targetStudents.map(s => s.name).join(', ');
          const estArrivalMins = Math.max(1, Math.round((distToNextStop / 35) * 60));

          if (targetStudents.length > 0) {
            triggerNotification(
              `🔔 Bus Arrival Update (${studentNames}): Bus ${bus.id} is approximately ${distToNextStop.toFixed(1)} km away from ${nextScheduledStop.name} and is expected to arrive in about ${estArrivalMins} minutes.`,
              "warning",
              { targetRole: 'ALL', category: 'BUS_ARRIVAL', busId: bus.id }
            );
          }
        }
      }

      // Check arrival at a stop (index matches step index in path)
      const stopIndex = Math.floor(nextIndex / 40);
      const currentStop = bus.stops[stopIndex];
      
      // If we are exactly at the stop step (first step of the stop segment)
      if (nextIndex % 40 === 0 && currentStop) {
        triggerNotification(`🚌 Bus ${bus.id} has arrived at ${currentStop.name}.`, "success", { targetRole: 'ALL', category: 'BUS_ARRIVAL', busId: bus.id });

        // Update boarding status of students at this stop
        setStudents(prevStudents => 
          prevStudents.map(s => {
            if (s.assignedBus === bus.id && s.pickupStop === currentStop.name) {
              if (currentStop.name === "Karpagam College of Engineering") {
                return { ...s, status: "Dropped", reachedSchool: 1, attendance: "Present" };
              } else {
                return { ...s, status: "On Board", boarded: 1, attendance: "Present" };
              }
            }
            return s;
          })
        );
      }

      return prevBuses.map(b => {
        if (b.id === busId) {
          const nextStopName = nextScheduledStop ? nextScheduledStop.name : "Karpagam College of Engineering";
          return {
            ...b,
            currentLocation: newLoc,
            currentStopIndex: nextIndex,
            heading: calculatedHeading,
            speed: nextIndex === 0 ? 0 : 35,
            status: nextIndex === 0 ? "Idle" : "On Route",
            nextStop: nextStopName,
            isLocallySimulating: true,
          };
        }
        return b;
      });
    });
  };

  return (
    <AppContext.Provider
      value={{
        buses,
        setBuses,
        students,
        setStudents,
        notifications,
        simTime,
        userRole,
        setUserRole,
        parentSelfStudentId,
        setParentSelfStudentId,
        triggerNotification,
        clearNotification,
        clearAllNotifications,
        resetSimulation,
        driverMessages,
        setDriverMessages,
        driverComplaints,
        setDriverComplaints,
        sendDriverMessage,
        submitComplaint,
        handleStudentBoarding,
        selectedBusId,
        setSelectedBusId,
        toggleBusDeviation,
        updateBusTripStatus,
        toggleBusSOS,
        activeSOSAlerts,
        sosStatistics,
        triggerSOSAlert,
        acknowledgeSOSAlert,
        resolveSOSAlert,
        driverBehavior,
        allDriverBehaviors,
        backendConnected,
        socketConnected,
        updateStudentProfile,
        user,
        setUser,
        advanceLocalBusSimulation
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
};
