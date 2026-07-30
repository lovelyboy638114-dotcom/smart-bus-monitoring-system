import React from 'react';
import { Bus } from '../types';
import { MapContainer } from './map/MapContainer';

interface LeafletMapProps {
  buses: Bus[];
  selectedBusId: string | null;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ buses, selectedBusId }) => {
  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-md border border-slate-200 z-10">
      <MapContainer buses={buses} selectedBusId={selectedBusId} />
    </div>
  );
};

export default LeafletMap;
