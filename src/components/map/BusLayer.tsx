import React, { useEffect, useState, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Bus, Coordinate } from '../../types';

interface BusMarkerProps {
  bus: Bus;
  isSelected: boolean;
}

const BusMarker: React.FC<BusMarkerProps> = ({ bus, isSelected }) => {
  // Target position is either the live GPS currentLocation or simulated path position
  const targetPos = bus.currentLocation || bus.path[bus.currentStopIndex] || bus.path[0];
  const [animatedPos, setAnimatedPos] = useState<Coordinate>(targetPos);
  const animFrameRef = useRef<number | null>(null);

  // Smooth Coordinate Interpolation Loop (Problem 2 Fix: requestAnimationFrame Slide-easing)
  useEffect(() => {
    const startLat = animatedPos.lat;
    const startLng = animatedPos.lng;
    const endLat = targetPos.lat;
    const endLng = targetPos.lng;

    // Skip interpolation if coordinates are identical
    if (startLat === endLat && startLng === endLng) return;

    const duration = 400; // Transition duration in milliseconds
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutQuad) for organic deceleration curves
      const easeProgress = progress * (2 - progress);

      const nextLat = startLat + (endLat - startLat) * easeProgress;
      const nextLng = startLng + (endLng - startLng) * easeProgress;

      setAnimatedPos({ lat: nextLat, lng: nextLng });

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetPos]);

  const heading = bus.heading || 0;

  // Color mappings (Green = Running, Yellow = Idle, Red = Emergency)
  const statusColor = bus.sos
    ? '#ef4444' // Emergency Red
    : bus.status === 'Running'
    ? '#10b981' // Running Green
    : '#eab308'; // Idle Yellow

  const nextStopIdx = Math.min(
    bus.stops.length - 1,
    Math.ceil(bus.currentStopIndex / 40)
  );
  const nextStopName = bus.stops[nextStopIdx]?.name || "Arrived / End Route";
  const onboardCount = bus.students.filter((s) => s.status === 'On Board').length;

  const createCustomIcon = () => {
    const flashClass = bus.sos
      ? 'animate-ping border-rose-500 bg-rose-250'
      : isSelected
      ? 'border-blue-500 scale-105 shadow-xl'
      : 'border-white';

    const innerHtml = `
      <div class="relative w-10 h-10 flex items-center justify-center">
        ${
          bus.sos
            ? `<span class="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping"></span>`
            : ''
        }
        
        <div class="relative w-9 h-9 rounded-full flex items-center justify-center border-2 shadow-md hover:scale-110 transition-transform ${flashClass}" 
             style="background-color: ${statusColor}; color: white; transition: background-color 0.3s ease;">
          
          <div style="transform: rotate(${heading}deg); transition: transform 0.4s ease;" class="flex items-center justify-center">
            <span class="text-sm font-bold">🚌</span>
            <div class="absolute -top-1 left-1/2 transform -translate-x-1/2 text-[8px] text-white font-black">▲</div>
          </div>
          
          <span class="absolute -bottom-1.5 -right-1.5 bg-slate-800 text-white text-[7.5px] font-black h-4 w-4 rounded-full border border-white flex items-center justify-center">
            ${bus.id.slice(-1)}
          </span>
        </div>
      </div>
    `;

    return L.divIcon({
      html: innerHtml,
      className: `custom-leaflet-bus-layer-icon-${bus.id}`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  return (
    <Marker position={[animatedPos.lat, animatedPos.lng]} icon={createCustomIcon()}>
      <Popup>
        <div className="p-2 text-slate-800 text-xs font-semibold font-sans min-w-[170px] text-left leading-normal">
          <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-1.5">
            <div>
              <span className="text-[9px] font-black uppercase text-blue-600 block">Active Telematics</span>
              <h4 className="font-extrabold text-sm text-slate-900 mt-0.5">{bus.id} ({bus.routeNumber})</h4>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
              bus.sos 
                ? 'bg-rose-100 text-rose-700 animate-pulse' 
                : bus.status === 'Running' 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'bg-amber-50 text-amber-700'
            }`}>
              {bus.sos ? "Emergency" : bus.status}
            </span>
          </div>

          <div className="space-y-1 text-slate-655">
            <p>Driver: <span className="font-bold text-slate-800">{bus.driverName}</span></p>
            <p>Speed: <span className="font-bold text-slate-800">{bus.speed} km/h</span></p>
            <p>Next Stop: <span className="font-bold text-slate-800">{nextStopName}</span></p>
            <p>Passengers: <span className="font-bold text-slate-800">{onboardCount} Onboard</span></p>
            <p>ETA Destination: <span className="font-bold text-slate-800">{bus.eta}</span></p>
            {bus.deviation && (
              <p className="text-rose-600 font-extrabold flex items-center gap-1 mt-1 border-t border-rose-50 pt-1">
                ⚠️ Route Deviation Alert!
              </p>
            )}
            {bus.sos && (
              <p className="text-rose-700 font-black animate-pulse bg-rose-50 border border-rose-200 rounded p-1 text-[10px] mt-1">
                🚨 SOS Signal Active! GPS: ${animatedPos.lat.toFixed(5)}, ${animatedPos.lng.toFixed(5)}
              </p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export const BusLayer: React.FC<{ bus: Bus; isSelected: boolean }> = ({ bus, isSelected }) => {
  return <BusMarker bus={bus} isSelected={isSelected} />;
};
export default BusLayer;
