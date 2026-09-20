import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QrCode, ScanFace, CheckSquare, Sparkles, UserCheck, CheckCircle2, Sun, RotateCcw, Users } from 'lucide-react';

const AttendancePage = () => {
  const { students, handleStudentBoarding } = useApp();
  const [scanResult, setScanResult] = useState(null); // { type: 'qr' | 'face', name: string, time: string, shift: string }
  const [faceActiveScan, setFaceActiveScan] = useState(false);
  const [activeShift, setActiveShift] = useState('morning'); // 'morning' | 'return'

  const isReturn = activeShift === 'return';

  // Counts for each shift
  const morningPresentCount = students.filter(s => s.boarded || s.morningAttendance === 'Present' || s.status === 'On Board' || s.status === 'Reached School').length;
  const returnPresentCount = students.filter(s => s.boardedReturn || s.returnAttendance === 'Present' || s.status === 'Returning' || s.status === 'Reached Home').length;

  // Pick a student who has not boarded yet for the ACTIVE shift
  const unboardedStudents = students.filter((s) => {
    if (isReturn) {
      return !s.boardedReturn && s.returnAttendance !== 'Present' && s.status !== 'Returning' && s.status !== 'Reached Home';
    }
    return !s.boarded && s.morningAttendance !== 'Present' && s.status !== 'On Board' && s.status !== 'Reached School';
  });

  const simulateQRScan = () => {
    if (unboardedStudents.length === 0) {
      setScanResult({ error: `All students are already checked in for ${isReturn ? 'Evening Return' : 'Morning Boarding'}.` });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    const student = unboardedStudents[Math.floor(Math.random() * unboardedStudents.length)];
    const boardingType = isReturn ? 'boardedReturn' : 'boarded';
    handleStudentBoarding(student.id, boardingType);

    setScanResult({
      type: 'qr',
      name: student.name,
      roll: student.rollNo,
      shift: isReturn ? 'Evening Return' : 'Morning Boarding',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    setTimeout(() => setScanResult(null), 3000);
  };

  const simulateFaceScan = () => {
    if (unboardedStudents.length === 0) {
      setScanResult({ error: `All students are already checked in for ${isReturn ? 'Evening Return' : 'Morning Boarding'}.` });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    setFaceActiveScan(true);

    const student = unboardedStudents[Math.floor(Math.random() * unboardedStudents.length)];
    const boardingType = isReturn ? 'boardedReturn' : 'boarded';

    setTimeout(() => {
      handleStudentBoarding(student.id, boardingType);
      setFaceActiveScan(false);
      setScanResult({
        type: 'face',
        name: student.name,
        roll: student.rollNo,
        class: student.class,
        shift: isReturn ? 'Evening Return' : 'Morning Boarding',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setTimeout(() => setScanResult(null), 3000);
    }, 2000);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Boarding Attendance Visualizer</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Verify and simulate boarding using QR Code scanner logs and Facial Recognition camera nodes.
          </p>
        </div>

        {/* Shift Toggle Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveShift('morning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !isReturn 
                ? 'bg-amber-500 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>☀ Morning Shift ({morningPresentCount}/{students.length})</span>
          </button>
          <button
            onClick={() => setActiveShift('return')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isReturn 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>🌙 Return Shift ({returnPresentCount}/{students.length})</span>
          </button>
        </div>
      </div>

      {/* Simulator panels grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* QR Scan module panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
              <QrCode className="w-4 h-4" /> QR Code Scanner Node
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Reader active</span>
          </div>

          <div className="w-44 h-44 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center p-4 relative overflow-hidden group shadow-inner">
            {/* Draw QR mesh overlay */}
            <svg viewBox="0 0 100 100" className="w-32 h-32 text-slate-800 opacity-80">
              {/* Top left marker */}
              <rect x="5" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="11" y="11" width="13" height="13" fill="currentColor" />
              {/* Top right marker */}
              <rect x="70" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="76" y="11" width="13" height="13" fill="currentColor" />
              {/* Bottom left marker */}
              <rect x="5" y="70" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="11" y="76" width="13" height="13" fill="currentColor" />
              {/* Custom dots represent QR payload data */}
              <rect x="40" y="5" width="6" height="6" fill="currentColor" />
              <rect x="50" y="15" width="6" height="12" fill="currentColor" />
              <rect x="45" y="35" width="12" height="6" fill="currentColor" />
              <rect x="15" y="45" width="6" height="12" fill="currentColor" />
              <rect x="35" y="55" width="18" height="6" fill="currentColor" />
              <rect x="75" y="40" width="6" height="18" fill="currentColor" />
              <rect x="55" y="75" width="12" height="12" fill="currentColor" />
              <rect x="80" y="75" width="6" height="6" fill="currentColor" />
            </svg>

            {/* Scanning line animation */}
            <div className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-lg shadow-blue-500/80 top-0 animate-bounce" style={{ animationDuration: '3s' }} />
          </div>

          <p className="text-xs text-slate-500 max-w-sm mt-6 leading-relaxed mb-6 font-medium">
            Pupils hold their unique encrypted identification QR badges in front of the bus terminal camera scanner to register attendance.
          </p>

          <button
            onClick={simulateQRScan}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 hover:shadow-lg transition-smooth uppercase tracking-wide flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate QR Scan</span>
          </button>
        </div>

        {/* Facial Recognition module panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
              <ScanFace className="w-4 h-4" /> Facial Identification Node
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">CV Engine Ready</span>
          </div>

          <div className="w-44 h-44 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden group shadow-inner">
            {/* Mock camera view */}
            {faceActiveScan ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
                <span className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-blue-400 border-slate-800 animate-spin" />
                <span className="text-[9px] font-mono text-blue-400 mt-3 animate-pulse">Mesh Alignment Active...</span>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                <ScanFace className="w-16 h-16 text-slate-400" />
                <span className="text-[8px] font-mono text-slate-500 mt-2">Awaiting Target Gaze</span>
              </div>
            )}

            {/* Custom face mesh points overlay (simulated) */}
            {faceActiveScan && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                <circle cx="50" cy="40" r="1.5" className="fill-blue-400" />
                <circle cx="43" cy="38" r="1" className="fill-blue-400" />
                <circle cx="57" cy="38" r="1" className="fill-blue-400" />
                <path d="M 40,55 Q 50,60 60,55" fill="none" stroke="#60a5fa" strokeWidth="1" />
                <rect x="35" y="25" width="30" height="38" fill="none" stroke="#3b82f6" strokeWidth="0.8" className="animate-pulse" />
              </svg>
            )}
          </div>

          <p className="text-xs text-slate-500 max-w-sm mt-6 leading-relaxed mb-6 font-medium">
            AI cameras above the bus entrance analyze facial vectors using MediaPipe meshes to verify identity and boarding location.
          </p>

          <button
            onClick={simulateFaceScan}
            disabled={faceActiveScan}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 hover:disabled:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 hover:shadow-lg transition-smooth uppercase tracking-wide flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Face Scan</span>
          </button>
        </div>

      </div>

      {/* Scanned result notifications logs banner */}
      {scanResult && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3.5 animate-smooth shadow-sm ${
          scanResult.error
            ? 'bg-rose-50 border-rose-100 text-rose-700'
            : 'bg-emerald-50 border-emerald-100 text-emerald-800'
        }`}>
          {scanResult.error ? (
            <span className="font-bold text-xs">{scanResult.error}</span>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shrink-0">
                {scanResult.type === 'qr' ? (
                  <QrCode className="w-5 h-5 text-emerald-600" />
                ) : (
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div>
                <span className="text-[9px] font-extrabold uppercase text-emerald-600 tracking-wider block">
                  {scanResult.shift || 'Boarding'} Attendance Match
                </span>
                <p className="text-xs font-black text-slate-800 mt-0.5">
                  Verified: <span className="underline">{scanResult.name}</span> (Roll: #{scanResult.roll})
                </p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Check-in recorded for {scanResult.shift} at <span className="font-bold">{scanResult.time}</span>. Parent notification trigger: SUCCESS.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
