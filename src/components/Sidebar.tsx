import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getCleanUserDisplay } from '../utils/userDisplay';
import { 
  LayoutDashboard, Map, Route, Users, ShieldAlert, 
  Bell, FileText, Settings, Bus, AlertOctagon, LogOut
} from 'lucide-react';

interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = () => {
  const { user, userRole, setUserRole } = useApp();
  const { name: displayName, roleLabel: displayRole, initials: avatarInitial } = getCleanUserDisplay(user, userRole || 'ADMIN');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setUserRole(null);
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/live-tracking', label: 'Live Tracking', icon: Map },
    { path: '/admin/routes', label: 'Routes', icon: Route },
    { path: '/admin/students', label: 'Students', icon: Users },
    { path: '/admin/drivers', label: 'Drivers', icon: ShieldAlert },
    { path: '/admin/notifications', label: 'Notifications', icon: Bell },
    { path: '/admin/reports', label: 'Reports', icon: FileText },
    { path: '/admin/emergency-history', label: 'Emergency History', icon: AlertOctagon },
    { path: '/admin/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-slate-900/90 backdrop-blur-md text-white border-r border-slate-800 flex flex-col h-full shrink-0 font-sans">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Bus className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black uppercase tracking-wider leading-none">SafeBus</h1>
          <span className="text-[8px] font-extrabold text-blue-400 tracking-widest uppercase">Shield Telematics</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isItemActive = 
            location.pathname === item.path || 
            (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isItemActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${isItemActive ? 'text-white' : 'text-slate-400'}`} />
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
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2 border border-slate-800 hover:border-rose-500/30 hover:bg-rose-950/20 text-slate-400 hover:text-rose-450 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout Session</span>
        </button>
      </div>

      {/* Brand Footer */}
      <div className="p-4 border-t border-slate-800/60 text-center">
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
          Version 2.4.0 (AI Enabled)
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
