import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, CheckCircle, Award, AlertOctagon } from 'lucide-react';

const DriverSafety = () => {
  const { driverBehavior = {
    drowsiness: false,
    mobileUsage: false,
    seatbelt: true,
    smoking: false,
    safetyScore: 94
  } } = useApp();


  const isDrowsy = driverBehavior.drowsiness;
  const isUsingPhone = driverBehavior.mobileUsage;
  const isSeatbeltOff = !driverBehavior.seatbelt;
  const isSmoking = driverBehavior.smoking;

  const safetyItems = [
    {
      label: 'Drowsiness Fatigue alert',
      status: isDrowsy ? 'Alarm Active' : 'Normal',
      val: isDrowsy,
      color: isDrowsy ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-100'
    },
    {
      label: 'Phone distraction warning',
      status: isUsingPhone ? 'Alarm Active' : 'Normal',
      val: isUsingPhone,
      color: isUsingPhone ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-100'
    },
    {
      label: 'Seatbelt Buckle Sensor',
      status: isSeatbeltOff ? 'Seatbelt Unbuckled' : 'Buckled',
      val: isSeatbeltOff,
      color: isSeatbeltOff ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-100'
    },
    {
      label: 'Smoking cabin sensor',
      status: isSmoking ? 'Violation Detected' : 'Normal',
      val: isSmoking,
      color: isSmoking ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-100'
    }
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto font-sans">
      
      {/* View Header */}
      <div>
        <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none">
          Compliance Ratings
        </span>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-1">Driver Safety Panel</h2>
        <p className="text-xs text-slate-500 font-medium">Review your live safety rating, drowsiness alarms, and driving compliance score:</p>
      </div>

      {/* Safety Score visual gauge card */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft flex items-center justify-between gap-6">
        <div>
          <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
            Telemetry Assessment rating
          </span>
          <h3 className="text-base font-black text-slate-800">Your Safety Score</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Weekly telemetry score calculates automatically.</p>
          
          <div className="mt-3.5 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-extrabold uppercase text-blue-600">Grade: {driverBehavior.safetyScore > 75 ? 'A+' : 'C-'}</span>
          </div>
        </div>

        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" className="stroke-slate-100 stroke-[5]" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              className={`stroke-[6] transition-all duration-500 ${
                driverBehavior.safetyScore > 75
                  ? 'stroke-emerald-500'
                  : driverBehavior.safetyScore > 50
                  ? 'stroke-amber-500'
                  : 'stroke-rose-500'
              }`}
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - driverBehavior.safetyScore / 100)}`}
            />
          </svg>
          <span className="absolute text-base font-black text-slate-800">{driverBehavior.safetyScore}%</span>
        </div>
      </div>

      {/* Telematics stats cards */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">AI Video Analysis indicators</h3>
        
        <div className="flex flex-col gap-3">
          {safetyItems.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-150">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none mb-1">Sensor Parameter</span>
                <span className="text-xs font-bold text-slate-850">{item.label}</span>
              </div>
              <span className={`px-2.5 py-1 text-[9px] font-extrabold uppercase border rounded-full ${item.color}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Warning */}
      {(isDrowsy || isUsingPhone || isSeatbeltOff) && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex gap-3.5 animate-pulse-ring">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-[8px] font-extrabold uppercase text-rose-600 tracking-wider block">
              Active Telemetry Violation Warning
            </span>
            <p className="text-xs font-bold text-slate-850 mt-0.5">
              Warning signals dispatched to central operator! Buckle seatbelt and focus on transit.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverSafety;
