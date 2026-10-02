import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { LatLng } from '../../utils/geo';

interface MapBoundsFitterProps {
  points: LatLng[];
  padding?: number;
  trigger?: unknown;
}

export function MapBoundsFitter({ points, padding = 48, trigger }: MapBoundsFitterProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google?.maps || points.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    points.forEach((pt) => {
      if (typeof pt?.lat === 'number' && typeof pt?.lng === 'number') {
        bounds.extend(pt);
      }
    });

    map.fitBounds(bounds, {
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
    });
  }, [map, points, padding, trigger]);

  return null;
}
