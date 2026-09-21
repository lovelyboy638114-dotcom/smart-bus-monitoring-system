import React, { useEffect, useState, useRef } from 'react';
import { Eye, ShieldAlert, Award, Volume2, UserCheck, AlertTriangle, Video, VideoOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playAlertBuzzer, unlockAudio } from '../utils/buzzer';
import { acquireSharedWebcam, releaseSharedWebcam } from '../utils/webcamStream';
import { CV_SERVICE_URL } from '../config';

const CameraMock = ({ 
  busId = "TN38AB1234", 
  driverName = "Ramesh Kumar", 
  defaultSafetyScore = 85, 
  hideSimulators = false,
  isActiveWebcam = true,
  onSelectActive = null
}) => {
  const { triggerAlert, allDriverBehaviors, backendConnected } = useApp();

  const [behavior, setBehavior] = useState({
    drowsiness: false,
    mobileUsage: false,
    yawning: false,
    seatbelt: true,
    smoking: false,
    distraction: false,
    safetyScore: defaultSafetyScore
  });

  const [dots, setDots] = useState([]);
  const [webcamActive, setWebcamActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [meshOffset, setMeshOffset] = useState({ x: 0, y: 0 });
  const [processedImg, setProcessedImg] = useState(null);
  const [cvTelemetry, setCvTelemetry] = useState(null);
  const [isBuzzerActive, setIsBuzzerActive] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastAlertRef = useRef('NORMAL');
  const isProcessingRef = useRef(false);

  // Synchronize buzzer sound active animation across components
  useEffect(() => {
    const handleBuzzerState = (e) => {
      setIsBuzzerActive(e.detail?.active || false);
    };
    window.addEventListener('safebus-buzzer-state', handleBuzzerState);
    return () => window.removeEventListener('safebus-buzzer-state', handleBuzzerState);
  }, []);

  // Sync behavior parameters dynamically when Python Flask backend is active
  useEffect(() => {
    if (backendConnected && allDriverBehaviors && allDriverBehaviors[busId]) {
      const busBehavior = allDriverBehaviors[busId];
      setBehavior({
        drowsiness: busBehavior.drowsiness || false,
        mobileUsage: busBehavior.mobileUsage || false,
        yawning: busBehavior.yawning || false,
        seatbelt: busBehavior.seatbelt !== undefined ? busBehavior.seatbelt : true,
        smoking: busBehavior.smoking || false,
        distraction: busBehavior.distraction || false,
        safetyScore: busBehavior.safetyScore || defaultSafetyScore
      });
    }
  }, [backendConnected, allDriverBehaviors, busId, defaultSafetyScore]);

  // Generate face mesh tracking dots
  useEffect(() => {
    const list = [];
    for (let i = 0; i < 6; i++) {
      list.push({ x: 130 + Math.sin(i) * 12, y: 95 + Math.cos(i) * 6, type: 'eye' });
    }
    for (let i = 0; i < 6; i++) {
      list.push({ x: 210 + Math.sin(i) * 12, y: 95 + Math.cos(i) * 6, type: 'eye' });
    }
    list.push({ x: 170, y: 105 });
    list.push({ x: 170, y: 120 });
    list.push({ x: 170, y: 135 });
    for (let i = 0; i < 8; i++) {
      list.push({ x: 170 + Math.sin(i * 0.8) * 18, y: 155 + Math.cos(i * 0.8) * 8, type: 'mouth' });
    }
    for (let i = 0; i < 15; i++) {
      list.push({ x: 170 + Math.sin(i * 0.25 - 1.8) * 70, y: 125 + Math.cos(i * 0.25 - 1.8) * 75, type: 'outline' });
    }
    setDots(list);
  }, []);

  // Connect to shared camera stream only for the active driver camera
  useEffect(() => {
    let isMounted = true;

    if (!isActiveWebcam) {
      setWebcamActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      return;
    }

    acquireSharedWebcam()
      .then(stream => {
        if (!isMounted) return;
        streamRef.current = stream;
        setWebcamActive(true);
        setCameraError(false);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
          };
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.warn(`Camera access not granted for ${busId}:`, err);
        setCameraError(true);
        setWebcamActive(false);
      });

    return () => {
      isMounted = false;
      releaseSharedWebcam();
    };
  }, [busId, isActiveWebcam]);

  // Real-time frame processing loop with OpenCV Microservice for active driver camera
  useEffect(() => {
    if (!webcamActive || !isActiveWebcam) return;

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Stagger sampling slightly so all 3 cameras send smoothly without server contention
    const sampleDelay = busId === 'TN38AB1234' ? 200 : busId === 'TN38CD5678' ? 260 : 320;

    const sampleInterval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const frameB64 = canvas.toDataURL('image/jpeg', 0.70);

        const res = await fetch(`${CV_SERVICE_URL}/process_frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frame: frameB64,
            busId: busId,
            driverId: `${driverName.toLowerCase().replace(/\s+/g, '')}@happyjourney.ai`
          })
        });

        if (res.ok) {
          const data = await res.json();
          setCvTelemetry(data);
          if (data.processedImage) {
            setProcessedImg(data.processedImage);
          }

          const isDrowsyAlert = data.status === 'DROWSINESS_DETECTED' || data.status === 'DROWSY';
          const isDistractAlert = data.status === 'DISTRACTION_DETECTED' || data.status === 'LOOKING_AWAY';

          // Confirmed Alert Trigger (Web Audio Buzzer for strictly 3 seconds)
          if (isDrowsyAlert) {
            if (lastAlertRef.current !== 'DROWSINESS_DETECTED') {
              lastAlertRef.current = 'DROWSINESS_DETECTED';
              const buzzerPlayed = playAlertBuzzer(3.0);
              if (buzzerPlayed) {
                triggerAlert?.({
                  type: 'DROWSINESS',
                  busId: busId,
                  message: `🚨 Driver drowsiness alert — buzzer activated (${busId}).`,
                  timestamp: new Date().toLocaleTimeString(),
                  targetRole: 'ADMIN',
                  category: 'DRIVER_INCIDENT'
                });
              }
            }
            setBehavior(prev => ({ ...prev, drowsiness: true, safetyScore: 60 }));
          } else if (isDistractAlert) {
            if (lastAlertRef.current !== 'DISTRACTION_DETECTED') {
              lastAlertRef.current = 'DISTRACTION_DETECTED';
              const buzzerPlayed = playAlertBuzzer(3.0);
              if (buzzerPlayed) {
                triggerAlert?.({
                  type: 'DISTRACTION',
                  busId: busId,
                  message: `⚠ Driver distraction alert — buzzer activated (${busId}).`,
                  timestamp: new Date().toLocaleTimeString(),
                  targetRole: 'ADMIN',
                  category: 'DRIVER_INCIDENT'
                });
              }
            }
            setBehavior(prev => ({ ...prev, distraction: true, safetyScore: 75 }));
          } else if (data.status === 'NORMAL' || data.status === 'NO_DRIVER_FACE_DETECTED') {
            lastAlertRef.current = data.status;
            setBehavior(prev => ({
              ...prev,
              drowsiness: false,
              distraction: false,
              safetyScore: 95
            }));
          }
        }
      } catch (err) {
        // Fallback gracefully if microservice is temporarily offline
      } finally {
        isProcessingRef.current = false;
      }
    }, sampleDelay);

    return () => clearInterval(sampleInterval);
  }, [webcamActive, busId, driverName, triggerAlert]);

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

      // Simulated warning alert triggers have been disabled to ensure only real webcam CV results are enqueued

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

        {/* OpenCV Processed Real-time Image with Eye Bounding Boxes & Landmarks */}
        {processedImg && webcamActive && (
          <img 
            src={processedImg} 
            alt="OpenCV Eye Detection Feed" 
            className="absolute inset-0 w-full h-full object-cover z-10" 
          />
        )}

        {/* Inactive Standby Card with Remote AI Status */}
        {!isActiveWebcam && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center z-15">
            <VideoOff className="w-8 h-8 text-slate-400 mb-2 opacity-70" />
            <span className="text-[11px] font-black text-slate-200 uppercase tracking-widest">Fleet Telemetry Standby</span>
            <span className="text-[9px] text-slate-400 mt-1 max-w-[210px] leading-relaxed">
              Telemetry monitoring active. Laptop webcam is mapped to active primary bus.
            </span>
            {onSelectActive && (
              <button
                onClick={onSelectActive}
                className="mt-3 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1"
              >
                <Video className="w-3 h-3" /> Connect Laptop Webcam
              </button>
            )}
          </div>
        )}

        {/* Mock Driver Face Silhouette Graphic */}
        {isActiveWebcam && !webcamActive && (
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
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${webcamActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
          <span className="px-1.5 py-0.5 text-[8px] font-extrabold tracking-widest text-white bg-slate-900/80 border border-slate-700/30 rounded uppercase font-mono">
            {busId} / {driverName.split(' ')[0]}
          </span>
          {webcamActive && (
            <span className="px-1.5 py-0.5 text-[8px] font-black rounded uppercase tracking-wider bg-emerald-600/90 text-white border border-emerald-400/40">
              OpenCV Active
            </span>
          )}
        </div>

        {/* Test Buzzer Button */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <button
            onClick={() => {
              unlockAudio();
              playAlertBuzzer(3.0);
            }}
            className="px-2 py-0.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all backdrop-blur-sm cursor-pointer"
            title="Test Cabin Buzzer Alarm Sound"
          >
            <Volume2 className="w-2.5 h-2.5" /> Test Buzzer
          </button>
        </div>

        {/* Active Buzzer Alarm Visual Banner */}
        {isBuzzerActive && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-rose-600 border border-white text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl animate-bounce pointer-events-none">
            <Volume2 className="w-3 h-3 animate-pulse text-yellow-300" />
            <span>🚨 CABIN BUZZER SOUNDING (3s)</span>
          </div>
        )}

        {/* Live Timer HUD Overlays (for Drowsiness & Distraction countdowns) */}
        {cvTelemetry && (
          <div className="absolute top-9 left-2.5 z-20 flex flex-col gap-1 pointer-events-none">
            {cvTelemetry.drowsyDuration > 0 && (
              <div className="bg-rose-950/90 border border-rose-600/80 px-2 py-0.5 rounded text-[8px] font-bold text-rose-200 flex items-center gap-1.5 backdrop-blur-sm shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>EYES CLOSED: {cvTelemetry.drowsyDuration.toFixed(1)}s / 3.0s</span>
                <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 transition-all duration-150" 
                    style={{ width: `${Math.min(100, (cvTelemetry.drowsyDuration / 3.0) * 100)}%` }} 
                  />
                </div>
              </div>
            )}

            {cvTelemetry.distractDuration > 0 && (
              <div className="bg-amber-950/90 border border-amber-500/80 px-2 py-0.5 rounded text-[8px] font-bold text-amber-200 flex items-center gap-1.5 backdrop-blur-sm shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>LOOKING AWAY ({cvTelemetry.direction || 'SIDE'}): {cvTelemetry.distractDuration.toFixed(1)}s / 5.0s</span>
                <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-400 transition-all duration-150" 
                    style={{ width: `${Math.min(100, (cvTelemetry.distractDuration / 5.0) * 100)}%` }} 
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Simulated Bounding Box Overlay for non-camera buses */}
        {!processedImg && (
          <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none" viewBox="0 0 340 220" preserveAspectRatio="none">
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
        )}

        {/* Simulated Face mesh dots for non-camera buses */}
        {!processedImg && (
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
        )}

        {/* Bottom telematics bar */}
        <div className="absolute bottom-1.5 left-2 right-2 z-20 flex justify-between items-center text-[8.5px] font-mono text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm">
          <span>EAR: {cvTelemetry && cvTelemetry.ear ? cvTelemetry.ear.toFixed(2) : isDrowsy ? '0.14 (CLOSED)' : '0.31 (OPEN)'}</span>
          <span>HEAD: {cvTelemetry && cvTelemetry.direction ? cvTelemetry.direction : isDistracted ? 'SIDEWAY' : 'CENTER'}</span>
          <span className={`font-bold ${isDrowsy || isDistracted ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {isDrowsy ? 'DROWSY' : isDistracted ? 'DISTRACTED' : 'ATTENTIVE'}
          </span>
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
