import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  QrCode, 
  ScanFace, 
  CheckCircle, 
  Upload, 
  Camera, 
  CameraOff, 
  Sun, 
  School, 
  RotateCcw, 
  Home, 
  Clock, 
  UserCheck, 
  AlertCircle,
  Sparkles,
  RefreshCw,
  Bus,
  CheckCircle2,
  XCircle,
  ChevronDown
} from 'lucide-react';
import jsQR from 'jsqr';
import { API_BASE_URL } from '../../config';
import { acquireSharedWebcam, releaseSharedWebcam } from '../../utils/webcamStream';

const TRANSIT_MODES = [
  { id: 'Boarded', label: 'Morning Boarding', icon: Sun, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'Arrived', label: 'School Arrival', icon: School, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'BoardedReturn', label: 'Afternoon Return', icon: RotateCcw, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'HomeDropped', label: 'Home Drop-off', icon: Home, color: 'text-purple-600 bg-purple-50 border-purple-200' }
];

const BUS_FILTERS = [
  { id: 'ALL', label: 'All Buses (20 Students)' },
  { id: 'TN38AB1234', label: 'Bus 1 • TN38AB1234' },
  { id: 'TN38CD5678', label: 'Bus 2 • TN38CD5678' },
  { id: 'TN38EP9012', label: 'Bus 3 • TN38EP9012' }
];

