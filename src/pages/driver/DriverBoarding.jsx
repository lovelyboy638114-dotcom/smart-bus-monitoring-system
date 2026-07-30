import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, QrCode, ScanFace, CheckCircle, Smartphone } from 'lucide-react';

const DriverBoarding = () => {
  const { students, handleStudentBoarding } = useApp();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [boardResult, setBoardResult] = useState(null);
  const [activeScan, setActiveScan] = useState(false);

  // Ramesh Kumar is assigned to TN38AB1234. Let's filter students for this bus.
  const busStudents = students.filter((s) => s.busId === 'TN38AB1234');
  const selectedStudent = busStudents.find((s) => s.id === selectedStudentId);

  const triggerQRBoard = () => {
    if (!selectedStudentId) return;
    handleStudentBoarding(selectedStudentId, 'boarded');
    setBoardResult({
      type: 'qr',
      name: selectedStudent.name,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setTimeout(() => {
      setBoardResult(null);
      setSelectedStudentId('');
    }, 3000);
  };

  const triggerFaceBoard = () => {
    if (!selectedStudentId) return;
    setActiveScan(true);
    setTimeout(() => {
      handleStudentBoarding(selectedStudentId, 'boarded');
      setActiveScan(false);
      setBoardResult({
        type: 'face',
        name: selectedStudent.name,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setTimeout(() => {
        setBoardResult(null);
        setSelectedStudentId('');
      }, 3000);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto font-sans">
      
      {/* View Header */}
      <div>
        <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none">
          Boarding Checklist
        </span>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-1">Pupil Boarding Terminal</h2>
        <p className="text-xs text-slate-500 font-medium">Verify passenger check-ins via QR Scanner or Facial Recognition match:</p>
      </div>

      {/* Select Pupil panel */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft">
        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
          Select Pupil to Check-in
        </label>
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition-smooth"
        >
          <option value="">Choose a passenger...</option>
          {busStudents.map((student) => (
            <option key={student.id} value={student.id} disabled={student.boarded}>
              {student.name} (Roll: #{student.rollNo}) {student.boarded ? ' [Boarded]' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Scanner Simulator panel */}
      {selectedStudent && (
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft flex flex-col gap-4 items-center justify-center text-center">
          
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2 text-xs font-bold text-slate-500">
            <span>Terminal Simulator ({selectedStudent.name})</span>
            <span className="text-blue-500 animate-pulse">● Ready</span>
          </div>

          <div className="w-40 h-40 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-inner">
            {activeScan ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-blue-400">
                <span className="w-10 h-10 rounded-full border-4 border-t-blue-500 border-r-blue-400 border-slate-800 animate-spin" />
                <span className="text-[9px] font-mono mt-2.5">Face Mesh Match...</span>
              </div>
            ) : (
              <div className="opacity-40 flex flex-col items-center gap-2">
                <QrCode className="w-14 h-14 text-slate-700" />
                <span className="text-[9px] font-bold text-slate-500 uppercase">Hold QR to lens</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs w-full mt-4">
            <button
              onClick={triggerQRBoard}
              disabled={activeScan}
              className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-smooth uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-sm"
            >
              <QrCode className="w-4 h-4" /> QR Match
            </button>

            <button
              onClick={triggerFaceBoard}
              disabled={activeScan}
              className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-smooth uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-sm"
            >
              <ScanFace className="w-4 h-4" /> Face Match
            </button>
          </div>

        </div>
      )}

      {/* Scanned Matches logs */}
      {boardResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3.5 animate-smooth shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-[8px] font-extrabold uppercase text-emerald-600 tracking-wider block">
              Passenger Checked-in
            </span>
            <p className="text-xs font-black text-slate-800 mt-0.5">
              Verified boarding for <span className="underline">{boardResult.name}</span>
            </p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Boarded check-in: SUCCESS ({boardResult.time}). Notification dispatched.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverBoarding;
