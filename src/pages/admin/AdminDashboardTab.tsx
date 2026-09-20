import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import DashboardStats from '../../components/DashboardStats';
import LeafletMap from '../../components/LeafletMap';
import NotificationPanel from '../../components/NotificationPanel';
import AIFeatures from '../../components/AIFeatures';

const AdminDashboardTab: React.FC = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    triggerNotification, 
    clearNotification, 
    clearAllNotifications,
    students,
    buses
  } = useApp();

  // Selected entities
  const [selectedBusId] = useState<string | null>(null);

  // AI Violation states
  const [isDrowsy, setIsDrowsy] = useState(false);
  const [isRouteDeviated, setIsRouteDeviated] = useState(false);
  const [isOverspeeding, setIsOverspeeding] = useState(false);
  const [isFaceRecognized, setIsFaceRecognized] = useState(false);
  const [sosActive, setSosActive] = useState(false);

  const handleTriggerAlert = (message: string, type: 'info' | 'warning' | 'error' | 'success') => {
    triggerNotification(message, type);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="text-left">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">
          SafeBus Command Center
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Real-time status updates and fleet telematics monitoring:
        </p>
      </div>

      {/* Dynamic stats cards */}
      <DashboardStats buses={buses} students={students} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Map preview */}
        <div className="lg:col-span-2 h-[350px] bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Fleet Transit Tracking
            </h3>
            <button 
              onClick={() => navigate('/admin/live-tracking')}
              className="text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider cursor-pointer"
            >
              Maximize Map
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <LeafletMap buses={buses} selectedBusId={selectedBusId} />
          </div>
        </div>

        {/* Notifications log feed */}
        <div className="h-[350px]">
          <NotificationPanel 
            notifications={notifications} 
            onClearNotification={clearNotification}
            onClearAll={clearAllNotifications}
          />
        </div>
      </div>

      {/* AI Violations, SOS and weather panels */}
      <AIFeatures 
        onTriggerAlert={handleTriggerAlert}
        isDrowsy={isDrowsy}
        setIsDrowsy={setIsDrowsy}
        isRouteDeviated={isRouteDeviated}
        setIsRouteDeviated={setIsRouteDeviated}
        isOverspeeding={isOverspeeding}
        setIsOverspeeding={setIsOverspeeding}
        isFaceRecognized={isFaceRecognized}
        setIsFaceRecognized={setIsFaceRecognized}
        sosActive={sosActive}
        setSosActive={setSosActive}
      />
    </div>
  );
};

export default AdminDashboardTab;
