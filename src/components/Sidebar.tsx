import React from 'react';
import { 
  LayoutDashboard, Map, Route, Users, ShieldAlert, 
  Bell, FileText, Settings, Bus
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tracking', label: 'Live Tracking', icon: Map },
    { id: 'routes', label: 'Routes', icon: Route },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'drivers', label: 'Drivers', icon: ShieldAlert },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
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
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Brand Footer */}
      <div className="p-6 border-t border-slate-800/60 text-center">
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
          Version 2.4.0 (AI Enabled)
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
