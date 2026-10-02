export interface LatLng {
  lat: number;
  lng: number;
}

// City centers
export const CITY_COORDINATES: Record<string, LatLng> = {
  Jijiga: { lat: 9.3547, lng: 42.7955 },
  'Addis Ababa': { lat: 9.0249, lng: 38.7468 },
  'Dire Dawa': { lat: 9.5931, lng: 41.8661 },
  Hargeisa: { lat: 9.5600, lng: 44.0650 },
  Harar: { lat: 9.3139, lng: 42.1182 },
};

// Known Mamila & Restaurant production hubs
export const MAMILA_COORDINATES: Record<string, LatLng> = {
  m1: { lat: 9.3620, lng: 42.8020 }, // Fresh Morning Farms (North greenbelt)
  m2: { lat: 9.3510, lng: 42.7915 }, // Arada Bakery (Central market sector)
  m3: { lat: 9.3470, lng: 42.8045 }, // Sheger Dairy (South depot)
  m4: { lat: 9.3580, lng: 42.7980 }, // Hassan Wali Hotel & Restaurant (Taiwan Market)
  m5: { lat: 9.3530, lng: 42.7930 }, // Jijiga Express Food & Drinks Hub (Commercial Hub)
};

// Default customer coordinates in Jijiga
export const DEFAULT_CUSTOMER_COORDINATES: LatLng = {
  lat: 9.3562,
  lng: 42.8002, // Kebele 04 Central Plaza
};

/**
 * Calculate distance in km between two lat/lng coordinates (Haversine formula)
 */
export function calculateDistanceKm(from: LatLng, to: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Generates an interpolated multi-point road polyline between origin and destination
 * with natural street doglegs simulating real street grid navigation.
 */
export function generateRoutePoints(origin: LatLng, destination: LatLng, stepCount = 8): LatLng[] {
  const points: LatLng[] = [origin];
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;

  // Add realistic street turn waypoints
  const waypoints = [
    { frac: 0.15, offsetLat: 0.0004, offsetLng: -0.0003 },
    { frac: 0.35, offsetLat: -0.0003, offsetLng: 0.0005 },
    { frac: 0.55, offsetLat: 0.0006, offsetLng: 0.0002 },
    { frac: 0.75, offsetLat: 0.0002, offsetLng: -0.0004 },
    { frac: 0.90, offsetLat: -0.0002, offsetLng: 0.0002 },
  ];

  for (const wp of waypoints) {
    points.push({
      lat: origin.lat + dLat * wp.frac + wp.offsetLat,
      lng: origin.lng + dLng * wp.frac + wp.offsetLng,
    });
  }

  points.push(destination);
  return points;
}

/**
 * Returns estimated position of courier/rider based on order status along the route
 */
export function getEstimatedRiderPosition(
  origin: LatLng,
  destination: LatLng,
  status: string,
  progressFrac = 0.5
): LatLng {
  switch (status) {
    case 'RUNNER_ASSIGNED':
      return { ...origin };
    case 'READY_FOR_RIDER':
      return {
        lat: origin.lat + 0.0002,
        lng: origin.lng - 0.0001,
      };
    case 'RIDER_ACCEPTED':
      // Approaching pickup
      return {
        lat: origin.lat - 0.0012,
        lng: origin.lng + 0.0008,
      };
    case 'PICKED_UP': {
      // In transit between origin and destination
      const p = Math.max(0.1, Math.min(0.9, progressFrac));
      const route = generateRoutePoints(origin, destination);
      const index = Math.floor(p * (route.length - 1));
      const nextIndex = Math.min(route.length - 1, index + 1);
      const subFrac = (p * (route.length - 1)) - index;
      return {
        lat: route[index].lat + (route[nextIndex].lat - route[index].lat) * subFrac,
        lng: route[index].lng + (route[nextIndex].lng - route[index].lng) * subFrac,
      };
    }
    case 'DELIVERED':
    case 'RATED':
      return { ...destination };
    default:
      return { ...origin };
  }
}
