import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Map, Route, Users, ShieldAlert,
  Bell, FileText, Settings, LogOut, Bus,
  UserRound, AlertOctagon, BarChart3
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCleanUserDisplay } from '../utils/userDisplay';

const Sidebar = () => {
  const { userRole, setUserRole, user } = useApp();
  const { name: displayName, roleLabel: displayRole, initials: avatarInitial } = getCleanUserDisplay(user, userRole);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setUserRole(null);
    navigate('/login');
  };

  const getNavItems = () => {
    switch (userRole?.toLowerCase()) {
      case 'admin':
        return [
          { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/admin/live-tracking', label: 'Live Tracking', icon: Map },
          { path: '/admin/routes', label: 'Routes', icon: Route },
          { path: '/admin/students', label: 'Students', icon: Users },
          { path: '/admin/drivers', label: 'Drivers', icon: ShieldAlert },
          { path: '/admin/notifications', label: 'Notifications', icon: Bell },
          { path: '/admin/reports', label: 'Reports', icon: FileText },
          { path: '/admin/emergency-history', label: 'Emergency History', icon: AlertOctagon },
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
          { path: '/student/id-card', label: 'My ID Card', icon: UserRound },
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
          <h1 className="font-extrabold text-white text-xs tracking-wider uppercase leading-none">SafeBus</h1>
          <span className="text-[9px] text-blue-400 font-extrabold tracking-widest uppercase mt-1 inline-block">AI Platform</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto flex flex-col gap-1.5">
        <span className="px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 block">
          Navigation ({userRole || 'User'})
        </span>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isItemActive = 
            location.pathname === item.path || 
            (item.path !== '/admin/dashboard' && item.path !== '/driver/dashboard' && item.path !== '/parent/dashboard' && item.path !== '/student/dashboard' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                isItemActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
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
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-xs shrink-0">
            {avatarInitial}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-slate-200 truncate">{displayName}</h4>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block truncate mt-0.5">{displayRole} • Active</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-800 hover:border-rose-500/30 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-semibold transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout Session</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
