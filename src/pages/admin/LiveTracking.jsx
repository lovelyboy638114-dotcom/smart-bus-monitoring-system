import React from 'react';
import { useApp } from '../../context/AppContext';
import LeafletMap from '../../components/LeafletMap';
import { Compass, Users, MapPin, ToggleLeft, ToggleRight, Play, Square, AlertTriangle, Layers } from 'lucide-react';

const LiveTracking = () => {
  const { buses, selectedBusId, setSelectedBusId, toggleBusDeviation, updateBusTripStatus } = useApp();

  // If selectedBusId is "all", we show overall fleet, otherwise we find the specific bus
  const isAllSelected = selectedBusId === "all";
  const selectedBus = buses.find((b) => b.id === selectedBusId) || buses[0];

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-[calc(100vh-4rem)] overflow-hidden font-sans">
      
      {/* Left side: Buses List Panel */}
      <div className="w-full lg:w-80 bg-white border border-slate-100 rounded-2xl flex flex-col shrink-0 overflow-hidden shadow-soft">
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Fleet Registry</h3>
          <p className="text-[10px] text-slate-400 font-medium">Select a route or view overall fleet live map:</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 flex flex-col gap-2">
          
          {/* Overall Fleet View Option */}
          <div
            onClick={() => setSelectedBusId("all")}
            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-smooth ${
              isAllSelected
                ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                : 'bg-white border-transparent hover:bg-slate-50'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-blue-600">
                <Layers className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider">Overall Fleet View</h4>
              </div>
              <span className="px-2 py-0.5 text-[8px] font-bold bg-blue-100 text-blue-800 rounded-full uppercase">
                {buses.length} Buses
              </span>
            </div>
            <p className="text-[9px] text-slate-450 mt-1 font-semibold leading-tight">
              Tracks all Route A, B, C positions simultaneously on one coordinates screen.
            </p>
          </div>

          {/* Regular Bus Items */}
          {buses.map((bus) => {
            const isActive = bus.id === selectedBusId && !isAllSelected;
            const isMoving = bus.status === 'On Route' || bus.status === 'In Transit';

            return (
              <div
                key={bus.id}
                onClick={() => setSelectedBusId(bus.id)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-smooth ${
                  isActive
                    ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                    : 'bg-white border-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-mono">
                      {bus.id}
                      {bus.deviation && (
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                      {bus.route}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                    bus.status === 'Idle' 
                      ? 'bg-slate-100 text-slate-600'
                      : bus.status === 'Delayed'
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100 animate-pulse'
                  }`}>
                    {bus.status === 'On Route' ? 'In Transit' : bus.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] text-slate-500 font-semibold border-t border-slate-100/60 pt-2">
                  <div>
                    <span className="text-slate-400 block text-[8px] uppercase tracking-wider">Speed</span>
                    <span className={bus.speed > 60 ? 'text-rose-600 font-extrabold animate-pulse' : 'text-slate-700'}>
                      {bus.speed} km/h
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[8px] uppercase tracking-wider">ETA</span>
                    <span className="text-slate-700">{bus.status === 'Idle' ? 'Depot' : bus.eta}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center & Right side: Interactive Map and Control Center */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        
        {/* Dynamic OpenStreetMap Leaflet Map */}
        <div className="flex-1 min-h-[300px]">
          <LeafletMap buses={buses} selectedBusId={selectedBusId} />
        </div>

        {/* Selected Bus Telematics Control Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft flex flex-wrap items-center justify-between gap-6">
          {isAllSelected ? (
            /* Fleet-Wide Summary view */
            <div className="flex gap-4 items-center w-full justify-between">
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <Layers className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none mb-1">
                    Fleet-Wide Command Mode
                  </span>
                  <h4 className="text-sm font-black text-slate-800">Overall Transit Grid Coordinates</h4>
                  <p className="text-xs text-slate-550 mt-0.5">
                    Monitoring {buses.length} active vehicle nodes. All GPS channels locked and active.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 text-[10px] font-bold text-slate-600">
                <div className="bg-slate-50 px-3.5 py-2 border border-slate-150 rounded-xl">
                  Active Alerts: <span className="text-rose-600 font-black">{buses.filter(b => b.deviation).length} Deviated</span>
                </div>
                <div className="bg-slate-50 px-3.5 py-2 border border-slate-150 rounded-xl">
                  In Transit: <span className="text-emerald-600 font-black">{buses.filter(b => b.status !== 'Idle').length} Active</span>
                </div>
              </div>
            </div>
          ) : (
            /* Individual Bus view controls */
            <>
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none mb-1">
                    Active Asset Details
                  </span>
                  <h4 className="text-sm font-black text-slate-800">{selectedBus.id} ({selectedBus.driver})</h4>
                  <p className="text-xs text-slate-550 mt-0.5">
                    Next Stop: <span className="font-semibold text-slate-700">{selectedBus.nextStop}</span> | Onboard: <span className="font-semibold text-slate-700">{selectedBus.studentsOnboard} students</span>
                  </p>
                </div>
              </div>

              {/* Trip Controllers & Deviation Simulation */}
              <div className="flex flex-wrap items-center gap-4">
                
                {/* Trip Controls */}
                <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-150 gap-1.5">
                  <button
                    onClick={() => updateBusTripStatus(selectedBus.id, 'On Route')}
                    disabled={selectedBus.status === 'On Route' || selectedBus.status === 'In Transit'}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 hover:disabled:bg-white text-emerald-600 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm border border-slate-200/50 transition-smooth"
                  >
                    <Play className="w-3.5 h-3.5 fill-emerald-600" />
                    <span>Start Trip</span>
                  </button>
                  <button
                    onClick={() => updateBusTripStatus(selectedBus.id, 'Idle')}
                    disabled={selectedBus.status === 'Idle'}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 hover:disabled:bg-white text-rose-600 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm border border-slate-200/50 transition-smooth"
                  >
                    <Square className="w-3.5 h-3.5 fill-rose-600" />
                    <span>End Trip</span>
                  </button>
                </div>

                {/* Route Deviation Simulator Toggle Button */}
                <button
                  onClick={() => toggleBusDeviation(selectedBus.id)}
                  className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-smooth ${
                    selectedBus.deviation
                      ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm animate-pulse-ring'
                      : 'bg-white border-slate-205 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Simulate Route Deviation</span>
                  {selectedBus.deviation ? (
                    <ToggleRight className="w-5 h-5 text-rose-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                </button>

              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default LiveTracking;
