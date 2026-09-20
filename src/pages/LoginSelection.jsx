import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Bus, Navigation, Eye, EyeOff, UserCheck, Activity, 
  AlertTriangle, CheckCircle2, Shield, UserCheck2, Key, Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import schoolBusHero from '../assets/school_bus_hero.jpg';
import { API_BASE_URL } from '../config';

const LoginSelection = () => {
  const { setUserRole } = useApp();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Force password change states
  const [forceChangeUser, setForceChangeUser] = useState(null);
  const [changePasswordForm, setChangePasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState('');

  // Password strength meter calculation helper
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':",./<>?\\|`~]/.test(pass)) score++;
    
    if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-amber-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(changePasswordForm.newPassword);

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!username || !password) {
      setError('Please enter your email/username and password.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });
      const resJson = await response.json();
      if (response.ok && resJson.success && resJson.data) {
        const loginData = resJson.data;

        // Redirect flow for mustChangePassword
        if (loginData.mustChangePassword) {
          setForceChangeUser({
            username: username.trim(),
            role: loginData.role.toUpperCase()
          });
          setChangePasswordForm(prev => ({ ...prev, oldPassword: password }));
          setIsLoading(false);
          return;
        }

        const role = loginData.role.toUpperCase();
        const fullName = loginData.fullName || '';
        if (fullName) {
          localStorage.setItem('safebus_user_fullname', fullName);
        }
        setUserRole(role, fullName);
        localStorage.setItem('safebus_user_username', username.trim());
        localStorage.setItem('safebus_token', loginData.token);
        localStorage.setItem('safebus_user_role', role);

        if (role === 'PARENT') {
          try {
            const parentRes = await fetch(`${API_BASE_URL}/api/v1/students/parent/profile?username=${encodeURIComponent(username.trim())}`, {
              headers: {
                'Authorization': `Bearer ${loginData.token}`
              }
            });
            const parentJson = await parentRes.json();
            if (parentRes.ok && parentJson.success && parentJson.data) {
              const parent = parentJson.data;
              localStorage.setItem('safebus_parent_id', String(parent.id));
              localStorage.setItem('safebus_user_phone', parent.phone);
              console.log("[Login] Resolved Parent Profile mapping. ID:", parent.id);
            }
          } catch (err) {
            console.error("[Login] Failed to fetch parent profile details:", err);
          }
        }

        setSuccessMsg('Login successful! Redirecting...');
        setTimeout(() => {
          if (role === 'DRIVER') navigate('/driver/dashboard');
          else if (role === 'PARENT') navigate('/parent/dashboard');
          else if (role === 'STUDENT') navigate('/student/dashboard');
          else if (role === 'ADMIN') navigate('/admin/dashboard');
        }, 800);
      } else {
        setError(resJson.message || 'Invalid username or password.');
      }
    } catch (err) {
      setError(err.message || 'Network error. Failed to reach backend API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setChangeError('');
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      setChangeError('Passwords do not match.');
      return;
    }

    if (strength.score < 5) {
      setChangeError('Password is too weak. Please satisfy all security rules.');
      return;
    }

    setChangeLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forceChangeUser.username,
          role: forceChangeUser.role,
          oldPassword: changePasswordForm.oldPassword,
          newPassword: changePasswordForm.newPassword
        })
      });
      const resJson = await response.json();
      if (response.ok && resJson.success) {
        const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: forceChangeUser.username,
            password: changePasswordForm.newPassword
          })
        });
        const loginJson = await loginResponse.json();

        if (loginResponse.ok && loginJson.success && loginJson.data) {
          const loginData = loginJson.data;
          const role = loginData.role.toUpperCase();
          const fullName = loginData.fullName || '';
          if (fullName) {
            localStorage.setItem('safebus_user_fullname', fullName);
          }
          setUserRole(role, fullName);
          localStorage.setItem('safebus_user_username', forceChangeUser.username);
          localStorage.setItem('safebus_token', loginData.token);
          localStorage.setItem('safebus_user_role', role);

          if (role === 'PARENT') {
            try {
              const parentRes = await fetch(`${API_BASE_URL}/api/v1/students/parent/profile?username=${encodeURIComponent(forceChangeUser.username.trim())}`, {
                headers: {
                  'Authorization': `Bearer ${loginData.token}`
                }
              });
              const parentJson = await parentRes.json();
              if (parentRes.ok && parentJson.success && parentJson.data) {
                const parent = parentJson.data;
                localStorage.setItem('safebus_parent_id', String(parent.id));
                localStorage.setItem('safebus_user_phone', parent.phone);
                console.log("[Login] Resolved Parent Profile mapping. ID:", parent.id);
              }
            } catch (err) {
              console.error("[Login] Failed to fetch parent profile details:", err);
            }
          }

          setForceChangeUser(null);
          setSuccessMsg('Password changed successfully! Redirecting...');
          setTimeout(() => {
            if (role === 'DRIVER') navigate('/driver/dashboard');
            else if (role === 'PARENT') navigate('/parent/dashboard');
            else if (role === 'STUDENT') navigate('/student/dashboard');
            else if (role === 'ADMIN') navigate('/admin/dashboard');
          }, 800);
        } else {
          setChangeError(loginJson.message || 'Auto-login failed after password change.');
        }
      } else {
        setChangeError(resJson.message || 'Verification failed.');
      }
    } catch (err) {
      setChangeError('Failed to change password. Connect to backend.');
    } finally {
      setChangeLoading(false);
    }
  };

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
              <Bus className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wider uppercase">SafeBus AI</h2>
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Smart Monitoring System</p>
            </div>
          </div>
        </div>
 
        {/* Dynamic Marketing Center text */}
        <div className="relative z-10 my-auto max-w-lg">
          <h1 className="text-4xl font-black leading-tight tracking-wide">
            Next-Gen School Transport Security
          </h1>
          <p className="text-xs text-blue-300 font-bold tracking-wider mt-2.5">
            Safe Journey • AI Driver Auditing • Real-time Location Sharing
          </p>
 
          {/* Quick list features */}
          <div className="mt-8 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-200">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-400" />
              <span>Live Location Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <span>CV Driver Auditing</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <span>Boarding QR Scanner</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Instant SOS Response</span>
            </div>
          </div>
        </div>
 
        {/* System parameters features card */}
        <div className="relative z-10 bg-white/5 border border-white/10 rounded-[20px] p-5 backdrop-blur-sm max-w-md">
          <span className="text-[9px] font-black tracking-wider text-blue-300 uppercase block mb-2">SaaS Protection Protocol</span>
          <p className="text-[11px] text-slate-200 leading-relaxed font-semibold">
            Ensuring high safety indices with automated speed checkpoints, anomaly logging, and instant notification checks.
          </p>
        </div>
 
      </div>

      {/* RIGHT PANEL: Auth Console */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto bg-slate-50/50">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-slate-100 shadow-xl transition-all duration-300">
          
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-3 shadow-inner">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Sign in to access your SafeBus AI dashboard.
            </p>
          </div>

          {/* Error and Success alerts */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            
            {/* Email / Username Field */}
            <div className="relative mt-2">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter email or username"
                className="w-full px-4 py-3 bg-slate-50/50 text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none transition-smooth"
              />
              <span className="absolute right-3.5 top-3 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">ID / Email</span>
            </div>

            {/* Password Field */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50/50 text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none transition-smooth"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-650 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-slate-500">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Please contact the system administrator to reset your portal password.')}
                className="hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition-smooth flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>

            {/* Operational notice */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-normal">
                * SafeBus Security Standard compliance enforced.
              </p>
            </div>

          </form>
        </div>
      </div>

      {/* Force Password Change Modal Overlay */}
      {forceChangeUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-sm flex flex-col overflow-hidden animate-smooth">
            <div className="p-6 bg-blue-600 text-white">
              <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4" /> Reset Portal Passphrase
              </h3>
              <p className="text-[10px] text-blue-100 mt-1">This is your first login. You must update your password to continue.</p>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="p-6 flex flex-col gap-4 text-xs">
              {changeError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{changeError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-600">Temporary Password *</label>
                <input 
                  type="password" 
                  required
                  value={changePasswordForm.oldPassword} 
                  onChange={e => setChangePasswordForm({...changePasswordForm, oldPassword: e.target.value})}
                  placeholder="Enter temporary password"
                  className="border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-600">New Password *</label>
                <input 
                  type="password" 
                  required
                  value={changePasswordForm.newPassword} 
                  onChange={e => setChangePasswordForm({...changePasswordForm, newPassword: e.target.value})}
                  placeholder="Enter new strong password"
                  className="border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                />
                
                {/* Live Password Strength Meter */}
                <div className="flex flex-col gap-1 mt-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="flex justify-between items-center text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">
                    <span>Pass Strength</span>
                    <span className={strength.score <= 2 ? 'text-rose-600' : strength.score <= 4 ? 'text-amber-600' : 'text-emerald-600'}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 h-1 w-full bg-slate-200 rounded-full overflow-hidden mt-1">
                    <div className={`h-full ${strength.score >= 1 ? strength.color : 'bg-slate-200'}`} />
                    <div className={`h-full ${strength.score >= 2 ? strength.color : 'bg-slate-200'}`} />
                    <div className={`h-full ${strength.score >= 3 ? strength.color : 'bg-slate-200'}`} />
                    <div className={`h-full ${strength.score >= 4 ? strength.color : 'bg-slate-200'}`} />
                    <div className={`h-full ${strength.score >= 5 ? strength.color : 'bg-slate-200'}`} />
                  </div>
                  <span className="text-[9px] text-slate-400 font-semibold block leading-tight mt-1.5">
                    Requires: length &gt;= 8, uppercase, lowercase, digit, and special symbol.
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-600">Confirm New Password *</label>
                <input 
                  type="password" 
                  required
                  value={changePasswordForm.confirmPassword} 
                  onChange={e => setChangePasswordForm({...changePasswordForm, confirmPassword: e.target.value})}
                  placeholder="Re-type new password"
                  className="border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button 
                type="submit"
                disabled={changeLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-bold uppercase tracking-wider shadow-md mt-2"
              >
                {changeLoading ? 'Saving...' : 'Update & Enter Portal'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LoginSelection;
