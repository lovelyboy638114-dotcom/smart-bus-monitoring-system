import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, Coordinate } from '../../types';
import { SCHOOL_LOCATION } from '../../data/mockData';
import { RouteLayer } from './RouteLayer';
import { StopLayer } from './StopLayer';
import { BusLayer } from './BusLayer';
import { NotificationLayer } from './NotificationLayer';
import { Compass, Maximize2, Crosshair, AlertCircle } from 'lucide-react';

// Fix relative paths for standard Leaflet marker assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapContainerProps {
  buses: Bus[];
  selectedBusId: string | null;
}

// Controller component to decouple Leaflet map camera actions from visual marker renders
const MapController: React.FC<{
  boundsPoints: Coordinate[];
  selectedBusId: string | null;
  followMode: boolean;
  setFollowMode: (mode: boolean) => void;
  fitAllTrigger: number;
  buses: Bus[];
  onMapStateChange: (zoom: number, center: L.LatLng) => void;
  setCameraMessage: (msg: string | null) => void;
}> = ({
  boundsPoints,
  selectedBusId,
  followMode,
  setFollowMode,
  fitAllTrigger,
  buses,
  onMapStateChange,
  setCameraMessage,
}) => {
  const map = useMap();
  const isInitialLoadedRef = useRef<boolean>(false);
  const prevSelectedBusIdRef = useRef<string | null>(null);

  // Capture user interactions and map state changes
  useMapEvents({
    dragstart: () => {
      if (followMode) {
        setFollowMode(false);
        setCameraMessage("Follow Mode Disabled (Manual Map Movement)");
        setTimeout(() => setCameraMessage(null), 3000);
      }
    },
    zoomstart: () => {
      if (followMode) {
        setFollowMode(false);
        setCameraMessage("Follow Mode Disabled (Manual Map Movement)");
        setTimeout(() => setCameraMessage(null), 3000);
      }
    },
    zoomend: () => {
      onMapStateChange(map.getZoom(), map.getCenter());
    },
    moveend: () => {
      onMapStateChange(map.getZoom(), map.getCenter());
    },
  });

  // Fit all elements on initial load and when fitAllTrigger increments
  useEffect(() => {
    if (boundsPoints.length === 0) return;
    const bounds = L.latLngBounds(boundsPoints.map((p) => [p.lat, p.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
    }
  }, [fitAllTrigger, map]);

  // Smoothly fit bounds exactly once on page startup mount
  useEffect(() => {
    if (!isInitialLoadedRef.current && boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints.map((p) => [p.lat, p.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 14 });
        isInitialLoadedRef.current = true;
      }
    }
  }, [boundsPoints, map]);

  // Smooth pan center camera when selectedBusId changes
  useEffect(() => {
    if (selectedBusId !== prevSelectedBusIdRef.current) {
      prevSelectedBusIdRef.current = selectedBusId;
      if (selectedBusId && selectedBusId !== 'all') {
        const activeBus = buses.find((b) => b.id === selectedBusId);
        const currentPos = activeBus?.currentLocation || activeBus?.path[activeBus?.currentStopIndex || 0];
        if (currentPos) {
          map.panTo([currentPos.lat, currentPos.lng], { animate: true, duration: 1.0 });
        }
      } else {
        // Fit all bounds when selection is cleared
        const bounds = L.latLngBounds(boundsPoints.map((p) => [p.lat, p.lng]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
        }
      }
    }
  }, [selectedBusId, buses, map, boundsPoints]);

  // Smoothly center tracking camera on moving coordinates when Follow Mode is active
  useEffect(() => {
    if (followMode && selectedBusId && selectedBusId !== 'all') {
      const activeBus = buses.find((b) => b.id === selectedBusId);
      const currentPos = activeBus?.currentLocation || activeBus?.path[activeBus?.currentStopIndex || 0];
      if (currentPos) {
        map.panTo([currentPos.lat, currentPos.lng], { animate: true, duration: 0.5 });
      }
    }
  }, [buses, followMode, selectedBusId, map]);

  return null;
};

export const MapContainer: React.FC<MapContainerProps> = ({ buses, selectedBusId }) => {
  const normalizedSelectedId = selectedBusId === 'all' ? null : selectedBusId;

  // Local HUD panel and camera states
  const [followMode, setFollowMode] = useState<boolean>(false);
  const [fitAllTrigger, setFitAllTrigger] = useState<number>(0);
  const [currentZoom, setCurrentZoom] = useState<number>(12);
  const [currentCenter, setCurrentCenter] = useState<L.LatLng>(
    new L.LatLng(SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng)
  );
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);

  const handleMapStateChange = useCallback((zoom: number, center: L.LatLng) => {
    setCurrentZoom(zoom);
    setCurrentCenter(center);
  }, []);

  // Fit bounds points calculation (School + stops + buses locations)
  const boundsPoints = useMemo(() => {
    const points: Coordinate[] = [];
    points.push(SCHOOL_LOCATION);

    buses.forEach((bus) => {
      const isSelected = normalizedSelectedId === null || normalizedSelectedId === bus.id;
      if (!isSelected) return;

      bus.stops.forEach((st) => points.push({ lat: st.lat, lng: st.lng }));

      const currentPos = bus.currentLocation || bus.path[bus.currentStopIndex];
      if (currentPos) {
        points.push(currentPos);
      }
    });

    return points;
  }, [buses, normalizedSelectedId]);

  // Handle center pan on selected bus
  const handleCenterSelectedBus = () => {
    if (normalizedSelectedId) {
      const activeBus = buses.find((b) => b.id === normalizedSelectedId);
      const currentPos = activeBus?.currentLocation || activeBus?.path[activeBus?.currentStopIndex || 0];
      if (currentPos && window.L) {
        setFitAllTrigger((prev) => prev + 1); // Trigger pan centering
      }
    }
  };

  return (
    <div className="w-full h-full relative z-0 bg-slate-50 overflow-hidden select-none">
      {/* FLOATING CONTROLS: Top Right Glassmorphism Control Center Overlay Panel */}
      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md border border-slate-200/50 shadow-premium p-4 rounded-2xl z-[1000] font-sans flex flex-col gap-3 min-w-[220px] text-xs text-slate-800 text-left">
        <div>
          <span className="text-[9px] font-black uppercase text-blue-600 block leading-none mb-1">
            Map Controls
          </span>
          <h4 className="font-extrabold text-slate-800">Fleet Control Center</h4>
        </div>

        <div className="space-y-2 border-t border-slate-250/40 pt-2.5">
          {/* Fit Fleet Trigger */}
          <button
            onClick={() => setFitAllTrigger((prev) => prev + 1)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm text-[10px] uppercase tracking-wider"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Fit All Fleet</span>
          </button>

          {/* Follow Mode Toggle switch (only active if a bus is selected) */}
          <div className="flex items-center justify-between py-1">
            <span className="font-semibold text-slate-600">Follow Selected Bus</span>
            <label className={`relative inline-flex items-center ${normalizedSelectedId ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
              <input
                type="checkbox"
                checked={followMode}
                disabled={!normalizedSelectedId}
                onChange={(e) => setFollowMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Center camera on active bus button */}
          <button
            onClick={handleCenterSelectedBus}
            disabled={!normalizedSelectedId}
            className="w-full bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-[10px] uppercase"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Center Selection</span>
          </button>
        </div>

        {/* Real-time coordinates and zoom level telemetry display */}
        <div className="border-t border-slate-250/40 pt-2.5 space-y-1 text-[9.5px] font-mono text-slate-500 font-semibold leading-normal">
          <div className="flex justify-between">
            <span>Zoom Level:</span>
            <span className="text-slate-700 font-bold">{currentZoom}</span>
          </div>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[7.5px]">Map Center GPS</span>
            <span className="text-slate-700 font-bold text-[9px]">
              {currentCenter.lat.toFixed(5)}° N, {currentCenter.lng.toFixed(5)}° E
            </span>
          </div>
        </div>
      </div>

      {/* Floating System Messages Notification alert banner */}
      {cameraMessage && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/90 text-white backdrop-blur-sm border border-slate-750/30 px-4 py-2.5 rounded-xl z-[1000] font-sans flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider shadow-lg animate-bounce">
          <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
          <span>{cameraMessage}</span>
        </div>
      )}

      {/* RENDER INTERACTIVE LEAFLET VIEWPORT */}
      <LeafletMapContainer
        center={[SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng]}
        zoom={12}
        zoomControl={true}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Map Controller coordinates panning */}
        <MapController
          boundsPoints={boundsPoints}
          selectedBusId={normalizedSelectedId}
          followMode={followMode}
          setFollowMode={setFollowMode}
          fitAllTrigger={fitAllTrigger}
          buses={buses}
          onMapStateChange={handleMapStateChange}
          setCameraMessage={setCameraMessage}
        />

        {/* Overlay Layers */}
        {buses.map((busItem) => {
          const isSelected = normalizedSelectedId === null || normalizedSelectedId === busItem.id;

          return (
            <React.Fragment key={busItem.id}>
              {/* Route Polyline drawer */}
              <RouteLayer bus={busItem} isSelected={isSelected} />

              {/* geofence 2km radius circle */}
              <NotificationLayer stops={busItem.stops} isSelected={isSelected} />

              {/* Intermediate stops marker pins */}
              <StopLayer stops={busItem.stops} bus={busItem} isSelected={isSelected} />

              {/* Dynamic Animated smooth movement bus icons */}
              <BusLayer bus={busItem} isSelected={isSelected} />
            </React.Fragment>
          );
        })}
      </LeafletMapContainer>
    </div>
  );
};
export default MapContainer;
