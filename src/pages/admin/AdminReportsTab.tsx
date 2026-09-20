import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle2, 
  FileSpreadsheet, 
  FileText, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Users 
} from 'lucide-react';

const AdminReportsTab: React.FC = () => {
  const { 
    triggerNotification, 
    buses = [], 
    students = [], 
    notifications = [], 
    driverBehavior, 
    allDriverBehaviors 
  } = useApp();

  // 1. Dynamic Average Driver Safety Score calculation
  const fleetScores = buses.map((b) => {
    const bBehavior = (allDriverBehaviors && allDriverBehaviors[b.id]) || (b.id === 'TN38AB1234' ? driverBehavior : null);
    if (bBehavior && typeof bBehavior.safetyScore === 'number') {
      return bBehavior.safetyScore;
    }
    return 95; // baseline nominal score
  });

  const avgSafetyScore = fleetScores.length > 0 
    ? (fleetScores.reduce((acc, curr) => acc + curr, 0) / fleetScores.length) 
    : (driverBehavior?.safetyScore || 94.8);

  // 2. Dynamic On-Time Arrival Index calculation
  const deviatedBusesCount = buses.filter(b => b.deviation).length;
  const speedingBusesCount = buses.filter(b => (b.speed || 0) > 60).length;
  const onTimeIndex = Math.max(65.0, Math.min(100.0, 98.2 - (deviatedBusesCount * 12.4) - (speedingBusesCount * 4.5)));

  // 3. Shift-Specific Attendance Statistics
  const morningBoardedCount = students.filter(s => s.boarded || s.morningAttendance === 'Present' || s.status === 'On Board' || s.status === 'Reached School').length;
  const returnBoardedCount = students.filter(s => s.boardedReturn || s.returnAttendance === 'Present' || s.status === 'Returning' || s.status === 'Reached Home').length;
  const totalStudentsCount = students.length || 20;
  const morningAttendanceRate = totalStudentsCount > 0 ? Math.round((morningBoardedCount / totalStudentsCount) * 100) : 0;
  const returnAttendanceRate = totalStudentsCount > 0 ? Math.round((returnBoardedCount / totalStudentsCount) * 100) : 0;

  // 4. Real CSV Export for Safety Logs
  const handleExportSafetyLogsCSV = () => {
    try {
      const incidentLogs = notifications.filter(n => 
        n.category === 'DRIVER_INCIDENT' || 
        n.category === 'SAFETY' || 
        n.category === 'ALERT' ||
        n.type === 'danger' ||
        n.type === 'warning'
      );

      const csvRows = [
        ['Log ID', 'Timestamp', 'Bus ID', 'Route', 'Driver Name', 'Speed (km/h)', 'Safety Score (%)', 'Event Category', 'Severity', 'Details']
      ];

      // Insert real incident logs
      if (incidentLogs.length > 0) {
        incidentLogs.forEach((inc, idx) => {
          const bus = buses.find(b => b.id === inc.busId) || buses[0];
          const bBehavior = (allDriverBehaviors && allDriverBehaviors[bus?.id]) || driverBehavior;
          csvRows.push([
            `LOG-${String(idx + 1).padStart(4, '0')}`,
            `"${inc.timestamp || new Date().toLocaleTimeString()}"`,
            `"${inc.busId || bus?.id || 'TN38AB1234'}"`,
            `"${bus?.routeNumber || 'Route A (Ukkadam)'}"`,
            `"${bus?.driverName || 'Ramesh Driver'}"`,
            String(bus?.speed || 35),
            String(bBehavior?.safetyScore || 95),
            `"${inc.category || 'DRIVER_INCIDENT'}"`,
            `"${inc.type || 'warning'}"`,
            `"${(inc.message || '').replace(/"/g, '""')}"`
          ]);
        });
      }

      // Add routine telemetry baseline entries for every active bus
      buses.forEach((b, idx) => {
        const bBehavior = (allDriverBehaviors && allDriverBehaviors[b.id]) || (b.id === 'TN38AB1234' ? driverBehavior : null);
        const score = bBehavior?.safetyScore || 95;
        const status = bBehavior?.drowsiness ? 'DROWSINESS_ALERT' : bBehavior?.distraction ? 'DISTRACTION_ALERT' : (b.deviation ? 'ROUTE_DEVIATION' : 'NOMINAL_PATROL');
        csvRows.push([
          `AUDIT-${String(idx + 1).padStart(3, '0')}`,
          `"${new Date().toLocaleTimeString()}"`,
          `"${b.id}"`,
          `"${b.routeNumber}"`,
          `"${b.driverName}"`,
          String(b.speed || 0),
          String(score),
          'ROUTINE_TELEMETRY',
          b.deviation ? 'warning' : 'nominal',
          `"Status: ${status} | ETA: ${b.eta || '--'} | Next Stop: ${b.stops[b.currentStopIndex]?.name || 'KCE'}"`
        ]);
      });

      const csvString = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `safebus_safety_logs_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      triggerNotification("Fleet safety logs CSV downloaded successfully!", "success");
    } catch (err) {
      console.error("Failed to export safety CSV:", err);
      triggerNotification("Failed to export safety logs CSV.", "warning");
    }
  };

  // 5. Real Printable PDF / Document Manifest for Attendance
  const handleDownloadAttendancePDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = new Date().toLocaleTimeString();

      const studentRows = students.map((s, idx) => {
        const isMorningPresent = Boolean(s.boarded || s.morningAttendance === 'Present' || s.status === 'On Board' || s.status === 'Reached School');
        const isReturnPresent = Boolean(s.boardedReturn || s.returnAttendance === 'Present' || s.status === 'Returning' || s.status === 'Reached Home');

        return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px; font-weight: bold; color: #475569;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: 700; color: #1e293b;">${s.rollNo || s.id}</td>
          <td style="padding: 8px; font-weight: 700; color: #0f172a;">${s.name}</td>
          <td style="padding: 8px; color: #64748b;">${s.class || 'IX-A'}</td>
          <td style="padding: 8px; font-weight: 600; color: #2563eb;">${s.assignedBus || 'Bus 1'}</td>
          <td style="padding: 8px; color: #334155;">${s.pickupStop || s.address || '--'}</td>
          <td style="padding: 8px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 800; font-size: 10px; text-transform: uppercase; background: ${isMorningPresent ? '#ecfdf5; color: #059669;' : '#fef2f2; color: #dc2626;'}">
              ${isMorningPresent ? 'Present' : 'Absent'}
            </span>
          </td>
          <td style="padding: 8px; color: #64748b; font-size: 10px;">${s.boardedTime || '--'}</td>
          <td style="padding: 8px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 800; font-size: 10px; text-transform: uppercase; background: ${isReturnPresent ? '#eff6ff; color: #2563eb;' : '#fef2f2; color: #dc2626;'}">
              ${isReturnPresent ? 'Present' : 'Absent'}
            </span>
          </td>
          <td style="padding: 8px; color: #64748b; font-size: 10px;">${s.returnBoardedTime || '--'}</td>
          <td style="padding: 8px; color: #475569;">${s.parentName || '--'} (${s.parentContact || '--'})</td>
        </tr>
      `;
      }).join('');

      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>SafeBus Daily Attendance Manifest - ${dateStr}</title>
              <style>
                @media print {
                  @page { size: landscape; margin: 12mm; }
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  color: #0f172a;
                  margin: 20px;
                  background: #fff;
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 2px solid #2563eb;
                  padding-bottom: 12px;
                  margin-bottom: 16px;
                }
                .title { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; }
                .subtitle { font-size: 12px; color: #64748b; font-weight: 600; margin-top: 4px; }
                .stats-bar {
                  display: flex;
                  gap: 20px;
                  margin-bottom: 16px;
                  background: #f8fafc;
                  padding: 10px 16px;
                  border-radius: 8px;
                  border: 1px solid #e2e8f0;
                  font-size: 12px;
                  font-weight: 700;
                }
                .stats-item span { color: #2563eb; }
                table { width: 100%; border-collapse: collapse; text-align: left; }
                th {
                  background: #f1f5f9;
                  padding: 8px;
                  font-size: 11px;
                  font-weight: 800;
                  text-transform: uppercase;
                  color: #475569;
                  border-bottom: 2px solid #cbd5e1;
                }
                .footer {
                  margin-top: 30px;
                  display: flex;
                  justify-content: space-between;
                  font-size: 12px;
                  color: #64748b;
                  font-weight: 600;
                }
                .sig-box {
                  border-top: 1px solid #94a3b8;
                  width: 200px;
                  text-align: center;
                  padding-top: 6px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <div class="title">SafeBus Shield • Student Transit Attendance Manifest</div>
                  <div class="subtitle">Karpagam College of Engineering (KCE) Fleet Operations</div>
                </div>
                <div style="text-align: right; font-size: 11px; color: #64748b;">
                  <div><strong>Date:</strong> ${dateStr}</div>
                  <div><strong>Generated:</strong> ${timeStr}</div>
                </div>
              </div>

              <div class="stats-bar">
                <div class="stats-item">Total Registered Pupils: <span>${totalStudentsCount}</span></div>
                <div class="stats-item">☀ Morning Boarded: <span>${morningBoardedCount} (${morningAttendanceRate}%)</span></div>
                <div class="stats-item">🌙 Return Boarded: <span>${returnBoardedCount} (${returnAttendanceRate}%)</span></div>
                <div class="stats-item">Active Fleet Routes: <span>${buses.length}</span></div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Roll No</th>
                    <th>Pupil Name</th>
                    <th>Class</th>
                    <th>Assigned Bus</th>
                    <th>Pickup Stop</th>
                    <th style="text-align: center;">☀ Morning Status</th>
                    <th>AM Time</th>
                    <th style="text-align: center;">🌙 Return Status</th>
                    <th>PM Time</th>
                    <th>Parent Contact</th>
                  </tr>
                </thead>
                <tbody>
                  ${studentRows}
                </tbody>
              </table>

              <div class="footer">
                <div class="sig-box">Fleet Route Supervisor</div>
                <div class="sig-box">Transport Department Manager</div>
              </div>

              <script>
                window.onload = function() {
                  window.print();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }

      // Also generate immediate backup CSV download for non-print environments
      const csvRows = [
        ['Roll No', 'Name', 'Class', 'Bus ID', 'Pickup Stop', 'Morning Attendance', 'Morning Time', 'Return Attendance', 'Return Time', 'Parent Name', 'Parent Contact']
      ];
      students.forEach(s => {
        const isMorningPresent = Boolean(s.boarded || s.morningAttendance === 'Present' || s.status === 'On Board' || s.status === 'Reached School');
        const isReturnPresent = Boolean(s.boardedReturn || s.returnAttendance === 'Present' || s.status === 'Returning' || s.status === 'Reached Home');
        csvRows.push([
          `"${s.rollNo || s.id}"`,
          `"${s.name}"`,
          `"${s.class || 'IX-A'}"`,
          `"${s.assignedBus || s.busId || 'Bus 1'}"`,
          `"${s.pickupStop || s.address || ''}"`,
          `"${isMorningPresent ? 'Present' : 'Absent'}"`,
          `"${s.boardedTime || ''}"`,
          `"${isReturnPresent ? 'Present' : 'Absent'}"`,
          `"${s.returnBoardedTime || ''}"`,
          `"${s.parentName || ''}"`,
          `"${s.parentContact || ''}"`
        ]);
      });
      const csvString = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStrFile = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `safebus_attendance_manifest_${dateStrFile}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      triggerNotification("Attendance Manifest opened for Print/PDF saving and CSV downloaded.", "success");
    } catch (err) {
      console.error("Failed to generate attendance document:", err);
      triggerNotification("Failed to generate attendance PDF.", "warning");
    }
  };

  return (
    <div className="space-y-6 text-left max-w-4xl font-sans">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Fleet Operations Reports</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Live calculated metrics sheets and safety ratings logs:</p>
      </div>

      {/* Main KPI Summary Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-blue-500" /> Operational Summary Stats
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Live Telematics Computed
          </span>
        </div>
        
        {/* Dynamic Metric Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          {/* Box 1: Average Driver Safety Score */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Average Driver Safety Score
              </span>
              {avgSafetyScore >= 85 ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <h4 className="text-2xl font-black text-slate-800 mt-1">
              {avgSafetyScore.toFixed(1)}%
            </h4>
            <div className="text-[10px] text-slate-500 font-bold mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${avgSafetyScore >= 85 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {avgSafetyScore >= 90 ? 'Grade A (Excellent)' : avgSafetyScore >= 75 ? 'Grade B (Nominal)' : 'Attention Required'}
            </div>
          </div>

          {/* Box 2: On-Time Arrival Index */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">
                On-Time Arrival Index
              </span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <h4 className="text-2xl font-black text-slate-800 mt-1">
              {onTimeIndex.toFixed(1)}%
            </h4>
            <div className="text-[10px] text-slate-500 font-bold mt-1">
              {deviatedBusesCount === 0 ? 'All 3 routes on schedule' : `${deviatedBusesCount} route(s) experiencing deviation`}
            </div>
          </div>

          {/* Box 3: Shift Transit Boarding Rates */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Transit Boarding Rates
              </span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-bold text-amber-900">☀ AM Pickup:</span>
                <span className="font-mono font-black text-sm text-slate-900">{morningAttendanceRate}% ({morningBoardedCount}/{totalStudentsCount})</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-bold text-blue-900">🌙 PM Return:</span>
                <span className="font-mono font-black text-sm text-slate-900">{returnAttendanceRate}% ({returnBoardedCount}/{totalStudentsCount})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fleet Driver Real-Time Status Breakdown */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">
            Individual Fleet Driver Telematics Performance
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {buses.map((bus) => {
              const bBehavior = (allDriverBehaviors && allDriverBehaviors[bus.id]) || (bus.id === 'TN38AB1234' ? driverBehavior : null);
              const score = bBehavior?.safetyScore || 95;
              const isDrowsy = Boolean(bBehavior?.drowsiness);
              const isDistracted = Boolean(bBehavior?.distraction);

              return (
                <div key={bus.id} className="p-3 bg-white border border-slate-200/70 rounded-xl shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs font-black text-slate-800">{bus.id}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{bus.driverName}</div>
                    </div>
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                      style={{ backgroundColor: bus.color || '#2563eb' }}
                    >
                      {score}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                    <span>Speed: {bus.speed} km/h</span>
                    <span className={isDrowsy ? 'text-rose-600 font-extrabold' : isDistracted ? 'text-amber-600 font-extrabold' : 'text-emerald-600'}>
                      {isDrowsy ? 'Drowsy Alert' : isDistracted ? 'Distracted' : 'Nominal'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button 
            onClick={handleExportSafetyLogsCSV}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-600/10 transition-all cursor-pointer flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Safety Logs CSV
          </button>
          
          <button 
            onClick={handleDownloadAttendancePDF}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Download Attendance PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsTab;
