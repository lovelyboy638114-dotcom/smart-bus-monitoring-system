import React, { useEffect, useState, useRef } from 'react';
import { Eye, ShieldAlert, Award, Volume2, UserCheck, AlertTriangle, Video, VideoOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

const CameraMock = ({ busId = "TN38AB1234", driverName = "Ramesh Kumar", defaultSafetyScore = 85, hideSimulators = false }) => {
  const { triggerAlert, driverBehavior, backendConnected } = useApp();
  
  const [behavior, setBehavior] = useState({
    drowsiness: false,
    mobileUsage: false,
    yawning: false,
    seatbelt: true,
    smoking: false,
    distraction: false,
    safetyScore: defaultSafetyScore
  });

  // Sync behavior parameters dynamically when Python Flask backend is active
  useEffect(() => {
    if (backendConnected && busId === "TN38AB1234") {
      setBehavior({
        drowsiness: driverBehavior.drowsiness,
        mobileUsage: driverBehavior.mobileUsage,
        yawning: driverBehavior.yawning,
        seatbelt: driverBehavior.seatbelt,
        smoking: driverBehavior.smoking,
        distraction: driverBehavior.distraction,
        safetyScore: driverBehavior.safetyScore
      });
    }
  }, [backendConnected, driverBehavior, busId]);

  const [dots, setDots] = useState([]);
  const [webcamActive, setWebcamActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [meshOffset, setMeshOffset] = useState({ x: 0, y: 0 });

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Generate face mesh tracking dots
  useEffect(() => {
    const list = [];
    // Eye left
    for (let i = 0; i < 6; i++) {
      list.push({ x: 130 + Math.sin(i) * 12, y: 95 + Math.cos(i) * 6, type: 'eye' });
    }
    // Eye right
    for (let i = 0; i < 6; i++) {
      list.push({ x: 210 + Math.sin(i) * 12, y: 95 + Math.cos(i) * 6, type: 'eye' });
    }
    // Nose bridge
    list.push({ x: 170, y: 105 });
    list.push({ x: 170, y: 120 });
    list.push({ x: 170, y: 135 });
    // Mouth outline
    for (let i = 0; i < 8; i++) {
      list.push({ x: 170 + Math.sin(i * 0.8) * 18, y: 155 + Math.cos(i * 0.8) * 8, type: 'mouth' });
    }
    // Face outline
    for (let i = 0; i < 15; i++) {
      list.push({ x: 170 + Math.sin(i * 0.25 - 1.8) * 70, y: 125 + Math.cos(i * 0.25 - 1.8) * 75, type: 'outline' });
    }
    setDots(list);
  }, []);

  // WebCam Stream Starter
  const startWebcam = async () => {
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 360, facingMode: 'user' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setWebcamActive(true);
      }
    } catch (err) {
      setCameraError(true);
      setWebcamActive(false);
    }
  };

  // WebCam Stream Stopper
  const stopWebcam = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  useEffect(() => {
    startWebcam();
    return () => {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Animate dots slightly to simulate active facial tracking (Jitter + Floating offset)
  useEffect(() => {
    let t = 0;
    const timer = setInterval(() => {
      t += 0.05;
      const swayX = Math.sin(t) * 4;
      const swayY = Math.cos(t * 1.5) * 3;
      setMeshOffset({ x: swayX, y: swayY });

      setDots((prev) =>
        prev.map((d) => {
          const dx = (Math.random() - 0.5) * 0.8;
          const dy = (Math.random() - 0.5) * 0.8;
          return { ...d, jitterX: dx, jitterY: dy };
        })
      );
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const isDrowsy = behavior.drowsiness;
  const isUsingPhone = behavior.mobileUsage;
  const isYawning = behavior.yawning;
  const isSmoking = behavior.smoking;
  const isSeatbeltOff = !behavior.seatbelt;

  const isDistracted = isUsingPhone || isSmoking;

  const toggleBehavior = (key) => {
    setBehavior(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      
      // Calculate safety score index based on violations
      let score = 95;
      if (updated.drowsiness) score -= 30;
      if (updated.mobileUsage) score -= 25;
      if (updated.yawning) score -= 5;
      if (updated.smoking) score -= 20;
      if (!updated.seatbelt) score -= 15;

      updated.safetyScore = Math.max(10, score);

      // Trigger Alerts dynamically to Admin console
      if (key === 'drowsiness' && updated.drowsiness) {
        triggerAlert("Driver Drowsiness Alert", "High", busId, driverName);
      }
      if (key === 'mobileUsage' && updated.mobileUsage) {
        triggerAlert("Driver Distracted (Mobile)", "High", busId, driverName);
      }
      if (key === 'smoking' && updated.smoking) {
        triggerAlert("Driver Smoking Detected", "High", busId, driverName);
      }
      if (key === 'seatbelt' && !updated.seatbelt) {
        triggerAlert("Driver Seatbelt Unbuckled", "Medium", busId, driverName);
      }

      return updated;
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm font-sans">
      
      {/* Visual Camera Feed Box */}
      <div className="xl:col-span-2 relative aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-200 shadow-inner flex flex-col items-center justify-center">
        
        {/* Real Webcam Stream Feed */}
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-550 ${
            webcamActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Mock Driver Face Silhouette Graphic */}
        {!webcamActive && (
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none opacity-40 z-0">
            <svg viewBox="0 0 340 220" className="w-48 h-auto fill-none stroke-blue-500/20 stroke-1">
              <path d="M 50,220 C 50,180 120,180 170,180 C 220,180 290,180 290,220" strokeWidth="2" />
              <circle cx="170" cy="125" r="40" strokeWidth="3" />
            </svg>
          </div>
        )}

        {/* Scan lines overlays */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_50%,rgba(0,0,0,0.1)_50%)] bg-[size:100%_4px] pointer-events-none z-10 opacity-40" />
        
        {/* Camera HUD Indicator */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${webcamActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
          <span className="px-1.5 py-0.5 text-[8px] font-extrabold tracking-widest text-white bg-slate-900/80 border border-slate-700/30 rounded uppercase font-mono">
            {busId} / {driverName.split(' ')[0]}
          </span>
        </div>

        {/* Bounding Box Overlay */}
        <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none" viewBox="0 0 340 220" preserveAspectRatio="none">
          {/* Eyes box */}
          <rect
            x={110 + meshOffset.x}
            y={80 + meshOffset.y}
            width="120"
            height="32"
            fill="none"
            stroke={isDrowsy ? "#ef4444" : isDistracted ? "#f59e0b" : "#10b981"}
            strokeWidth="1.5"
            className="transition-all duration-100"
          />
          <text 
            x={112 + meshOffset.x} 
            y={76 + meshOffset.y} 
            className={`text-[7px] font-extrabold uppercase ${isDrowsy ? 'fill-rose-600' : isDistracted ? 'fill-amber-500' : 'fill-emerald-600'}`}
          >
            {isDrowsy ? "EYE CLOSURE" : isDistracted ? "Gaze Distracted" : "Gaze OK"}
          </text>

          {/* Mouth box */}
          <rect
            x={140 + meshOffset.x}
            y={140 + meshOffset.y}
            width="60"
            height="26"
            fill="none"
            stroke={isYawning ? "#ef4444" : "#10b981"}
            strokeWidth="1.5"
          />
        </svg>

        {/* Face mesh dots */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <svg className="w-full h-full" viewBox="0 0 340 220" preserveAspectRatio="none">
            {dots.map((d, idx) => {
              const jX = d.jitterX || 0;
              const jY = d.jitterY || 0;
              let dotColor = "fill-emerald-400";
              if (d.type === 'eye' && isDrowsy) dotColor = "fill-rose-500";
              else if (d.type === 'eye' && isDistracted) dotColor = "fill-amber-400";
              else if (d.type === 'mouth' && isYawning) dotColor = "fill-rose-500";

              return (
                <circle
                  key={idx}
                  cx={d.x + meshOffset.x + jX}
                  cy={d.y + meshOffset.y + jY}
                  r={d.type === 'eye' || d.type === 'mouth' ? "1.5" : "1.0"}
                  className={`${dotColor} opacity-70`}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Controller Buttons Panel */}
      <div className="flex flex-col justify-between gap-4">
        {!hideSimulators && (
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Simulate Behaviors</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => toggleBehavior('drowsiness')}
              className={`p-2 rounded-lg border text-left text-[10px] font-bold flex items-center justify-between transition-smooth ${
                isDrowsy ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Drowsiness</span>
              <span className={`px-1 rounded-[3px] text-[7.5px] uppercase ${isDrowsy ? 'bg-rose-605 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {isDrowsy ? 'On' : 'Off'}
              </span>
            </button>

            <button
              onClick={() => toggleBehavior('mobileUsage')}
              className={`p-2 rounded-lg border text-left text-[10px] font-bold flex items-center justify-between transition-smooth ${
                isUsingPhone ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Mobile Phone</span>
              <span className={`px-1 rounded-[3px] text-[7.5px] uppercase ${isUsingPhone ? 'bg-rose-605 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {isUsingPhone ? 'On' : 'Off'}
              </span>
            </button>

            <button
              onClick={() => toggleBehavior('yawning')}
              className={`p-2 rounded-lg border text-left text-[10px] font-bold flex items-center justify-between transition-smooth ${
                isYawning ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Yawning</span>
              <span className={`px-1 rounded-[3px] text-[7.5px] uppercase ${isYawning ? 'bg-rose-605 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {isYawning ? 'On' : 'Off'}
              </span>
            </button>

            <button
              onClick={() => toggleBehavior('smoking')}
              className={`p-2 rounded-lg border text-left text-[10px] font-bold flex items-center justify-between transition-smooth ${
                isSmoking ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Smoking</span>
              <span className={`px-1 rounded-[3px] text-[7.5px] uppercase ${isSmoking ? 'bg-rose-605 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {isSmoking ? 'On' : 'Off'}
              </span>
            </button>

            <button
              onClick={() => toggleBehavior('seatbelt')}
              className={`p-2 rounded-lg border text-left text-[10px] font-bold flex items-center justify-between transition-smooth col-span-2 ${
                isSeatbeltOff ? 'bg-rose-50 border-rose-200 text-rose-750' : 'bg-emerald-50/50 border-emerald-100 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Seatbelt Buckled
              </span>
              <span className={`px-1 rounded-[3px] text-[7.5px] uppercase ${isSeatbeltOff ? 'bg-rose-605 text-white animate-pulse' : 'bg-emerald-600 text-white'}`}>
                {isSeatbeltOff ? 'Unbuckled' : 'Buckled'}
              </span>
            </button>
          </div>
        </div>
      )}

        {/* Safety Score Meter Widget */}
        <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" className="stroke-slate-200 stroke-[4]" />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                className={`stroke-[5] ${
                  behavior.safetyScore > 75 ? 'stroke-emerald-550' : behavior.safetyScore > 50 ? 'stroke-amber-500' : 'stroke-rose-500'
                }`}
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - behavior.safetyScore / 100)}`}
              />
            </svg>
            <span className="absolute text-[10px] font-black text-slate-800">{behavior.safetyScore}%</span>
          </div>

          <div className="min-w-0">
            <h5 className="text-[10px] font-black text-slate-850 leading-none truncate">Safety Rating</h5>
            <p className="text-[9px] text-slate-500 mt-1 font-semibold leading-tight">
              {behavior.safetyScore > 75 ? (
                <span className="text-emerald-600 font-semibold">Excellent State</span>
              ) : behavior.safetyScore > 50 ? (
                <span className="text-amber-600 font-semibold">Fatigue Risk</span>
              ) : (
                <span className="text-rose-600 font-bold animate-pulse">Critical Danger</span>
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CameraMock;
