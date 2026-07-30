import React from 'react';
import CameraMock from '../../components/CameraMock';
import { useApp } from '../../context/AppContext';
import { Shield, Activity, Compass, AlertOctagon, MonitorDot } from 'lucide-react';

const DriverAnalysis = () => {
  const { buses } = useApp();

  return (
    <div className="flex flex-col gap-6 p-6 font-sans">
      {/* View Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none">
            Computer Vision Telematics
          </span>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-1">Driver Behavior Analysis Console</h2>
          <p className="text-xs text-slate-500 font-medium">
            Real-time driver fatigue, visual distraction, and seatbelt telematics monitoring using Computer Vision.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm text-xs font-bold uppercase shrink-0">
          <MonitorDot className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>Overall CV Feeds Connected</span>
        </div>
      </div>

      {/* Grid rendering all three bus driver cameras side-by-side (connected overall CV) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {buses.map((bus) => (
          <div key={bus.id} className="flex flex-col gap-3">
            <div className="bg-slate-50 p-3.5 border border-slate-150 rounded-xl flex justify-between items-center shadow-inner">
              <div>
                <h4 className="text-xs font-bold text-slate-850 font-mono leading-none">{bus.id}</h4>
                <span className="text-[9px] text-slate-450 uppercase font-extrabold block mt-1 tracking-wider">
                  Driver: {bus.driver}
                </span>
              </div>
              <span className="px-2 py-0.5 text-[8.5px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase tracking-wider">
                ✓ Cam Connected
              </span>
            </div>
            
            <CameraMock 
              busId={bus.id} 
              driverName={bus.driver} 
              defaultSafetyScore={bus.id === "TN38AB1234" ? 85 : bus.id === "TN38CD5678" ? 92 : 88} 
              hideSimulators={true}
            />
          </div>
        ))}
      </div>

      {/* Driver Registry Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-soft mt-6">
        <div className="p-5 bg-slate-50 border-b border-slate-100">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Verified Drivers Registry</h3>
          <p className="text-[10px] text-slate-400 font-medium">Verify driver background checks, verified license IDs, and total years of transit experience:</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Driver Name</th>
                <th className="py-4 px-6">Vehicle / Route</th>
                <th className="py-4 px-6">License Number</th>
                <th className="py-4 px-6">Experience</th>
                <th className="py-4 px-6">Verification API Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {buses.map((busItem) => (
                <tr key={busItem.id} className="hover:bg-slate-50/20 transition-smooth">
                  <td className="py-3.5 px-6 text-slate-900">{busItem.driver}</td>
                  <td className="py-3.5 px-6 font-mono text-[10px] text-slate-550">{busItem.id} ({busItem.route})</td>
                  <td className="py-3.5 px-6 font-mono text-slate-655">{busItem.driverLicense || "Pending Signup"}</td>
                  <td className="py-3.5 px-6">{busItem.driverExperience ? `${busItem.driverExperience} Years` : "N/A"}</td>
                  <td className="py-3.5 px-6">
                    {busItem.driverLicense ? (
                      <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase">
                        ✓ API Verified (Active)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase animate-pulse">
                        ⌛ Awaiting Verification
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DriverAnalysis;
