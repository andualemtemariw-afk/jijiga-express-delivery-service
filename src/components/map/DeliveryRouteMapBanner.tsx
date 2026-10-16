import { useState, useEffect } from 'react';
import { 
  Navigation, 
  Bike, 
  MapPin, 
  ShieldCheck, 
  Phone, 
  MessageSquare, 
  Maximize2, 
  Clock, 
  Gauge, 
  Package, 
  FastForward,
  ChevronDown,
  ChevronUp,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { Order } from '../../types';
import { OrderMapPreview } from './OrderMapPreview';
import { DEFAULT_CUSTOMER_COORDINATES, MAMILA_COORDINATES, calculateDistanceKm, LatLng } from '../../utils/geo';

interface Props {
  activeOrder?: Order | null;
  onOpenMapModal?: (order: Order) => void;
  onBookParcel?: () => void;
  onSimulateStep?: (orderId: string) => void;
  onOpenChat?: (order: Order) => void;
  onCallCourier?: (phone: string) => void;
  language?: 'en' | 'so' | 'am';
}

export function DeliveryRouteMapBanner({
  activeOrder,
  onOpenMapModal,
  onBookParcel,
  onSimulateStep,
  onOpenChat,
  onCallCourier,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [trackingNow, setTrackingNow] = useState(() => Date.now());
  const demoSandboxEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_SANDBOX === 'true';

  useEffect(() => {
    const interval = setInterval(() => setTrackingNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  // Synthetic route data is available only in an explicit development/demo sandbox.
  const displayOrder: Order = activeOrder || (demoSandboxEnabled ? {
    id: 'DEMO-ROUTE-01',
    serviceType: 'PARCEL',
    batchId: 'demo-batch',
    batchName: 'Express Parcel: Central Dispatch → Kebele 04 Corridor',
    mamilaId: 'm1',
    mamilaName: 'Jijiga Express Delivery Service Hub',
    mamilaLocation: 'Central Dispatch Hub, Taiwan Sector, Jijiga',
    price: 350,
    quantity: 1,
    deliveryFee: 150,
    totalPrice: 500,
    status: 'PICKED_UP',
    paymentMethod: 'TELEBIRR',
    customerId: '',
    customerName: 'Andualem Awraris Haile',
    customerPhone: '+251 91 123 4567',
    customerCity: 'Jijiga',
    customerPlusCode: '8F2P+5H Jijiga',
    customerAddress: 'Kebele 04, Central Plaza, Jijiga',
    customerCoordinates: DEFAULT_CUSTOMER_COORDINATES,
    mamilaCoordinates: MAMILA_COORDINATES.m1,
    riderName: 'Active Fleet Courier',
    distanceKm: 2.4,
    etaMinutes: 7,
    runnerTagId: 'TAG-ET-91820',
    createdAt: new Date(),
  } : null as unknown as Order);

  if (!activeOrder && !demoSandboxEnabled) return null;

  const isRealOrder = !!activeOrder;
  const locationTimestampMs = displayOrder.riderLocationUpdatedAt ? Date.parse(displayOrder.riderLocationUpdatedAt) : NaN;
  const locationAgeMs = trackingNow - locationTimestampMs;
  const hasFreshRiderLocation = !!displayOrder.riderCoordinates
    && Number.isFinite(locationTimestampMs)
    && locationAgeMs >= -60000
    && locationAgeMs <= 90000;
  const trackingStatus = hasFreshRiderLocation
    ? 'LIVE GPS LOCATION'
    : demoSandboxEnabled
      ? 'DEMO SIMULATION ONLY'
      : 'WAITING FOR RIDER GPS';
  const liveDirectDistanceKm = hasFreshRiderLocation && displayOrder.riderCoordinates && displayOrder.customerCoordinates
    ? calculateDistanceKm(displayOrder.riderCoordinates, displayOrder.customerCoordinates)
    : null;

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-500/30 shadow-md overflow-hidden transition-all">
      {/* Top Banner Header Contract */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 p-4 md:p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
              hasFreshRiderLocation
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : demoSandboxEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-500/20 text-slate-300 border-slate-500/40'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                hasFreshRiderLocation ? 'bg-emerald-400 animate-pulse' : demoSandboxEnabled ? 'bg-amber-400' : 'bg-slate-400'
              }`} />
              {trackingStatus}
            </span>
            <span className="text-[11px] font-mono text-blue-300">
              {isRealOrder ? `Order #${displayOrder.id}` : 'Fleet Patrol Demo'}
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-400" />
            Delivery Route Map • Real-Time Courier Tracking
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            {isRealOrder
              ? `Tracking ${displayOrder.riderName || 'Courier'} live on route to ${displayOrder.customerAddress || displayOrder.customerCity}.`
              : 'Direct route visualization connecting Jijiga Express Central Hub to local sectors with live telemetry.'}
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {onSimulateStep && (
            <button
              onClick={() => onSimulateStep(displayOrder.id)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Advance simulated courier state along route"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Simulate Next Step</span>
            </button>
          )}

          {onOpenMapModal && (
            <button
              onClick={() => onOpenMapModal(displayOrder)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fullscreen</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            aria-label="Toggle map view"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 md:p-6 space-y-4">
          {/* Real-time Telemetry HUD Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Courier
              </span>
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1 truncate">
                <Bike className="w-4 h-4 text-blue-600 flex-shrink-0" />
                {displayOrder.riderName || 'Staff Rider'}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block">
                {displayOrder.riderId || displayOrder.riderName ? 'Courier assigned' : 'Awaiting rider assignment'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Location Signal
              </span>
              <span className="font-mono font-extrabold text-slate-900 text-sm flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-amber-500" />
                {hasFreshRiderLocation ? 'GPS ACTIVE' : demoSandboxEnabled ? 'DEMO ONLY' : 'NO GPS FIX'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {hasFreshRiderLocation
                  ? `Updated ${new Date(locationTimestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : demoSandboxEnabled ? 'Synthetic location; not real courier GPS' : 'Waiting for rider location'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {hasFreshRiderLocation ? 'Approx. Direct Distance' : demoSandboxEnabled ? 'Demo Route Distance' : 'Remaining Distance'}
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm block">
                {liveDirectDistanceKm !== null
                  ? `~${liveDirectDistanceKm.toFixed(1)} km`
                  : demoSandboxEnabled && displayOrder.distanceKm !== undefined
                    ? `~${displayOrder.distanceKm} km (demo)`
                    : 'Waiting for GPS'}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold block">
                {hasFreshRiderLocation && displayOrder.etaMinutes !== undefined
                  ? `Estimated ETA: ~${displayOrder.etaMinutes} mins`
                  : demoSandboxEnabled
                    ? `Demo ETA: ~${displayOrder.etaMinutes || 7} mins`
                    : 'ETA unavailable until GPS updates'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Security Seal
              </span>
              <span className="font-mono font-bold text-emerald-700 text-xs flex items-center gap-1 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                {displayOrder.runnerTagId || 'Not assigned'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {displayOrder.runnerTagId ? 'Tag recorded on order' : 'Security seal pending'}
              </span>
            </div>
          </div>

          {/* Integrated Interactive Delivery Route Map */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <OrderMapPreview
              order={displayOrder}
              heightClass="h-[320px] md:h-[380px]"
              onExpandFullscreen={onOpenMapModal ? () => onOpenMapModal(displayOrder) : undefined}
              showControls={true}
            />

            {/* In-Map Telemetry Overlay Badge */}
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-2 pointer-events-none text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold text-slate-800">
                {displayOrder.customerCity || 'Jijiga'}: {displayOrder.customerAddress || 'Kebele 04 Corridor'}
              </span>
            </div>
          </div>

          {/* Bottom Action Footer with Secondary Text Prompt */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCallCourier?.(displayOrder.customerPhone || '')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Call Courier</span>
              </button>

              <button
                onClick={() => onOpenChat?.(displayOrder)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition cursor-pointer border border-blue-200"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Chat & Vernacular Voice</span>
              </button>

              {onBookParcel && (
                <button
                  onClick={onBookParcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-2xs"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Dispatch Express Parcel</span>
                </button>
              )}
            </div>

            {/* Requirement 3: Secondary text prompt below the main button */}
            <p className="text-[11px] text-slate-500 font-medium sm:text-right">
              To request custom delivery features, ask support.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
