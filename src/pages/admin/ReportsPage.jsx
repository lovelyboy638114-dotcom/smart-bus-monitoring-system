import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle, ShieldCheck, UserCheck, Navigation, Percent, MapPin, AlertCircle, ShieldAlert } from 'lucide-react';

const ReportsPage = () => {
  const { driverBehavior, students = [], buses = [], activeSOSAlerts = [] } = useApp();

  // safety score weekly distributions mapping
  const safetyScore = (driverBehavior && typeof driverBehavior.safetyScore === 'number') ? driverBehavior.safetyScore : 95;
  const isDrowsy = driverBehavior ? Boolean(driverBehavior.drowsiness) : false;

  // Real alert categories mapping
  const sosTypesCount = activeSOSAlerts.reduce((acc, alert) => {
    const type = alert.emergency_type || alert.emergencyType || 'General SOS';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  const alertCategoriesData = Object.entries(sosTypesCount).map(([name, value], idx) => ({
    name,
    value: value,
    fill: ['#60a5fa', '#818cf8', '#fb7185', '#f43f5e'][idx % 4]
  }));

  // Bus assignment analytics calculations
  const autoAssigned = students.filter(s => s.assignment_status === 'ASSIGNED').length;
  const pendingAssigned = students.filter(s => s.assignment_status === 'BUS_PENDING').length;
  const totalAuto = autoAssigned + pendingAssigned;
  const successRate = totalAuto > 0 ? Math.round((autoAssigned / totalAuto) * 100) : 100;
  
  const assignedStudents = students.filter(s => s.assignment_status === 'ASSIGNED' && s.pickup_distance !== undefined && s.pickup_distance !== null);
  const avgDistance = assignedStudents.length > 0 ? Math.round(assignedStudents.reduce((sum, s) => sum + (s.pickup_distance || 0), 0) / assignedStudents.length) : 0;
  
  const activeBusesCount = buses.length;
  const totalCapacity = activeBusesCount * 40;
  const totalAssigned = students.filter(s => s.assignedBus && s.status !== 'BUS_PENDING').length;
  const occupancyPercent = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;
  const remainingCapacity = Math.max(0, totalCapacity - totalAssigned);

  return (
    <div className="flex flex-col gap-6 p-6">
      
      {/* View Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Deep Analytical Reports & ML Diagnostics</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Machine Learning telemetry reports, anomaly logs, and fleet performance charts.
        </p>
      </div>

      {/* Automatic Bus Assignment KPI Dashboard */}
      <div>
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">Automatic Bus Assignment & Routing Analytics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between min-h-[90px] bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Auto Assignment Rate</span>
              <Percent className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="mt-2">
              <h3 className="text-lg font-black text-slate-800 leading-none">{successRate}%</h3>
              <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block mt-1">Success Rate ({autoAssigned}/{totalAuto})</span>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between min-h-[90px] bg-gradient-to-br from-amber-500/5 to-orange-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Pending Assignments</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="mt-2">
              <h3 className="text-lg font-black text-slate-800 leading-none">{pendingAssigned}</h3>
              <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block mt-1">Needs Admin Review</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between min-h-[90px] bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Avg Pickup Distance</span>
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="mt-2">
              <h3 className="text-lg font-black text-slate-800 leading-none">{avgDistance}m</h3>
              <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block mt-1">Student-to-Stop</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between min-h-[90px] bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Bus Occupancy Rate</span>
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-2">
              <h3 className="text-lg font-black text-slate-800 leading-none">{occupancyPercent}%</h3>
              <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block mt-1">{totalAssigned} / {totalCapacity} seats ({remainingCapacity} remaining)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Isolation Forest ML Explanation Panel */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl border border-blue-950 shadow-soft relative overflow-hidden flex flex-col md:flex-row gap-6 items-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,#1e3a8a_0%,transparent_100%)] pointer-events-none opacity-50" />
        
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-blue-400" />
        </div>

        <div className="flex-1 relative z-10">
          <span className="text-[9px] font-extrabold text-blue-300 uppercase tracking-widest block mb-1">
            Machine Learning Telemetry System
          </span>
          <h4 className="text-sm font-black mb-2 uppercase tracking-wide">Isolation Forest Anomaly Detection</h4>
          <p className="text-[11px] text-slate-350 leading-relaxed font-medium">
            This module evaluates driving behavior anomalies in real-time. By fitting an unsupervised tree-based ensemble 
            over velocity rates, harsh braking parameters (deceleration &gt; 0.5g), and geofence route coordinates paths offsets, 
            the system isolates outlier states (violations) from nominal patterns, computing a live safety score index.
          </p>
        </div>
      </div>

      {/* Performance charts layouts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Safety Score Trends Recharts Area Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft lg:col-span-2">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">Safety Index & Incident Frequency</h3>
          <p className="text-[10px] text-slate-400 font-medium mb-6">Safety scores compared with daily telematics alerts.</p>
          
          <div className="h-64 w-full">
            <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 font-semibold text-xs uppercase tracking-wider gap-2">
              <ShieldAlert className="w-8 h-8 text-slate-300" />
              Insufficient telemetry logs to compute safety trends
            </div>
          </div>
        </div>

        {/* Alert category distributions Pie chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">Alert Categories Ratio</h3>
            <p className="text-[10px] text-slate-400 font-medium mb-6">Distribution percentages of safety logs categorized by type.</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center relative">
            {alertCategoriesData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={alertCategoriesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {alertCategoriesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-450 uppercase leading-none">Total Logs</span>
                  <span className="text-lg font-black text-slate-800 mt-1">{activeSOSAlerts.length}</span>
                </div>
              </>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 font-semibold text-xs uppercase tracking-wider gap-2">
                <ShieldAlert className="w-8 h-8 text-slate-300" />
                No active emergency alerts recorded today
              </div>
            )}
          </div>

          {alertCategoriesData.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4 text-[9px] font-bold">
              {alertCategoriesData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.fill }}></span>
                  <span className="text-slate-600 uppercase tracking-wider truncate">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Attendance report metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance trend bar chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft lg:col-span-2">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">Monthly Attendance Progress</h3>
          <p className="text-[10px] text-slate-400 font-medium mb-6">Pupils weekly average check-in percentages recorded this month.</p>

          <div className="h-48 w-full">
            <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 font-semibold text-xs uppercase tracking-wider gap-2">
              <UserCheck className="w-8 h-8 text-slate-300" />
              Insufficient historical logs for monthly trend
            </div>
          </div>
        </div>

        {/* Fleet KPI panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">ML Telematics KPI Summary</h3>
            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="text-slate-500">Anomaly Rate</span>
                <span>4.2%</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 border-t border-slate-100 pt-2.5">
                <span className="text-slate-500">Fleet Route Adherence</span>
                <span className="text-emerald-600">98.5%</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 border-t border-slate-100 pt-2.5">
                <span className="text-slate-500">Average ETA Precision</span>
                <span>+1.5 min</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 border-t border-slate-100 pt-2.5">
                <span className="text-slate-500">Driver Compliance Rating</span>
                <span className="text-emerald-600">Grade A</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl mt-4">
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Project Status</span>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
              ML scoring engine is operating autonomously. Analytics sync with cloud dashboards every 10 seconds.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};

export default ReportsPage;
