import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bus, ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useApp } from '../context/AppContext';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useApp();

  const getDashboardPath = () => {
    switch (userRole?.toLowerCase()) {
      case 'admin':
        return '/admin/dashboard';
      case 'driver':
        return '/driver/dashboard';
      case 'parent':
        return '/parent/dashboard';
      case 'student':
        return '/student/dashboard';
      default:
        return '/login';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-md text-center flex flex-col items-center gap-6">
        {/* Logo Badge */}
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
          <Bus className="w-9 h-9 text-white" />
        </div>

        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">
            Error 404
          </span>
          <h1 className="text-2xl font-black text-white mt-1 uppercase tracking-wide">
            Route Not Found
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
            The requested telematics endpoint <span className="font-mono text-blue-300 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-700">{location.pathname}</span> does not exist or has been relocated.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => navigate(getDashboardPath())}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </button>
          <button
            onClick={() => navigate('/')}
            className="py-3 px-4 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" /> Home
          </button>
        </div>

        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
          SafeBus Shield Telematics OS
        </span>
      </div>
    </div>
  );
};

export default NotFound;
