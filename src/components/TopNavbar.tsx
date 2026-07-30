import React, { useState, useEffect } from 'react';
import { Search, Bell, User, Calendar, Clock } from 'lucide-react';

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
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-extrabold text-xs shadow-sm">
            AD
          </div>
          <div className="text-left leading-none hidden sm:block">
            <h4 className="text-xs font-black text-slate-800">Admin Control</h4>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block mt-0.5">KCE Registrar</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
