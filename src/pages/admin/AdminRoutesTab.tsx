import React from 'react';
import { useApp } from '../../context/AppContext';

const AdminRoutesTab: React.FC = () => {
  const { buses, students } = useApp();

  return (
    <div className="space-y-6 text-left font-sans">
      <div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Transit Route Planners</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Assigned loops, coordinate stops, and pickup times:</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {buses.map((busItem) => (
          <div key={busItem.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800">{busItem.id} Route Stops</h3>
                <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider block mt-0.5">
                  {busItem.routeNumber}
                </span>
              </div>
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: busItem.color }} />
            </div>

            <div className="space-y-4 relative pl-4 border-l border-slate-200/80">
              {busItem.stops.map((stop, sIdx) => {
                const waitingPupils = students && students.length > 0
                  ? students.filter(s => {
                      const busMatch = s.assignedBus === busItem.id ||
                        s.busId === busItem.id ||
                        (busItem.id === 'TN38AB1234' && (s.assignedBus === 'Bus 1' || s.busId === 'Bus 1')) ||
                        (busItem.id === 'TN38CD5678' && (s.assignedBus === 'Bus 2' || s.busId === 'Bus 2')) ||
                        (busItem.id === 'TN38EP9012' && (s.assignedBus === 'Bus 3' || s.busId === 'Bus 3'));
                      if (!busMatch) return false;
                      const sStop = (s.pickupStop || s.address || '').toLowerCase().trim();
                      const stopName = stop.name.toLowerCase().trim();
                      return sStop === stopName ||
                        (sStop.length > 3 && stopName.includes(sStop)) ||
                        (stopName.length > 3 && sStop.includes(stopName));
                    }).length
                  : stop.studentsWaiting;

                return (
                  <div key={sIdx} className="relative text-xs">
                    {/* Indicator pin */}
                    <div 
                      className="absolute -left-[20.5px] top-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                      style={{ backgroundColor: busItem.color }}
                    />
                    <div className="font-extrabold text-slate-800">{stop.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-bold flex gap-4">
                      <span>Time: {stop.pickupTime}</span>
                      <span>Pupils waiting: {waitingPupils}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRoutesTab;
