import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Compass, Users, MapPin, Play, Square, AlertOctagon, PhoneCall, ShieldAlert, AlertTriangle, Check, BellRing } from 'lucide-react';

const DriverDashboard = () => {
  const { buses, setBuses, students, triggerNotification = () => {}, driverMessages, setDriverMessages } = useApp();
  const [sosType, setSosType] = useState('Breakdown');
  const [sosActive, setSosActive] = useState(false);

  const updateBusTripStatus = (busId, newStatus) => {
    const mappedStatus = newStatus === 'On Route' ? 'Running' : 'Stopped';
    setBuses(prev => prev.map(b => b.id === busId ? { ...b, status: mappedStatus } : b));
  };

  // Murugan is mock driver for Bus 1
  const bus = buses.find((b) => b.id === 'Bus 1') || buses[0];
  const busStudents = students.filter((s) => s.assignedBus === bus.id);
  const checkedInCount = busStudents.filter((s) => s.status === 'On Board').length;

  const driverBehavior = {
    speed: bus ? bus.speed : 0,
    drowsiness: false,
    mobileUsage: false
  };

  const handleSOSClick = () => {
    setSosActive(true);
    triggerNotification(`EMERGENCY SOS: [${sosType}] - Bus 1 (Murugan) - Dispatched to Admin & Nearby Police Station`, "error");
    setTimeout(() => {
      setSosActive(false);
    }, 5000);
  };

  const handleAcknowledgeMessage = (msgId) => {
    // Remove or filter out acknowledged updates for cleaner presentation
    setDriverMessages(prev => prev.filter(m => m.id !== msgId));
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto font-sans">
      
      {/* View Header */}
      <div>
        <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none">
          Active Trip Console
        </span>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-1">Driver Dashboard</h2>
        <p className="text-xs text-slate-500 font-medium">Manage trip start/stops and report road status updates:</p>
      </div>

      {/* Main Stats Panel */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
          <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
            Telemetry Speed
          </span>
          <div className="flex items-baseline gap-1">
            <h4 className={`text-xl font-black ${driverBehavior.speed > 60 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
              {driverBehavior.speed}
            </h4>
            <span className="text-[10px] font-bold text-slate-500">km/h</span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
          <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
            Pupils Checked-in
          </span>
          <h4 className="text-xl font-black text-slate-800">
            {checkedInCount} <span className="text-xs text-slate-500 font-bold">/ {busStudents.length}</span>
          </h4>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl col-span-2 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">
                Active Assigned Route
              </span>
              <h4 className="text-xs font-bold text-slate-800 uppercase">{bus.route}</h4>
            </div>
            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
              bus.status === 'Idle' 
                ? 'bg-slate-200 text-slate-600'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-100 animate-pulse'
            }`}>
              {bus.status === 'On Route' ? 'In Transit' : bus.status}
            </span>
          </div>
          <div className="border-t border-slate-200/60 pt-2 mt-1 flex justify-between text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
            <span>License: <span className="font-mono text-slate-800 font-black">{bus.driverLicense || "DL-TN38AB2024"}</span></span>
            <span>Experience: <span className="text-slate-800 font-black">{bus.driverExperience || "8"} Years</span></span>
          </div>
        </div>
      </div>

      {/* PARENT ATTENDANCE UPDATES ALERTS PANEL */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h3 className="text-xs font-extrabold text-slate-805 uppercase tracking-wider flex items-center gap-1.5">
            <BellRing className="w-4 h-4 text-blue-500" /> Parent Attendance Updates
          </h3>
          <span className="px-2 py-0.5 text-[8.5px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 rounded-full uppercase tracking-wider leading-none">
            {driverMessages.length} New
          </span>
        </div>

        {driverMessages.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">All stops normal today</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {driverMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={`p-3 border rounded-xl flex items-center justify-between gap-4 transition-smooth ${
                  msg.status === 'absent' 
                    ? 'bg-rose-50/40 border-rose-100' 
                    : 'bg-emerald-50/30 border-emerald-100'
                }`}
              >
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-extrabold text-slate-800">{msg.studentName}</h5>
                    <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded ${
                      msg.status === 'absent' 
                        ? 'bg-rose-600 text-white' 
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {msg.status === 'absent' ? 'Skip Stop' : 'Coming'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-550 font-semibold mt-1 leading-normal italic">{msg.message}</p>
                  <span className="text-[8px] text-slate-400 font-bold block mt-1 tracking-wider">{msg.timestamp}</span>
                </div>

                <button
                  onClick={() => handleAcknowledgeMessage(msg.id)}
                  className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-smooth hover:text-emerald-600"
                  title="Acknowledge & Clear"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Driver Controls */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft flex flex-col gap-4">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">Trip Controls</h3>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <button
            onClick={() => updateBusTripStatus(bus.id, 'On Route')}
            disabled={bus.status === 'On Route' || bus.status === 'In Transit'}
            className="py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 hover:disabled:bg-emerald-600 text-white rounded-xl font-bold transition-smooth uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/10"
          >
            <Play className="w-4 h-4 fill-white" /> Start Morning Trip
          </button>
          
          <button
            onClick={() => updateBusTripStatus(bus.id, 'Idle')}
            disabled={bus.status === 'Idle'}
            className="py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 hover:disabled:bg-rose-600 text-white rounded-xl font-bold transition-smooth uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-sm shadow-rose-600/10"
          >
            <Square className="w-4 h-4 fill-white" /> Complete / End Trip
          </button>
        </div>

        <button
          onClick={() => updateBusTripStatus(bus.id, 'Delayed')}
          disabled={bus.status === 'Idle' || bus.status === 'Delayed'}
          className="w-full py-3.5 bg-amber-50 hover:bg-amber-100/50 disabled:opacity-40 hover:disabled:bg-amber-50 text-amber-700 rounded-xl font-bold transition-smooth uppercase tracking-wide flex items-center justify-center gap-1.5 border border-amber-200"
        >
          <AlertOctagon className="w-4 h-4" /> Report Traffic Delay
        </button>
      </div>

      {/* Emergency SOS Assistance Panel */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft flex flex-col items-center justify-center text-center">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-rose-600">
          <AlertTriangle className="w-4.5 h-4.5 text-rose-600 animate-bounce" /> Emergency Assistance SOS
        </h3>
        <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-4">
          Select the emergency type and trigger the SOS alarm to dispatcher and central command:
        </p>

        {sosActive && (
          <div className="w-full mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-extrabold flex flex-col gap-1 items-center">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 animate-ping" />
              <span>CRITICAL SOS ALARM DISPATCHED!</span>
            </div>
            <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wide">
              Central Admin notified & nearest Police Station contacted.
            </p>
          </div>
        )}

        <div className="w-full flex flex-col gap-4 items-center">
          <div className="w-full text-left">
            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
              Select Emergency Type
            </label>
            <select
              value={sosType}
              onChange={(e) => setSosType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="Breakdown">Mechanical Breakdown / Engine Failure</option>
              <option value="Accident">Accident / Collision</option>
              <option value="Medical">Medical Emergency Onboard</option>
              <option value="Traffic">Severe Traffic Congestion / Roadblock</option>
              <option value="Other">Other Critical Situation</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleSOSClick}
            disabled={sosActive}
            className={`w-28 h-28 rounded-full flex flex-col items-center justify-center text-white font-extrabold uppercase text-[10px] tracking-wider transition-smooth ${
              sosActive 
                ? 'bg-rose-500/30 border border-rose-300 text-rose-600 animate-pulse'
                : 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/30 animate-pulse-ring'
            }`}
            style={{ animationDuration: '1.5s' }}
          >
            <PhoneCall className="w-8 h-8 text-white mb-2" />
            <span>{sosActive ? 'Alert Sent' : 'Trigger SOS'}</span>
          </button>
        </div>
      </div>

      {/* Help helpline contacts */}
      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center">
        <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
          Emergency dispatcher assistance
        </span>
        <h4 className="text-xs font-bold text-slate-800 mt-1">Direct Helpline: +91 99999 88888</h4>
      </div>

    </div>
  );
};

export default DriverDashboard;
