import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Coordinate, Bus, Student, Stop, SystemNotification } from '../types';
import { 
  interpolatePath, 
  busesList as initialBuses, 
  studentsList as initialStudents, 
  driversList, 
  SCHOOL_LOCATION 
} from '../data/mockData';
import { getDistanceKm, checkRouteDeviation, calculateBearing } from '../services/GPSService';

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
  // Authentication & Profile States with localStorage persistence to prevent refresh loops
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
  const [parentSelfStudentId, setParentSelfStudentId] = useState<string>("ST001");

  // Telematics States
  const [buses, setBuses] = useState<Bus[]>(initialBuses);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
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
    setBuses(initialBuses.map(b => ({
      ...b,
      status: 'Stopped',
      currentStopIndex: 0,
      speed: 0,
      eta: '--'
    })));
    setStudents(initialStudents.map(s => ({
      ...s,
      status: 'Waiting',
      attendance: 'Not Checked In'
    })));
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

  // Main Live GPS coordinates simulation tick: runs whenever simMinutes increments
  useEffect(() => {
    // Check if all buses are completed
    const allCompleted = buses.every(b => b.status === 'Stopped' && b.currentStopIndex >= b.path.length - 1);
    if (allCompleted && simMinutes > 8 * 60 + 12) {
      // Auto restart after completion
      resetSimulation();
      return;
    }

    setBuses((prevBuses) =>
      prevBuses.map((bus) => {
        const schedule = BUS_SCHEDULES[bus.id as keyof typeof BUS_SCHEDULES];
        if (!schedule) return bus;

        // 1. Check if it's time to start the trip
        if (bus.status === 'Stopped' && bus.currentStopIndex === 0) {
          if (simMinutes >= schedule.startMin) {
            triggerNotification(`🚌 ${bus.id} started route ${bus.routeNumber} (Driver: ${bus.driverName})`, "success");
            return { ...bus, status: 'Running', speed: 30 };
          }
          return bus;
        }

        if (bus.status !== 'Running') return bus;

        // 2. Pause/Stop Wait logic: if the bus is currently waiting at a stop
        // Check if current coordinate matches a stop index (every 40 steps is a stop)
        const isAtStop = bus.currentStopIndex % 40 === 0 && bus.currentStopIndex > 0 && bus.currentStopIndex < bus.path.length - 1;
        const stopIdx = Math.floor(bus.currentStopIndex / 40);
        const stop = bus.stops[stopIdx];
        
        if (isAtStop && stop) {
          const stopArrivalKey = `${bus.id}-arrival-${stop.name}`;
          const stopBoardedKey = `${bus.id}-boarded-${stop.name}`;

          // Trigger Arrival Alert once
          if (!alertsSentRef.current[stopArrivalKey]) {
            alertsSentRef.current[stopArrivalKey] = true;
            triggerNotification(`🚌 ${bus.id} has arrived at ${stop.name}.`, "info");
            return { ...bus, speed: 0 };
          }

          // Simulated wait for 5 ticks (10 seconds)
          // We use alertsSentRef counter for wait time simulation
          const waitKey = `${bus.id}-wait-ticks-${stop.name}`;
          const currentTicks = Number(alertsSentRef.current[waitKey] || 0);
          
          if (currentTicks < 5) {
            alertsSentRef.current[waitKey] = (currentTicks + 1) as any;
            return { ...bus, speed: 0 };
          }

          // Once wait ticks completed, board students and resume
          if (!alertsSentRef.current[stopBoardedKey]) {
            alertsSentRef.current[stopBoardedKey] = true;
            
            // Mark students at this stop as Boarded
            setStudents(prevStudents =>
              prevStudents.map(s => {
                if (s.assignedBus === bus.id && s.pickupStop === stop.name) {
                  const boardTime = formatSimTime(simMinutes);
                  triggerNotification(`✅ ${s.name} boarded ${bus.id} at ${boardTime}.`, "success");
                  return { ...s, status: 'On Board', attendance: 'Present' };
                }
                return s;
              })
            );
          }
        }

        // 3. Move bus forward by 1 coordinate index along its path
        const nextIndex = Math.min(bus.path.length - 1, bus.currentStopIndex + 1);
        const currentPos = bus.path[nextIndex];

        // Check if reached school
        if (nextIndex === bus.path.length - 1) {
          triggerNotification(`🏫 ${bus.id} reached Karpagam College of Engineering at ${formatSimTime(simMinutes)}.`, "success");
          
          // Mark all remaining onboard students on this bus as Present/Dropped
          setStudents(prevStudents =>
            prevStudents.map(s => {
              if (s.assignedBus === bus.id && s.status === 'On Board') {
                return { ...s, status: 'Dropped' };
              }
              return s;
            })
          );

          return {
            ...bus,
            currentStopIndex: nextIndex,
            status: 'Stopped',
            speed: 0,
            eta: 'Arrived'
          };
        }

        // 4. Calculate Distance Alerts to NEXT stop (2 km parent-targeted alerts)
        const nextStopIndexInStops = Math.min(bus.stops.length - 1, Math.ceil(nextIndex / 40));
        const nextScheduledStop = bus.stops[nextStopIndexInStops];
        if (nextScheduledStop) {
          const distToNextStop = getDistanceKm(currentPos, { lat: nextScheduledStop.lat, lng: nextScheduledStop.lng });
          const alertKey = `${bus.id}-near-2km-${nextScheduledStop.name}`;
          
          if (distToNextStop <= 2.0 && distToNextStop > 0.1 && !alertsSentRef.current[alertKey]) {
            alertsSentRef.current[alertKey] = true;
            
            // Find students assigned specifically to this next stop on this bus
            const targetStudents = students.filter(s => s.assignedBus === bus.id && s.pickupStop === nextScheduledStop.name);
            const studentNames = targetStudents.map(s => s.name).join(', ');
            const currentSpeed = bus.speed || 35;
            const etaMins = Math.max(1, Math.round((distToNextStop / currentSpeed) * 60));
            
            if (targetStudents.length > 0) {
              triggerNotification(
                `🔔 Parent Notification (${studentNames}): Your child's school bus ${bus.id} is approximately ${distToNextStop.toFixed(1)} km away from ${nextScheduledStop.name} and is expected to arrive in about ${etaMins} minutes.`,
                "warning"
              );
            }
          }
        }

        // Calculate speed fluctuation (25–45 km/h)
        const randomSpeed = Math.floor(Math.random() * (45 - 25 + 1)) + 25;

        // Calculate remaining details
        const totalPoints = bus.path.length;
        const remainingPoints = totalPoints - nextIndex;
        const estMinutesRemaining = Math.ceil(remainingPoints * 0.2); // approx eta minutes
        const etaSchool = formatSimTime(simMinutes + estMinutesRemaining);

        const prevLoc = bus.path[Math.max(0, nextIndex - 1)];
        const simulatedHeading = calculateBearing(prevLoc, currentPos);

        return {
          ...bus,
          currentLocation: undefined, // Clear live tracking overrides in simulator fallback mode
          heading: simulatedHeading,
          currentStopIndex: nextIndex,
          speed: randomSpeed,
          eta: etaSchool
        };
      })
    );
  }, [simMinutes]);

  // Poll live driver behavior from Flask server to sync CV warnings
  useEffect(() => {
    let offlineLogged = false;

    const pollInterval = setInterval(() => {
      fetch("http://localhost:5000/api/driver/behavior")
        .then(res => {
          if (!res.ok) throw new Error("Backend unavailable");
          return res.json();
        })
        .then(data => {
          if (data) {
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
      fetch("http://localhost:5000/api/buses/location")
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
        toggleBusSOS
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
