import React from 'react';
import { Bell, Info, AlertTriangle, AlertCircle, CheckCircle, X, MessageCircle } from 'lucide-react';
import { SystemNotification } from '../types';

interface NotificationPanelProps {
  notifications: SystemNotification[];
  onClearNotification: (id: string) => void;
  onClearAll: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  notifications, 
  onClearNotification,
  onClearAll
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50/50 border-amber-100/60';
      case 'error':
        return 'bg-rose-50/50 border-rose-100/60';
      case 'success':
        return 'bg-emerald-50/40 border-emerald-100/50';
      default:
        return 'bg-blue-50/40 border-blue-100/50';
    }
  };

  // Filter out normal detection logs, individual student attendance, and cap drowsiness alerts to strictly max 2
  const busDrowsyCount: Record<string, number> = {};
  const displayNotifications = notifications.filter(notif => {
    const upper = (notif.message || '').toUpperCase();
    if (upper.includes("NORMAL") || upper.includes("ATTENTIVE") || upper.includes("NO DRIVER FACE")) {
      return false;
    }
    if (notif.category === 'ATTENDANCE' && notif.studentId && notif.category !== 'ATTENDANCE_SUMMARY') {
      return false;
    }
    if (notif.targetRole === 'PARENT') {
      return false;
    }
    if (notif.category === 'DRIVER_INCIDENT' || upper.includes("DROWSY") || upper.includes("DROWSINESS")) {
      const bId = notif.busId || 'TN38AB1234';
      busDrowsyCount[bId] = (busDrowsyCount[bId] || 0) + 1;
      if (busDrowsyCount[bId] > 2) {
        return false; // Strictly capped to 2 notifications per incident!
      }
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-full font-sans">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Live System Logs</h3>
        </div>
        {displayNotifications.length > 0 && (
          <button 
            onClick={onClearAll}
            className="text-[9px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Log Feed */}
      <div className="flex-1 p-4 overflow-y-auto divide-y divide-slate-100 space-y-2.5 max-h-[360px]">
        {displayNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-450 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
            <h4 className="text-xs font-bold text-slate-700">All Operations Nominal</h4>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">No warning indicators triggered in active loops.</p>
          </div>
        ) : (
          displayNotifications.map((notif) => (
            <div 
              key={notif.id}
              className={`p-3 border rounded-xl flex items-start justify-between gap-3 transform translate-x-0 transition-transform duration-300 ${getBgColor(notif.type)}`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
                <div className="text-left min-w-0 text-slate-700">
                  <p className="text-xs font-semibold leading-relaxed truncate-2-lines">{notif.message}</p>
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">{notif.timestamp}</span>
                    {notif.whatsappUrl && (
                      <a
                        href={notif.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-0.5 rounded transition-colors"
                      >
                        <MessageCircle className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" />
                        <span>Send WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => onClearNotification(notif.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
