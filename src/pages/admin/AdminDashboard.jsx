import React, { useState } from 'react';
import { 
  Bus, Users, ShieldAlert, Award, Bell, Search,
  TrendingUp, AlertTriangle, AlertCircle, ArrowUpRight, CheckCircle2, UserCheck, Eye, Compass, AlertOctagon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Cell 
} from 'recharts';

const AdminDashboard = () => {
  const { 
    buses, 
    students, 
    driverBehavior, 
    allDriverBehaviors = {},
    driverComplaints, 
    resolveComplaint,
    activeSOSAlerts = [],
    sosStatistics,
    acknowledgeSOSAlert,
    resolveSOSAlert,
    triggerNotification = () => {}
  } = useApp();

  const alerts = activeSOSAlerts || [];

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Emergency state
  const [selectedSOS, setSelectedSOS] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const syncedSOS = selectedSOS ? (activeSOSAlerts.find(a => a.sos_id === selectedSOS.sos_id) || selectedSOS) : null;

  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const activeTripsCount = buses.filter(b => b.status === 'Running' || b.status === 'On Route' || b.status === 'In Transit').length;
  const totalStudentsCount = students.length; 
  const studentsOnBoard = students.filter(s => s.status === 'On Board').length; 

  const safetyTrendData = [
    { day: 'Mon', score: 88 },
    { day: 'Tue', score: 85 },
    { day: 'Wed', score: 92 },
    { day: 'Thu', score: 87 },
    { day: 'Fri', score: 89 },
    { day: 'Sat', score: 90 },
    { day: 'Sun', score: (driverBehavior && driverBehavior.safetyScore) ? driverBehavior.safetyScore : 95 } 
  ];

  const presentCount = students.filter(s => s.attendance === 'Present').length;
  const absentCount = students.filter(s => s.attendance === 'Absent').length;
  const lateCount = students.filter(s => s.attendance === 'Late').length;

  const attendanceChartData = [
    { name: 'Present', count: presentCount, fill: '#10b981' },
    { name: 'Absent', count: absentCount, fill: '#ef4444' },
    { name: 'Late', count: lateCount, fill: '#f59e0b' }
  ];

  const stats = [
    {
      label: 'Total Fleet Buses',
      val: buses.length,
      icon: Bus,
      color: 'bg-blue-50 text-blue-600 border-blue-105',
      desc: `${activeTripsCount} active routes running`
    },
    {
      label: 'Enrolled Pupils',
      val: totalStudentsCount,
      icon: Users,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-105',
      desc: 'Attendance integrated'
    },
    {
      label: 'Students On Bus',
      val: studentsOnBoard,
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-105',
      desc: 'Active transit checks'
    },
    {
      label: 'Safety Score (Avg)',
      val: `${driverBehavior.safetyScore}%`,
      icon: Award,
      color: driverBehavior.safetyScore > 75 ? 'bg-emerald-50 text-emerald-600 border-emerald-105' : 'bg-rose-50 text-rose-600 border-rose-105',
      desc: 'Isolation Forest rating'
    },
    {
      label: 'Active System Alerts',
      val: unresolvedAlerts.length,
      icon: ShieldAlert,
      color: unresolvedAlerts.length > 0 ? 'bg-rose-50 text-rose-600 border-rose-105' : 'bg-slate-50 text-slate-400 border-slate-105',
      desc: 'Immediate action needed'
    }
  ];

  // Behavior summary mapper for search details
  const getDriverBehaviorData = (busId) => {
    const defaultData = {
      score: 95,
      drowsy: "UNKNOWN",
      phone: "UNKNOWN",
      seatbelt: "UNKNOWN",
      smoking: "UNKNOWN",
      isNormal: true
    };
    
    const bh = allDriverBehaviors[busId] || (busId === "TN38AB1234" ? driverBehavior : null);
    if (!bh) return defaultData;
    
    const isNormal = bh.status === 'NORMAL' || bh.status === 'UNKNOWN' || (!bh.drowsiness && !bh.mobileUsage && !bh.smoking && (bh.seatbelt !== false));
    
    return {
      score: bh.safetyScore || 95,
      drowsy: bh.status === 'DROWSY' || bh.drowsiness ? "WARNING: Drowsy" : (bh.status === 'UNKNOWN' ? "UNKNOWN" : "Alert & Active"),
      phone: bh.status === 'PHONE_USAGE' || bh.mobileUsage ? "VIOLATION: Phone Use" : (bh.status === 'UNKNOWN' ? "UNKNOWN" : "Focus Checked"),
      seatbelt: bh.seatbelt !== undefined ? (bh.seatbelt ? "Buckled" : "WARNING: Unbuckled") : "UNKNOWN",
      smoking: bh.smoking ? "VIOLATION: Smoking" : (bh.status === 'UNKNOWN' ? "UNKNOWN" : "Safe Cabin"),
      isNormal
    };
  };

  // Filter buses based on query plate
  const searchedBus = searchQuery.trim() 
    ? buses.find(b => b.id.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : null;

  return (
    <div className="flex flex-col gap-6 p-6 font-sans relative">
      
      {/* Flashing critical alarm warning banner */}
      {activeSOSAlerts.length > 0 && (
        <div className="w-full bg-rose-600 text-white font-extrabold text-center py-3.5 text-xs uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse border-b border-rose-700 rounded-xl mb-4 shadow-lg shadow-rose-600/20">
          <AlertOctagon className="w-5 h-5 text-white animate-spin" />
          <span>CRITICAL EMERGENCY WARNING: {activeSOSAlerts.length} Bus SOS alerts active. Action Required!</span>
          <button 
            onClick={() => setSelectedSOS(activeSOSAlerts[0])}
            className="ml-4 bg-white text-rose-700 hover:bg-rose-50 px-3.5 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-smooth uppercase shadow"
          >
            Open Control Center
          </button>
        </div>
      )}

      {/* Page Title & welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Fleet Safety Command Dashboard</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time status updates and telemetry feeds overview.</p>
        </div>
        
        {/* Active Emergency Counter Badge */}
        {activeSOSAlerts.length > 0 && (
          <button
            onClick={() => setSelectedSOS(activeSOSAlerts[0])}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider animate-pulse cursor-pointer shadow-md shadow-rose-600/30"
          >
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            🚨 active emergencies: {activeSOSAlerts.length}
          </button>
        )}
      </div>

      {/* Emergency Response statistics metrics center center */}
      {activeSOSAlerts.length > 0 && (
        <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-2xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-2">
          <div className="p-3 bg-white border border-rose-100 rounded-xl">
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Critical Alerts</span>
            <h4 className="text-lg font-black text-rose-600">{activeSOSAlerts.filter(a => a.severity === 'CRITICAL').length}</h4>
          </div>
          <div className="p-3 bg-white border border-rose-100 rounded-xl">
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Today's Alerts</span>
            <h4 className="text-lg font-black text-slate-800">{sosStatistics?.total_alerts || 0}</h4>
          </div>
          <div className="p-3 bg-white border border-rose-100 rounded-xl col-span-2 md:col-span-1">
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Avg Response</span>
            <h4 className="text-lg font-black text-slate-800">{sosStatistics?.avg_acknowledgment_time_seconds ? `${sosStatistics.avg_acknowledgment_time_seconds}s` : "0.0s"}</h4>
          </div>
          <div className="p-3 bg-white border border-rose-100 rounded-xl col-span-2 md:col-span-1">
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Avg Resolution</span>
            <h4 className="text-lg font-black text-slate-800">{sosStatistics?.avg_resolution_time_seconds ? `${sosStatistics.avg_resolution_time_seconds}s` : "0.0s"}</h4>
          </div>
          <div className="p-3 bg-white border border-rose-100 rounded-xl">
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Police Alerted</span>
            <h4 className="text-lg font-black text-slate-800">{activeSOSAlerts.filter(a => a.status === 'POLICE_NOTIFIED' || a.status === 'ADMIN_ACKNOWLEDGED').length}</h4>
          </div>
          <div className="p-3 bg-white border border-rose-100 rounded-xl">
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Parents Waiting</span>
            <h4 className="text-lg font-black text-slate-800">{activeSOSAlerts.filter(a => a.status === 'POLICE_NOTIFIED').length}</h4>
          </div>
          <div className="p-3 bg-white border border-rose-100 rounded-xl">
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Resolved Today</span>
            <h4 className="text-lg font-black text-slate-800">{sosStatistics?.resolved_alerts || 0}</h4>
          </div>
        </div>
      )}

      {/* Grid Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft flex flex-col justify-between min-h-[120px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                  {stat.label}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl font-black text-slate-800 leading-none">{stat.val}</h3>
                <span className="text-[9px] text-slate-500 font-bold block mt-1.5 uppercase tracking-wide">
                  {stat.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SEARCH BUS TELEMETRY CONSOLE SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-soft">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">Bus Telemetry & Behavior Search</h3>
        <p className="text-[10px] text-slate-450 font-medium mb-4">Enter a bus license plate to audit driver safety score and active computer vision analytics:</p>

        {/* Search bar */}
        <div className="relative max-w-lg mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active Bus plate (e.g. TN38AB1234, TN38CD5678, TN38EP9012)..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-smooth"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </div>

        {/* Searched Bus result template */}
        {searchedBus ? (
          (() => {
            const bh = getDriverBehaviorData(searchedBus.id);
            return (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                {/* Score gauge */}
                <div className="flex items-center gap-4 border-r border-slate-200/80 pr-6">
                  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="28" fill="none" className="stroke-slate-200 stroke-[5]" />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        className={`stroke-[6] transition-all duration-300 ${
                          bh.score > 75 ? 'stroke-emerald-500' : bh.score > 50 ? 'stroke-amber-500' : 'stroke-rose-500'
                        }`}
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - bh.score / 100)}`}
                      />
                    </svg>
                    <span className="absolute text-sm font-black text-slate-800">{bh.score}%</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">Bus Score</span>
                    <h4 className="text-sm font-black text-slate-800">{searchedBus.id}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{searchedBus.route}</p>
                  </div>
                </div>

                {/* Driver Info */}
                <div className="flex flex-col justify-center border-r border-slate-200/80 pr-6">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Driver Details</span>
                  <h4 className="text-xs font-bold text-slate-800">{searchedBus.driver}</h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    License: <span className="font-mono text-slate-700 font-bold">{searchedBus.driverLicense || "Verified"}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Next Stop: <span className="font-semibold text-slate-700">{searchedBus.nextStop}</span>
                  </p>
                </div>

                {/* CV Behavior Analysis */}
                <div className="flex flex-col justify-center gap-1.5">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">CV Behavior Analysis</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${bh.drowsy.includes('WARNING') ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className={bh.drowsy.includes('WARNING') ? 'text-rose-600 font-extrabold' : 'text-slate-650'}>
                        {bh.drowsy}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${bh.phone.includes('VIOLATION') ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className={bh.phone.includes('VIOLATION') ? 'text-rose-600 font-extrabold' : 'text-slate-650'}>
                        {bh.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${bh.seatbelt.includes('WARNING') ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className={bh.seatbelt.includes('WARNING') ? 'text-rose-600 font-extrabold' : 'text-slate-655'}>
                        Seatbelt: {bh.seatbelt}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${bh.smoking.includes('VIOLATION') ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className={bh.smoking.includes('VIOLATION') ? 'text-rose-600 font-extrabold' : 'text-slate-655'}>
                        {bh.smoking}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : searchQuery.trim() ? (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>No active school bus matching plate "{searchQuery}" found.</span>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-[10px] font-semibold tracking-wide italic">
            * Type any bus license number (e.g. TN38AB1234) to run an immediate behavior audit log.
          </div>
        )}
      </div>

      {/* Complex analytical views grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Safety Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Driver Safety Score Trend</h3>
              <p className="text-[10px] text-slate-400 font-medium">Telemetry safety indices averages recorded this week.</p>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 rounded-lg flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +2.4% vs last week
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={safetyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis domain={[50, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '10px' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance overview mini representation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">Boarding Attendance overview</h3>
          <p className="text-[10px] text-slate-400 font-medium mb-6">Aggregate daily boarding check logs from face and QR readers.</p>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceChartData} barSize={28}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '10px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {attendanceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mt-4">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100/60">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Present</span>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">420</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100/60">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Absent</span>
              <p className="text-xs font-bold text-rose-600 mt-0.5">30</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100/60">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Late</span>
              <p className="text-xs font-bold text-amber-600 mt-0.5">8</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Warning Logs feed grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Recent Active Alerts</h3>
              <p className="text-[10px] text-slate-400 font-medium">Telematics violation indicators requiring operator confirmation.</p>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Live stream</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {unresolvedAlerts.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 text-emerald-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Telemetry Feed Clear</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">All fleet systems are operating within nominal thresholds.</p>
                </div>
              </div>
            ) : (
              unresolvedAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      alert.severity === 'High' 
                        ? 'bg-rose-50 border-rose-100 text-rose-600' 
                        : 'bg-amber-50 border-amber-100 text-amber-600'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{alert.emergency_type || alert.type}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Bus {alert.bus_id || alert.bus} | Driver: <span className="font-semibold text-slate-600">{alert.driver_name || alert.driver}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border bg-slate-50 border-slate-200 text-slate-500 font-mono">
                      {alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : alert.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bus Status summary logs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">Fleet Route Status</h3>
          <div className="flex flex-col gap-4">
            {buses.map((bus) => (
              <div key={bus.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100/60 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{bus.id}</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase block mt-1 tracking-wider">{bus.route}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                    bus.status === 'Idle' 
                      ? 'bg-slate-205 text-slate-650' 
                      : bus.status === 'Delayed'
                      ? 'bg-rose-50 text-rose-650 border border-rose-150'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-150 animate-pulse'
                  }`}>
                    {bus.status === 'On Route' ? 'In Transit' : bus.status}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">ETA: {bus.eta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Safety & Complaints Log Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft mt-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <div className="text-left">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Driver Safety Complaints Log</h3>
            <p className="text-[10px] text-slate-400 font-medium">Logged reports submitted by parents via AI chatbot portal.</p>
          </div>
          <span className="px-2.5 py-1 text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-100 rounded-full uppercase tracking-wider">
            {driverComplaints.filter(c => c.status === "Pending").length} Action Pending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-650">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 uppercase text-[9px] font-extrabold tracking-wider">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Parent / Pupil</th>
                <th className="p-3">Driver / Bus</th>
                <th className="p-3">Complaint Detail</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
              {driverComplaints.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">No driver complaints logged.</td>
                </tr>
              ) : (
                driverComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-[10px]">{c.timestamp}</td>
                    <td className="p-3">
                      <div>{c.parentName}</div>
                      <div className="text-[9px] text-slate-450 mt-0.5">Pupil: {c.studentName}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{c.driverName}</div>
                      <div className="text-[9px] font-mono mt-0.5">{c.busId}</div>
                    </td>
                    <td className="p-3 max-w-sm truncate" title={c.complaintText}>
                      {c.complaintText}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[8.5px] font-extrabold rounded-full uppercase ${
                        c.status === "Pending" 
                          ? "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse" 
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {c.status === "Pending" && (
                        <button
                          onClick={() => resolveComplaint(c.id)}
                          className="px-2.5 py-1 text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-smooth uppercase tracking-wider"
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Drawer Panel */}
      {syncedSOS && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between font-sans">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-widest block leading-none mb-1">
                  Incident control center
                </span>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Emergency ID: {syncedSOS.sos_id}
                </h3>
              </div>
              <button 
                onClick={() => { setSelectedSOS(null); setRemarks(""); setError(""); }}
                className="text-slate-400 hover:text-white font-bold text-xs uppercase cursor-pointer"
              >
                Close Control Panel
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              
              {/* Alert Meta details */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold border-b border-slate-200 pb-1.5 mb-1.5">
                  <span className="text-slate-500">Bus ID:</span>
                  <span className="text-slate-800">{syncedSOS.bus_id}</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-b border-slate-200 pb-1.5 mb-1.5">
                  <span className="text-slate-500">Assigned Driver:</span>
                  <span className="text-slate-800">{syncedSOS.driver_name}</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-b border-slate-200 pb-1.5 mb-1.5">
                  <span className="text-slate-500">Assigned Route:</span>
                  <span className="text-slate-800 uppercase">{syncedSOS.route}</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-b border-slate-200 pb-1.5 mb-1.5">
                  <span className="text-slate-500">Reported Speed:</span>
                  <span className="text-slate-800">{syncedSOS.speed} km/h</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-b border-slate-200 pb-1.5 mb-1.5">
                  <span className="text-slate-500">Emergency Type:</span>
                  <span className="text-rose-600 uppercase font-black">{syncedSOS.emergency_type}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Coordinates:</span>
                  <span className="font-mono text-slate-800">{syncedSOS.latitude.toFixed(4)}, {syncedSOS.longitude.toFixed(4)}</span>
                </div>
              </div>
              
              {/* Nearest Police Station Details */}
              {syncedSOS.police_station && (
                <div className="bg-blue-50/45 border border-blue-100 p-4 rounded-xl flex flex-col gap-2">
                  <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">
                    Nearest Police Station Identified
                  </h4>
                  <div className="text-xs font-bold text-slate-800">
                    <div>{syncedSOS.police_station.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">{syncedSOS.police_station.address}</div>
                    <div className="flex gap-4 mt-2 text-[10px] text-blue-650 font-extrabold uppercase">
                      <span>Phone: {syncedSOS.police_station.phone}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Vertical Audit Timeline */}
              <div className="flex flex-col gap-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Incident Response Timeline
                </h4>
                <div className="relative border-l border-slate-200 ml-2.5 pl-6 flex flex-col gap-5 text-xs font-bold text-slate-700">
                  {syncedSOS.timeline && syncedSOS.timeline.map((event, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-0.5 w-2.5 h-2.5 bg-slate-900 border-2 border-white rounded-full" />
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-slate-900">{event.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">{event.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-450 font-semibold leading-normal italic">
                        {event.remarks || `Action performed by ${event.performed_by}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
            </div>
            
            {/* Footer Control Panel */}
            <div className="bg-slate-50 border-t border-slate-200 p-5 flex flex-col gap-3">
              {error && <div className="text-[10px] text-rose-600 font-bold uppercase">{error}</div>}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    console.log(`Mock Call Dialed helpline for driver ${syncedSOS.driver_name}`);
                    triggerNotification(`[Mock Call] Contacting driver ${syncedSOS.driver_name} at TN38AB2024 helpline...`, "info");
                  }}
                  className="flex-1 py-3 border border-slate-350 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-smooth uppercase tracking-wide cursor-pointer"
                >
                  Call Driver Helpline
                </button>
                
                {(syncedSOS.status === 'CREATED' || syncedSOS.status === 'POLICE_NOTIFIED') && (
                  <button
                    onClick={() => {
                      acknowledgeSOSAlert(syncedSOS.sos_id)
                        .then(() => {
                          triggerNotification(`Acknowledged SOS ${syncedSOS.sos_id} successfully. Parents warned.`, "success");
                        })
                        .catch(err => setError(err.message));
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-smooth uppercase tracking-wide shadow-sm cursor-pointer"
                  >
                    Acknowledge SOS
                  </button>
                )}
              </div>
              
              {syncedSOS.status === 'ADMIN_ACKNOWLEDGED' && (
                <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Incident Resolution Remarks (Required)
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => { setRemarks(e.target.value); setError(""); }}
                    placeholder="Enter details on emergency resolution (e.g. medical transport arrived, backup bus dispatched)..."
                    className="w-full p-2.5 bg-white border border-slate-250 text-xs font-bold rounded-lg focus:outline-none focus:border-blue-500"
                    rows={3}
                  />
                  <button
                    onClick={() => {
                      if (!remarks.trim()) {
                        setError("Resolution remarks are required.");
                        return;
                      }
                      resolveSOSAlert(syncedSOS.sos_id, remarks)
                        .then(() => {
                          triggerNotification(`Incident ${syncedSOS.sos_id} successfully resolved.`, "success");
                          setSelectedSOS(null);
                          setRemarks("");
                        })
                        .catch(err => setError(err.message));
                    }}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-smooth uppercase tracking-wide shadow-sm cursor-pointer"
                  >
                    Resolve Incident
                  </button>
                </div>
              )}
              
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
