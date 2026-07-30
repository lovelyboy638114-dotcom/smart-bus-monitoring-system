import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Bus, Smartphone, Users, ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import schoolBusHero from '../assets/school_bus_hero.jpg';

const SignUp = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('parent'); // 'parent' | 'student'
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [signupData, setSignupData] = useState({
    fullName: '',
    username: '',
    phone: '',
    studentName: '',
    studentRoll: '',
    studentClass: '',
    busRoute: '',
    password: '',
    confirmPassword: ''
  });

  const updateSignupField = (key, value) => {
    setSignupData(prev => ({ ...prev, [key]: value }));
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Validations
    if (!signupData.fullName || !signupData.username || !signupData.password || !signupData.confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (role === 'parent' && (!signupData.studentName || !signupData.studentRoll || !signupData.phone)) {
      setError('Please fill in child details and phone number.');
      return;
    }

    if (role === 'student' && (!signupData.studentRoll || !signupData.studentClass || !signupData.busRoute)) {
      setError('Please fill in class details, roll number, and bus route.');
      return;
    }

    // Try posting to backend if connected
    const API_URL = "http://localhost:5000/api";
    let backendSuccess = false;
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: role,
          username: signupData.username.trim(),
          password: signupData.password,
          fullName: signupData.fullName,
          phone: signupData.phone,
          busRoute: signupData.busRoute,
          studentName: signupData.studentName,
          studentRoll: signupData.studentRoll,
          studentClass: signupData.studentClass
        })
      });
      if (response.ok) {
        backendSuccess = true;
      }
    } catch (err) {
      // Offline mode
    }

    // Save locally
    const saved = localStorage.getItem('safebus_accounts');
    let localAccounts = [];
    if (saved) {
      try {
        localAccounts = JSON.parse(saved);
      } catch (e) {
        localAccounts = [];
      }
    }

    // Check duplicate
    const exists = localAccounts.some(acc => acc.role === role && acc.username === signupData.username.trim());
    if (exists) {
      setError(`Username '${signupData.username.trim()}' is already taken.`);
      return;
    }

    const newAcc = {
      role: role,
      username: signupData.username.trim(),
      password: signupData.password,
      fullName: signupData.fullName,
      phone: signupData.phone,
      busRoute: signupData.busRoute,
      studentName: signupData.studentName,
      studentRoll: signupData.studentRoll,
      studentClass: signupData.studentClass
    };

    localAccounts.push(newAcc);
    localStorage.setItem('safebus_accounts', JSON.stringify(localAccounts));

    setSuccessMsg('Account registered successfully! Redirecting to login...');
    setTimeout(() => {
      navigate('/login', { state: { registeredUser: signupData.username.trim() } });
    }, 2000);
  };

  return (
    <div className="flex h-screen w-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Left Panel: Branding & Illustration */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-between p-12 bg-gradient-to-br from-[#081F4D] to-[#1E3A8A] text-white">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={schoolBusHero}
            alt="School Bus Safety Illustration"
            className="w-full h-full object-cover mix-blend-overlay opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#081F4D]/90 to-[#1E3A8A]/90" />
        </div>

        <div className="relative z-10">
          {/* Logo / Header */}
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

        <div className="relative z-10 my-auto max-w-md">
          <h1 className="text-3xl font-black leading-tight tracking-wide">
            Register Your Portal Account
          </h1>
          <p className="text-xs text-blue-300 font-bold tracking-wider mt-3 pl-3 border-l-2 border-blue-500">
            "Safe Journey • Smart Monitoring • Complete Protection"
          </p>

          {/* System features bullets */}
          <div className="mt-8 flex flex-col gap-4 text-xs font-semibold text-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              <span>Real-Time GPS Tracking & Route Deviation Detection</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              <span>Computer Vision Driver Fatigue Monitoring</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              <span>Secure QR & Face Recognition Attendance System</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          © 2026 HappyJourney AI Inc. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Registration Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-lg bg-white border border-slate-200/80 rounded-[20px] shadow-xl p-8 transition-smooth">
          
          <div className="flex items-center justify-between mb-6">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-smooth">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>

            {/* Role Switch Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-250 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setRole('parent')}
                className={`px-3.5 py-1.5 rounded-lg transition-smooth ${role === 'parent' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-505'}`}
              >
                Parent
              </button>
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`px-3.5 py-1.5 rounded-lg transition-smooth ${role === 'student' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-505'}`}
              >
                Student
              </button>
            </div>
          </div>

          <h3 className="text-xl font-black text-slate-800 mb-1">
            Create {role === 'parent' ? 'Parent' : 'Student'} Account
          </h3>
          <p className="text-xs text-slate-500 font-medium mb-6">
            Configure your portal account details below:
          </p>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSignupSubmit} className="flex flex-col gap-4">
            
            {/* Common Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={signupData.fullName}
                  onChange={(e) => updateSignupField('fullName', e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
                />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Desired Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={signupData.username}
                  onChange={(e) => updateSignupField('username', e.target.value)}
                  placeholder="Choose a login ID"
                  className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
                />
              </div>
            </div>

            {/* Parent specific fields */}
            {role === 'parent' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                      Child's Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.studentName}
                      onChange={(e) => updateSignupField('studentName', e.target.value)}
                      placeholder="e.g. Rahul Kumar"
                      className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                      Child's Roll Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.studentRoll}
                      onChange={(e) => updateSignupField('studentRoll', e.target.value)}
                      placeholder="e.g. 12"
                      className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                    Parent Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={signupData.phone}
                    onChange={(e) => updateSignupField('phone', e.target.value)}
                    placeholder="e.g. +91 98450 12345"
                    className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
                  />
                </div>
              </>
            )}

            {/* Student specific fields */}
            {role === 'student' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                      Roll Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.studentRoll}
                      onChange={(e) => updateSignupField('studentRoll', e.target.value)}
                      placeholder="e.g. 12"
                      className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                      Class & Section <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.studentClass}
                      onChange={(e) => updateSignupField('studentClass', e.target.value)}
                      placeholder="e.g. 8A"
                      className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                    Assigned Bus Route <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={signupData.busRoute}
                    onChange={(e) => updateSignupField('busRoute', e.target.value)}
                    className="w-full px-4 py-3 bg-white text-slate-805 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
                  >
                    <option value="">Choose Route...</option>
                    <option value="TN38AB1234">Route A (TN38AB1234)</option>
                    <option value="TN38CD5678">Route B (TN38CD5678)</option>
                    <option value="TN38EP9012">Route C (TN38EP9012)</option>
                  </select>
                </div>
              </>
            )}

            {/* Common Passwords fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Set Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={signupData.password}
                  onChange={(e) => updateSignupField('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
                />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={signupData.confirmPassword}
                  onChange={(e) => updateSignupField('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/10 transition-smooth uppercase tracking-widest mt-4"
            >
              Register Portal Account
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default SignUp;
