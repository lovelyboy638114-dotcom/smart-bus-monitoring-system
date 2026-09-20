import React from 'react';
import { useApp } from '../../context/AppContext';
import NotificationPanel from '../../components/NotificationPanel';

const AdminNotificationsTab: React.FC = () => {
  const { notifications, clearNotification, clearAllNotifications } = useApp();

  return (
    <div className="space-y-6 text-left max-w-xl mx-auto font-sans">
      <div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Safety Warning & System Logs</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Full audit history of tracking telemetry logs:</p>
      </div>

      <NotificationPanel 
        notifications={notifications} 
        onClearNotification={clearNotification}
        onClearAll={clearAllNotifications}
      />
    </div>
  );
};

export default AdminNotificationsTab;
