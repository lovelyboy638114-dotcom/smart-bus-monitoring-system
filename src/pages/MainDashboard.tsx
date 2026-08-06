import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar.tsx';
import EmergencyHistory from './admin/EmergencyHistory.tsx';
import TopNavbar from '../components/TopNavbar.tsx';
import LeafletMap from '../components/LeafletMap.tsx';
import DashboardStats from '../components/DashboardStats.tsx';
import NotificationPanel from '../components/NotificationPanel.tsx';
import AIFeatures from '../components/AIFeatures.tsx';
import { useApp } from '../context/AppContext';
import { SCHOOL_LOCATION } from '../data/mockData';
import { Bus, Student, SystemNotification } from '../types';
import { 
  Bus as BusIcon, ShieldAlert, Users, Compass, 
  CheckCircle2, AlertTriangle, Play, Square, Award, X
} from 'lucide-react';

const MainDashboard: React.FC = () => {
  const { 
    notifications, 
    triggerNotification, 
    clearNotification, 
    clearAllNotifications,
    students,
    setStudents,
    buses,
    updateBusTripStatus
  } = useApp();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [qrModalStudent, setQrModalStudent] = useState<Student | null>(null);

  // Selected entities
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  // AI Violation states
  const [isDrowsy, setIsDrowsy] = useState(false);
  const [isRouteDeviated, setIsRouteDeviated] = useState(false);
  const [isOverspeeding, setIsOverspeeding] = useState(false);
  const [isFaceRecognized, setIsFaceRecognized] = useState(false);
  const [sosActive, setSosActive] = useState(false);

  // Settings state
  const [overspeedThreshold, setOverspeedThreshold] = useState(50);
  const [geofenceRadius, setGeofenceRadius] = useState(100);

  // 1. Trigger simulated notifications
  const handleTriggerAlert = (message: string, type: 'info' | 'warning' | 'error' | 'success') => {
    triggerNotification(message, type);
  };

  // Clear single log item
  const handleClearNotification = (id: string) => {
    clearNotification(id);
  };

  // Clear all alerts
  const handleClearAll = () => {
    clearAllNotifications();
  };

  // Bus coordinates and statuses are updated in real-time from the backend database state.

  // Filter students based on search query
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.pickupStop.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          notificationCount={notifications.length}
          onNotificationClick={() => setActiveTab('notifications')}
        />

        {/* Dynamic Pages Mountpoint */}
        <main className="flex-1 overflow-y-auto p-6 font-sans">
          
          {/* TAB 1: DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="text-left">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">
                  SafeBus Command Center
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Real-time status updates and fleet telematics monitoring:
                </p>
              </div>

              {/* Dynamic stats cards */}
              <DashboardStats buses={buses} students={students} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Map preview */}
                <div className="lg:col-span-2 h-[350px] bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Fleet Transit Tracking
                    </h3>
                    <button 
                      onClick={() => setActiveTab('tracking')}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                    >
                      Maximize Map
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <LeafletMap buses={buses} selectedBusId={selectedBusId} />
                  </div>
                </div>

                {/* Notifications log feed */}
                <div className="h-[350px]">
                  <NotificationPanel 
                    notifications={notifications} 
                    onClearNotification={handleClearNotification}
                    onClearAll={handleClearAll}
                  />
                </div>
              </div>

              {/* AI Violations, SOS and weather panels */}
              <AIFeatures 
                onTriggerAlert={handleTriggerAlert}
                isDrowsy={isDrowsy}
                setIsDrowsy={setIsDrowsy}
                isRouteDeviated={isRouteDeviated}
                setIsRouteDeviated={setIsRouteDeviated}
                isOverspeeding={isOverspeeding}
                setIsOverspeeding={setIsOverspeeding}
                isFaceRecognized={isFaceRecognized}
                setIsFaceRecognized={setIsFaceRecognized}
                sosActive={sosActive}
                setSosActive={setSosActive}
              />
            </div>
          )}

          {/* TAB 2: LIVE TRACKING TAB */}
          {activeTab === 'tracking' && (
            <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-6">
              
              {/* Map Canvas */}
              <div className="flex-1 h-full min-h-[300px] flex flex-col gap-3">
                <div className="flex justify-between items-center text-left">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Coimbatore Live Map
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      Destination: Karpagam College of Engineering, Othakkalmandapam
                    </p>
                  </div>
                  
                  {/* Select active bus to highlight */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedBusId(null)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase border transition-all ${
                        selectedBusId === null 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Show All
                    </button>
                    {buses.map(b => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBusId(b.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase border transition-all ${
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

                <div className="flex-1 min-h-0">
                  <LeafletMap buses={buses} selectedBusId={selectedBusId} />
                </div>
              </div>

              {/* Sidebar stats tracker for live tracking */}
              <div className="w-full md:w-80 h-full overflow-y-auto flex flex-col gap-4">
                <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider border-b border-slate-200 pb-2">
                  Fleet telemetry feeds
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
                        <h4 className="text-xs font-black text-slate-800">{b.id}</h4>
                        <span className="text-[9px] font-extrabold text-slate-400 block tracking-wider uppercase mt-0.5">
                          {b.routeNumber}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase ${
                        b.status === 'Running' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-left text-[11px] font-semibold text-slate-600 border-t border-slate-100 pt-2.5">
                      <div>Speed: <span className="font-extrabold text-slate-800">{b.speed} km/h</span></div>
                      <div>ETA: <span className="font-extrabold text-slate-800">{b.eta}</span></div>
                      <div>Battery: <span className="font-extrabold text-slate-800">{b.battery}%</span></div>
                      <div>Driver: <span className="font-extrabold text-slate-850">{b.driverName}</span></div>
                    </div>

                    <div className="flex gap-2 border-t border-slate-100 pt-3">
                      {b.status === 'Running' ? (
                        <button
                          onClick={() => updateBusTripStatus(b.id, 'Stopped')}
                          className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                        >
                          <Square className="w-3.5 h-3.5 fill-rose-600 stroke-none" /> Stop Bus
                        </button>
                      ) : (
                        <button
                          onClick={() => updateBusTripStatus(b.id, 'Running')}
                          className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-emerald-700 stroke-none" /> Start Route
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: ROUTES TAB */}
          {activeTab === 'routes' && (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Transit Route Planners</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Assigned loops, coordinate stops, and pickup times:</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {buses.map((busItem) => (
                  <div key={busItem.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-black text-slate-850">{busItem.id} Route Stops</h3>
                        <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider block mt-0.5">
                          {busItem.routeNumber}
                        </span>
                      </div>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: busItem.color }} />
                    </div>

                    <div className="space-y-4 relative pl-4 border-l border-slate-200/80">
                      {busItem.stops.map((stop, sIdx) => (
                        <div key={sIdx} className="relative text-xs">
                          {/* Indicator pin */}
                          <div 
                            className="absolute -left-[20.5px] top-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                            style={{ backgroundColor: busItem.color }}
                          />
                          <div className="font-extrabold text-slate-800">{stop.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-bold flex gap-4">
                            <span>Time: {stop.pickupTime}</span>
                            <span>Pupils waiting: {stop.studentsWaiting}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: STUDENTS TAB */}
          {activeTab === 'students' && (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Pupil Registry Control</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Manage boarding status, pickup points and parents contacts:</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-650">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 uppercase text-[9px] font-extrabold tracking-wider">
                        <th className="p-3">Avatar</th>
                        <th className="p-3">ID</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Assigned Bus</th>
                        <th className="p-3">Pickup Stop</th>
                        <th className="p-3">Distance</th>
                        <th className="p-3">Attendance</th>
                        <th className="p-3">Parent Contact</th>
                        <th className="p-3">Transit Status</th>
                        <th className="p-3 text-center">Boarding Pass</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredStudents.map((stud) => (
                        <tr key={stud.id} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <img src={stud.avatarUrl} alt={stud.name} className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100" />
                          </td>
                          <td className="p-3 font-mono text-slate-800 font-bold">{stud.id}</td>
                          <td className="p-3 text-slate-900 font-extrabold">{stud.name}</td>
                          <td className="p-3 flex items-center gap-1.5 pt-4">
                            <span className="px-2 py-0.5 text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                              {stud.assignedBus}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[8.5px] font-black rounded uppercase ${
                              stud.assignment_status === 'ASSIGNED' 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : stud.assignment_status === 'BUS_PENDING'
                                ? 'bg-amber-55 text-amber-700 border border-amber-150 animate-pulse'
                                : 'bg-slate-50 text-slate-600 border border-slate-200'
                            }`}>
                              {stud.assignment_status || 'MANUAL'}
                            </span>
                          </td>
                          <td className="p-3">{stud.pickupStop}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-550">
                            {stud.pickup_distance !== undefined && stud.pickup_distance !== null
                              ? `${Math.round(stud.pickup_distance)}m`
                              : '--'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded ${
                              stud.attendance === 'Present' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : stud.attendance === 'Absent'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {stud.attendance}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[10px]">{stud.parentContact}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full border ${
                              stud.status === 'On Board'
                                ? 'bg-amber-50 border-amber-100 text-amber-700 animate-pulse'
                                : stud.status === 'Dropped'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}>
                              {stud.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setQrModalStudent(stud)}
                              className="px-2.5 py-1 text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-smooth uppercase tracking-wider cursor-pointer"
                            >
                              View QR
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DRIVERS TAB */}
          {activeTab === 'drivers' && (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Driver Safety Registry</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Assigned buses, licensing details and experience index:</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {buses.map((busItem, index) => {
                  const prefix = busItem.driverName ? busItem.driverName.replace(/\s+/g, '').toLowerCase() : '';
                  const driverPhone = "+91 94432 1000" + (index + 1);
                  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${busItem.driverName || 'Driver'}`;

                  return (
                    <div key={index} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center text-center gap-4">
                      <img src={avatarUrl} alt={busItem.driverName} className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-150 p-1" />
                      <div>
                        <h3 className="text-sm font-black text-slate-800">{busItem.driverName}</h3>
                        <span className="text-[10px] font-black text-blue-600 block mt-0.5 uppercase tracking-wider">
                          Assigned: {busItem.id}
                        </span>
                      </div>

                      <div className="w-full space-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-655 text-left">
                        <div className="flex justify-between">
                          <span>Phone:</span>
                          <span className="font-bold text-slate-800">{driverPhone}</span>
                        </div>
                        <div className="flex justify-between font-mono">
                          <span>License No:</span>
                          <span className="font-bold text-slate-805">{busItem.driverLicense || "DL-TN38AB2024"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Experience:</span>
                          <span className="font-bold text-slate-800">{busItem.driverExperience || 5} Years</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {buses.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-slate-400 font-medium">
                    No Drivers Found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 text-left max-w-xl mx-auto">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Safety Warning & System Logs</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Full audit history of tracking telemetry logs:</p>
              </div>

              <NotificationPanel 
                notifications={notifications} 
                onClearNotification={handleClearNotification}
                onClearAll={handleClearAll}
              />
            </div>
          )}

          {/* TAB 7: REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="space-y-6 text-left max-w-3xl">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Fleet Operations Reports</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Export metrics sheets and safety ratings logs:</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-blue-500" /> Operational Summary Stats
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">Average Driver Safety score</span>
                    <h4 className="text-lg font-black text-slate-800 mt-1">94.8%</h4>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">On-Time Arrival Index</span>
                    <h4 className="text-lg font-black text-slate-800 mt-1">98.2%</h4>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleTriggerAlert("CSV Report Export started for Fleet Safety Logs.", "success")}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-600/10 transition-smooth"
                  >
                    Export Safety Logs CSV
                  </button>
                  <button 
                    onClick={() => handleTriggerAlert("PDF Report download started.", "success")}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-smooth"
                  >
                    Download Attendance PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7.5: EMERGENCY HISTORY TAB */}
          {activeTab === 'sosHistory' && (
            <EmergencyHistory />
          )}

          {/* TAB 8: SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6 text-left max-w-xl">
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
                    className="w-full mt-2 accent-blue-600"
                  />
                  <p className="text-[10px] text-slate-450 font-medium mt-1">Triggers automated overspeed warning if driver exceeds this value.</p>
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
                    className="w-full mt-2 accent-blue-600"
                  />
                  <p className="text-[10px] text-slate-450 font-medium mt-1">Defines proximity radius to trigger stop approach notifications.</p>
                </div>

                {/* Simulated save */}
                <button
                  onClick={() => handleTriggerAlert("Telemetry configurations saved successfully.", "success")}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-smooth"
                >
                  Save Configurations
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* QR Boarding Pass Modal popup */}
      {qrModalStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full text-center relative font-sans animate-scale-up">
            <button
              onClick={() => setQrModalStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Boarding QR Pass</span>
            <h3 className="text-base font-black text-slate-800 leading-none mt-1">{qrModalStudent.name}</h3>
            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block mt-1">ID: {qrModalStudent.id}</span>
            
            <div className="my-6 p-4 bg-white border border-slate-150 rounded-2xl inline-block shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrModalStudent.id}`}
                alt="Student Boarding QR"
                className="w-40 h-40"
              />
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-left text-xs font-semibold text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span>Assigned Bus:</span>
                <span className="font-bold text-slate-800">{qrModalStudent.assignedBus}</span>
              </div>
              <div className="flex justify-between">
                <span>Pickup Stop:</span>
                <span className="font-bold text-slate-800">{qrModalStudent.pickupStop}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-450 font-medium leading-normal mt-4">
              Scan this QR code at the bus card reader to register passenger boarding checks automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainDashboard;
