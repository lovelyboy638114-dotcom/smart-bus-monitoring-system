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
  setUserRole: (role: string | null) => void;
  parentSelfStudentId: string;
  setParentSelfStudentId: (id: string) => void;
  triggerNotification: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  resetSimulation: () => void;
  driverMessages: any[];
  setDriverMessages: React.Dispatch<React.SetStateAction<any[]>>;
  driverComplaints: any[];
  setDriverComplaints: React.Dispatch<React.SetStateAction<any[]>>;
  sendDriverMessage: (studentId: string, studentName: string, status: string, message: string) => void;
  submitComplaint: (parentName: string, studentName: string, driverName: string, busId: string, complaintText: string) => void;
  
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
  backendConnected: boolean;
  socketConnected: boolean;
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
  const [userRole, setUserRoleState] = useState<string | null>(() => {
    return localStorage.getItem('safebus_user_role') || null;
  });

  const setUserRole = (role: string | null) => {
    setUserRoleState(role);
    if (role) {
      localStorage.setItem('safebus_user_role', role);
    } else {
      localStorage.removeItem('safebus_user_role');
    }
  };
  const [parentSelfStudentId, setParentSelfStudentId] = useState<string>("");

  // Telematics States
  const [buses, setBuses] = useState<Bus[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

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
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  const mapDbBusToFrontendBus = (dbBus: any, allStudents: Student[]): Bus => {
    let stops = bus1Stops;
    let color = "#2563eb"; // Blue
    let routeNumber = dbBus.route || "R-01 (North Loop)";
    
    if (dbBus.id === "TN38CD5678" || dbBus.id === "Bus 2") {
      stops = bus2Stops;
      color = "#16a34a"; // Green
    } else if (dbBus.id === "TN38EP9012" || dbBus.id === "Bus 3") {
      stops = bus3Stops;
      color = "#dc2626"; // Red
    }
    
    const path = interpolatePath(stops);
    const busStudents = allStudents.filter(s => s.assignedBus === dbBus.id || s.assignedBus === (dbBus.id === "TN38AB1234" ? "Bus 1" : dbBus.id === "TN38CD5678" ? "Bus 2" : "Bus 3"));

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
        const studentsRes = await fetch(`${API_BASE_URL}/api/students`);
        const studentsData = await studentsRes.json();
        
        let mappedStudents: Student[] = [];
        if (Array.isArray(studentsData)) {
          const busIdMapping: Record<string, string> = {
            "TN38AB1234": "Bus 1",
            "TN38CD5678": "Bus 2",
            "TN38EP9012": "Bus 3"
          };
          const stopNamesMapping: Record<string, string> = {
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
            assignedBus: busIdMapping[s.busId] || s.busId || "Bus 1",
            pickupStop: stopNamesMapping[s.pickup_stop_id] || s.pickup_stop_id || s.address || "Gandhipuram Bus Stand",
            attendance: s.boarded ? "Present" : (s.status === "Absent" ? "Absent" : "Not Checked In"),
            parentContact: s.parentPhone || "",
            parentId: s.parentId,
            status: s.status || "Waiting",
            avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.name}`,
            bloodGroup: s.bloodGroup || "",
            address: s.address || "",
            medicalNotes: s.medicalNotes || "",
            school_email: s.school_email || "",
            class: s.class || "Grade 10",
            id_card_front_path: s.id_card_front_path,
            id_card_back_path: s.id_card_back_path,
            id_card_pdf_path: s.id_card_pdf_path,
            id_card_version: s.id_card_version,
            id_card_status: s.id_card_status,
            pickup_distance: s.pickup_distance,
            assignment_status: s.assignment_status,
            assigned_at: s.assigned_at
          }));
          setStudents(mappedStudents);
          
          // Auto-initialize parentSelfStudentId for logged-in parents
          const pId = localStorage.getItem('safebus_parent_id');
          const pPhone = localStorage.getItem('safebus_user_phone');
          const children = mappedStudents.filter(s => {
            if (pId && s.parentId === Number(pId)) return true;
            if (pPhone && s.parentContact && s.parentContact.replace(/\s+/g, '') === pPhone.replace(/\s+/g, '')) return true;
            return false;
          });
          if (children.length > 0) {
            setParentSelfStudentId(children[0].id);
          }
        }

        const busesRes = await fetch(`${API_BASE_URL}/api/buses`);
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
    if (userRole === 'parent' && students.length > 0) {
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

  // Trigger notification logs
  const triggerNotification = (message: string, type: 'info' | 'warning' | 'error' | 'success') => {
    const timeStr = formatSimTime(simMinutes);
    const newNotif: SystemNotification = {
      id: String(Date.now() + Math.random()),
      message,
      type,
      timestamp: timeStr
    };
    setNotifications(prev => [newNotif, ...prev]);
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
    fetch(`${API_BASE_URL}/api/students`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const busIdMapping: Record<string, string> = {
            "TN38AB1234": "Bus 1",
            "TN38CD5678": "Bus 2",
            "TN38EP9012": "Bus 3"
          };
          const stopNamesMapping: Record<string, string> = {
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
            assignedBus: busIdMapping[s.busId] || s.busId || "Bus 1",
            pickupStop: stopNamesMapping[s.pickup_stop_id] || s.pickup_stop_id || s.address || "Gandhipuram Bus Stand",
            attendance: 'Not Checked In',
            parentContact: s.parentPhone || "",
            parentId: s.parentId,
            status: s.status || 'Waiting',
            avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.name}`,
            bloodGroup: s.bloodGroup || "",
            address: s.address || "",
            medicalNotes: s.medicalNotes || "",
            school_email: s.school_email || "",
            class: s.class || "Grade 10",
            id_card_front_path: s.id_card_front_path,
            id_card_back_path: s.id_card_back_path,
            id_card_pdf_path: s.id_card_pdf_path,
            id_card_version: s.id_card_version,
            id_card_status: s.id_card_status,
            pickup_distance: s.pickup_distance,
            assignment_status: s.assignment_status,
            assigned_at: s.assigned_at
          }));
          setStudents(mapped);

          fetch(`${API_BASE_URL}/api/buses`)
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
        return { ...b, status: mappedStatus, speed: mappedStatus === 'Running' ? 35 : 0 };
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
      fetch(`${API_BASE_URL}/api/driver/behavior`)
        .then(res => {
          if (!res.ok) throw new Error("Backend unavailable");
          return res.json();
        })
        .then(data => {
          if (data) {
            setDriverBehavior(data);
            setBackendConnected(true);
            offlineLogged = false;
            // Trigger alerts based on CV status
            if (data.drowsiness && !alertsSentRef.current["cv-drowsy-active"]) {
              alertsSentRef.current["cv-drowsy-active"] = true;
              triggerNotification("⚠️ AI Camera Alert: Driver Drowsiness fatigue detected on Bus 1!", "error");
            } else if (!data.drowsiness) {
              alertsSentRef.current["cv-drowsy-active"] = false;
            }

            if (data.yawning && !alertsSentRef.current["cv-yawn-active"]) {
              alertsSentRef.current["cv-yawn-active"] = true;
              triggerNotification("⚠️ AI Camera Alert: Driver Yawning fatigue signs detected on Bus 1.", "warning");
            } else if (!data.yawning) {
              alertsSentRef.current["cv-yawn-active"] = false;
            }

            if (data.distraction && !alertsSentRef.current["cv-distract-active"]) {
              alertsSentRef.current["cv-distract-active"] = true;
              triggerNotification("⚠️ AI Camera Alert: Driver Gaze Distraction detected on Bus 1.", "warning");
            } else if (!data.distraction) {
              alertsSentRef.current["cv-distract-active"] = false;
            }
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
  }, [simMinutes]);

  // Poll live GPS tracking locations from Flask/Spring backend API
  useEffect(() => {
    let offlineLogged = false;

    const pollTracking = setInterval(() => {
      fetch(`${API_BASE_URL}/api/buses/location`)
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
                    const targetStudents = students.filter(s => s.assignedBus === bus.id && s.pickupStop === nextScheduledStop.name);
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
  }, [simMinutes]);

  // Socket.IO event registrations effect
  useEffect(() => {
    let socket: any;
    try {
      socket = io(API_BASE_URL, { transports: ["websocket", "polling"] });
      socketRef.current = socket;
      
      socket.on("connect", () => {
        console.log("[SocketIO] Connected to backend telemetry gateway.");
        setSocketConnected(true);
      });
      
      socket.on("disconnect", () => {
        setSocketConnected(false);
      });
      
      socket.on("sos_alert_received", (newSos: any) => {
        console.log("[SocketIO] Received new SOS event:", newSos);
        triggerNotification(`🚨 CRITICAL SOS RECEIVED: ${newSos.bus_id} is reporting: ${newSos.emergency_type}!`, "error");
        playEmergencyAlarmSound();
        fetchActiveSOS();
        fetchSOSStats();
      });
      
      socket.on("sos_alert_acknowledged", (ackData: any) => {
        console.log("[SocketIO] SOS Acknowledged:", ackData);
        triggerNotification(`✅ School has acknowledged emergency ${ackData.sos_id}`, "success");
        fetchActiveSOS();
        fetchSOSStats();
      });
      
      socket.on("sos_alert_resolved", (resData: any) => {
        console.log("[SocketIO] SOS Resolved:", resData);
        triggerNotification(`ℹ️ Emergency ${resData.sos_id} has been resolved: ${resData.remarks}`, "info");
        fetchActiveSOS();
        fetchSOSStats();
      });
    } catch (e) {
      console.error("[SocketIO] Init failure: ", e);
    }
    
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // Fallback active alerts periodic check effect
  useEffect(() => {
    fetchActiveSOS();
    fetchSOSStats();
    
    const interval = setInterval(() => {
      fetchActiveSOS();
      fetchSOSStats();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

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
        backendConnected,
        socketConnected
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
