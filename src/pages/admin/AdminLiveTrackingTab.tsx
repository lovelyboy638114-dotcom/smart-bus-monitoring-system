import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import LeafletMap from '../../components/LeafletMap';
import { Play, Square, FastForward, AlertTriangle, ShieldAlert, RotateCw, Smartphone, ExternalLink, X, Check } from 'lucide-react';

const AdminLiveTrackingTab: React.FC = () => {
  const { 
    buses, 
    updateBusTripStatus, 
    advanceLocalBusSimulation, 
    toggleBusDeviation, 
    toggleBusSOS,
    resetSimulation,
    triggerNotification 
  } = useApp();
  
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [autoSimulating, setAutoSimulating] = useState<boolean>(false);
  const [showPhoneModal, setShowPhoneModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [networkIp, setNetworkIp] = useState<string>('10.56.62.126');
  const [availableIps, setAvailableIps] = useState<{ interface: string; ip: string }[]>([]);
  const autoSimIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-detect laptop's true local network IP address
  useEffect(() => {
    if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setNetworkIp(window.location.hostname);
    }
    fetch('/api/network-ip')
      .then(r => r.json())
      .then(data => {
        if (data && data.ip) {
          if (!window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            setNetworkIp(data.ip);
          }
          if (data.allIps && Array.isArray(data.allIps)) {
            setAvailableIps(data.allIps);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Auto simulation loop
  useEffect(() => {
    if (autoSimulating) {
      autoSimIntervalRef.current = setInterval(() => {
        const targetBusId = selectedBusId || 'Bus 1';
        advanceLocalBusSimulation(targetBusId);
      }, 1500);
    } else {
      if (autoSimIntervalRef.current) {
        clearInterval(autoSimIntervalRef.current);
        autoSimIntervalRef.current = null;
      }
    }

    return () => {
      if (autoSimIntervalRef.current) {
        clearInterval(autoSimIntervalRef.current);
      }
    };
  }, [autoSimulating, selectedBusId, advanceLocalBusSimulation]);

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-6 font-sans">
      {/* Map Canvas */}
      <div className="flex-1 h-full min-h-[300px] flex flex-col gap-3">
        <div className="flex flex-wrap justify-between items-center text-left gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Coimbatore Live GPS Fleet Telemetry
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Target Destination: Karpagam College of Engineering, Othakkalmandapam
            </p>
          </div>
          
          {/* Controls toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setAutoSimulating(!autoSimulating);
                triggerNotification(
                  autoSimulating ? 'GPS Auto-simulation paused.' : 'GPS Auto-simulation active. Bus advancing on route.',
                  'info'
                );
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                autoSimulating 
                  ? 'bg-amber-500 text-white animate-pulse' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {autoSimulating ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              {autoSimulating ? 'Pause Auto GPS' : 'Auto Run GPS Demo'}
            </button>

            <button
              onClick={() => {
                const targetId = selectedBusId || 'Bus 1';
                advanceLocalBusSimulation(targetId);
              }}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-smooth cursor-pointer"
              title="Step bus forward one GPS waypoint"
            >
              <FastForward className="w-3.5 h-3.5" /> Step GPS
            </button>

            <button
              onClick={() => resetSimulation()}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-smooth cursor-pointer"
              title="Reset simulation to depot start"
            >
              <RotateCw className="w-3.5 h-3.5" /> Reset
            </button>

            {/* Phone GPS Controller Button */}
            <button
              onClick={() => setShowPhoneModal(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Connect your smartphone to simulate live bus GPS"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Phone GPS Controller
            </button>
            
            {/* Bus Selectors */}
            <div className="flex gap-1">
              <button 
                onClick={() => setSelectedBusId(null)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase border transition-all cursor-pointer ${
                  selectedBusId === null 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All
              </button>
              {buses.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBusId(b.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase border transition-all cursor-pointer ${
                    selectedBusId === b.id 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {b.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <LeafletMap buses={buses} selectedBusId={selectedBusId} />
        </div>
      </div>

      {/* Sidebar stats tracker for live tracking */}
      <div className="w-full md:w-84 h-full overflow-y-auto flex flex-col gap-3">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
          Fleet Telemetry & Demo Controls
        </h3>

        {buses.map((b) => (
          <div 
            key={b.id} 
            className={`bg-white border p-4 rounded-xl shadow-sm flex flex-col gap-3 transition-all ${
              selectedBusId === b.id ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200'
            }`}
          >
            <div className="flex justify-between items-center text-left">
              <div>
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  {b.id}
                  {b.sos && (
                    <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[8px] font-black rounded uppercase animate-bounce">
                      SOS
                    </span>
                  )}
                  {b.deviation && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[8px] font-black rounded uppercase">
                      Deviated
                    </span>
                  )}
                </h4>
                <span className="text-[9px] font-extrabold text-slate-400 block tracking-wider uppercase mt-0.5">
                  {b.routeNumber}
                </span>
              </div>
              <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase ${
                b.status === 'Running' || b.status === 'On Route' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {b.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left text-[11px] font-semibold text-slate-600 border-t border-slate-100 pt-2.5">
              <div>Speed: <span className="font-extrabold text-slate-800">{b.speed} km/h</span></div>
              <div>ETA: <span className="font-extrabold text-slate-800">{b.eta}</span></div>
              <div>Battery: <span className="font-extrabold text-slate-800">{b.battery}%</span></div>
              <div>Driver: <span className="font-extrabold text-slate-800">{b.driverName}</span></div>
            </div>

            {/* Quick Demo Action Triggers */}
            <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2.5">
              <button
                onClick={() => advanceLocalBusSimulation(b.id)}
                className="py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
              >
                <FastForward className="w-3 h-3" /> Step
              </button>

              {b.status === 'Running' || b.status === 'On Route' ? (
                <button
                  onClick={() => updateBusTripStatus(b.id, 'Stopped')}
                  className="py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-rose-600 stroke-none" /> Stop
                </button>
              ) : (
                <button
                  onClick={() => updateBusTripStatus(b.id, 'Running')}
                  className="py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-emerald-700 stroke-none" /> Start
                </button>
              )}

              <button
                onClick={() => toggleBusDeviation(b.id)}
                className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border cursor-pointer ${
                  b.deviation 
                    ? 'bg-amber-500 text-white border-amber-600' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Simulate route geofence breach"
              >
                <AlertTriangle className="w-3 h-3" /> Deviation
              </button>

              <button
                onClick={() => toggleBusSOS(b.id)}
                className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border cursor-pointer ${
                  b.sos 
                    ? 'bg-rose-600 text-white border-rose-700 animate-pulse' 
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                }`}
                title="Trigger Driver SOS"
              >
                <ShieldAlert className="w-3 h-3" /> SOS
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Phone GPS Controller Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Phone GPS Controller</h3>
                  <p className="text-xs text-slate-500">Control bus location live from your smartphone</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPhoneModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs flex flex-col gap-3 text-slate-600">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mx-auto text-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`http://${networkIp}:5173/gps-controller`)}`}
                  alt="Scan QR code with Phone"
                  className="w-36 h-36 mx-auto rounded-xl"
                />
                <span className="text-[10px] text-slate-400 font-semibold block mt-1.5">Point phone camera to open live</span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Network Address:</span>
                {availableIps.length > 1 ? (
                  <select
                    value={networkIp}
                    onChange={(e) => setNetworkIp(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs text-indigo-700 font-mono"
                  >
                    {availableIps.map(item => (
                      <option key={item.ip} value={item.ip}>{item.ip} ({item.interface})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={networkIp}
                    onChange={(e) => setNetworkIp(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs text-indigo-700 font-mono w-32 text-right"
                  />
                )}
              </div>

              <p className="font-semibold text-slate-800">
                1. Connect phone & laptop to the <span className="text-indigo-600 font-black">same Wi-Fi or Hotspot</span>.
              </p>
              <p className="font-semibold text-slate-800">
                2. On your phone browser, open this URL:
              </p>
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-xs text-indigo-700 font-bold justify-between">
                <span className="truncate">{`http://${networkIp}:5173/gps-controller`}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`http://${networkIp}:5173/gps-controller`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] text-slate-700 shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                3. Use the <strong className="text-slate-900">Route Slider</strong> or tap <strong className="text-amber-600">⚡ Approach 1.8km</strong> to trigger the 2KM parent WhatsApp proximity alert!
              </p>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 flex flex-col gap-1">
                <span className="font-bold">⚠️ On Campus Wi-Fi (KCE-WIFI)?</span>
                <span>College Wi-Fi blocks direct phone-to-laptop communication (AP Isolation). Turn on <strong>Mobile Hotspot</strong> on your phone/laptop, or test directly using <strong>Open Controller (New Tab)</strong> below!</span>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href="/gps-controller"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md text-center"
              >
                <ExternalLink className="w-4 h-4" /> Open Controller (New Tab)
              </a>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLiveTrackingTab;

