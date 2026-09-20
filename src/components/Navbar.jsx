import React, { useState } from 'react';
import { Bell, AlertOctagon, Check, ShieldAlert, Calendar, X, Mail, Shield, UserCheck, KeyRound, Phone, BadgeInfo } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCleanUserDisplay } from '../utils/userDisplay';

const Navbar = () => {
  const { notifications: alerts = [], clearNotification, userRole, user, students = [] } = useApp();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isParent = userRole === 'PARENT';
  const { name: displayName, roleLabel: displayRole, initials: avatarInitial } = getCleanUserDisplay(user, userRole);

  // Role-filtered alerts:
  // - ADMIN receives: Aggregated attendance summaries, buzzer alerts, driver safety incidents, SOS, operational alerts. ADMIN NEVER receives individual student attendance alerts.
  // - PARENT receives: ONLY their own child's attendance and bus arrival alerts. PARENT NEVER receives driver incidents, drowsiness, driver analysis, SOS, or other children's attendance.
  const busDrowsyCount = {};
  const unresolvedAlerts = alerts.filter(a => {
    const upper = (a.message || '').toUpperCase();
    // Drop any normal or attentive state notifications
    if (upper.includes("NORMAL") || upper.includes("ATTENTIVE") || upper.includes("NO DRIVER FACE")) {
      return false;
    }

    if (a.category === 'DRIVER_INCIDENT' || upper.includes("DROWSY") || upper.includes("DROWSINESS")) {
      const bId = a.busId || 'TN38AB1234';
      busDrowsyCount[bId] = (busDrowsyCount[bId] || 0) + 1;
      if (busDrowsyCount[bId] > 2) {
        return false;
      }
    }

    if (isParent) {
      if (a.category === 'DRIVER_INCIDENT' || a.category === 'DRIVER_ANALYSIS' || a.category === 'SOS' || a.category === 'ATTENDANCE_SUMMARY' || a.category === 'OPERATIONAL' || a.targetRole === 'ADMIN' || a.targetRole === 'DRIVER') {
        return false;
      }
      const upper = (a.message || '').toUpperCase();
      if (upper.includes("DRIVER") || upper.includes("DROWSY") || upper.includes("FATIGUE") || upper.includes("DISTRACT") || upper.includes("SOS") || upper.includes("EMERGENCY") || upper.includes("ATTENDANCE:") || upper.includes("STRENGTH:")) {
        return false;
      }
      if (a.category === 'ATTENDANCE' && a.studentId) {
        const pId = localStorage.getItem('safebus_parent_id');
        const pPhone = localStorage.getItem('safebus_user_phone');
        const isChild = students.some(s =>
          s.id === a.studentId && (
            (pId && String(s.parentId) === String(pId)) ||
            (pPhone && s.parentContact && s.parentContact.replace(/\s+/g, '') === pPhone.replace(/\s+/g, ''))
          )
        );
        if (!isChild) return false;
      }
      return true;
    }

    if (userRole === 'ADMIN') {
      // Suppress individual student attendance notifications for Admin
      if (a.category === 'ATTENDANCE' && a.studentId && a.category !== 'ATTENDANCE_SUMMARY') {
        return false;
      }
      if (a.targetRole === 'PARENT') {
        return false;
      }
      return true;
    }

    if (userRole === 'DRIVER') {
      // Drivers must NEVER receive parent notifications (boarding alerts, student reaches school, attendance summaries, parent WhatsApp notices)
      if (
        a.targetRole === 'PARENT' ||
        a.category === 'ATTENDANCE' ||
        a.category === 'ATTENDANCE_SUMMARY'
      ) {
        return false;
      }
      const upper = (a.message || '').toUpperCase();
      if (
        upper.includes("PARENT NOTIFICATION") ||
        upper.includes("HAS BOARDED") ||
        upper.includes("REACHED SCHOOL") ||
        upper.includes("DROPPED AT") ||
        upper.includes("ATTENDANCE:") ||
        upper.includes("STRENGTH:") ||
        upper.includes("WHATSAPP")
      ) {
        return false;
      }
      return true;
    }

    return true;
  });

  const criticalAlerts = unresolvedAlerts.filter(a => a.type === 'error');
  const hasCritical = !isParent && criticalAlerts.length > 0;

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
                          <AlertOctagon className={`w-4 h-4 mt-0.5 shrink-0 ${alert.type === 'error' ? 'text-rose-600' : 'text-amber-500'}`} />
                          <div className="flex-1 min-w-0 font-sans text-left">
                            <p className="text-[11px] font-bold text-slate-800 leading-tight whitespace-normal break-words">{alert.message}</p>
                            <span className="text-[9px] font-bold text-slate-400 block mt-1">{alert.timestamp}</span>
                          </div>
                          <button
                            onClick={() => clearNotification(alert.id)}
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
        <button
          onClick={() => setShowProfileModal(true)}
          className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-xl border border-transparent hover:border-slate-200/80 transition-all duration-300 cursor-pointer text-left"
        >
          <div className="text-right leading-none hidden sm:block">
            <span className="text-xs font-black text-slate-800 block leading-tight">
              {displayName}
            </span>
            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block mt-0.5">
              {displayRole}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md flex items-center justify-center text-white text-sm font-extrabold uppercase shadow-blue-500/20">
            {avatarInitial}
          </div>
        </button>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="p-6 bg-gradient-to-tr from-slate-900 to-slate-800 text-white relative">
              <button 
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/25 border border-blue-500/35 flex items-center justify-center text-blue-400 text-xl font-black uppercase shadow-lg shadow-blue-500/10">
                  {avatarInitial}
                </div>
                <div className="text-left">
                  <span className="px-2 py-0.5 text-[9px] font-black tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/25 rounded-md uppercase">
                    {displayRole}
                  </span>
                  <h3 className="text-base font-black text-white mt-1 leading-tight">{displayName}</h3>
                </div>
              </div>
            </div>

            {/* Profile details */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 py-1 border-b border-slate-100">
                <Mail className="w-4 h-4 text-slate-400" />
                <div className="text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Username / Email</span>
                  <p className="text-xs font-bold text-slate-800">{user?.username || 'user@happyjourney.ai'}</p>
                </div>
              </div>

              {localStorage.getItem('safebus_user_phone') && (
                <div className="flex items-center gap-3 py-1 border-b border-slate-100">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div className="text-left">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Contact Number</span>
                    <p className="text-xs font-bold text-slate-800">{localStorage.getItem('safebus_user_phone')}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 py-1 border-b border-slate-100">
                <Shield className="w-4 h-4 text-slate-400" />
                <div className="text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Portal Role</span>
                  <p className="text-xs font-bold text-slate-800">Verified Platform {displayRole}</p>
                </div>
              </div>

              {userRole === 'DRIVER' && (
                <div className="flex items-center gap-3 py-1 border-b border-slate-100">
                  <BadgeInfo className="w-4 h-4 text-slate-400" />
                  <div className="text-left">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Driver License</span>
                    <p className="text-xs font-bold text-slate-800">LIC-COIMBATORE-ACTIVE</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 py-1">
                <KeyRound className="w-4 h-4 text-slate-400" />
                <div className="text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Session Status</span>
                  <p className="text-xs font-bold text-emerald-600">Active & Authenticated</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end">
              <button 
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/10 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
