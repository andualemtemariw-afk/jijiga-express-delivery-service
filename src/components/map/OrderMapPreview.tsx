import { useState, useMemo, useEffect } from 'react';
import { 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow, 
  useMap, 
  useApiLoadingStatus, 
  APILoadingStatus 
} from '@vis.gl/react-google-maps';
import { Order } from '../../types';
import { 
  MAMILA_COORDINATES, 
  DEFAULT_CUSTOMER_COORDINATES, 
  CITY_COORDINATES,
  calculateDistanceKm, 
  generateRoutePoints, 
  getEstimatedRiderPosition, 
  LatLng 
} from '../../utils/geo';
import { RoutePolyline } from './RoutePolyline';
import { MapBoundsFitter } from './MapBoundsFitter';
import { VectorRouteMapFallback } from './VectorRouteMapFallback';
import { MapErrorBoundary } from './MapErrorBoundary';
import { UpdateApiKeyModal } from './UpdateApiKeyModal';
import { 
  Bike, 
  Store, 
  MapPin, 
  Navigation, 
  Maximize2, 
  Layers, 
  Crosshair, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  Compass
} from 'lucide-react';

interface OrderMapPreviewProps {
  order: Order;
  heightClass?: string;
  onExpandFullscreen?: () => void;
  showControls?: boolean;
  className?: string;
}

// Inner helper component to control map camera and layers
function MapCameraController({ 
  riderPos, 
  customerPos, 
  mamilaPos,
  mapType,
  showTraffic
}: { 
  riderPos: LatLng; 
  customerPos: LatLng; 
  mamilaPos: LatLng;
  mapType: string;
  showTraffic: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapType);
  }, [map, mapType]);

  useEffect(() => {
    if (!map || !window.google?.maps?.TrafficLayer) return;
    try {
      const trafficLayer = new google.maps.TrafficLayer();
      if (showTraffic) {
        trafficLayer.setMap(map);
      } else {
        trafficLayer.setMap(null);
      }
      return () => {
        trafficLayer.setMap(null);
      };
    } catch {
      // ignore layer errors
    }
  }, [map, showTraffic]);

  return null;
}

