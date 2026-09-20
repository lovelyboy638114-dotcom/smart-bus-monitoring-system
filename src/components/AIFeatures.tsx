import { 
  Eye, ShieldAlert, AlertTriangle, AlertCircle, PhoneCall,
  CloudSun, ShieldCheck, Thermometer, Wind, Compass, UserCheck
} from 'lucide-react';

interface AIFeaturesProps {
  onTriggerAlert: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;
  isDrowsy: boolean;
  setIsDrowsy: (val: boolean) => void;
  isRouteDeviated: boolean;
  setIsRouteDeviated: (val: boolean) => void;
  isOverspeeding: boolean;
  setIsOverspeeding: (val: boolean) => void;
  isFaceRecognized: boolean;
  setIsFaceRecognized: (val: boolean) => void;
  sosActive: boolean;
  setSosActive: (val: boolean) => void;
}

const AIFeatures: React.FC<AIFeaturesProps> = ({
  onTriggerAlert,
  isDrowsy,
  setIsDrowsy,
  isRouteDeviated,
  setIsRouteDeviated,
  isOverspeeding,
  setIsOverspeeding,
  isFaceRecognized,
  setIsFaceRecognized,
  sosActive,
  setSosActive
}) => {

  const triggerSOS = () => {
    setSosActive(true);
    onTriggerAlert("EMERGENCY SOS: Triggered alarm for Bus 1 (Murugan) - Nearby authorities and school admin notified!", "error");
    setTimeout(() => setSosActive(false), 4000);
  };

  const handleDrowsyToggle = () => {
    onTriggerAlert("Simulation Alert: Driver Drowsiness testing must be performed using the real webcam.", "warning");
  };

  const handleRouteDeviateToggle = () => {
    const nextVal = !isRouteDeviated;
    setIsRouteDeviated(nextVal);
    if (nextVal) {
      onTriggerAlert("TELEMETRY WARNING: Bus 1 has deviated from its assigned route coordinates!", "warning");
    } else {
      onTriggerAlert("Route deviation resolved for Bus 1.", "success");
    }
  };

  const handleOverspeedToggle = () => {
    const nextVal = !isOverspeeding;
    setIsOverspeeding(nextVal);
    if (nextVal) {
      onTriggerAlert("VIOLATION WARNING: Bus 1 detected moving at 68 km/h in 40 km/h school zone!", "warning");
    } else {
      onTriggerAlert("Bus 1 velocity returned to nominal limits.", "success");
    }
  };

  const handleFaceRecogCheck = () => {
    setIsFaceRecognized(true);
    onTriggerAlert("BIOMETRIC CHECK: Face recognition matched Student ST003 (Rahul) boarding Bus 1.", "success");
    setTimeout(() => setIsFaceRecognized(false), 3000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
      
      {/* AI Telematics control board */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div>
          <span className="text-[8px] font-extrabold text-blue-500 uppercase tracking-widest block mb-1">
            Simulate AI Violations
          </span>
          <h4 className="text-sm font-black text-slate-800">Safety & Biometrics Console</h4>
          <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5 mb-4">
            Test real-time IoT alerts and Computer Vision camera feeds by clicking triggers below:
          </p>
        </div>

        <div className="space-y-2 text-xs font-bold">
          <button
            onClick={handleDrowsyToggle}
            className="w-full py-2.5 px-4 rounded-xl border flex items-center justify-between transition-smooth bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
          >
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" /> Driver Drowsiness (CV ONLY)
            </span>
            <span>CV ONLY</span>
          </button>

          <button
            onClick={handleRouteDeviateToggle}
            className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-between transition-smooth ${
              isRouteDeviated 
                ? 'bg-amber-50 border-amber-250 text-amber-800 animate-pulse' 
                : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Compass className="w-4 h-4" /> Route Deviation
            </span>
            <span>{isRouteDeviated ? 'DEVIA' : 'TEST'}</span>
          </button>

          <button
            onClick={handleOverspeedToggle}
            className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-between transition-smooth ${
              isOverspeeding 
                ? 'bg-amber-50 border-amber-250 text-amber-800 animate-pulse' 
                : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Zone Overspeeding
            </span>
            <span>{isOverspeeding ? 'OVERS' : 'TEST'}</span>
          </button>

          <button
            onClick={handleFaceRecogCheck}
            className={`w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-650 hover:bg-slate-50 flex items-center justify-between transition-smooth ${
              isFaceRecognized ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : ''
            }`}
          >
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Face Biometric ID
            </span>
            <span>{isFaceRecognized ? 'MATCHED' : 'RUN'}</span>
          </button>
        </div>
      </div>

      {/* SOS Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between items-center text-center">
        <div>
          <span className="text-[8px] font-extrabold text-rose-500 uppercase tracking-widest block mb-1">
            Emergency System
          </span>
          <h4 className="text-sm font-black text-slate-800">SOS Trigger Alert</h4>
          <p className="text-[10px] text-slate-450 font-medium leading-normal mt-0.5 max-w-[200px]">
            Instantly dispatch an emergency distress flag directly to fleet operators:
          </p>
        </div>

        <button
          onClick={triggerSOS}
          disabled={sosActive}
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center text-white font-extrabold uppercase text-[9px] tracking-wider transition-smooth ${
            sosActive 
              ? 'bg-rose-500/20 border border-rose-350 text-rose-600 animate-ping'
              : 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer'
          }`}
        >
          <PhoneCall className="w-6 h-6 mb-1 text-white" />
          <span>{sosActive ? 'SENT' : 'SOS'}</span>
        </button>

        <span className="text-[8px] text-slate-450 font-bold uppercase tracking-wide">
          Direct Police Desk: +91 99999 88888
        </span>
      </div>

      {/* Weather & Traffic telemetry Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between text-left">
        <div>
          <span className="text-[8px] font-extrabold text-blue-500 uppercase tracking-widest block mb-1">
            Environment Metrics
          </span>
          <h4 className="text-sm font-black text-slate-800">Coimbatore Operations</h4>
          <p className="text-[10px] text-slate-450 font-medium leading-normal mt-0.5">
            Local weather and road grid congestion statistics:
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-3 font-semibold text-xs text-slate-650">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CloudSun className="w-4 h-4 text-amber-500" /> Weather status
            </span>
            <span className="text-slate-800">Clear Skies</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-rose-500" /> Temperature
            </span>
            <span className="text-slate-800 font-mono">29°C</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-sky-500" /> Wind Velocity
            </span>
            <span className="text-slate-800 font-mono">14 km/h</span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 mt-1.5">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Traffic Load
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">NORMAL</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AIFeatures;
