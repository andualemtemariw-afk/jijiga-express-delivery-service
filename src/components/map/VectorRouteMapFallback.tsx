import { useState, useMemo, useEffect } from 'react';
import { Order } from '../../types';
import { 
  MAMILA_COORDINATES, 
  DEFAULT_CUSTOMER_COORDINATES, 
  CITY_COORDINATES,
  generateRoutePoints, 
  getEstimatedRiderPosition, 
  LatLng 
} from '../../utils/geo';
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
  KeyRound,
  ZoomIn,
  ZoomOut,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';

interface VectorRouteMapFallbackProps {
  order: Order;
  heightClass?: string;
  onExpandFullscreen?: () => void;
  onConfigureKey?: () => void;
  showControls?: boolean;
  className?: string;
  errorMessage?: string;
}

export function VectorRouteMapFallback({
  order,
  heightClass = 'h-[360px]',
  onExpandFullscreen,
  onConfigureKey,
  showControls = true,
  className = '',
  errorMessage = '',
}: VectorRouteMapFallbackProps) {
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');
  const [zoomLevel, setZoomLevel] = useState(1);
  const demoSandboxEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_SANDBOX === 'true';
  const [simulatedFrac, setSimulatedFrac] = useState(0.48);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(interval);
  }, []);

  const riderGpsTimestamp = order.riderLocationUpdatedAt ? Date.parse(order.riderLocationUpdatedAt) : Number.NaN;
  const hasFreshRiderGps = Boolean(
    order.riderId &&
    order.riderCoordinates &&
    Number.isFinite(riderGpsTimestamp) &&
    nowMs >= riderGpsTimestamp &&
    nowMs - riderGpsTimestamp <= 60000
  );

  useEffect(() => {
    if (demoSandboxEnabled && order.status === 'PICKED_UP') {
      const interval = setInterval(() => {
        setSimulatedFrac((prev) => (prev >= 0.9 ? 0.35 : prev + 0.03));
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [order.status, demoSandboxEnabled]);

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
    if (hasFreshRiderGps && order.riderCoordinates) return order.riderCoordinates;
    if (demoSandboxEnabled) return getEstimatedRiderPosition(mamilaPos, customerPos, order.status, simulatedFrac);
    return customerPos;
  }, [order.riderCoordinates, hasFreshRiderGps, mamilaPos, customerPos, order.status, simulatedFrac, demoSandboxEnabled]);


  // Convert GPS coordinates into local SVG coordinate space (0-1000 x 0-600)
  const svgCoords = useMemo(() => {
    // Normalization bounds
    const minLat = Math.min(mamilaPos.lat, customerPos.lat, riderPos.lat) - 0.005;
    const maxLat = Math.max(mamilaPos.lat, customerPos.lat, riderPos.lat) + 0.005;
    const minLng = Math.min(mamilaPos.lng, customerPos.lng, riderPos.lng) - 0.005;
    const maxLng = Math.max(mamilaPos.lng, customerPos.lng, riderPos.lng) + 0.005;

    const toSvg = (pt: LatLng) => {
      const x = 120 + ((pt.lng - minLng) / (maxLng - minLng || 0.01)) * 760;
      // Invert Y for latitude
      const y = 100 + ((maxLat - pt.lat) / (maxLat - minLat || 0.01)) * 400;
      return { x, y };
    };

    const origin = toSvg(mamilaPos);
    const dest = toSvg(customerPos);
    const courier = toSvg(riderPos);

    // Intermediate street-grid doglegs
    const mid1 = { x: origin.x + (dest.x - origin.x) * 0.35, y: origin.y };
    const mid2 = { x: origin.x + (dest.x - origin.x) * 0.35, y: dest.y * 0.7 + origin.y * 0.3 };
    const mid3 = { x: dest.x * 0.8 + origin.x * 0.2, y: dest.y };

    const pathD = `M ${origin.x} ${origin.y} L ${mid1.x} ${mid1.y} L ${mid2.x} ${mid2.y} L ${mid3.x} ${mid3.y} L ${dest.x} ${dest.y}`;

    return { origin, dest, courier, pathD };
  }, [mamilaPos, customerPos, riderPos]);

  const isDark = mapTheme === 'dark';
  const usesFallbackCustomerLocation = Boolean(order.customerCoordinates
    && order.customerCoordinates.lat === DEFAULT_CUSTOMER_COORDINATES.lat
    && order.customerCoordinates.lng === DEFAULT_CUSTOMER_COORDINATES.lng);

  if (!demoSandboxEnabled && (!order.customerCoordinates || !order.mamilaCoordinates || usesFallbackCustomerLocation)) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 ${className}`}>
        <strong>Location preview unavailable.</strong> Verified customer and vendor coordinates are required before drawing a route illustration.
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-md ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'} ${className}`}>
      {/* Top Banner Notice: only show if an explicit error occurred */}
      {!!errorMessage && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 flex items-center justify-between gap-3 text-xs text-amber-200 backdrop-blur-xs">
          <div className="flex items-center gap-2 truncate">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="truncate">
              <strong className="font-semibold text-amber-300">Google Maps Platform:</strong> {errorMessage}
            </span>
          </div>

          {onConfigureKey && (
            <button
              onClick={onConfigureKey}
              className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3 h-3" />
              Update API Key
            </button>
          )}
        </div>
      )}

      {/* Map Header Toolbar */}
      <div className="p-3 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-xs">Illustrative Location Map</span>
          <span className="text-[11px] font-mono text-slate-400">
            {order.customerCity || 'Jijiga'} • Not turn-by-turn routing
          </span>
        </div>

        {showControls && (
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setMapTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Toggle map theme"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 text-xs flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
            </button>

            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              title="Zoom In"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
              title="Zoom Out"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setZoomLevel(1)}
              title="Reset Zoom"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            {onExpandFullscreen && (
              <button
                onClick={onExpandFullscreen}
                title="Fullscreen map preview"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Interactive Vector Map Canvas */}
      <div className={`w-full ${heightClass} relative overflow-hidden flex items-center justify-center`}>
        <div 
          className="w-full h-full relative transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
            {/* Background Grid Pattern */}
            <defs>
              <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path 
                  d="M 40 0 L 0 0 0 40" 
                  fill="none" 
                  stroke={isDark ? '#1e293b' : '#e2e8f0'} 
                  strokeWidth="0.8" 
                />
              </pattern>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>

            <rect width="1000" height="600" fill={isDark ? '#090d16' : '#f8fafc'} />
            <rect width="1000" height="600" fill="url(#gridPattern)" />

            {/* City Street Grid Roads Simulation */}
            <g stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeWidth="12" strokeLinecap="round" opacity={0.6}>
              <line x1="50" y1="180" x2="950" y2="180" />
              <line x1="50" y1="360" x2="950" y2="360" />
              <line x1="280" y1="50" x2="280" y2="550" />
              <line x1="580" y1="50" x2="580" y2="550" />
              <line x1="780" y1="50" x2="780" y2="550" />
              <path d="M 120 480 Q 500 200 900 320" fill="none" strokeWidth="18" stroke={isDark ? '#172554' : '#dbeafe'} opacity={0.5} />
            </g>

            {/* Street Names Labels */}
            <g fill={isDark ? '#475569' : '#94a3b8'} fontSize="11" fontFamily="sans-serif" fontWeight="600">
              <text x="70" y="172">Karamara Hospital Road</text>
              <text x="70" y="352">Kebele 04 Central Commercial Ave</text>
              <text x="290" y="80">Taiwan Market Boulevard</text>
              <text x="590" y="80">Jijiga University Expressway</text>
              <text x="750" y="520">Illustrative connector, not a verified road route</text>
            </g>

            {/* Route Polyline */}
            <path
              d={svgCoords.pathD}
              fill="none"
              stroke={isDark ? '#1e3a8a' : '#bfdbfe'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={svgCoords.pathD}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="4"
              strokeDasharray="8 6"
              strokeLinecap="round"
              className="animate-pulse"
            />

            {/* Origin Mamila Marker */}
            <g transform={`translate(${svgCoords.origin.x}, ${svgCoords.origin.y})`}>
              <circle r="22" fill="#10b981" fillOpacity="0.2" />
              <circle r="14" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
              <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">M</text>
              <rect x="-60" y="-36" width="120" height="20" rx="6" fill={isDark ? '#0f172a' : '#ffffff'} stroke="#10b981" strokeWidth="1.5" />
              <text x="0" y="-22" textAnchor="middle" fill={isDark ? '#ffffff' : '#0f172a'} fontSize="10" fontWeight="bold">
                {order.mamilaName}
              </text>
            </g>

            {/* Customer Dropoff Marker */}
            <g transform={`translate(${svgCoords.dest.x}, ${svgCoords.dest.y})`}>
              <circle r="22" fill="#3b82f6" fillOpacity="0.2" />
              <circle r="14" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
              <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">C</text>
              <rect x="-70" y="24" width="140" height="22" rx="6" fill={isDark ? '#0f172a' : '#ffffff'} stroke="#2563eb" strokeWidth="1.5" />
              <text x="0" y="38" textAnchor="middle" fill={isDark ? '#ffffff' : '#0f172a'} fontSize="10" fontWeight="bold">
                {order.customerName}
              </text>
            </g>

            {/* Live Courier Marker — only when real rider GPS exists */}
            {['READY_FOR_RIDER', 'RIDER_ACCEPTED', 'PICKED_UP'].includes(order.status) && hasFreshRiderGps && (
              <g transform={`translate(${svgCoords.courier.x}, ${svgCoords.courier.y})`}>
                <circle r="28" fill="#3b82f6" fillOpacity="0.25" className="animate-ping" />
                <circle r="16" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2.5" />
                <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">🏍️</text>
                <rect x="-55" y="-38" width="110" height="20" rx="10" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" />
                <text x="0" y="-24" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                  {order.riderName || 'Staff Rider'}
                </text>
              </g>
            )}

          </svg>
        </div>
      </div>

      {/* Bottom Live Metrics Bar */}
      <div className={`p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Corridor Distance</span>
              <span className="font-mono font-bold">Unavailable — no verified route estimate</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Estimated Arrival</span>
              <span className="font-mono font-bold text-emerald-400">Unavailable — live routing not connected</span>
            </div>
          </div>

          {order.runnerTagId && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Verification Tag</span>
                <span className="font-mono font-bold text-slate-300">{order.runnerTagId}</span>
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
