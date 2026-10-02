import { useState, useEffect, type MouseEvent } from 'react';
import { 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap, 
  useApiLoadingStatus, 
  APILoadingStatus,
  type MapMouseEvent 
} from '@vis.gl/react-google-maps';
import { LatLng, CITY_COORDINATES, calculateDistanceKm, MAMILA_COORDINATES } from '../../utils/geo';
import { MapPin, Navigation, Crosshair, Check, Layers } from 'lucide-react';
import { MapErrorBoundary } from './MapErrorBoundary';

interface DeliveryLocationPickerMapProps {
  city: string;
  initialCoordinates?: LatLng;
  onLocationSelect: (coords: LatLng, derivedPlusCode: string) => void;
  heightClass?: string;
}

function CameraCenteringHelper({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo(center);
  }, [map, center]);
  return null;
}

function VectorLocationPickerFallback({
  city,
  markerPos,
  onMarkerChange,
  heightClass,
}: {
  city: string;
  markerPos: LatLng;
  onMarkerChange: (newPos: LatLng) => void;
  heightClass: string;
}) {
  const cityBase = CITY_COORDINATES[city] || CITY_COORDINATES['Jijiga'];

  // Normalize marker position to percentage on grid (30% to 70%)
  const relX = Math.min(85, Math.max(15, 50 + (markerPos.lng - cityBase.lng) * 4000));
  const relY = Math.min(85, Math.max(15, 50 - (markerPos.lat - cityBase.lat) * 4000));

  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width);
    const clickY = ((e.clientY - rect.top) / rect.height);

    const newLng = cityBase.lng + (clickX - 0.5) / 40;
    const newLat = cityBase.lat - (clickY - 0.5) / 40;

    onMarkerChange({
      lat: Number(newLat.toFixed(5)),
      lng: Number(newLng.toFixed(5)),
    });
  };

  return (
    <div className={`w-full ${heightClass} relative bg-slate-950 overflow-hidden cursor-crosshair select-none`}>
      <svg 
        className="w-full h-full" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        onClick={handleSvgClick}
      >
        <defs>
          <pattern id="pickerGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="#090d16" />
        <rect width="100" height="100" fill="url(#pickerGrid)" />

        {/* Roads */}
        <line x1="0" y1="35" x2="100" y2="35" stroke="#1e293b" strokeWidth="2.5" />
        <line x1="0" y1="65" x2="100" y2="65" stroke="#1e293b" strokeWidth="2.5" />
        <line x1="30" y1="0" x2="30" y2="100" stroke="#1e293b" strokeWidth="2.5" />
        <line x1="70" y1="0" x2="70" y2="100" stroke="#1e293b" strokeWidth="2.5" />

        {/* Street labels */}
        <text x="5" y="32" fill="#475569" fontSize="3.5" fontWeight="600">{city} Central Corridor</text>
        <text x="32" y="10" fill="#475569" fontSize="3.5" fontWeight="600">Main Commercial Way</text>

        {/* Selected Dropoff Pin */}
        <g transform={`translate(${relX}, ${relY})`}>
          <circle r="4.5" fill="#3b82f6" fillOpacity="0.3" className="animate-ping" />
          <circle r="2.8" fill="#2563eb" stroke="#ffffff" strokeWidth="0.6" />
          <text x="0" y="-3.5" textAnchor="middle" fill="#93c5fd" fontSize="2.8" fontWeight="bold">Dropoff</text>
        </g>
      </svg>
    </div>
  );
}

