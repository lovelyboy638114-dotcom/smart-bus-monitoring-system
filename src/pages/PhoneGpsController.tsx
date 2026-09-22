import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bus as BusIcon, 
  Play, 
  Pause, 
  RotateCcw, 
  Navigation, 
  Gauge, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Smartphone,
  Radio,
  Send,
  Wifi,
  Compass,
  Crosshair,
  Zap,
  ShieldCheck,
  Target,
  QrCode,
  Copy,
  Check,
  ChevronRight,
  Sliders,
  Maximize2,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  student?: string;
  parentName?: string;
  parentPhone?: string;
}

export interface BusRoutePreset {
  id: string;
  name: string;
  routeCode: string;
  routeName: string;
  color: string;
  driver: string;
  stops: RouteStop[];
}

export const BUS_ROUTES: BusRoutePreset[] = [
  {
    id: 'TN38AB1234',
    name: 'Bus 1',
    routeCode: 'R-01',
    routeName: 'Route A (Ukkadam Loop)',
    color: '#2563eb',
    driver: 'Ramesh Driver',
    stops: [
      { id: '118', name: 'Ukkadam Bus Stand', lat: 10.9925, lng: 76.9616, student: 'Sathish R (STD001)', parentName: 'Ravi Kumar', parentPhone: '7010846064' },
      { id: '119', name: 'Sundarapuram', lat: 10.9595, lng: 76.9755, student: 'Ragunath S (STD002)', parentName: 'Suresh Kumar', parentPhone: '8220986029' },
      { id: '120', name: 'Eachanari', lat: 10.9060, lng: 76.9865, student: 'Noyal Ashwin M (STD003)', parentName: 'Mohan Raj', parentPhone: '6381276381' },
      { id: '121', name: 'Karpagam Signal', lat: 10.8985, lng: 76.9950, student: 'Sharon M (STD004)', parentName: 'Manoharan', parentPhone: '9842154321' },
      { id: '122', name: 'Malumichampatti', lat: 10.8872, lng: 77.0015, student: 'Gokulnath P (STD005)', parentName: 'Prabhu', parentPhone: '9789456123' },
      { id: '123', name: 'Othakalmandapam', lat: 10.8750, lng: 77.0120, student: 'Hemachandran K (STD006) & Naveenraj S (STD007)', parentName: 'Krishnamoorthy / Senthil', parentPhone: '9443123456' },
      { id: '124', name: 'Karpagam College of Engineering (KCE)', lat: 10.8801, lng: 77.0224, student: 'Campus Destination' }
    ]
  },
  {
    id: 'TN38CD5678',
    name: 'Bus 2',
    routeCode: 'R-02',
    routeName: 'Route B (Pollachi Loop)',
    color: '#16a34a',
    driver: 'Suresh Pillai',
    stops: [
      { id: '125', name: 'Pollachi Bus Stand', lat: 10.6580, lng: 77.0090, student: 'Naresh Kumar R (STD008)', parentName: 'Ramesh Kumar', parentPhone: '9876543210' },
      { id: '126', name: 'Achipatti', lat: 10.6850, lng: 77.0125, student: 'Sriram V (STD009)', parentName: 'Venkat', parentPhone: '9876543211' },
      { id: '127', name: 'Kovilpalayam', lat: 10.7250, lng: 77.0160, student: 'Shahul P (STD010)', parentName: 'Peer', parentPhone: '9876543212' },
      { id: '128', name: 'Thamaraikulam', lat: 10.7600, lng: 77.0180, student: 'Venkateshwaran R (STD011)', parentName: 'Ravi', parentPhone: '9876543213' },
      { id: '129', name: 'Kinathukadavu', lat: 10.8170, lng: 77.0205, student: 'Sanjai S (STD012)', parentName: 'Sekar', parentPhone: '9876543214' },
      { id: '130', name: 'Millgate', lat: 10.8450, lng: 77.0215, student: 'Kamalesh K (STD013)', parentName: 'Kumar', parentPhone: '9876543215' },
      { id: '131', name: 'Myleripalayam', lat: 10.8650, lng: 77.0220, student: 'Venkatesh V (STD014)', parentName: 'Velusamy', parentPhone: '9876543216' },
      { id: '132', name: 'Karpagam College of Engineering (KCE)', lat: 10.8801, lng: 77.0224, student: 'Campus Destination' }
    ]
  },
  {
    id: 'TN38EP9012',
    name: 'Bus 3',
    routeCode: 'R-03',
    routeName: 'Route C (Singanallur Loop)',
    color: '#dc2626',
    driver: 'Kumar Swamy',
    stops: [
      { id: '133', name: 'Singanallur', lat: 10.9985, lng: 77.0273, student: 'Pottrivendhan R (STD015)', parentName: 'Rajendran', parentPhone: '9876543217' },
      { id: '134', name: 'Ondipudur', lat: 10.9940, lng: 77.0580, student: 'Nithish P (STD016)', parentName: 'Palanisamy', parentPhone: '9876543218' },
      { id: '135', name: 'Pattanam Pirivu', lat: 10.9650, lng: 77.0650, student: 'Avinesh K (STD017)', parentName: 'Krishnan', parentPhone: '9876543219' },
      { id: '136', name: 'Chinthamanipudur', lat: 10.9420, lng: 77.0610, student: 'Gopi R (STD018)', parentName: 'Ramasamy', parentPhone: '9876543220' },
      { id: '137', name: 'Chettipalayam', lat: 10.9020, lng: 77.0420, student: 'Ragav T (STD019) & Kishore S (STD020)', parentName: 'Thirumurugan / Suresh', parentPhone: '9876543221' },
      { id: '138', name: 'Karpagam College of Engineering (KCE)', lat: 10.8801, lng: 77.0224, student: 'Campus Destination' }
    ]
  }
];