function LiveGoogleMap({
  order,
  heightClass,
  onExpandFullscreen,
  onTriggerFallback,
  showControls,
  className,
}: OrderMapPreviewProps & { onTriggerFallback: () => void }) {
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [showTraffic, setShowTraffic] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<'mamila' | 'rider' | 'customer' | null>(null);
  const [recenterCount, setRecenterCount] = useState(0);
  const [simulatedTransitFrac, setSimulatedTransitFrac] = useState(0.45);

  const hasAdvancedMarker = typeof window !== 'undefined' && !!window.google?.maps?.marker?.AdvancedMarkerElement;

  useEffect(() => {
    if (order.status === 'PICKED_UP') {
      const interval = setInterval(() => {
        setSimulatedTransitFrac((prev) => (prev >= 0.88 ? 0.35 : prev + 0.04));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [order.status]);

  const mamilaPos: LatLng = useMemo(() => {
    if (order.mamilaCoordinates) return order.mamilaCoordinates;
    if (order.mamilaId && MAMILA_COORDINATES[order.mamilaId]) {
      return MAMILA_COORDINATES[order.mamilaId];
    }
    return MAMILA_COORDINATES.m1;
  }, [order.mamilaCoordinates, order.mamilaId]);

  const customerPos: LatLng = useMemo(() => {
    if (order.customerCoordinates) return order.customerCoordinates;
    if (order.customerCity && CITY_COORDINATES[order.customerCity]) {
      const base = CITY_COORDINATES[order.customerCity];
      return { lat: base.lat + 0.0015, lng: base.lng + 0.0047 };
    }
    return DEFAULT_CUSTOMER_COORDINATES;
  }, [order.customerCoordinates, order.customerCity]);

  const riderPos: LatLng = useMemo(() => {
    if (order.riderCoordinates) return order.riderCoordinates;
    return getEstimatedRiderPosition(mamilaPos, customerPos, order.status, simulatedTransitFrac);
  }, [order.riderCoordinates, mamilaPos, customerPos, order.status, simulatedTransitFrac]);

  const routePath = useMemo(() => {
    return generateRoutePoints(mamilaPos, customerPos);
  }, [mamilaPos, customerPos]);

  const pointsToFit = useMemo(() => [mamilaPos, customerPos, riderPos], [mamilaPos, customerPos, riderPos]);
  const calculatedDistance = useMemo(() => calculateDistanceKm(mamilaPos, customerPos), [mamilaPos, customerPos]);

  if (!hasAdvancedMarker) {
    return null;
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs bg-slate-900 ${className}`}>
      {/* Top Overlay Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">Live Route Telemetry</span>
            <span className="text-slate-400 font-mono text-[11px]">
              {order.customerCity || 'Jijiga'}
            </span>
          </div>
        </div>

        {/* Quick Toolbar */}
        {showControls && (
          <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-md">
            <button
              onClick={() => setMapType((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))}
              title={mapType === 'roadmap' ? 'Switch to Satellite view' : 'Switch to Map view'}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium hidden sm:inline">
                {mapType === 'roadmap' ? 'Satellite' : 'Roadmap'}
              </span>
            </button>

            <button
              onClick={() => setShowTraffic((prev) => !prev)}
              title={showTraffic ? 'Hide traffic conditions' : 'Show live traffic'}
              className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                showTraffic ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium hidden sm:inline">Traffic</span>
            </button>

            <button
              onClick={() => setRecenterCount((c) => c + 1)}
              title="Recenter map to fit route"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            {onExpandFullscreen && (
              <button
                onClick={onExpandFullscreen}
                title="Expand map preview full screen"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Map Container */}
      <div className={`w-full ${heightClass} relative`}>
        <Map
          defaultCenter={mamilaPos}
          defaultZoom={14}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          className="w-full h-full"
        >
          <MapCameraController
            riderPos={riderPos}
            customerPos={customerPos}
            mamilaPos={mamilaPos}
            mapType={mapType}
            showTraffic={showTraffic}
          />
          <MapBoundsFitter points={pointsToFit} trigger={recenterCount} padding={50} />

          {/* Polyline Route */}
          <RoutePolyline path={routePath} strokeColor="#2563eb" strokeOpacity={0.85} strokeWeight={4} />

          {/* Origin: Mamila Hub Marker */}
          {hasAdvancedMarker && (
            <AdvancedMarker
              position={mamilaPos}
              title={`Mamila: ${order.mamilaName}`}
              onClick={() => setSelectedMarker('mamila')}
            >
              <div className="relative group cursor-pointer">
                <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-lg border-2 border-white flex items-center justify-center transform transition-transform group-hover:scale-110">
                  <Store className="w-4 h-4" />
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">
                  {order.mamilaName.split(' ')[0]}
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* Destination: Customer Dropoff Marker */}
          {hasAdvancedMarker && (
            <AdvancedMarker
              position={customerPos}
              title={`Destination: ${order.customerName}`}
              onClick={() => setSelectedMarker('customer')}
            >
              <Pin background="#2563eb" glyphColor="#ffffff" borderColor="#1e3a8a">
                <MapPin className="w-3.5 h-3.5 text-white" />
              </Pin>
            </AdvancedMarker>
          )}

          {/* Live Rider / Dispatch Courier Marker */}
          {hasAdvancedMarker && ['READY_FOR_RIDER', 'RIDER_ACCEPTED', 'PICKED_UP'].includes(order.status) && (
            <AdvancedMarker
              position={riderPos}
              title={`Rider: ${order.riderName || 'Staff Rider'}`}
              onClick={() => setSelectedMarker('rider')}
            >
              <div className="relative cursor-pointer group">
                <div className="absolute -inset-2 bg-blue-500/30 rounded-full animate-ping pointer-events-none" />
                <div className="relative bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center transform transition-transform group-hover:scale-110">
                  <Bike className="w-4 h-4" />
                </div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-blue-900 text-blue-100 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                  {order.status === 'PICKED_UP' ? 'En Route' : 'Assigned'}
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* Marker Details InfoWindows */}
          {selectedMarker === 'mamila' && (
            <InfoWindow position={mamilaPos} onCloseClick={() => setSelectedMarker(null)}>
              <div className="p-1 max-w-[200px] text-slate-900">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700">
                  <Store className="w-3.5 h-3.5" />
                  <span>Pickup Origin</span>
                </div>
                <p className="font-semibold text-sm mt-0.5">{order.mamilaName}</p>
                <p className="text-xs text-slate-500">{order.mamilaLocation}</p>
                <span className="inline-block mt-1 text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                  Status: {order.runnerTagId ? 'Tagged & Verified' : 'Preparing Order'}
                </span>
              </div>
            </InfoWindow>
          )}

          {selectedMarker === 'customer' && (
            <InfoWindow position={customerPos} onCloseClick={() => setSelectedMarker(null)}>
              <div className="p-1 max-w-[200px] text-slate-900">
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-700">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Delivery Destination</span>
                </div>
                <p className="font-semibold text-sm mt-0.5">{order.customerName}</p>
                <p className="text-xs text-slate-500">{order.customerAddress || order.customerCity}</p>
                <p className="text-[11px] font-mono text-blue-600 font-bold mt-1">
                  {order.customerPlusCode}
                </p>
              </div>
            </InfoWindow>
          )}

          {selectedMarker === 'rider' && (
            <InfoWindow position={riderPos} onCloseClick={() => setSelectedMarker(null)}>
              <div className="p-1 max-w-[200px] text-slate-900">
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-600">
                  <Bike className="w-3.5 h-3.5" />
                  <span>Active Courier</span>
                </div>
                <p className="font-semibold text-sm mt-0.5">{order.riderName || 'Staff Rider'}</p>
                <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                  <p>ETA: ~{order.etaMinutes || 12} mins</p>
                  <p className="font-mono text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Tag: {order.runnerTagId || 'TAG-ET-91820'}
                  </p>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>

      {/* Bottom Live Metrics Bar */}
      <div className="bg-slate-900 border-t border-slate-800 p-3.5 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Corridor Distance</span>
              <span className="font-mono font-bold text-slate-200">
                {order.distanceKm || calculatedDistance} km
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Estimated Arrival</span>
              <span className="font-mono font-bold text-emerald-400">
                ~{order.etaMinutes || 12} mins
              </span>
            </div>
          </div>

          {order.runnerTagId && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Verification Tag</span>
                <span className="font-mono font-bold text-slate-300">
                  {order.runnerTagId}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/60">
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}

export function OrderMapPreview(props: OrderMapPreviewProps) {
  const loadingStatus = useApiLoadingStatus();
  const [authFailed, setAuthFailed] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const currentKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || (typeof window !== 'undefined' ? localStorage.getItem('user_google_maps_api_key') : null) || '';

  useEffect(() => {
    const handleAuthFail = (e: any) => {
      setAuthFailed(true);
      if (e.detail?.error) {
        setAuthErrorMsg(String(e.detail.error));
      }
    };
    window.addEventListener('gmp-auth-failed', handleAuthFail);
    return () => window.removeEventListener('gmp-auth-failed', handleAuthFail);
  }, []);

  const handleSaveKey = (newKey: string) => {
    localStorage.setItem('user_google_maps_api_key', newKey);
    window.location.reload();
  };

  const isApiReady = 
    loadingStatus === APILoadingStatus.LOADED && 
    !authFailed && 
    !!currentKey;

  const fallbackComponent = (
    <VectorRouteMapFallback
      order={props.order}
      heightClass={props.heightClass}
      onExpandFullscreen={props.onExpandFullscreen}
      onConfigureKey={() => setShowKeyModal(true)}
      showControls={props.showControls}
      className={props.className}
      errorMessage={authErrorMsg}
    />
  );

  if (loadingStatus === APILoadingStatus.LOADING && !!currentKey && !authFailed) {
    return (
      <div className={`w-full ${props.heightClass || 'h-[320px] md:h-[380px]'} bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-300 gap-3 border border-slate-800 shadow-inner`}>
        <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading Google Maps telemetry...</span>
      </div>
    );
  }

  return (
    <>
      <MapErrorBoundary fallback={fallbackComponent}>
        {!isApiReady ? (
          fallbackComponent
        ) : (
          <LiveGoogleMap {...props} onTriggerFallback={() => setAuthFailed(true)} />
        )}
      </MapErrorBoundary>

      <UpdateApiKeyModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        currentKey={currentKey}
        onSaveKey={handleSaveKey}
      />
    </>
  );
}
