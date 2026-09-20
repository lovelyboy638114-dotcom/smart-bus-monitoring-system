import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

const AdminSettingsTab: React.FC = () => {
  const { triggerNotification } = useApp();
  const [overspeedThreshold, setOverspeedThreshold] = useState(50);
  const [geofenceRadius, setGeofenceRadius] = useState(100);

  const handleTriggerAlert = (message: string, type: 'info' | 'warning' | 'error' | 'success') => {
    triggerNotification(message, type);
  };

  return (
    <div className="space-y-6 text-left max-w-xl font-sans">
      <div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">System Settings</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Configure telematics speed limits and geofencing ranges:</p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
        {/* Speed Limit Slider */}
        <div>
          <label className="text-xs font-extrabold text-slate-800 flex justify-between">
            <span>School Zone Speed Limit</span>
            <span className="font-mono text-blue-600">{overspeedThreshold} km/h</span>
          </label>
          <input
            type="range"
            min="30"
            max="80"
            value={overspeedThreshold}
            onChange={(e) => {
              const val = Number(e.target.value);
              setOverspeedThreshold(val);
              handleTriggerAlert(`School zone speed threshold set to: ${val} km/h`, "success");
            }}
            className="w-full mt-2 accent-blue-600 cursor-pointer"
          />
          <p className="text-[10px] text-slate-500 font-medium mt-1">Triggers automated overspeed warning if driver exceeds this value.</p>
        </div>

        {/* Geofence Range Slider */}
        <div>
          <label className="text-xs font-extrabold text-slate-800 flex justify-between">
            <span>Geofence Arrival Range</span>
            <span className="font-mono text-blue-600">{geofenceRadius} meters</span>
          </label>
          <input
            type="range"
            min="50"
            max="500"
            value={geofenceRadius}
            onChange={(e) => {
              const val = Number(e.target.value);
              setGeofenceRadius(val);
              handleTriggerAlert(`Geofence arrival boundary radius configured to: ${val}m`, "success");
            }}
            className="w-full mt-2 accent-blue-600 cursor-pointer"
          />
          <p className="text-[10px] text-slate-500 font-medium mt-1">Defines proximity radius to trigger stop approach notifications.</p>
        </div>

        {/* Simulated save */}
        <button
          onClick={() => handleTriggerAlert("Telemetry configurations saved successfully.", "success")}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
        >
          Save Configurations
        </button>
      </div>
    </div>
  );
};

export default AdminSettingsTab;