const DriverBoarding = () => {
  const { students, setStudents, handleStudentBoarding, triggerNotification } = useApp();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [boardResult, setBoardResult] = useState(null);
  const [activeScan, setActiveScan] = useState(false);
  const [scanError, setScanError] = useState('');
  const [transitMode, setTransitMode] = useState('Boarded');
  const [cameraActive, setCameraActive] = useState(true);
  const [lastScannedId, setLastScannedId] = useState(null);
  const [activeBusFilter, setActiveBusFilter] = useState('ALL');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [resettingAttendance, setResettingAttendance] = useState(false);
  const [resetMenuOpen, setResetMenuOpen] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  // Filter students based on activeBusFilter
  const displayStudents = students.filter((s) => {
    if (activeBusFilter === 'ALL') return true;
    return s.busId === activeBusFilter || s.assignedBus === activeBusFilter ||
           (activeBusFilter === 'TN38AB1234' && (s.assignedBus === 'Bus 1' || s.busId === 'Bus 1')) ||
           (activeBusFilter === 'TN38CD5678' && (s.assignedBus === 'Bus 2' || s.busId === 'Bus 2')) ||
           (activeBusFilter === 'TN38EP9012' && (s.assignedBus === 'Bus 3' || s.busId === 'Bus 3'));
  });

  const selectedStudent = displayStudents.find((s) => s.id === selectedStudentId);

  // Synthesize positive audio chime on successful scan
  const playSuccessChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880.0, ctx.currentTime);
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio chime unsupported or blocked:', e);
    }
  }, []);

  // Universal QR Code Data Processor
  const processQrCodeData = useCallback(async (qrText, mode = transitMode) => {
    if (!qrText) return;
    const cleanText = String(qrText).trim();
    let rawCandidate = cleanText;

    // 1. Check for JSON format
    try {
      if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
        const parsed = JSON.parse(cleanText);
        rawCandidate = parsed.studentId || parsed.id || parsed.rollNo || rawCandidate;
      }
    } catch (e) {}

    // 2. Extract with regex patterns
    const idMatch = cleanText.match(/(?:ID|Student\s*ID)\s*:\s*([A-Za-z0-9_-]+)/i);
    const rollMatch = cleanText.match(/Roll(?:\s*No|\s*Number)?\s*:\s*([A-Za-z0-9_-]+)/i);
    const stdMatch = cleanText.match(/\b(STD\d+|STU\d+)\b/i);
    const rollPatternMatch = cleanText.match(/\b(717824I\d+)\b/i);

    const candidateIds = [];
    if (idMatch) candidateIds.push(idMatch[1].trim());
    if (rollMatch) candidateIds.push(rollMatch[1].trim());
    if (stdMatch) candidateIds.push(stdMatch[1].trim());
    if (rollPatternMatch) candidateIds.push(rollPatternMatch[1].trim());
    candidateIds.push(rawCandidate);

    // 3. Match against students registry
    let matchedStudent = null;
    for (const cand of candidateIds) {
      const match = students.find((s) => 
        s.id?.toLowerCase() === cand.toLowerCase() || 
        s.rollNo?.toLowerCase() === cand.toLowerCase() ||
        s.studentIdCode?.toLowerCase() === cand.toLowerCase()
      );
      if (match) {
        matchedStudent = match;
        break;
      }
    }

    // 4. Fallback search: check if any student ID or RollNo appears within text
    if (!matchedStudent) {
      matchedStudent = students.find((s) => 
        (s.id && cleanText.toLowerCase().includes(s.id.toLowerCase())) ||
        (s.rollNo && cleanText.toLowerCase().includes(s.rollNo.toLowerCase()))
      );
    }

    if (!matchedStudent) {
      throw new Error(`QR Code data "${cleanText.substring(0, 35)}" not recognized in student registry.`);
    }

    // Debounce duplicate scans within 3 seconds for the same student
    const now = Date.now();
    if (lastScannedId === matchedStudent.id && now - lastScanTimeRef.current < 3000) {
      return; // Ignore rapid duplicate scan
    }

    lastScanTimeRef.current = now;
    setLastScannedId(matchedStudent.id);

    // Call unified boarding handler in AppContext (persists to MySQL and updates state)
    await handleStudentBoarding(matchedStudent.id, mode);

    playSuccessChime();

    const modeObj = TRANSIT_MODES.find(m => m.id === mode);
    const modeLabel = modeObj ? modeObj.label : mode;

    setBoardResult({
      id: matchedStudent.id,
      name: matchedStudent.name,
      rollNo: matchedStudent.rollNo,
      bus: matchedStudent.assignedBus || matchedStudent.busId,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      mode: modeLabel,
      avatar: matchedStudent.avatarUrl
    });

    setScanError('');

    setTimeout(() => {
      setBoardResult((prev) => (prev?.id === matchedStudent.id ? null : prev));
    }, 6000);
  }, [students, transitMode, lastScannedId, handleStudentBoarding, playSuccessChime]);


  // Continuous QR scanning frame reader
  const scanVideoFrame = useCallback(() => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          processQrCodeData(code.data).catch((err) => {
            console.warn('[QR Scanner]', err.message);
          });
        }
      }
    }
  }, [cameraActive, processQrCodeData]);

  // Initialize webcam feed
  useEffect(() => {
    let active = true;
    if (cameraActive) {
      acquireSharedWebcam()
        .then((stream) => {
          if (active && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('[DriverBoarding] Camera access note:', err.message);
        });

      scanIntervalRef.current = setInterval(scanVideoFrame, 180);
    } else {
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    return () => {
      active = false;
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      releaseSharedWebcam();
    };
  }, [cameraActive, scanVideoFrame]);

  // Handle uploaded static QR image
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setScanError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        
        const imageData = context.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code && code.data) {
          processQrCodeData(code.data).catch((err) => {
            setScanError(err.message);
            triggerNotification(err.message, "error");
          });
        } else {
          setScanError("Failed to decode QR code. Make sure the image contains a clear QR code.");
          triggerNotification("Failed to decode QR code.", "error");
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Manual check-in for selected student
  const handleManualCheckIn = (studentId, mode = transitMode) => {
    const targetId = studentId || selectedStudentId;
    if (!targetId) {
      triggerNotification("Please select a student first.", "warning");
      return;
    }

    setActiveScan(true);
    setScanError('');
    setTimeout(() => {
      processQrCodeData(targetId, mode)
        .then(() => {
          setActiveScan(false);
          setSelectedStudentId('');
        })
        .catch((err) => {
          setActiveScan(false);
          setScanError(err.message);
          triggerNotification(err.message, "error");
        });
    }, 400);
  };

  const isReturnSession = transitMode === 'BoardedReturn' || transitMode === 'HomeDropped';
  const activeShiftName = isReturnSession ? 'Evening Return' : 'Morning Boarding';

  // Calculate session-specific attendance
  const morningPresentCount = displayStudents.filter(s => s.boarded || s.morningAttendance === 'Present' || s.status === 'On Board' || s.status === 'Reached School').length;
  const morningAbsentCount = displayStudents.length - morningPresentCount;

  const returnPresentCount = displayStudents.filter(s => s.boardedReturn || s.returnAttendance === 'Present' || s.status === 'Returning' || s.status === 'Reached Home').length;
  const returnAbsentCount = displayStudents.length - returnPresentCount;

  // Active shift counters for top metrics card
  const presentCount = isReturnSession ? returnPresentCount : morningPresentCount;
  const absentCount = isReturnSession ? returnAbsentCount : morningAbsentCount;

  const handleResetAttendance = async (shiftToReset = 'ACTIVE', busId = activeBusFilter) => {
    setResettingAttendance(true);
    try {
      const resetReturn = shiftToReset === 'ALL' || shiftToReset === 'RETURN' || (shiftToReset === 'ACTIVE' && isReturnSession);
      const resetMorning = shiftToReset === 'ALL' || shiftToReset === 'MORNING' || (shiftToReset === 'ACTIVE' && !isReturnSession);

      const shiftParam = (resetMorning && resetReturn) ? 'ALL' : resetReturn ? 'RETURN' : 'MORNING';
      const urlParams = new URLSearchParams();
      if (busId && busId !== 'ALL') urlParams.append('busId', busId);
      urlParams.append('shift', shiftParam);
      const url = `${API_BASE_URL}/api/v1/attendance/reset?${urlParams.toString()}`;
      
      try { await fetch(url, { method: 'POST' }); } catch (e) {}

      setStudents(prev => prev.map(s => {
        if (busId && busId !== 'ALL' && s.busId !== busId && s.assignedBus !== busId) {
          return s;
        }
        return {
          ...s,
          ...(resetMorning ? {
            boarded: false,
            boardedTime: null,
            reachedSchool: false,
            morningAttendance: 'Absent',
          } : {}),
          ...(resetReturn ? {
            boardedReturn: false,
            returnBoardedTime: null,
            reachedHome: false,
            returnAttendance: 'Absent',
          } : {}),
          status: (resetMorning && resetReturn) ? 'Absent' : s.status,
          attendance: (resetMorning && resetReturn) ? 'Absent' : s.attendance,
          student_status: (resetMorning && resetReturn) ? 'Waiting' : s.student_status
        };
      }));

      const resetMsg = resetMorning && resetReturn 
        ? "🔄 All shifts reset to Absent." 
        : resetReturn 
        ? "🔄 Evening Return attendance reset to Absent." 
        : "🔄 Morning Boarding attendance reset to Absent.";
      triggerNotification(resetMsg, "info");
    } catch (err) {
      console.error("Reset error:", err);
      triggerNotification("Failed to reset attendance.", "error");
    } finally {
      setResettingAttendance(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto font-sans">
      
      {/* Hidden offscreen canvas for QR frame processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block leading-none">
            Driver & Bus Scanner Terminal • SafeBus AI
          </span>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-wide mt-1">
            Automated Student QR Attendance Scanner
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Pupils scan their QR code on boarding to automatically record Present attendance in MySQL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-smooth cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Test QR / Demo</span>
          </button>
          {/* Reset Attendance Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setResetMenuOpen(!resetMenuOpen)}
              disabled={resettingAttendance}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-smooth cursor-pointer"
              title="Reset attendance options"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resettingAttendance ? 'animate-spin' : ''}`} />
              <span>Reset Attendance</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {resetMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-1.5 space-y-1">
                <div className="px-2.5 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Reset Target
                </div>
                <button
                  onClick={() => {
                    handleResetAttendance('ACTIVE');
                    setResetMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 text-xs font-bold rounded-lg hover:bg-amber-50 text-amber-900 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <div>
                    <div>Reset {activeShiftName} Only</div>
                    <div className="text-[10px] font-normal text-slate-500">Resets {isReturnSession ? 'Evening Return' : 'Morning Boarding'} to Absent</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    handleResetAttendance('ALL');
                    setResetMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 text-xs font-bold rounded-lg hover:bg-rose-50 text-rose-900 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <div>
                    <div>Reset Full Day (AM + PM)</div>
                    <div className="text-[10px] font-normal text-slate-500">Resets both Morning & Return shifts</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setCameraActive(!cameraActive)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-smooth cursor-pointer ${
              cameraActive 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            {cameraActive ? <Camera className="w-4 h-4 text-emerald-600" /> : <CameraOff className="w-4 h-4 text-slate-500" />}
            {cameraActive ? 'Camera Active' : 'Camera Paused'}
          </button>
        </div>
      </div>

      {/* Bus Route Selector Tabs */}
      <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bus className="w-4 h-4 text-slate-500" />
          <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
            Select Route / Bus Manifest:
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BUS_FILTERS.map((bf) => {
            const isSelected = activeBusFilter === bf.id;
            return (
              <button
                key={bf.id}
                onClick={() => setActiveBusFilter(bf.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {bf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transit Stage Selector */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none">
              Select Active Transit Stage
            </label>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Attendance records and passenger counts dynamically adapt to the selected shift:
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              !isReturnSession 
                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
              <Sun className="w-3 h-3" />
              <span>Morning Shift ({morningPresentCount}/{displayStudents.length})</span>
            </span>
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              isReturnSession 
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
              <RotateCcw className="w-3 h-3" />
              <span>Return Shift ({returnPresentCount}/{displayStudents.length})</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TRANSIT_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = transitMode === mode.id;
            const isReturnMode = mode.id === 'BoardedReturn' || mode.id === 'HomeDropped';
            return (
              <button
                key={mode.id}
                onClick={() => setTransitMode(mode.id)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected 
                    ? `${mode.color} ring-2 ring-blue-500 font-bold shadow-sm` 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold">{mode.label}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                  isReturnMode ? 'bg-blue-100/80 text-blue-700' : 'bg-amber-100/80 text-amber-700'
                }`}>
                  {isReturnMode ? 'PM' : 'AM'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Live Camera QR Scanner */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-blue-600" /> Live Optical QR Reader
            </span>
            {cameraActive && (
              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                ● SCANNER ARMED
              </span>
            )}
          </div>

          <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-300 shadow-inner flex items-center justify-center">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Target Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-52 h-52 border-2 border-dashed border-blue-400/80 rounded-2xl relative shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    {/* Reticle corner markers */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-blue-500" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-blue-500" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-blue-500" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-blue-500" />
                    
                    {/* Animated Scanning Line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_8px_#60a5fa] animate-pulse" 
                         style={{ top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-sm text-slate-200 text-[10px] py-1.5 px-3 rounded-lg text-center font-mono border border-slate-700/50">
                  Hold student ID Card QR badge in front of camera
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400 p-6 text-center">
                <CameraOff className="w-12 h-12 stroke-[1.5]" />
                <p className="text-xs font-semibold">Camera feed paused</p>
                <button
                  onClick={() => setCameraActive(true)}
                  className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Enable Camera
                </button>
              </div>
            )}
          </div>

          {/* Backup Action Buttons */}
          <div className="grid grid-cols-2 gap-2 w-full mt-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-smooth flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Upload QR Image
            </button>
            <button
              type="button"
              onClick={() => handleManualCheckIn()}
              disabled={!selectedStudentId || activeScan}
              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-smooth flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" /> Manual Check-in
            </button>
          </div>

          {scanError && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2 w-full">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}
        </div>

        {/* Right Column: Status Feedback & Passenger Dropdown */}
        <div className="flex flex-col gap-4">
          
          {/* Quick Select Passenger */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Select Passenger for Manual Check-in
              </label>
              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${
                isReturnSession ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                Recording for {activeShiftName}
              </span>
            </div>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">Select a student...</option>
              {displayStudents.map((s) => {
                const isStudentPresent = isReturnSession
                  ? (s.boardedReturn || s.returnAttendance === 'Present' || s.status === 'Returning' || s.status === 'Reached Home')
                  : (s.boarded || s.morningAttendance === 'Present' || s.status === 'On Board' || s.status === 'Reached School');
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.rollNo || s.id}) — {isStudentPresent ? `🟢 ${activeShiftName}: Present` : `🔴 ${activeShiftName}: Absent`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Scanned Result Banner */}
          {boardResult ? (
            <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl shadow-sm flex items-start gap-3.5 animate-smooth">
              <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                {boardResult.avatar ? (
                  <img src={boardResult.avatar} alt={boardResult.name} className="w-full h-full object-cover" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase text-emerald-700 tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Attendance: Present ({boardResult.mode})
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {boardResult.time}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 mt-1">
                  {boardResult.name}
                </h4>
                <p className="text-[11px] text-slate-600 font-medium">
                  ID: <span className="font-mono font-bold text-slate-800">{boardResult.rollNo || boardResult.id}</span> • Persisted to MySQL Database & Parent WhatsApp Notified.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed p-6 rounded-2xl flex flex-col items-center justify-center text-center text-slate-400">
              <QrCode className="w-8 h-8 stroke-[1.5] mb-2 text-slate-400" />
              <p className="text-xs font-bold text-slate-600">Awaiting Student QR Scan</p>
              <p className="text-[10px] text-slate-400 mt-0.5">When student scans QR badge, attendance is automatically set to Present for the selected shift.</p>
            </div>
          )}

          {/* Quick Stats Summary */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isReturnSession ? 'bg-blue-500' : 'bg-amber-500'}`} />
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  {activeShiftName} Attendance Summary
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-600">
                {displayStudents.length > 0 ? Math.round((presentCount / displayStudents.length) * 100) : 0}% Attendance
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-lg font-black text-slate-800 block">{displayStudents.length}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Total Students</span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-lg font-black text-emerald-600 block">{presentCount}</span>
                <span className="text-[9px] font-bold text-emerald-700 uppercase flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Present
                </span>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                <span className="text-lg font-black text-rose-600 block">{absentCount}</span>
                <span className="text-[9px] font-bold text-rose-700 uppercase flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Absent
                </span>
              </div>
            </div>

            {/* Shift comparison baseline */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-[9px] font-bold">
              <div className={`p-1.5 rounded-lg border transition-all ${!isReturnSession ? 'bg-amber-50/90 border-amber-200 text-amber-900 shadow-xs' : 'bg-slate-50 border-slate-150 text-slate-500'}`}>
                <span>☀ Morning: </span>
                <span className="font-mono font-black">{morningPresentCount} Present</span>
                <span className="font-mono text-slate-400"> ({morningAbsentCount} Absent)</span>
              </div>
              <div className={`p-1.5 rounded-lg border transition-all ${isReturnSession ? 'bg-blue-50/90 border-blue-200 text-blue-900 shadow-xs' : 'bg-slate-50 border-slate-150 text-slate-500'}`}>
                <span>🌙 Return: </span>
                <span className="font-mono font-black">{returnPresentCount} Present</span>
                <span className="font-mono text-slate-400"> ({returnAbsentCount} Absent)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Passenger Manifest Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              Live Attendance Registry & Passenger Manifest
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 font-mono">
            {presentCount} Present / {displayStudents.length} Total
          </span>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {displayStudents.map((s) => {
            const isMorningPresent = Boolean(s.boarded || s.morningAttendance === 'Present' || s.status === 'On Board' || s.status === 'Reached School');
            const isReturnPresent = Boolean(s.boardedReturn || s.returnAttendance === 'Present' || s.status === 'Returning' || s.status === 'Reached Home');
            const isActiveShiftPresent = isReturnSession ? isReturnPresent : isMorningPresent;

            const isBoarded = Boolean(s.boarded || s.status === 'On Board');
            const hasReachedSchool = Boolean(s.reachedSchool || s.status === 'Reached School');
            const isReturning = Boolean(s.boardedReturn || s.status === 'Returning');
            const hasReachedHome = Boolean(s.reachedHome || s.status === 'Reached Home');

            let transitDetail = 'Awaiting Bus';
            if (isReturnSession) {
              if (hasReachedHome) transitDetail = 'Home Dropped';
              else if (isReturning) transitDetail = `Return Bus (${s.returnBoardedTime || 'PM'})`;
              else transitDetail = 'Waiting Return';
            } else {
              if (hasReachedSchool) transitDetail = 'At School';
              else if (isBoarded) transitDetail = `Boarded (${s.boardedTime || 'AM'})`;
              else transitDetail = 'Waiting Pickup';
            }

            return (
              <div key={s.id} className="p-3.5 hover:bg-slate-50/80 transition-smooth flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img 
                    src={s.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.name}`} 
                    alt={s.name} 
                    className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 shrink-0" 
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                      <span>{s.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">({s.id})</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      Roll: {s.rollNo || s.id} • Bus: {s.assignedBus || s.busId || 'Bus 1'} • Stop: {s.pickupStop || 'Bus Stop'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* AM & PM Baseline Indicator Badges */}
                  <div className="flex items-center gap-1 font-mono text-[9px] font-bold">
                    <span 
                      className={`px-1.5 py-0.5 rounded border transition-all ${
                        isMorningPresent 
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      } ${!isReturnSession ? 'ring-1 ring-amber-400 font-black' : 'opacity-70'}`}
                      title={isMorningPresent ? `Morning: Present (${s.boardedTime || 'Boarded'})` : 'Morning: Absent'}
                    >
                      ☀ AM: {isMorningPresent ? 'P' : 'A'}
                    </span>
                    <span 
                      className={`px-1.5 py-0.5 rounded border transition-all ${
                        isReturnPresent 
                          ? 'bg-blue-50 text-blue-800 border-blue-200' 
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      } ${isReturnSession ? 'ring-1 ring-blue-400 font-black' : 'opacity-70'}`}
                      title={isReturnPresent ? `Return: Present (${s.returnBoardedTime || 'Boarded'})` : 'Return: Absent'}
                    >
                      🌙 PM: {isReturnPresent ? 'P' : 'A'}
                    </span>
                  </div>

                  {/* Active Shift Attendance Status Badge */}
                  {isActiveShiftPresent ? (
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {isReturnSession ? '🌙 PM Present' : '☀ AM Present'} • {transitDetail}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      {isReturnSession ? '🌙 PM Absent' : '☀ AM Absent'}
                    </span>
                  )}

                  {/* Instant QR Scan simulator button */}
                  <button
                    onClick={() => {
                      const qrPayload = `=== SafeBus AI - Student ID ===\nID: ${s.id}\nName: ${s.name}\nRoll No: ${s.rollNo}\nClass: ${s.class || 'Grade 10'}\nStatus: ACTIVE`;
                      processQrCodeData(qrPayload, transitMode);
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-smooth cursor-pointer flex items-center gap-1 shadow-sm"
                    title={`Simulate scanning this student's QR badge for ${activeShiftName}`}
                  >
                    <QrCode className="w-3 h-3" />
                    <span>Scan {isReturnSession ? 'PM' : 'AM'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demo / Test QR Modal Drawer */}
      {isTestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" /> QR Code Scanner Test Bench
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select any student below to simulate optical QR scanning into the driver terminal:
                </p>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 rounded-lg text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              {students.map((s) => {
                const isMorningPresent = Boolean(s.boarded || s.morningAttendance === 'Present' || s.status === 'On Board' || s.status === 'Reached School');
                const isReturnPresent = Boolean(s.boardedReturn || s.returnAttendance === 'Present' || s.status === 'Returning' || s.status === 'Reached Home');
                const qrText = `=== SafeBus AI - Student ID ===\nID: ${s.id}\nName: ${s.name}\nRoll No: ${s.rollNo}\nClass: ${s.class || 'Grade 10'}\nStatus: ACTIVE`;

                return (
                  <div key={s.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white transition-all flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(qrText)}`} 
                        alt="QR" 
                        className="w-12 h-12 rounded-lg border border-slate-200 bg-white p-0.5" 
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{s.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{s.id} • {s.rollNo}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${isMorningPresent ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            AM: {isMorningPresent ? 'P' : 'A'}
                          </span>
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${isReturnPresent ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            PM: {isReturnPresent ? 'P' : 'A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        processQrCodeData(qrText, transitMode);
                        setIsTestModalOpen(false);
                      }}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-sm cursor-pointer"
                      title={`Scan for ${activeShiftName}`}
                    >
                      Scan ({isReturnSession ? 'PM' : 'AM'})
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverBoarding;

