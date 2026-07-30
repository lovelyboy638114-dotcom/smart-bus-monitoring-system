import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, Navigation, Eye, EyeOff, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import schoolBusHero from '../assets/school_bus_hero.jpg';

const AdminLogin = () => {
  const { setUserRole } = useApp();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin@happyjourney.ai');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username || !password) {
      setError('Please enter your administrator credentials.');
      return;
    }

    // Verify against default admin account
    const isAdminMatch = username.trim() === 'admin@happyjourney.ai' && password === 'admin123';

    if (!isAdminMatch) {
      setError('Invalid administrator email or password. Access Denied.');
      return;
    }

    setUserRole('admin');
    setSuccessMsg('Admin access verified! Opening Fleet Command...');
    setTimeout(() => {
      navigate('/admin/dashboard');
    }, 850);
  };

  return (
    <div className="flex h-screen w-screen bg-[#F8FAFC] overflow-hidden font-sans">
      
      {/* LEFT PANEL: Branding & Info Card */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-between p-12 bg-gradient-to-br from-[#081F4D] to-[#1E3A8A] text-white border-r border-slate-200/50">
        
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={schoolBusHero}
            alt="Admin Bus Safety Illustration"
            className="w-full h-full object-cover mix-blend-overlay opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#081F4D]/90 to-[#1E3A8A]/90" />
        </div>

        {/* Branding header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 text-white p-2 rounded-xl flex items-center justify-center border border-white/20 shadow-sm">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wider uppercase">HappyJourney AI</h2>
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Admin Control System</p>
            </div>
          </div>
        </div>

        {/* Dynamic Marketing Center text */}
        <div className="relative z-10 my-auto max-w-lg">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold bg-blue-500/20 text-blue-200 border border-blue-400/30 uppercase tracking-wider mb-5">
            <ShieldCheck className="w-3.5 h-3.5" /> High Authority Security
          </span>
          <h1 className="text-4xl font-black leading-tight tracking-wide">
            Administrator Gateway
          </h1>
          <p className="text-xs text-blue-300 font-bold tracking-wider mt-2.5 leading-relaxed">
            Manage global fleet analytics, configure computer vision fatigue indices, edit driver registries, and configure parent alerts.
          </p>
        </div>

        {/* Security parameters card */}
        <div className="relative z-10 bg-white/5 border border-white/10 rounded-[20px] p-5 backdrop-blur-sm max-w-md">
          <span className="text-[9px] font-black tracking-wider text-blue-300 uppercase block mb-2">Secure Protocol</span>
          <p className="text-[11px] text-slate-205 leading-relaxed font-semibold">
            All administrative logins are encrypted and tracked via local security event logs. Unregistered registration is locked.
          </p>
        </div>

      </div>

      {/* RIGHT PANEL: Admin Auth Console */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md bg-white p-2.5 transition-all duration-300">
          
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Portal</h1>
            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
              Enter admin credentials to access fleet command.
            </p>
          </div>

          {/* Error and Success alerts */}
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 text-rose-755 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-850 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            
            {/* Email field */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Admin Email / ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@happyjourney.ai"
                className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
              />
            </div>

            {/* Password field */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Admin Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-10 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-650 transition-smooth"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember and Forgot options */}
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-blue-650 focus:ring-blue-500 bg-white border-slate-200 w-4 h-4"
                />
                <span>Remember me</span>
              </label>
            </div>

            {/* Submit Log In button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/10 hover:shadow-lg transition-smooth uppercase tracking-widest mt-2"
            >
              Verify & Enter
            </button>

            {/* Link back to public portal login */}
            <div className="mt-8 pt-4 border-t border-slate-100 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-755 hover:underline transition-smooth"
              >
                ← Back to main portal login
              </Link>
            </div>

          </form>

        </div>
      </div>

    </div>
  );
};

export default AdminLogin;