// Haversine formula to compute distance in km
export const getDistanceKm = (c1: Coordinate, c2: Coordinate): number => {
  const R = 6371;
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

// Generate high-resolution waypoints along an array of stops
const interpolateFullRoute = (stops: RouteStop[], stepsPerSegment = 25): Coordinate[] => {
  const points: Coordinate[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const start = stops[i];
    const end = stops[i + 1];
    for (let j = 0; j < stepsPerSegment; j++) {
      const t = j / stepsPerSegment;
      const curveOffset = Math.sin(t * Math.PI) * 0.002;
      points.push({
        lat: Number((start.lat + (end.lat - start.lat) * t + curveOffset).toFixed(6)),
        lng: Number((start.lng + (end.lng - start.lng) * t - curveOffset * 0.5).toFixed(6)),
      });
    }
  }
  points.push({ lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng });
  return points;
};

// Calculate an approach point ~1.8 km upstream before a given target stop
const getApproachPoint1_8km = (stops: RouteStop[], stopIdx: number): Coordinate => {
  const targetStop = stops[stopIdx];
  if (stopIdx === 0) {
    // Offset slightly northward
    return {
      lat: Number((targetStop.lat + 0.0150).toFixed(6)),
      lng: Number((targetStop.lng + 0.0080).toFixed(6))
    };
  }
  const prevStop = stops[stopIdx - 1];
  const totalSegDist = getDistanceKm(prevStop, targetStop);
  if (totalSegDist <= 1.8) {
    // Position 85% towards target from previous stop
    return {
      lat: Number((prevStop.lat + (targetStop.lat - prevStop.lat) * 0.2).toFixed(6)),
      lng: Number((prevStop.lng + (targetStop.lng - prevStop.lng) * 0.2).toFixed(6))
    };
  }
  // Target is ~1.75 km from targetStop along segment
  const ratio = Math.max(0.1, 1 - (1.75 / totalSegDist));
  return {
    lat: Number((prevStop.lat + (targetStop.lat - prevStop.lat) * ratio).toFixed(6)),
    lng: Number((prevStop.lng + (targetStop.lng - prevStop.lng) * ratio).toFixed(6))
  };
};

export const PhoneGpsController: React.FC = () => {
  // Mode: 'assigned_route' (scrubber + stops) | 'manual_coords' | 'real_phone'
  const [controlMode, setControlMode] = useState<'assigned_route' | 'manual_coords' | 'real_phone'>('assigned_route');

  // Selected Bus
  const [selectedBusId, setSelectedBusId] = useState<string>('TN38AB1234');
  const activeBusRoute = useMemo(() => {
    return BUS_ROUTES.find(b => b.id === selectedBusId) || BUS_ROUTES[0];
  }, [selectedBusId]);

  // Interpolated waypoints along the assigned route
  const assignedWaypoints = useMemo(() => {
    return interpolateFullRoute(activeBusRoute.stops, 25);
  }, [activeBusRoute]);

  // Backend Target URL
  const defaultBackend = API_BASE_URL;
  const [backendUrl, setBackendUrl] = useState<string>(defaultBackend);

  // Current bus coordinates & speed
  const [busCoords, setBusCoords] = useState<Coordinate>({
    lat: activeBusRoute.stops[0].lat,
    lng: activeBusRoute.stops[0].lng
  });
  const [speedKmh, setSpeedKmh] = useState<number>(35);

  // --- Route Scrubber State ---
  const [scrubberPercent, setScrubberPercent] = useState<number>(0);
  const [isDrivingRoute, setIsDrivingRoute] = useState<boolean>(false);
  const driveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Manual Coords Form State ---
  const [manualLat, setManualLat] = useState<string>(activeBusRoute.stops[0].lat.toFixed(6));
  const [manualLng, setManualLng] = useState<string>(activeBusRoute.stops[0].lng.toFixed(6));
  const [manualSpeed, setManualSpeed] = useState<number>(35);

  // --- Real Phone GPS State ---
  const [isPhoneTracking, setIsPhoneTracking] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const realGpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Telemetry status & metrics
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'transmitting' | 'error'>('idle');
  const [pingsSentCount, setPingsSentCount] = useState<number>(0);
  const [lastSentTime, setLastSentTime] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Ready. Select a control mode to move the bus.');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [resetAlertSuccess, setResetAlertSuccess] = useState<boolean>(false);

  // Nearest stop & 2KM proximity detection
  const proximityInfo = useMemo(() => {
    let nearestStop: RouteStop = activeBusRoute.stops[0];
    let minDistance = 9999;

    for (const stop of activeBusRoute.stops) {
      const dist = getDistanceKm(busCoords, { lat: stop.lat, lng: stop.lng });
      if (dist < minDistance) {
        minDistance = dist;
        nearestStop = stop;
      }
    }

    const currentSpeed = speedKmh > 0 ? speedKmh : 30;
    const etaMinutes = Math.max(1, Math.round((minDistance / currentSpeed) * 60));
    const isWithin2Km = minDistance <= 2.15 && minDistance >= 0.05;

    return {
      nearestStop,
      distanceKm: minDistance,
      etaMinutes,
      isWithin2Km
    };
  }, [busCoords, activeBusRoute, speedKmh]);

  // Re-initialize coords when bus route changes
  useEffect(() => {
    const firstStop = activeBusRoute.stops[0];
    setBusCoords({ lat: firstStop.lat, lng: firstStop.lng });
    setManualLat(firstStop.lat.toFixed(6));
    setManualLng(firstStop.lng.toFixed(6));
    setScrubberPercent(0);
    setIsDrivingRoute(false);
    setStatusMessage(`Switched to ${activeBusRoute.name} (${activeBusRoute.routeName}).`);
  }, [activeBusRoute]);

  // Transmit single telemetry ping to backend
  const sendTelemetryPing = async (pos: Coordinate, currentSpeed: number, isLastStep = false) => {
    try {
      setConnectionStatus('transmitting');
      const payload = {
        busId: selectedBusId,
        latitude: Number(pos.lat.toFixed(6)),
        longitude: Number(pos.lng.toFixed(6)),
        speed: Math.max(0, Math.round(currentSpeed)),
        acceleration: 0.1,
        heading: 45,
        status: isLastStep ? 'Stopped' : 'Running'
      };

      const res = await fetch(`${backendUrl}/api/v1/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setConnectionStatus('idle');
        setLastSentTime(new Date().toLocaleTimeString());
        setPingsSentCount(c => c + 1);

        // Check if proximity alert was dispatched
        const dist = getDistanceKm(pos, { lat: proximityInfo.nearestStop.lat, lng: proximityInfo.nearestStop.lng });
        if (dist <= 2.15 && dist >= 0.05) {
          setStatusMessage(
            `🚨 2 KM GEOFENCE ALERT! Bus is ${dist.toFixed(2)} km from ${proximityInfo.nearestStop.name}. WhatsApp alert & ~${proximityInfo.etaMinutes} min ETA sent to parent.`
          );
        }
      } else {
        setConnectionStatus('error');
      }
    } catch (err: any) {
      console.error('[Phone GPS] Transmit error:', err);
      setConnectionStatus('error');
    }
  };

  // Reset deduplication cache on backend
  const handleResetTripCache = async () => {
    try {
      await fetch(`${backendUrl}/api/v1/telemetry/reset?busId=${selectedBusId}`, { method: 'POST' });
      setResetAlertSuccess(true);
      setStatusMessage(`🔄 Geofence deduplication cleared for ${selectedBusId}. You can trigger 2KM alerts again!`);
      setTimeout(() => setResetAlertSuccess(false), 3000);
    } catch (e) {
      console.warn('Failed to reset deduplication:', e);
    }
  };

  // --- Route Scrubber Drag Handler ---
  const handleScrubberChange = (newPercent: number) => {
    setScrubberPercent(newPercent);
    const totalWaypoints = assignedWaypoints.length;
    const targetIdx = Math.min(
      totalWaypoints - 1,
      Math.max(0, Math.round((newPercent / 100) * (totalWaypoints - 1)))
    );
    const targetPos = assignedWaypoints[targetIdx];
    setBusCoords(targetPos);
    setManualLat(targetPos.lat.toFixed(6));
    setManualLng(targetPos.lng.toFixed(6));
    sendTelemetryPing(targetPos, speedKmh);
    setStatusMessage(`Bus scrubbed to ${newPercent}% of ${activeBusRoute.routeName} (${targetPos.lat.toFixed(4)}, ${targetPos.lng.toFixed(4)}).`);
  };

  // --- Stop Quick Jump Handlers ---
  const handleJumpToStop = (stop: RouteStop) => {
    const pos = { lat: stop.lat, lng: stop.lng };
    setBusCoords(pos);
    setManualLat(pos.lat.toFixed(6));
    setManualLng(pos.lng.toFixed(6));
    sendTelemetryPing(pos, 0);
    setStatusMessage(`📍 Bus arrived directly at stop: ${stop.name}.`);
  };

  const handleApproachStop2Km = (stopIdx: number) => {
    const targetStop = activeBusRoute.stops[stopIdx];
    const approachPoint = getApproachPoint1_8km(activeBusRoute.stops, stopIdx);
    setBusCoords(approachPoint);
    setManualLat(approachPoint.lat.toFixed(6));
    setManualLng(approachPoint.lng.toFixed(6));
    setSpeedKmh(35);
    
    // Transmit location ~1.8 km from stop
    sendTelemetryPing(approachPoint, 35);
    
    const dist = getDistanceKm(approachPoint, { lat: targetStop.lat, lng: targetStop.lng });
    const etaMins = Math.max(1, Math.round((dist / 35) * 60));
    setStatusMessage(
      `⚡ Approaching ${targetStop.name} (${dist.toFixed(2)} km away). Fired 2KM Proximity Alert with ~${etaMins} min ETA!`
    );
  };

  // --- Auto-Drive Along Assigned Route Loop ---
  useEffect(() => {
    if (isDrivingRoute && assignedWaypoints.length > 0) {
      driveTimerRef.current = setInterval(() => {
        setScrubberPercent(prevPercent => {
          const nextPercent = prevPercent + 2;
          if (nextPercent >= 100) {
            setIsDrivingRoute(false);
            const finalPos = assignedWaypoints[assignedWaypoints.length - 1];
            setBusCoords(finalPos);
            sendTelemetryPing(finalPos, 0, true);
            setStatusMessage(`🏁 Arrived at final stop: ${activeBusRoute.stops[activeBusRoute.stops.length - 1].name}! Route completed.`);
            return 100;
          }

          const totalWaypoints = assignedWaypoints.length;
          const targetIdx = Math.min(
            totalWaypoints - 1,
            Math.max(0, Math.round((nextPercent / 100) * (totalWaypoints - 1)))
          );
          const currentPos = assignedWaypoints[targetIdx];
          setBusCoords(currentPos);
          setManualLat(currentPos.lat.toFixed(6));
          setManualLng(currentPos.lng.toFixed(6));
          sendTelemetryPing(currentPos, speedKmh);
          return nextPercent;
        });
      }, 2500);
    } else {
      if (driveTimerRef.current) {
        clearInterval(driveTimerRef.current);
        driveTimerRef.current = null;
      }
    }

    return () => {
      if (driveTimerRef.current) clearInterval(driveTimerRef.current);
    };
  }, [isDrivingRoute, assignedWaypoints, speedKmh, activeBusRoute, backendUrl, selectedBusId]);

  // --- Real Phone GPS Hardware Watch ---
  const startPhoneGpsHardware = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser or device.');
      return;
    }
    setGpsError(null);
    setIsPhoneTracking(true);
    setStatusMessage('📡 Hooking into device GPS satellite sensor...');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        const currentCoord = { lat: latitude, lng: longitude };
        setBusCoords(currentCoord);
        setManualLat(latitude.toFixed(6));
        setManualLng(longitude.toFixed(6));
        setGpsAccuracy(accuracy);

        let computedSpeed = 25;
        if (speed !== null && speed >= 0) {
          computedSpeed = Math.round(speed * 3.6);
        }
        setSpeedKmh(computedSpeed);
        sendTelemetryPing(currentCoord, computedSpeed);
        setStatusMessage(`📡 Hardware GPS Active (±${Math.round(accuracy)}m). Transmitting live phone coordinates.`);
      },
      (err) => {
        console.warn('GPS hardware error:', err);
        setGpsError(err.message || 'GPS location access denied or timed out.');
      },
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 10000 }
    );

    // Keepalive ping every 3s
    realGpsIntervalRef.current = setInterval(() => {
      setBusCoords(current => {
        sendTelemetryPing(current, speedKmh);
        return current;
      });
    }, 3000);
  };

  const stopPhoneGpsHardware = () => {
    setIsPhoneTracking(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (realGpsIntervalRef.current) {
      clearInterval(realGpsIntervalRef.current);
      realGpsIntervalRef.current = null;
    }
    setStatusMessage('⏹️ Hardware GPS tracking stopped.');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (realGpsIntervalRef.current) clearInterval(realGpsIntervalRef.current);
    };
  }, []);

  const [deviceIp, setDeviceIp] = useState<string>('10.56.62.126');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setDeviceIp(window.location.hostname);
      } else {
        fetch('/api/network-ip')
          .then(r => r.json())
          .then(data => {
            if (data && data.ip) setDeviceIp(data.ip);
          })
          .catch(() => {});
      }
    }
  }, []);

  const isCloud = window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const phoneUrl = isCloud ? `${window.location.origin}/gps-controller` : `http://${deviceIp}:5173/gps-controller`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-3 pb-16 max-w-lg mx-auto flex flex-col gap-3.5">
      {/* ================= TOP HEADER & CONNECTION CARD ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
              <Smartphone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-white tracking-tight">SafeBus GPS Controller</h1>
                <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Live Sim
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Phone-Controlled Bus GPS & 2KM Alerts</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowQrModal(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all"
              title="View QR Code for Phone Link"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              (isPhoneTracking || isDrivingRoute || connectionStatus === 'transmitting')
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${(isPhoneTracking || isDrivingRoute || connectionStatus === 'transmitting') ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              {(isPhoneTracking || isDrivingRoute) ? 'TRANSMITTING' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Quick Connection URL Banner */}
        <div className="mt-3 p-2.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 truncate text-slate-300">
            <Wifi className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{phoneUrl}</span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(phoneUrl);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 transition-all"
          >
            {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copiedLink ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Backend Target Input */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Gateway: <strong className="text-indigo-400">{backendUrl}</strong></span>
          <span>Pings Sent: <strong className="text-white">{pingsSentCount}</strong> {lastSentTime && `(${lastSentTime})`}</span>
        </div>
      </div>

      {/* ================= BUS SELECTION TABS ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
          Select Vehicle & Assigned Route
        </label>
        <div className="grid grid-cols-3 gap-2">
          {BUS_ROUTES.map((bus) => {
            const isSelected = selectedBusId === bus.id;
            return (
              <button
                key={bus.id}
                onClick={() => {
                  setSelectedBusId(bus.id);
                  handleResetTripCache();
                }}
                className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`text-[11px] font-black ${isSelected ? 'text-slate-950' : 'text-white'}`}>
                    {bus.name}
                  </span>
                  <BusIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} />
                </div>
                <div className={`text-[9px] font-bold truncate ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                  {bus.routeCode}
                </div>
                <div className={`text-[8px] truncate mt-0.5 ${isSelected ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                  {bus.id}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= 2KM PROXIMITY & ETA STATUS HUD ================= */}
      <div className={`p-4 rounded-3xl border transition-all shadow-xl ${
        proximityInfo.isWithin2Km
          ? 'bg-gradient-to-br from-emerald-950/80 to-slate-900 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/20'
          : 'bg-slate-900 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              proximityInfo.isWithin2Km
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              {proximityInfo.isWithin2Km ? <Zap className="w-6 h-6 fill-emerald-400" /> : <Target className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black uppercase tracking-wider ${
                  proximityInfo.isWithin2Km ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {proximityInfo.isWithin2Km ? '🚨 2 KM GEOFENCE ACTIVE' : 'PROXIMITY RADAR'}
                </span>
              </div>
              <p className="font-black text-white text-sm mt-0.5">
                Target: {proximityInfo.nearestStop.name}
              </p>
              {proximityInfo.nearestStop.student && (
                <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                  Student: {proximityInfo.nearestStop.student}
                  {proximityInfo.nearestStop.parentName && ` (Parent: ${proximityInfo.nearestStop.parentName})`}
                </p>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xl font-black text-amber-400 font-mono">
              {proximityInfo.distanceKm.toFixed(2)} <span className="text-xs font-normal text-slate-400">km</span>
            </div>
            <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
              ETA: ~{proximityInfo.etaMinutes} min
            </div>
          </div>
        </div>

        {proximityInfo.isWithin2Km && (() => {
          const nearest = proximityInfo.nearestStop;
          const phone = nearest.parentPhone || '7010846064';
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          const intlPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
          const alertMsg = `🚨 SafeBus Alert: Bus ${selectedBusId} is approximately ${proximityInfo.distanceKm.toFixed(2)} km away from ${nearest.name} and is expected to arrive in about ${proximityInfo.etaMinutes} minutes${nearest.student ? ' for ' + nearest.student : ''}.`;
          const waUrl = `https://api.whatsapp.com/send?phone=${intlPhone}&text=${encodeURIComponent(alertMsg)}`;

          return (
            <div className="mt-3 pt-3 border-t border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-emerald-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  2KM Geofence Alert Activated for {nearest.name}!
                </span>
                <button
                  onClick={handleResetTripCache}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold"
                >
                  Re-Arm Alert
                </button>
              </div>

              {/* 1-Click WhatsApp Direct Alert Button */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white font-black rounded-xl shadow-lg shadow-emerald-950/40 text-xs uppercase tracking-wider transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                <span>📲 Open WhatsApp & Send Alert (+91 {cleanPhone})</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
              </a>
              <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed">
                Tap above to open WhatsApp directly with pre-filled alert message for {nearest.parentName || 'Parent'}.
              </p>
            </div>
          );
        })()}
      </div>

      {/* ================= MODE SELECTION TABS ================= */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
        <button
          onClick={() => {
            setControlMode('assigned_route');
            stopPhoneGpsHardware();
          }}
          className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 ${
            controlMode === 'assigned_route'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          Route Slider
        </button>

        <button
          onClick={() => {
            setControlMode('manual_coords');
            stopPhoneGpsHardware();
            setIsDrivingRoute(false);
          }}
          className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 ${
            controlMode === 'manual_coords'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          Manual GPS
        </button>

        <button
          onClick={() => {
            setControlMode('real_phone');
            setIsDrivingRoute(false);
          }}
          className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 ${
            controlMode === 'real_phone'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Phone Sensor
        </button>
      </div>

      {/* ================= MODE 1: ASSIGNED ROUTE TRAVEL & SCRUBBER ================= */}
      {controlMode === 'assigned_route' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                Assigned Route Movement
              </span>
              <h3 className="text-sm font-black text-white">{activeBusRoute.routeName}</h3>
            </div>
            <button
              onClick={handleResetTripCache}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold border border-slate-700"
              title="Reset deduplication cache to re-fire 2km alerts"
            >
              Reset Cache
            </button>
          </div>

          {/* Interactive Route Scrubber Slider */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                Route Progress Scrubber: <span className="text-amber-400 font-mono font-black">{scrubberPercent}%</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {assignedWaypoints.length} waypoints
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={scrubberPercent}
              onChange={(e) => handleScrubberChange(Number(e.target.value))}
              className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-1.5">
              <span>{activeBusRoute.stops[0].name.split(' ')[0]} (0%)</span>
              <span>Mid-Route (50%)</span>
              <span>KCE Campus (100%)</span>
            </div>
          </div>

          {/* Speed Slider & Auto Drive Controls */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Speed
                </label>
                <span className="text-xs font-black text-white font-mono">{speedKmh} km/h</span>
              </div>
              <input
                type="range"
                min="15"
                max="65"
                step="5"
                value={speedKmh}
                onChange={(e) => setSpeedKmh(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {!isDrivingRoute ? (
                <button
                  onClick={() => {
                    if (scrubberPercent >= 98) setScrubberPercent(0);
                    setIsDrivingRoute(true);
                    sendTelemetryPing(busCoords, speedKmh);
                  }}
                  className="flex-1 h-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  Auto Drive
                </button>
              ) : (
                <button
                  onClick={() => setIsDrivingRoute(false)}
                  className="flex-1 h-full bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                >
                  <Pause className="w-4 h-4 fill-white" />
                  Pause Drive
                </button>
              )}

              <button
                onClick={() => {
                  setIsDrivingRoute(false);
                  handleScrubberChange(0);
                }}
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-2xl active:scale-95 transition-all"
                title="Reset to Start Stop"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Assigned Stops Jump List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Assigned Stops Sequence & 2KM Triggers:
              </label>
              <span className="text-[10px] text-slate-500">Tap to Jump or Approach</span>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {activeBusRoute.stops.map((stop, idx) => {
                const distToThisStop = getDistanceKm(busCoords, { lat: stop.lat, lng: stop.lng });
                const isVeryClose = distToThisStop < 0.2;

                return (
                  <div
                    key={stop.id}
                    className={`p-2.5 rounded-2xl border transition-all text-xs flex flex-col gap-2 ${
                      isVeryClose
                        ? 'bg-amber-500/10 border-amber-500/50'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-black text-white text-xs">{stop.name}</p>
                          {stop.student ? (
                            <p className="text-[10px] text-amber-300 font-semibold mt-0.5">
                              👤 {stop.student}
                            </p>
                          ) : (
                            <p className="text-[9px] text-slate-500 font-mono">
                              ({stop.lat.toFixed(4)}, {stop.lng.toFixed(4)})
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-black text-cyan-400">
                          {distToThisStop.toFixed(1)} km
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons for this Stop */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => handleApproachStop2Km(idx)}
                        className="py-1.5 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-[10px] flex items-center justify-center gap-1 shadow-sm transition-all"
                        title="Set bus location 1.8km before this stop to trigger the 2KM WhatsApp alert"
                      >
                        <Zap className="w-3 h-3 fill-slate-950" />
                        ⚡ Approach 1.8 km (2KM Alert)
                      </button>

                      <button
                        onClick={() => handleJumpToStop(stop)}
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1 transition-all"
                      >
                        <MapPin className="w-3 h-3 text-rose-400" />
                        📍 At Stop (0 km)
                      </button>
                    </div>

                    {stop.parentPhone && (
                      <a
                        href={`https://api.whatsapp.com/send?phone=91${stop.parentPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(`🚨 SafeBus Alert: Bus ${selectedBusId} is approximately 1.8 km away from ${stop.name} and is expected to arrive in about 5 minutes${stop.student ? ' for ' + stop.student : ''}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 hover:text-white font-black rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <MessageCircle className="w-3 h-3 fill-emerald-400 text-emerald-400 shrink-0" />
                        <span>Open WhatsApp Alert (+91 {stop.parentPhone})</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODE 2: MANUAL GPS COORDINATES SETTER ================= */}
      {controlMode === 'manual_coords' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black text-white">Manual GPS Coordinate Input</h3>
            </div>
            <span className="text-[10px] text-slate-400">Zero physical movement required</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Latitude (°N)
              </label>
              <input
                type="number"
                step="0.0001"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:border-amber-500 focus:outline-none"
                placeholder="10.9595"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Longitude (°E)
              </label>
              <input
                type="number"
                step="0.0001"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:border-amber-500 focus:outline-none"
                placeholder="76.9755"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Bus Speed (km/h)
              </label>
              <input
                type="number"
                min="0"
                max="80"
                value={manualSpeed}
                onChange={(e) => setManualSpeed(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white font-bold focus:border-amber-500 focus:outline-none"
                placeholder="35"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  const lat = parseFloat(manualLat);
                  const lng = parseFloat(manualLng);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    const pos = { lat, lng };
                    setBusCoords(pos);
                    setSpeedKmh(manualSpeed);
                    sendTelemetryPing(pos, manualSpeed);
                    setStatusMessage(`📡 Transmitted custom GPS location: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E.`);
                  }
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                Transmit Ping
              </button>
            </div>
          </div>

          {/* Quick Coordinate Presets */}
          <div className="border-t border-slate-800 pt-3">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              ⚡ 1-Tap 2KM Alert & Key Location Presets:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  // Sundarapuram 1.8km approach (Ragunath S)
                  const pos = { lat: 10.9700, lng: 76.9740 };
                  setBusCoords(pos);
                  setManualLat(pos.lat.toFixed(6));
                  setManualLng(pos.lng.toFixed(6));
                  setManualSpeed(35);
                  sendTelemetryPing(pos, 35);
                  setStatusMessage(`🎯 Bus placed 1.2 km from Sundarapuram. Triggering 2KM WhatsApp Alert for Ragunath S!`);
                }}
                className="p-2.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 hover:border-amber-400 rounded-xl text-left transition-all"
              >
                <div className="flex items-center gap-1 text-amber-400 text-[11px] font-black">
                  <Zap className="w-3 h-3 fill-amber-400" />
                  Sundarapuram Approach
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">1.2 km away • Ragunath S (STD002)</div>
              </button>

              <button
                onClick={() => {
                  // Eachanari 1.8km approach (Noyal Ashwin)
                  const pos = { lat: 10.9180, lng: 76.9800 };
                  setBusCoords(pos);
                  setManualLat(pos.lat.toFixed(6));
                  setManualLng(pos.lng.toFixed(6));
                  setManualSpeed(35);
                  sendTelemetryPing(pos, 35);
                  setStatusMessage(`🎯 Bus placed 1.4 km from Eachanari. Triggering 2KM WhatsApp Alert for Noyal Ashwin M!`);
                }}
                className="p-2.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 hover:border-amber-400 rounded-xl text-left transition-all"
              >
                <div className="flex items-center gap-1 text-amber-400 text-[11px] font-black">
                  <Zap className="w-3 h-3 fill-amber-400" />
                  Eachanari Approach
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">1.4 km away • Noyal Ashwin (STD003)</div>
              </button>

              <button
                onClick={() => {
                  // Ukkadam 1.8km approach (Sathish R)
                  const pos = { lat: 11.0010, lng: 76.9630 };
                  setBusCoords(pos);
                  setManualLat(pos.lat.toFixed(6));
                  setManualLng(pos.lng.toFixed(6));
                  setManualSpeed(30);
                  sendTelemetryPing(pos, 30);
                  setStatusMessage(`🎯 Bus placed 1.0 km from Ukkadam. Triggering 2KM WhatsApp Alert for Sathish R!`);
                }}
                className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all"
              >
                <div className="text-[11px] font-bold text-slate-200">Ukkadam Approach</div>
                <div className="text-[9px] text-slate-400 mt-0.5">1.0 km away • Sathish R (STD001)</div>
              </button>

              <button
                onClick={() => {
                  // Karpagam Campus (Destination)
                  const pos = { lat: 10.8801, lng: 77.0224 };
                  setBusCoords(pos);
                  setManualLat(pos.lat.toFixed(6));
                  setManualLng(pos.lng.toFixed(6));
                  setManualSpeed(0);
                  sendTelemetryPing(pos, 0, true);
                  setStatusMessage(`🏁 Bus arrived at Karpagam College of Engineering!`);
                }}
                className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all"
              >
                <div className="text-[11px] font-bold text-slate-200">Karpagam Campus</div>
                <div className="text-[9px] text-slate-400 mt-0.5">Destination • 0 km away</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODE 3: REAL HARDWARE PHONE SENSOR ================= */}
      {controlMode === 'real_phone' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400" />
              <h3 className="font-black text-sm text-white">Smartphone Hardware Sensor</h3>
            </div>
            {gpsAccuracy !== null && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                ±{Math.round(gpsAccuracy)}m
              </span>
            )}
          </div>

          {gpsError && (
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-bold">GPS Permission / Sensor Notice:</p>
                <p className="mt-0.5 opacity-90">{gpsError}</p>
                <p className="mt-1 text-[11px] text-rose-200">
                  Tip: Switch to <strong>"Route Slider"</strong> or <strong>"Manual GPS"</strong> to simulate instantly without physical movement!
                </p>
              </div>
            </div>
          )}

          {!isPhoneTracking ? (
            <button
              onClick={startPhoneGpsHardware}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm tracking-wide uppercase"
            >
              <Radio className="w-5 h-5 animate-pulse" />
              Start Physical Phone GPS
            </button>
          ) : (
            <button
              onClick={stopPhoneGpsHardware}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 px-6 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-sm uppercase"
            >
              <Pause className="w-5 h-5 fill-white" />
              Stop Physical Phone GPS
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone Speed</span>
              <span className="text-lg font-black text-white font-mono mt-0.5 block">{speedKmh} km/h</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Dist to Stop</span>
              <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">
                {proximityInfo.distanceKm.toFixed(2)} km
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= LIVE COORDINATES & STATUS BAR ================= */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3 flex flex-col gap-1.5 text-center text-xs">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Active Bus: <strong className="text-white">{selectedBusId}</strong></span>
          <span className="text-emerald-400 font-black">
            {busCoords.lat.toFixed(6)}° N, {busCoords.lng.toFixed(6)}° E
          </span>
        </div>
        <p className="text-slate-300 font-semibold text-[11px] mt-0.5">
          {statusMessage}
        </p>
      </div>

      {/* ================= QR CODE POPUP MODAL ================= */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-800 shadow-2xl flex flex-col gap-4 text-center">
            <div className="flex items-center justify-between text-left">
              <div>
                <h3 className="text-base font-black text-white">Scan from Phone</h3>
                <p className="text-xs text-slate-400">Open this live controller on any smartphone</p>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-white p-3 rounded-2xl mx-auto shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(phoneUrl)}`}
                alt="Scan to open GPS Controller"
                className="w-44 h-44 mx-auto rounded-xl"
              />
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono text-indigo-300 truncate">
              {phoneUrl}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(phoneUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy Link'}
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneGpsController;
