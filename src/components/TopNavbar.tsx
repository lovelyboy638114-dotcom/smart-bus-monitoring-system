import React, { useState, useEffect } from 'react';
import { Search, Bell, User, Calendar, Clock, X, Mail, Shield, UserCheck, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCleanUserDisplay } from '../utils/userDisplay';

interface TopNavbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  notificationCount: number;
  onNotificationClick: () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ 
  searchQuery, 
  setSearchQuery, 
  notificationCount,
  onNotificationClick
}) => {
  const { user, userRole } = useApp();
  const { name: displayName, roleLabel: displayRole, initials: avatarInitial } = getCleanUserDisplay(user, userRole || 'ADMIN');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0 font-sans shadow-sm z-30">
      {/* Left side: Search */}
      <div className="relative w-80">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search students, drivers or routes..."
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-300"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
      </div>

      {/* Right side: DateTime, Notifications, Admin Profile */}
      <div className="flex items-center gap-6">
        {/* Date Time info */}
        <div className="hidden lg:flex items-center gap-4 text-slate-500 text-xs border-r border-slate-200 pr-6 font-bold">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            {formatDate(time)}
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            {formatTime(time)}
          </span>
        </div>

        {/* Notifications Icon with Badge */}
        <button 
          onClick={onNotificationClick}
          className="relative p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 transition-colors cursor-pointer group"
        >
          <Bell className="w-4 h-4 text-slate-600 group-hover:animate-swing" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full border-2 border-white flex items-center justify-center animate-bounce">
              {notificationCount}
            </span>
          )}
        </button>

        {/* Admin profile */}
        <button 
          onClick={() => setShowProfileModal(true)}
          className="flex items-center gap-2.5 hover:bg-slate-50 p-1.5 rounded-xl transition-all duration-300 border border-transparent hover:border-slate-200/80 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md flex items-center justify-center text-white font-extrabold text-xs">
            {avatarInitial}
          </div>
          <div className="text-left leading-none hidden sm:block">
            <h4 className="text-xs font-black text-slate-800">{displayName}</h4>
            <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-wide block mt-0.5">{displayRole}</span>
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
                  <p className="text-xs font-bold text-slate-800">{user?.username || 'admin.admin@happyjourney.ai'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1 border-b border-slate-100">
                <Shield className="w-4 h-4 text-slate-400" />
                <div className="text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Security Role</span>
                  <p className="text-xs font-bold text-slate-800">System {displayRole} ({user?.role || 'ADMIN'})</p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1 border-b border-slate-100">
                <UserCheck className="w-4 h-4 text-slate-400" />
                <div className="text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Privileges</span>
                  <p className="text-xs font-bold text-slate-800">Full Console Access, Database Auditing</p>
                </div>
              </div>

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

export default TopNavbar;