export function DeliveryLocationPickerMap({
  city,
  initialCoordinates,
  onLocationSelect,
  heightClass = 'h-[220px]',
}: DeliveryLocationPickerMapProps) {
  const loadingStatus = useApiLoadingStatus();
  const [authFailed, setAuthFailed] = useState(false);
  const defaultCenter = CITY_COORDINATES[city] || CITY_COORDINATES['Jijiga'];
  const [markerPos, setMarkerPos] = useState<LatLng>(initialCoordinates || defaultCenter);
  const currentKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || (typeof window !== 'undefined' ? localStorage.getItem('user_google_maps_api_key') : null) || '';

  useEffect(() => {
    const handleAuthFail = () => setAuthFailed(true);
    window.addEventListener('gmp-auth-failed', handleAuthFail);
    return () => window.removeEventListener('gmp-auth-failed', handleAuthFail);
  }, []);

  // Update center when city changes
  useEffect(() => {
    const cityBase = CITY_COORDINATES[city] || CITY_COORDINATES['Jijiga'];
    const newPos = {
      lat: cityBase.lat + 0.0015,
      lng: cityBase.lng + 0.003,
    };
    setMarkerPos(newPos);
    const code = derivePlusCode(city, newPos);
    onLocationSelect(newPos, code);
  }, [city]);

  const derivePlusCode = (cityName: string, coords: LatLng) => {
    const dLat = Math.round((coords.lat % 1) * 10000);
    const dLng = Math.round((coords.lng % 1) * 10000);
    return `8F2P+${dLat.toString(36).toUpperCase().slice(-2)}${dLng.toString(36).toUpperCase().slice(-2)} ${cityName}`;
  };

  const handleMapClick = (e: MapMouseEvent) => {
    if (!e.detail.latLng) return;
    const newCoords = {
      lat: e.detail.latLng.lat,
      lng: e.detail.latLng.lng,
    };
    setMarkerPos(newCoords);
    const code = derivePlusCode(city, newCoords);
    onLocationSelect(newCoords, code);
  };

  const handleVectorPinChange = (newCoords: LatLng) => {
    setMarkerPos(newCoords);
    const code = derivePlusCode(city, newCoords);
    onLocationSelect(newCoords, code);
  };

  const mamilaHub = MAMILA_COORDINATES.m1;
  const estDistance = calculateDistanceKm(mamilaHub, markerPos);

  const isApiReady = 
    loadingStatus === APILoadingStatus.LOADED && 
    !authFailed && 
    !!currentKey;

  if (loadingStatus === APILoadingStatus.LOADING && !!currentKey && !authFailed) {
    return (
      <div className={`w-full ${heightClass} bg-slate-900 rounded-xl flex flex-col items-center justify-center text-slate-300 gap-2 border border-slate-700/80`}>
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Loading map...</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xs space-y-2">
      <div className="relative">
        <div className="absolute top-2 left-2 z-10 bg-slate-900/90 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5">
          <Navigation className="w-3 h-3 text-emerald-400" />
          <span>Click anywhere to adjust doorstep pin</span>
        </div>

        <MapErrorBoundary
          fallback={
            <VectorLocationPickerFallback
              city={city}
              markerPos={markerPos}
              onMarkerChange={handleVectorPinChange}
              heightClass={heightClass}
            />
          }
        >
          {!isApiReady ? (
            <VectorLocationPickerFallback
              city={city}
              markerPos={markerPos}
              onMarkerChange={handleVectorPinChange}
              heightClass={heightClass}
            />
          ) : (
            <div className={`w-full ${heightClass} relative`}>
              <Map
                defaultCenter={markerPos}
                defaultZoom={15}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                gestureHandling="greedy"
                disableDefaultUI={false}
                zoomControl={true}
                mapTypeControl={false}
                streetViewControl={false}
                fullscreenControl={false}
                onClick={handleMapClick}
                className="w-full h-full"
              >
                <CameraCenteringHelper center={markerPos} />

                {typeof window !== 'undefined' && !!window.google?.maps?.marker?.AdvancedMarkerElement && (
                  <AdvancedMarker position={markerPos} title="Your Dropoff Pinpoint">
                    <Pin background="#2563eb" glyphColor="#ffffff" borderColor="#1e3a8a">
                      <MapPin className="w-4 h-4 text-white" />
                    </Pin>
                  </AdvancedMarker>
                )}
              </Map>
            </div>
          )}
        </MapErrorBoundary>
      </div>

      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <Crosshair className="w-3.5 h-3.5 text-blue-600" />
          <span>{markerPos.lat.toFixed(4)}, {markerPos.lng.toFixed(4)}</span>
        </div>
        <div className="text-[11px] font-semibold text-slate-700">
          Est. Hub Distance: <span className="font-mono text-blue-600">{estDistance} km</span> (~{Math.round(estDistance * 3.5 + 4)} mins)
        </div>
      </div>
    </div>
  );
}
