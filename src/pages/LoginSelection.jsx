import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, Navigation, Eye, EyeOff, UserCheck, Activity, BellRing, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import schoolBusHero from '../assets/school_bus_hero.jpg';

const LoginSelection = () => {
  const { setUserRole } = useApp();
  const navigate = useNavigate();

  // Role: Default to 'parent'
  const [selectedRole, setSelectedRole] = useState('parent'); 
  const [username, setUsername] = useState('parent@happyjourney.ai');
  const [password, setPassword] = useState('parent123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Default HappyJourney Demo Credentials
  const defaultAccounts = {
    driver: { username: 'driver@happyjourney.ai', password: 'driver123' },
    parent: { username: 'parent@happyjourney.ai', password: 'parent123' },
    student: { username: 'student@happyjourney.ai', password: 'student123' }
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
    setSuccessMsg('');
    const demo = defaultAccounts[role];
    if (demo) {
      setUsername(demo.username);
      setPassword(demo.password);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username || !password) {
      setError('Please enter your login ID and password.');
      return;
    }

    const demoAcc = defaultAccounts[selectedRole];
    const isDemoMatch = demoAcc && demoAcc.username === username.trim() && demoAcc.password === password;

    const saved = localStorage.getItem('safebus_accounts');
    let localAccounts = [];
    if (saved) {
      try { localAccounts = JSON.parse(saved); } catch (e) {}
    }
    const isLocalMatch = localAccounts.some(acc => 
      acc.role === selectedRole && 
      acc.username === username.trim() && 
      acc.password === password
    );

    if (!isDemoMatch && !isLocalMatch) {
      setError('Invalid ID or password. Please verify credentials.');
      return;
    }

    setUserRole(selectedRole);
    setSuccessMsg('Login successful! Redirecting...');
    setTimeout(() => {
      if (selectedRole === 'driver') navigate('/driver/dashboard');
      if (selectedRole === 'parent') navigate('/parent/dashboard');
      if (selectedRole === 'student') navigate('/student/dashboard');
    }, 800);
  };

  const isGoogleAllowed = selectedRole === 'parent' || selectedRole === 'student';

  return (
    <div className="flex h-screen w-screen bg-[#F8FAFC] overflow-hidden font-sans">
      
      {/* LEFT PANEL: Branding & Info Card */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-between p-12 bg-gradient-to-br from-[#081F4D] to-[#1E3A8A] text-white border-r border-slate-200/50">
        
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={schoolBusHero}
            alt="School Bus Safety Illustration"
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
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Smart School Bus Safety</p>
            </div>
          </div>
        </div>

        {/* Dynamic Marketing Center text */}
        <div className="relative z-10 my-auto max-w-lg">
          <h1 className="text-4xl font-black leading-tight tracking-wide">
            HappyJourney AI
          </h1>
          <p className="text-xs text-blue-300 font-bold tracking-wider mt-2.5">
            Safe Journey • Smart Monitoring • Complete Protection
          </p>

          {/* Quick list features */}
          <div className="mt-8 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-200">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-400" />
              <span>Live GPS Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <span>Driver Behavior CV</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <span>QR + Face Attendance</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Path Deviation Alert</span>
            </div>
          </div>
        </div>

        {/* System parameters features card */}
        <div className="relative z-10 bg-white/5 border border-white/10 rounded-[20px] p-5 backdrop-blur-sm max-w-md">
          <span className="text-[9px] font-black tracking-wider text-blue-300 uppercase block mb-2">Operational Protocol</span>
          <p className="text-[11px] text-slate-205 leading-relaxed font-semibold">
            Ensuring high safety indices with automated speed checks, geofencing checks, and camera simulation feeds.
          </p>
        </div>

      </div>

      {/* RIGHT PANEL: Auth Console */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md bg-white p-2.5 transition-all duration-300">
          
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back !</h1>
            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
              Enter to get unlimited access to data & information.
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
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-805 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            
            {/* Role selection dropdown row */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Choose Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth cursor-pointer"
              >
                <option value="parent">Parent</option>
                <option value="student">Student</option>
                <option value="driver">Driver</option>
              </select>
            </div>

            {/* Email field */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Email / User ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your mail address"
                className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
              />
            </div>

            {/* Password field */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
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

            {/* Remember Me and Forgot Password row */}
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

              <Link
                to="/signup" 
                className="text-blue-600 hover:text-blue-750 hover:underline transition-smooth"
              >
                Forgot your password ?
              </Link>
            </div>

            {/* Submit Log In button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/10 hover:shadow-lg transition-smooth uppercase tracking-widest mt-2"
            >
              Log In
            </button>

            {/* Dynamic Google Login and Register Links (Parent / Student only) */}
            {isGoogleAllowed ? (
              <div className="animate-fade-in">
                {/* Divider */}
                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Or, Login with
                  </span>
                </div>

                {/* Google login Button */}
                <button
                  type="button"
                  onClick={() => navigate(selectedRole === 'parent' ? '/parent/dashboard' : '/student/dashboard')}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-black flex items-center justify-center gap-2.5 transition-smooth"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.6 15.02 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.87 3C6.3 7.62 8.9 5.04 12 5.04z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.9c2.18-2.01 3.7-4.96 3.7-8.63z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.37 14.5c-.24-.72-.37-1.49-.37-2.3s.13-1.58.37-2.3L1.5 6.9C.54 8.82 0 10.96 0 13.2s.54 4.38 1.5 6.3l3.87-3z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.9c-1.1.74-2.52 1.18-4.23 1.18-3.1 0-5.7-2.58-6.63-5.46l-3.87 3C3.4 20.35 7.35 23 12 23z"
                    />
                  </svg>
                  <span>Sign up with google</span>
                </button>

                {/* Register here footer */}
                <p className="text-center text-xs font-bold text-slate-700 mt-6">
                  Don't have an account ?{' '}
                  <Link
                    to="/signup"
                    className="text-blue-600 hover:text-blue-750 underline decoration-blue-600 transition-smooth"
                  >
                    Register here
                  </Link>
                </p>
              </div>
            ) : (
              /* Driver static warning panel: ONLY log in */
              <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-center animate-fade-in">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                  * Credentials assigned via administrative console registry.
                </p>
              </div>
            )}

            {/* Administrator Login Link concept */}
            <div className="mt-6 pt-4 border-t border-slate-105 text-center">
              <Link
                to="/admin-login"
                className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-805 transition-smooth"
              >
                🔒 Administrator Login
              </Link>
            </div>

          </form>

        </div>
      </div>

    </div>
  );
};

export default LoginSelection;
