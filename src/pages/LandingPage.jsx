import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Map, Eye, Users, ArrowRight, Activity, 
  BellRing, Cpu, Target, ShieldCheck, Heart, Navigation,
  Smartphone, UserCheck, AlertTriangle, Bus
} from 'lucide-react';
import schoolBusHero from '../assets/school_bus_hero.jpg';

const LandingPage = () => {
  const navigate = useNavigate();
  const [telemetrySpeed, setTelemetrySpeed] = useState(42);
  const [activeStep, setActiveStep] = useState(0);

  // Animate mini telemetry widget speeds on load
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetrySpeed(prev => {
        const drift = Math.floor(Math.random() * 5) - 2;
        const target = prev + drift;
        return target < 30 ? 32 : target > 58 ? 50 : target;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Cycle GPS logs step highlight
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const overviewFeatures = [
    {
      icon: Map,
      title: "Live GPS Tracking",
      desc: "Real-time coordinates",
      color: "text-blue-600 bg-blue-50 border border-blue-100"
    },
    {
      icon: Eye,
      title: "Driver Behavior CV",
      desc: "MediaPipe facial tracking",
      color: "text-emerald-600 bg-emerald-50 border border-emerald-100"
    },
    {
      icon: Users,
      title: "Student Tracking",
      desc: "Transit timelines logs",
      color: "text-teal-650 bg-teal-50 border border-teal-100"
    },
    {
      icon: BellRing,
      title: "Instant Alerts",
      desc: "SMS & push alerts feed",
      color: "text-amber-600 bg-amber-50 border border-amber-100"
    },
    {
      icon: Cpu,
      title: "QR & Face Attendance",
      desc: "Dual validation shield",
      color: "text-indigo-650 bg-indigo-50 border border-indigo-100"
    }
  ];

  const fullFeatures = [
    {
      icon: Eye,
      title: "AI Driver Monitoring",
      description: "Real-time edge computer vision tracking driver drowsiness (EAR), mobile phone usage, seatbelts, smoking, and fatigue parameters.",
      color: "bg-rose-50 border border-rose-100 text-rose-700"
    },
    {
      icon: Map,
      title: "Live GPS & ETA Mapping",
      description: "Track precise fleet positions, active speed logs, geofencing safe zones, and automated route deviation alerts.",
      color: "bg-blue-50 border border-blue-100 text-blue-700"
    },
    {
      icon: Users,
      title: "Dual Attendance Shield",
      description: "Seamless boarding checks using facial recognition scanner cameras or encrypted QR code scans, instantly updating databases.",
      color: "bg-emerald-50 border border-emerald-100 text-emerald-700"
    },
    {
      icon: BellRing,
      title: "Immediate Alert Engine",
      description: "Instant notifications updates triggered to parents and dispatch teams for speeding, delays, boarding details, or SOS alerts.",
      color: "bg-indigo-50 border border-indigo-100 text-indigo-700"
    },
    {
      icon: Activity,
      title: "Behavioral Analytics",
      description: "Isolation Forest machine learning models analyzing driving behavior anomalies, creating weekly driver safety reports.",
      color: "bg-amber-50 border border-amber-100 text-amber-700"
    },
    {
      icon: Smartphone,
      title: "Parent & Student Apps",
      description: "Dedicated mobile interfaces for instant journey tracking, live notifications, boarding status, and direct SOS emergency buttons.",
      color: "bg-purple-50 border border-purple-100 text-purple-750"
    }
  ];

  const telemetryLogs = [
    { time: "08:12 AM", desc: "Bus TN38AB1234 departed Depot A", active: 0 },
    { time: "08:15 AM", desc: "QR Attendance Verified: Rahul Kumar boarded", active: 1 },
    { time: "08:22 AM", desc: "AI Engine: Seatbelt buckled check passed", active: 2 },
    { time: "08:28 AM", desc: "Live Speed Check: 45 km/h zone safe", active: 3 }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans scroll-smooth">
      
      {/* SaaS Navigation Header (Glassmorphic White) */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-205/60 z-50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-650/10 text-blue-600 p-2 rounded-xl flex items-center justify-center border border-blue-550/20">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-sm tracking-wider uppercase">HappyJourney AI</span>
            <span className="hidden sm:inline-block text-[8px] font-black text-blue-600 uppercase tracking-widest block ml-2">Transit Safety</span>
          </div>
        </div>
        
        <nav className="hidden md:flex gap-8 text-xs font-bold text-slate-600">
          <a href="#" className="hover:text-blue-600 transition-smooth">Home</a>
          <a href="#features" className="hover:text-blue-600 transition-smooth">Features</a>
          <a href="#about" className="hover:text-blue-600 transition-smooth">AI Technology</a>
          <a href="#mission" className="hover:text-blue-600 transition-smooth">Our Mission</a>
        </nav>
        
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-smooth shadow-lg shadow-blue-600/10 uppercase tracking-widest"
        >
          Login
        </button>
      </header>

      {/* Hero Split Layout Section */}
      <section className="relative py-20 px-8 md:px-12 overflow-hidden flex flex-col items-center border-b border-slate-200/50 bg-white">
        {/* Soft Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.4] pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Text Column */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-600 border border-blue-200/60 uppercase tracking-wider mb-5">
              <Activity className="w-3.5 h-3.5" /> Next-Gen AI Fleet Safety
            </span>
            
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-2">
              HappyJourney AI
            </h1>
            <span className="text-base md:text-lg font-bold text-blue-600 mb-5 block">
              Safe Journey • Smart Monitoring • Complete Protection
            </span>

            <p className="text-xs md:text-sm text-slate-500 leading-relaxed max-w-lg mb-8 font-semibold">
              Deploy real-time edge computer vision tracking driver fatigue, smartphone alerts, GPS path geofences, and secure attendance verification.
            </p>

            <div className="flex flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/10 transition-smooth uppercase tracking-wider"
              >
                Get Started
              </button>
              <a
                href="#features"
                className="px-8 py-3.5 text-xs font-black text-slate-600 hover:text-slate-800 bg-[#F8FAFC] hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center transition-smooth uppercase tracking-wider"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Right Column: School Bus Illustration */}
          <div className="lg:col-span-6 w-full flex justify-center">
            <div className="relative w-full max-w-xl bg-white rounded-3xl overflow-hidden p-1.5 shadow-premium border border-slate-200/60">
              <img 
                src={schoolBusHero} 
                className="w-full h-auto rounded-[20px] object-cover transition-smooth hover:scale-102"
                alt="School Bus Safety Illustration" 
              />
            </div>
          </div>

        </div>

        {/* Overview Feature Cards Bar */}
        <div className="max-w-6xl w-full mt-16 relative z-10 px-4 md:px-0">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 grid grid-cols-2 md:grid-cols-5 gap-6 shadow-premium">
            {overviewFeatures.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="flex flex-col items-center text-center p-3 hover:bg-slate-50 rounded-2xl transition-smooth cursor-pointer">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${f.color} mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wider">{f.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-tight">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Detailed Features Section */}
      <section id="features" className="py-20 px-8 bg-[#F8FAFC] border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Complete Safety Protection Modules</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Equipped with computer vision AI and geofence tracking loops, HappyJourney covers all transit dimensions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {fullFeatures.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl bg-white border border-slate-200/80 hover:shadow-md transition-smooth flex flex-col gap-4 group cursor-pointer`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.color} transition-smooth group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm mb-1.5 uppercase tracking-wide group-hover:text-blue-600 transition-smooth">
                      {f.title}
                    </h3>
                    <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                      {f.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Technology Section */}
      <section id="about" className="py-20 px-8 bg-white border-b border-slate-200/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-600 border border-blue-200/60 uppercase tracking-widest mb-3">
              <Cpu className="w-3.5 h-3.5" /> Edge Intelligence
            </span>
            <h2 className="text-3xl font-black text-slate-900 mb-4">AI & Machine Learning Architecture</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Our system deploys real-time CV models and anomaly classifiers at the transport edge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-slate-205 shadow-sm">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-wider mb-2">1. OpenCV & MediaPipe</h3>
              <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                Uses real-time webcam streams to track facial meshes. It maps Eye Aspect Ratio (EAR) to detect drowsiness, Mouth Aspect Ratio (MAR) for yawning fatigue, and checks neck angle tilt vectors to confirm driver alertness.
              </p>
            </div>
            <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-slate-205 shadow-sm">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-wider mb-2">2. Object Detection</h3>
              <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                Scans driving cabin frames to detect mobile phone shapes and smoking anomalies. If the driver holds a device near their face or starts smoking, the neural network flags the state and triggers high-severity dashboard alerts.
              </p>
            </div>
            <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-slate-205 shadow-sm">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-wider mb-2">3. Isolation Forest ML</h3>
              <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                An unsupervised tree-based machine learning model analyzing vehicle speed coordinates telemetry data. It isolates outlier behaviors such as sudden braking deceleration (&gt;0.5g), overspeeding, or geofence path deviations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission Section */}
      <section id="mission" className="py-20 px-8 bg-[#F8FAFC] border-b border-slate-200/50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-tr from-[#081F4D] to-[#1E3A8A] text-white rounded-3xl p-8 md:p-12 shadow-premium relative overflow-hidden flex flex-col md:flex-row gap-8 items-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,#3b82f6_0%,transparent_100%)] pointer-events-none opacity-20" />

            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 z-10 shadow-lg">
              <Target className="w-8 h-8 text-blue-400" />
            </div>

            <div className="flex-1 relative z-10">
              <span className="text-[9px] font-extrabold text-blue-300 uppercase tracking-widest block mb-2">
                PROJECT GOAL & PURPOSE
              </span>
              <h2 className="text-2xl md:text-3xl font-black mb-4 uppercase tracking-wide">Our Mission</h2>
              
              <div className="flex flex-col gap-4 text-xs text-slate-200 font-semibold leading-relaxed">
                <p className="flex gap-2.5 items-start">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-450 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Accident Fleet Transit:</strong> Mitigate public transit incidents caused by driver fatigue or smartphone distractions, ensuring school transport runs under verified guidelines.
                  </span>
                </p>
                <p className="flex gap-2.5 items-start border-t border-slate-800/80 pt-4">
                  <Heart className="w-4.5 h-4.5 text-rose-455 shrink-0 mt-0.5" />
                  <span>
                    <strong>Total Peace of Mind for Parents:</strong> Restore parent trust by bridging transit visibility gaps. Providing instant boarding/alighting timelines and notifications keeps parents closely integrated.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section & Footer */}
      <section className="bg-slate-900 text-white py-20 px-8 relative overflow-hidden text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center relative z-10">
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4">Ready to test the telemetry simulation?</h2>
          <p className="text-xs md:text-sm text-slate-400 font-semibold max-w-xl mb-8 leading-relaxed">
            Choose between Admin, Driver, Parent, or Student accounts and explore live interactive tracking, QR code check-ins, and CV video alerts.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center gap-1.5 shadow-lg shadow-blue-650/30 transition-smooth uppercase tracking-wider"
          >
            <span>Access Portal Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <footer className="py-8 bg-slate-950 text-slate-500 text-[10px] font-bold text-center uppercase tracking-widest border-t border-slate-900">
        &copy; 2026 HappyJourney AI Inc. All Rights Reserved. Designed as Academic/Internship Project.
      </footer>
    </div>
  );
};

export default LandingPage;
