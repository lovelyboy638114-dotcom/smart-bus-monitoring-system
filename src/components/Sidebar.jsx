import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Map, Eye, Users, CheckSquare, 
  AlertTriangle, BarChart3, Settings, LogOut, Bus,
  UserRound
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const Sidebar = () => {
  const { userRole, setUserRole } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    setUserRole(null);
    navigate('/');
  };

  const getNavItems = () => {
    switch (userRole) {
      case 'admin':
        return [
          { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/admin/live-tracking', label: 'Live Tracking', icon: Map },
          { path: '/admin/driver-analysis', label: 'Driver Analysis', icon: Eye },
          { path: '/admin/student-monitoring', label: 'Student Monitoring', icon: Users },
          { path: '/admin/attendance', label: 'Attendance (QR+CV)', icon: CheckSquare },
          { path: '/admin/alerts', label: 'Alerts Feed', icon: AlertTriangle },
          { path: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
          { path: '/admin/settings', label: 'Settings', icon: Settings },
        ];
      case 'driver':
        return [
          { path: '/driver/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/driver/boarding', label: 'Student Boarding', icon: Users },
          { path: '/driver/safety', label: 'Safety Status', icon: Settings },
        ];
      case 'parent':
        return [
          { path: '/parent/dashboard', label: 'Live Tracking', icon: Map },
          { path: '/parent/timeline', label: 'Journey Timeline', icon: BarChart3 },
        ];
      case 'student':
        return [
          { path: '/student/dashboard', label: 'Dashboard & QR', icon: LayoutDashboard },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 h-screen sticky top-0 font-sans">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-blue-600 text-white p-2 rounded-xl border border-blue-500/20 shadow-sm">
          <Bus className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-extrabold text-white text-xs tracking-wider uppercase leading-none">HappyJourney</h1>
          <span className="text-[9px] text-blue-400 font-extrabold tracking-widest uppercase mt-1 inline-block">AI Platform</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto flex flex-col gap-1.5">
        <span className="px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 block">
          Navigation ({userRole})
        </span>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-smooth ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-205'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Session profile info */}
      <div className="p-4 border-t border-slate-800 flex flex-col gap-3 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <UserRound className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-slate-200 truncate capitalize">{userRole} User</h4>
            <span className="text-[9px] text-slate-500 font-medium block truncate">active session</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-800 hover:border-rose-500/30 hover:bg-rose-950/20 text-slate-450 hover:text-rose-400 rounded-xl text-xs font-semibold transition-smooth"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout Session</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
