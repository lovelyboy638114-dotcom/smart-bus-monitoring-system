import React, { useState } from 'react';
import { Settings, Shield, Bell, Map, Key, RefreshCw } from 'lucide-react';

const AdminSettings = () => {
  // State variables for ranges values
  const [drowsinessVal, setDrowsinessVal] = useState(1.5);
  const [mobileVal, setMobileVal] = useState(85);
  const [yawningVal, setYawningVal] = useState(0.65);
  
  const [speedLimitVal, setSpeedLimitVal] = useState(60);
  const [deviationVal, setDeviationVal] = useState(200);
  const [intervalVal, setIntervalVal] = useState(10);

  return (
    <div className="flex flex-col gap-6 p-6 font-sans">
      
      {/* View Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">System Control Settings</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Configure AI thresholds, GPS coordinates geofencing ranges, and parent push alert integrations.
        </p>
      </div>

      {/* Settings Options Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* AI telematics limits panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-205/60 shadow-soft">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-blue-600" /> AI Video Analytics Thresholds
          </h3>
          
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block mb-1">
                Drowsiness Eye Closure duration
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1.0" 
                  max="3.0" 
                  step="0.1" 
                  value={drowsinessVal} 
                  onChange={(e) => setDrowsinessVal(parseFloat(e.target.value))}
                  className="flex-1 accent-blue-600" 
                />
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-12 text-center">
                  {drowsinessVal.toFixed(1)}s
                </span>
              </div>
            </div>

            <div className="border-t border-slate-105 pt-3">
              <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block mb-1">
                Mobile usage detection confidence
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="70" 
                  max="99" 
                  value={mobileVal} 
                  onChange={(e) => setMobileVal(parseInt(e.target.value))}
                  className="flex-1 accent-blue-600" 
                />
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-12 text-center">
                  {mobileVal}%
                </span>
              </div>
            </div>

            <div className="border-t border-slate-105 pt-3">
              <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest block mb-1">
                Yawing check aperture threshold
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0.4" 
                  max="0.9" 
                  step="0.05" 
                  value={yawningVal} 
                  onChange={(e) => setYawningVal(parseFloat(e.target.value))}
                  className="flex-1 accent-blue-600" 
                />
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-12 text-center">
                  {yawningVal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GPS alerts options panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-205/60 shadow-soft">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Map className="w-4.5 h-4.5 text-blue-600" /> GPS Geofence & Routing
          </h3>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block mb-1">
                Maximum speed limit (School Zone)
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="30" 
                  max="80" 
                  value={speedLimitVal} 
                  onChange={(e) => setSpeedLimitVal(parseInt(e.target.value))}
                  className="flex-1 accent-blue-600" 
                />
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-20 text-center">
                  {speedLimitVal} km/h
                </span>
              </div>
            </div>

            <div className="border-t border-slate-105 pt-3">
              <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block mb-1">
                Route deviation distance boundary
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="50" 
                  max="500" 
                  step="10" 
                  value={deviationVal} 
                  onChange={(e) => setDeviationVal(parseInt(e.target.value))}
                  className="flex-1 accent-blue-600" 
                />
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-16 text-center">
                  {deviationVal}m
                </span>
              </div>
            </div>

            <div className="border-t border-slate-105 pt-3">
              <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest block mb-1">
                Geofence radius check intervals
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="5" 
                  max="30" 
                  value={intervalVal} 
                  onChange={(e) => setIntervalVal(parseInt(e.target.value))}
                  className="flex-1 accent-blue-600" 
                />
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-12 text-center">
                  {intervalVal}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications config options */}
        <div className="bg-white p-6 rounded-2xl border border-slate-205/60 shadow-soft">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Bell className="w-4.5 h-4.5 text-blue-600" /> FCM Notification Settings
          </h3>

          <div className="flex flex-col gap-3 text-xs font-semibold text-slate-700">
            <label className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-xl cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 accent-blue-600" />
              <span>SMS Alert to Parents on Boarding check-ins</span>
            </label>
            <label className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-xl cursor-pointer border-t border-slate-100/60 pt-2.5">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 accent-blue-600" />
              <span>Push alerts on route deviation triggers</span>
            </label>
            <label className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-xl cursor-pointer border-t border-slate-100/60 pt-2.5">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 accent-blue-600" />
              <span>Automated critical warnings to Fleet Operator</span>
            </label>
            <label className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-xl cursor-pointer border-t border-slate-100/60 pt-2.5">
              <input type="checkbox" className="w-4 h-4 rounded text-blue-600 accent-blue-600" />
              <span>Weekly driving safety analytical summaries email</span>
            </label>
          </div>
        </div>

        {/* Reset / Diagnostic Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-205/60 shadow-soft flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <RefreshCw className="w-4.5 h-4.5 text-blue-600" /> System Maintenance Console
            </h3>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-4">
              Perform diagnostic self-tests, recalibrate cameras, or clear simulation logs.
            </p>
          </div>

          <div className="flex gap-3 text-xs">
            <button className="flex-1 py-3 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-smooth uppercase tracking-wider text-[10px]">
              Recalibrate AI Cam
            </button>
            <button className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-600/10 transition-smooth uppercase tracking-wider text-[10px]">
              Reset Telemetry Database
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminSettings;
