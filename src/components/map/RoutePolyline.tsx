import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { LatLng } from '../../utils/geo';

interface RoutePolylineProps {
  path: LatLng[];
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
}

export function RoutePolyline({
  path,
  strokeColor = '#2563eb',
  strokeOpacity = 0.85,
  strokeWeight = 4,
}: RoutePolylineProps) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !window.google?.maps?.Polyline || !Array.isArray(path) || path.length < 2) {
      return;
    }

    try {
      const validPoints = path
        .filter((pt) => typeof pt?.lat === 'number' && typeof pt?.lng === 'number')
        .map((pt) => ({ lat: Number(pt.lat), lng: Number(pt.lng) }));

      if (validPoints.length < 2) return;

      if (!polylineRef.current) {
        polylineRef.current = new google.maps.Polyline({
          path: validPoints,
          strokeColor,
          strokeOpacity,
          strokeWeight,
          map,
        });
      } else {
        polylineRef.current.setPath(validPoints);
        polylineRef.current.setOptions({ strokeColor, strokeOpacity, strokeWeight });
        polylineRef.current.setMap(map);
      }
    } catch (err) {
      console.warn('Polyline render safely caught:', err);
    }

    return () => {
      if (polylineRef.current) {
        try {
          polylineRef.current.setMap(null);
        } catch {
          // ignore cleanup error
        }
        polylineRef.current = null;
      }
    };
  }, [map, path, strokeColor, strokeOpacity, strokeWeight]);

  return null;
}
