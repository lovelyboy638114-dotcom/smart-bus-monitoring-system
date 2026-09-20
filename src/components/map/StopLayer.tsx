import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Stop, Bus } from '../../types';

interface StopLayerProps {
  stops: Stop[];
  bus: Bus;
  isSelected: boolean;
}

// Stop Icons definition using Leaflet DivIcon
const visitedIcon = L.divIcon({
  html: `<div class="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md border border-emerald-300 hover:scale-110 transition-transform cursor-pointer" style="font-size: 11px; line-height: 22px; text-align: center; font-weight: bold;">✓</div>`,
  className: 'custom-leaflet-stop-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const scheduledIcon = L.divIcon({
  html: `<div class="w-6 h-6 bg-white text-slate-700 rounded-full flex items-center justify-center shadow-md border border-slate-200 hover:scale-110 transition-transform cursor-pointer" style="font-size: 12px; line-height: 22px; text-align: center;">🛑</div>`,
  className: 'custom-leaflet-stop-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const nextStopIcon = L.divIcon({
  html: `
    <div class="relative w-8 h-8 flex items-center justify-center" style="transform: translate(-4px, -4px)">
      <span class="absolute w-8 h-8 rounded-full bg-blue-500/40 border border-blue-500 animate-ping"></span>
      <div class="relative w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg border border-blue-400 font-bold" style="font-size: 10px; line-height: 22px; text-align: center; animation: pulse 2s infinite;">🎯</div>
    </div>
  `,
  className: 'custom-leaflet-next-stop-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const StopLayer: React.FC<StopLayerProps> = React.memo(({ stops, bus, isSelected }) => {
  if (!isSelected) return null;

  // Find the next stop index (first index that hasn't been visited yet)
  const nextStopIndex = stops.findIndex((stop, idx) => idx * 40 > bus.currentStopIndex);

  return (
    <>
      {stops.map((stop, index) => {
        // Determine arrival status and dynamic ETA relative to bus timeline
        const isVisited = index * 40 <= bus.currentStopIndex;
        const isNextStop = index === nextStopIndex;
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

        // Dynamic icon assignment
        const currentIcon = isVisited ? visitedIcon : isNextStop ? nextStopIcon : scheduledIcon;

        return (
          <Marker
            key={`${bus.id}-stop-${index}`}
            position={[stop.lat, stop.lng]}
            icon={currentIcon}
          >
            <Popup>
              <div className="p-2 text-slate-800 text-xs font-semibold font-sans min-w-[140px] text-left">
                <span className="text-[9px] font-black uppercase text-blue-600 block">
                  {isDepot ? "🚌 Bus Depot" : isSchool ? "🏫 School Campus" : isNextStop ? "🎯 Next Destination Stop" : "🛑 Student Pickup"}
                </span>
                <h4 className="font-extrabold text-sm text-slate-900 mt-0.5">{stop.name}</h4>
                <div className="mt-2 space-y-1 text-slate-650 border-t border-slate-100 pt-1.5 leading-normal">
                  <p>Students Waiting: <span className="font-bold text-slate-800">{stop.studentsWaiting}</span></p>
                  <p>Students Picked: <span className="font-bold text-slate-800">{pickedCount}</span></p>
                  <p>Boarding Status: <span className={`font-bold ${isVisited ? 'text-emerald-600' : isNextStop ? 'text-blue-600 animate-pulse' : 'text-amber-500'}`}>{isVisited ? "Completed" : isNextStop ? "Next Stop" : "Scheduled"}</span></p>
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
