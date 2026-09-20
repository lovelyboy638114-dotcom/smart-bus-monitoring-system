import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Filter, Calendar, Award, CheckCircle2, Download, BarChart2, TrendingUp, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { API_BASE_URL } from '../../config';

const EmergencyHistory = () => {
  const { sosStatistics, triggerNotification = () => {} } = useApp();
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [loading, setLoading] = useState(true);

  const fetchHistory = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/v1/sos/history`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHistoryList(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch history:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filter history records
  const filteredHistory = historyList.filter(item => {
    const sosId = item.sosId || item.sos_id || "";
    const busId = item.busId || item.bus_id || "";
    const driverName = item.driverName || item.driver_name || "";
    const emergencyType = item.emergencyType || item.emergency_type || "";
    const routeName = item.routeName || item.route_name || "";

    const matchesSearch = 
      sosId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      busId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emergencyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      routeName.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesSeverity = filterSeverity === 'All' || item.severity === filterSeverity;
    
    return matchesSearch && matchesSeverity;
  });


  // Recharts Pie Chart Data (Severity counts)
  const pieData = [
    { name: 'Critical', value: sosStatistics?.severity_counts?.CRITICAL || 0, fill: '#ef4444' },
    { name: 'High', value: sosStatistics?.severity_counts?.HIGH || 0, fill: '#f97316' },
    { name: 'Medium', value: sosStatistics?.severity_counts?.MEDIUM || 0, fill: '#f59e0b' },
    { name: 'Low', value: sosStatistics?.severity_counts?.LOW || 0, fill: '#3b82f6' }
  ].filter(d => d.value > 0);

  // Recharts Averages data
  const avgData = [
    { name: 'Acknowledgment', duration: Math.round((sosStatistics?.avg_acknowledgment_time_seconds || 0) / 60 * 10) / 10, fill: '#10b981' },
    { name: 'Resolution', duration: Math.round((sosStatistics?.avg_resolution_time_seconds || 0) / 60 * 10) / 10, fill: '#3b82f6' }
  ];

  // Route analysis breakdowns
  const routesChartData = Object.keys(sosStatistics?.route_counts || {}).map(route => ({
    name: route,
    incidents: sosStatistics.route_counts[route]
  }));

  const handleExport = (format: string) => {
    try {
      if (format === 'PDF') {
        const printWindow = window.open('', '_blank');
        const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const rowsHtml = filteredHistory.map((item, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px; font-weight: bold;">${idx + 1}</td>
            <td style="padding: 8px; font-weight: bold; font-family: monospace;">${item.sosId || item.sos_id}</td>
            <td style="padding: 8px;">${item.createdAt || item.time || item.created_at || ''}</td>
            <td style="padding: 8px; font-weight: 600;">${item.busId || item.bus_id} (${item.routeName || item.route_name || 'Route'})</td>
            <td style="padding: 8px;">${item.driverName || item.driver_name}</td>
            <td style="padding: 8px; font-weight: bold; color: #dc2626;">${item.emergencyType || item.emergency_type}</td>
            <td style="padding: 8px; font-weight: 800;">${item.severity}</td>
            <td style="padding: 8px; font-style: italic;">"${item.remarks || 'Resolved'}"</td>
            <td style="padding: 8px;">${item.resolvedBy || item.resolved_by || 'Admin'} (${item.resolvedAt || item.resolved_at || ''})</td>
          </tr>
        `).join('');

        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>SafeBus Emergency Response Audit Report - ${dateStr}</title>
                <style>
                  @media print { @page { size: landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                  body { font-family: system-ui, sans-serif; margin: 20px; color: #0f172a; }
                  .header { border-bottom: 2px solid #ef4444; padding-bottom: 10px; margin-bottom: 15px; }
                  .title { font-size: 20px; font-weight: 900; color: #991b1b; text-transform: uppercase; }
                  table { width: 100%; border-collapse: collapse; text-align: left; }
                  th { background: #f8fafc; padding: 8px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
                </style>
              </head>
              <body>
                <div class="header">
                  <div class="title">SafeBus Shield • Emergency Response Audit Report</div>
                  <div style="font-size: 11px; color: #64748b;">Karpagam College of Engineering Fleet • Generated: ${new Date().toLocaleString()}</div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Alert ID</th>
                      <th>Trigger Time</th>
                      <th>Bus / Route</th>
                      <th>Driver</th>
                      <th>Incident Type</th>
                      <th>Severity</th>
                      <th>Resolution Notes</th>
                      <th>Resolved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
                <script>window.onload = function() { window.print(); };</script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      } else {
        // CSV / Excel Export
        const csvRows = [
          ['Alert ID', 'Trigger Time', 'Bus ID', 'Route Name', 'Driver Name', 'Incident Type', 'Severity', 'Status', 'Resolution Remarks', 'Resolved By', 'Resolved Time']
        ];
        filteredHistory.forEach(item => {
          csvRows.push([
            `"${item.sosId || item.sos_id}"`,
            `"${item.createdAt || item.time || item.created_at || ''}"`,
            `"${item.busId || item.bus_id}"`,
            `"${item.routeName || item.route_name || ''}"`,
            `"${item.driverName || item.driver_name}"`,
            `"${item.emergencyType || item.emergency_type}"`,
            `"${item.severity}"`,
            `"${item.status}"`,
            `"${(item.remarks || '').replace(/"/g, '""')}"`,
            `"${item.resolvedBy || item.resolved_by || ''}"`,
            `"${item.resolvedAt || item.resolved_at || ''}"`
          ]);
        });
        const csvString = csvRows.map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const ext = format.toLowerCase() === 'excel' ? 'csv' : 'csv';
        link.setAttribute('href', url);
        link.setAttribute('download', `safebus_emergency_audit_${new Date().toISOString().split('T')[0]}.${ext}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      triggerNotification(`Successfully compiled and exported ${filteredHistory.length} emergency log records to ${format} format!`, "success");
    } catch (err) {
      console.error("Export error:", err);
      triggerNotification(`Failed to export emergency logs to ${format}.`, "warning");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 font-sans">
      
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Emergency Response Audits</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Audit resolved incidents, response durations, and telemetry statistics.</p>
        </div>
        <button 
          onClick={fetchHistory}
          className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl uppercase tracking-wider transition-smooth cursor-pointer"
        >
          Reload Logs
        </button>
      </div>

      {/* Analytics widgets block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Severity Distribution Pie chart */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft flex flex-col justify-between min-h-[260px]">
          <div>
            <span className="text-[9px] font-black uppercase text-rose-500 tracking-wider flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5" /> Severity distribution
            </span>
            <h4 className="font-extrabold text-slate-800 mt-1">Alerts by Severity</h4>
          </div>
          <div className="h-32 flex items-center justify-center relative">
            {pieData.length === 0 ? (
              <span className="text-[10px] text-slate-400 font-bold">No historic data recorded yet</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val} Alerts`, 'Volume']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-center gap-4 text-[9px] font-bold text-slate-500 uppercase mt-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> High</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Low</span>
          </div>
        </div>

        {/* Average response Bar chart */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft flex flex-col justify-between min-h-[260px]">
          <div>
            <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Efficiency analytics
            </span>
            <h4 className="font-extrabold text-slate-800 mt-1">Average Response Durations</h4>
          </div>
          <div className="h-36 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} />
                <YAxis unit="m" tick={{ fontSize: 9, fill: '#64748b' }} />
                <Tooltip formatter={(val) => [`${val} Minutes`, 'Duration']} />
                <Bar dataKey="duration" radius={[6, 6, 0, 0]}>
                  {avgData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Route distribution Bar chart */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft flex flex-col justify-between min-h-[260px]">
          <div>
            <span className="text-[9px] font-black uppercase text-blue-500 tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> High risk sectors
            </span>
            <h4 className="font-extrabold text-slate-800 mt-1">Alerts by Route</h4>
          </div>
          <div className="h-36 mt-2">
            {routesChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">No sectors resolved</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routesChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                  <Tooltip formatter={(val) => [`${val} Incidents`, 'Count']} />
                  <Bar dataKey="incidents" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Query filters HUD bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-soft flex flex-wrap items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative max-w-sm flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resolved (ID, Bus, Driver, Type)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-smooth"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
        </div>

        {/* Right tools (filters and exports) */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Severity filter toggler */}
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-150 gap-1 text-[10px] font-extrabold uppercase">
            {['All', 'CRITICAL', 'HIGH', 'RESOLVED'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev === 'RESOLVED' ? 'All' : sev)}
                className={`px-3 py-1.5 rounded-lg transition-smooth ${
                  (sev === 'RESOLVED' ? 'All' : sev) === filterSeverity
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'hover:bg-slate-200/50 text-slate-500 hover:text-slate-700'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Exports Buttons group */}
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button
              onClick={() => handleExport('CSV')}
              className="px-3 py-2 hover:bg-slate-50 text-[10px] font-black text-slate-650 border-r border-slate-200 flex items-center gap-1 cursor-pointer uppercase"
              title="Export to CSV format"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => handleExport('Excel')}
              className="px-3 py-2 hover:bg-slate-50 text-[10px] font-black text-slate-650 border-r border-slate-200 flex items-center gap-1 cursor-pointer uppercase"
              title="Export to Excel format"
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              onClick={() => handleExport('PDF')}
              className="px-3 py-2 hover:bg-slate-50 text-[10px] font-black text-slate-650 flex items-center gap-1 cursor-pointer uppercase"
              title="Export to PDF print format"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

        </div>

      </div>

      {/* Main logs database table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-600 font-medium">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-450 tracking-wider">
                <th className="p-4">Alert ID</th>
                <th className="p-4">Trigger Time</th>
                <th className="p-4">Bus / Route</th>
                <th className="p-4">Assigned Driver</th>
                <th className="p-4">Incident Type</th>
                <th className="p-4">Severity</th>
                <th className="p-4">Resolution Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-400 uppercase tracking-widest font-bold">
                    Syncing resolution database...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-slate-300" />
                    <span>No resolved incident history logs matched search parameters.</span>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const sosId = item.sosId || item.sos_id;
                  const busId = item.busId || item.bus_id;
                  const routeName = item.routeName || item.route_name;
                  const driverName = item.driverName || item.driver_name;
                  const emergencyType = item.emergencyType || item.emergency_type;
                  const remarks = item.remarks;
                  const resolvedBy = item.resolvedBy || item.resolved_by;
                  const resolvedAt = item.resolvedAt || item.resolved_at;
                  const createdAt = item.createdAt || item.time || item.created_at || "";
                  const displayDate = createdAt.includes("T") ? createdAt.split("T")[0] : "30-07-2026";
                  const displayTime = createdAt.includes("T") ? createdAt.split("T")[1] : createdAt;

                  return (
                    <tr key={sosId} className="hover:bg-slate-50/20 transition-smooth">
                      <td className="p-4 font-mono text-[10px] text-slate-900 font-black">{sosId}</td>
                      <td className="p-4 text-[10px] text-slate-450 leading-normal">
                        <div>{displayTime}</div>
                        <div className="text-[8px] font-bold text-slate-400 mt-0.5">{displayDate}</div>
                      </td>
                      <td className="p-4">
                        <div>{busId}</div>
                        <div className="text-[9px] text-slate-400 font-black uppercase mt-0.5">{routeName || "Route A"}</div>
                      </td>
                      <td className="p-4 text-[11px] text-slate-800">{driverName}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[9px] uppercase font-black">
                          {emergencyType}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          item.severity === 'CRITICAL' 
                            ? 'bg-red-600 text-white' 
                            : item.severity === 'HIGH'
                            ? 'bg-orange-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs text-left">
                        <div className="text-[11px] text-slate-800 leading-normal italic">"{remarks}"</div>
                        <div className="text-[8.5px] text-slate-400 font-extrabold uppercase mt-1">
                          Resolved by: {resolvedBy} | {resolvedAt}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default EmergencyHistory;
