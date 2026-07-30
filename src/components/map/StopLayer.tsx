import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Stop, Bus } from '../../types';

interface StopLayerProps {
  stops: Stop[];
  bus: Bus;
  isSelected: boolean;
}

// Stop Icon definition using Leaflet DivIcon
const stopIcon = L.divIcon({
  html: `<div class="w-6 h-6 bg-white text-slate-700 rounded-full flex items-center justify-center shadow-md border border-slate-200 hover:scale-110 transition-transform cursor-pointer" style="font-size: 12px; line-height: 22px; text-align: center;">🛑</div>`,
  className: 'custom-leaflet-stop-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export const StopLayer: React.FC<StopLayerProps> = React.memo(({ stops, bus, isSelected }) => {
  if (!isSelected) return null;

  return (
    <>
      {stops.map((stop, index) => {
        // Determine arrival status and dynamic ETA relative to bus timeline
        const isVisited = index * 40 <= bus.currentStopIndex;
        const isDepot = index === 0;
        const isSchool = index === stops.length - 1;

        let etaStr = "Visited";
        if (!isVisited) {
          const stepsRemaining = index * 40 - bus.currentStopIndex;
          const minsRemaining = Math.max(1, Math.ceil(stepsRemaining * 0.15));
          etaStr = `${minsRemaining} mins`;
        }

        // Students Picked status count
        const pickedCount = isVisited && !isSchool ? stop.studentsWaiting : 0;

        return (
          <Marker
            key={`${bus.id}-stop-${index}`}
            position={[stop.lat, stop.lng]}
            icon={stopIcon}
          >
            <Popup>
              <div className="p-2 text-slate-800 text-xs font-semibold font-sans min-w-[140px] text-left">
                <span className="text-[9px] font-black uppercase text-blue-600 block">
                  {isDepot ? "🚌 Bus Depot" : isSchool ? "🏫 School Campus" : "🛑 Student Pickup"}
                </span>
                <h4 className="font-extrabold text-sm text-slate-900 mt-0.5">{stop.name}</h4>
                <div className="mt-2 space-y-1 text-slate-650 border-t border-slate-100 pt-1.5 leading-normal">
                  <p>Students Waiting: <span className="font-bold text-slate-800">{stop.studentsWaiting}</span></p>
                  <p>Students Picked: <span className="font-bold text-slate-800">{pickedCount}</span></p>
                  <p>Boarding Status: <span className={`font-bold ${isVisited ? 'text-emerald-600' : 'text-amber-500'}`}>{isVisited ? "Completed" : "Scheduled"}</span></p>
                  <p>ETA: <span className="font-bold text-slate-800">{isVisited ? "Arrived" : etaStr}</span></p>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
});

StopLayer.displayName = 'StopLayer';
