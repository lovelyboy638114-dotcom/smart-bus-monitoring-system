import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertOctagon, CheckCircle2, Search, Filter, AlertTriangle, ShieldAlert } from 'lucide-react';

const AlertsPage = () => {
  const { alerts, resolveAlert } = useApp();
  const [filterSeverity, setFilterSeverity] = useState('All');

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity === 'All') return true;
    return alert.severity === filterSeverity;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Telemetry Alerts Feed</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            View active speed violations, geofencing triggers, and AI camera driver drowsiness records.
          </p>
        </div>

        {/* Severity Filter Toggle */}
        <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-150 gap-1 text-xs">
          {['All', 'High', 'Medium', 'Low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-smooth ${
                filterSeverity === sev
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-200/50 text-slate-500 hover:text-slate-700'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts feed list container */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-soft flex-1 flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Alert Details</span>
          <span>Status</span>
        </div>

        <div className="divide-y divide-slate-100 overflow-y-auto">
          {filteredAlerts.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400 font-medium flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-slate-350" />
              <span>No alerts matching the filter.</span>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 flex items-center justify-between gap-6 transition-smooth hover:bg-slate-50/20 ${
                  !alert.resolved && alert.severity === 'High' ? 'bg-rose-50/10' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                    alert.resolved 
                      ? 'bg-slate-50 border-slate-150 text-slate-400'
                      : alert.severity === 'High'
                      ? 'bg-rose-50 border-rose-100 text-rose-600'
                      : alert.severity === 'Medium'
                      ? 'bg-amber-50 border-amber-100 text-amber-600'
                      : 'bg-blue-50 border-blue-100 text-blue-600'
                  }`}>
                    {alert.severity === 'High' ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-xs font-black ${alert.resolved ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                      {alert.type}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                      Bus Code: {alert.bus} | Driver: {alert.driver}
                    </p>
                    <span className="text-[9px] text-slate-400 font-bold mt-1.5 block">{alert.time}</span>
                  </div>
                </div>

                <div>
                  {alert.resolved ? (
                    <span className="px-2.5 py-1 text-[9px] font-bold text-slate-500 bg-slate-100 rounded-full border border-slate-200 uppercase">
                      Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold shadow-sm transition-smooth uppercase tracking-wide"
                    >
                      Resolve Alert
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
