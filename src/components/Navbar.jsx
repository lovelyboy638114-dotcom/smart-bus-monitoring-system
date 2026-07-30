import React, { useState } from 'react';
import { Bell, AlertOctagon, Check, ShieldAlert, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Navbar = () => {
  const { notifications: alerts = [], resolveAlert = () => {}, userRole } = useApp();
  const [showDropdown, setShowDropdown] = useState(false);

  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const criticalAlerts = unresolvedAlerts.filter(a => a.severity === 'High');
  const hasCritical = criticalAlerts.length > 0;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm font-sans">
      {/* Date & SOS warnings banner */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span>{today}</span>
        </div>

        {/* SOS Alarm marquee banner */}
        {hasCritical && (
          <div className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700 animate-pulse-ring">
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-bounce" />
            <span className="hidden sm:inline">SAFETY ALERT ACTIVE:</span>
            <span className="font-extrabold underline">{criticalAlerts[0].type}</span>
          </div>
        )}
      </div>

      {/* Notification utilities & User Profile details */}
      <div className="flex items-center gap-4">
        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`p-2.5 rounded-xl border transition-smooth relative ${
              unresolvedAlerts.length > 0
                ? 'bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100/50'
                : 'bg-slate-50 border border-slate-200/80 text-slate-500 hover:border-slate-300'
            }`}
          >
            <Bell className={`w-4.5 h-4.5 ${unresolvedAlerts.length > 0 ? 'animate-bounce' : ''}`} />
            {unresolvedAlerts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unresolvedAlerts.length}
              </span>
            )}
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              
              <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top-right transition-smooth">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Active Alerts</h3>
                  <span className="px-2 py-0.5 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-full">
                    {unresolvedAlerts.length} Active
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {unresolvedAlerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">
                      No active anomalies. System normal.
                    </div>
                  ) : (
                    unresolvedAlerts.map((alert) => (
                      <div key={alert.id} className="p-3.5 hover:bg-slate-50 transition-smooth">
                        <div className="flex gap-2.5 items-start">
                          <AlertOctagon className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === 'High' ? 'text-rose-600' : 'text-amber-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 leading-tight truncate">{alert.type}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                              Bus: {alert.bus} | Driver: {alert.driver}
                            </p>
                            <span className="text-[9px] font-bold text-slate-400 block mt-1">{alert.time}</span>
                          </div>
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            title="Mark Resolved"
                            className="p-1 rounded-lg border border-slate-200/60 hover:border-emerald-200 hover:bg-emerald-50 text-slate-450 hover:text-emerald-605 transition-smooth"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <span className="text-[10px] font-semibold text-slate-400">HappyJourney Security Protocol</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* User Session Metadata UI */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Role Session</span>
            <span className="text-xs font-bold text-slate-800 capitalize leading-none block">{userRole} User</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md flex items-center justify-center text-white text-sm font-extrabold uppercase shadow-blue-500/20">
            {userRole ? userRole.charAt(0) : '?'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
