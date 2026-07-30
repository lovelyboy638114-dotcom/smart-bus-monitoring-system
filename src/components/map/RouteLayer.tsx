import React from 'react';
import { Polyline } from 'react-leaflet';
import { Bus } from '../../types';

interface RouteLayerProps {
  bus: Bus;
  isSelected: boolean;
}

export const RouteLayer: React.FC<RouteLayerProps> = React.memo(({ bus, isSelected }) => {
  const opacity = isSelected ? 0.85 : 0.3;
  const weight = isSelected ? 4 : 2;

  // Planned Path coordinates
  const plannedPositions = bus.path.map((p) => [p.lat, p.lng] as [number, number]);

  // Completed Path coordinates (from depot up to current stop index)
  const completedIndex = Math.min(bus.currentStopIndex, bus.path.length - 1);
  const completedPositions = bus.path
    .slice(0, completedIndex + 1)
    .map((p) => [p.lat, p.lng] as [number, number]);

  // Deviation segment: red dashed line from planned track to current location
  const currentPos = bus.currentLocation || bus.path[completedIndex];
  const deviationPositions =
    bus.deviation && bus.currentLocation
      ? ([
          [bus.path[completedIndex].lat, bus.path[completedIndex].lng],
          [currentPos.lat, currentPos.lng],
        ] as [number, number][])
      : null;

  return (
    <>
      {/* Planned Planned Route (Blue Line) */}
      <Polyline
        positions={plannedPositions}
        pathOptions={{
          color: '#3b82f6', // Brand Blue
          weight: weight,
          opacity: opacity,
          dashArray: isSelected ? undefined : '6, 6',
        }}
      />

      {/* Completed Route (Green Line) */}
      {completedPositions.length > 0 && (
        <Polyline
          positions={completedPositions}
          pathOptions={{
            color: '#10b981', // Emerald Green
            weight: weight + 1.5,
            opacity: opacity + 0.1,
          }}
        />
      )}

      {/* Deviated Route (Red Line) */}
      {deviationPositions && (
        <Polyline
          positions={deviationPositions}
          pathOptions={{
            color: '#ef4444', // Crimson Red
            weight: weight + 1.5,
            opacity: 1.0,
            dashArray: '5, 8',
          }}
        />
      )}
    </>
  );
});

RouteLayer.displayName = 'RouteLayer';
