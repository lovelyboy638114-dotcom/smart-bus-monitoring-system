import React from 'react';
import { Circle } from 'react-leaflet';
import { Stop } from '../../types';

interface NotificationLayerProps {
  stops: Stop[];
  isSelected: boolean;
}

export const NotificationLayer: React.FC<NotificationLayerProps> = React.memo(({ stops, isSelected }) => {
  if (!isSelected) return null;

  return (
    <>
      {stops.map((stop, index) => {
        // Skip drawing the 2 km geofence circle for school destination node to avoid visual clutter
        if (index === stops.length - 1) return null;

        return (
          <Circle
            key={`proximity-geofence-${stop.name}-${index}`}
            center={[stop.lat, stop.lng]}
            radius={2000} // 2.0 kilometers radius bounds in meters
            pathOptions={{
              color: '#2563eb', // Brand Blue
              fillColor: '#3b82f6',
              fillOpacity: 0.03,
              weight: 1.2,
              dashArray: '5, 8',
            }}
          />
        );
      })}
    </>
  );
});

NotificationLayer.displayName = 'NotificationLayer';
