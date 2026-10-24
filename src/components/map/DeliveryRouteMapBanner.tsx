import { useEffect, useState } from 'react';
import { 
  Navigation, 
  Bike, 
  MapPin, 
  ShieldCheck, 
  Phone, 
  MessageSquare, 
  Maximize2, 
  Clock, 
  Package, 
  FastForward,
  ChevronDown,
  ChevronUp,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { Order } from '../../types';
import { OrderMapPreview } from './OrderMapPreview';
import { DEFAULT_CUSTOMER_COORDINATES, MAMILA_COORDINATES, LatLng } from '../../utils/geo';

interface Props {
  activeOrder?: Order | null;
  onOpenMapModal?: (order: Order) => void;
  onBookParcel?: () => void;
  onSimulateStep?: (orderId: string) => void;
  onOpenChat?: (order: Order) => void;
  language?: 'en' | 'so' | 'am';
}

export function DeliveryRouteMapBanner({
  activeOrder,
  onOpenMapModal,
  onBookParcel,
  onSimulateStep,
  onOpenChat,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const demoSandboxEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_SANDBOX === 'true';

  useEffect(() => {
    if (!activeOrder?.riderLocationUpdatedAt) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(interval);
  }, [activeOrder?.riderLocationUpdatedAt]);

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
    customerName: 'Demo Customer',
    customerPhone: '',
    customerCity: 'Jijiga',
    customerPlusCode: '8F2P+5H Jijiga',
    customerAddress: 'Sample address, Jijiga',
    customerCoordinates: DEFAULT_CUSTOMER_COORDINATES,
    mamilaCoordinates: MAMILA_COORDINATES.m1,
    riderName: 'Active Fleet Courier',
    distanceKm: 2.4,
    etaMinutes: 7,
    runnerTagId: 'TAG-SEAL-99820',
    createdAt: new Date(),
  } : null as unknown as Order);

  if (!activeOrder && !demoSandboxEnabled) return null;

  const isRealOrder = !!activeOrder;
  const gpsUpdatedAt = activeOrder?.riderLocationUpdatedAt ? Date.parse(activeOrder.riderLocationUpdatedAt) : Number.NaN;
  const hasLiveGps = Boolean(
    activeOrder?.riderId &&
    activeOrder.riderCoordinates &&
    Number.isFinite(gpsUpdatedAt) &&
    nowMs >= gpsUpdatedAt &&
    nowMs - gpsUpdatedAt <= 60000
  );
  const hasStaleGps = Boolean(activeOrder?.riderCoordinates && !hasLiveGps);
  const hasAssignedCourier = Boolean(activeOrder?.riderId || activeOrder?.runnerId);

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-500/30 shadow-md overflow-hidden transition-all">
      {/* Top Banner Header Contract */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 p-4 md:p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${hasLiveGps ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-500/20 text-slate-300 border-slate-500/40'}`}>
              <span className={`w-2 h-2 rounded-full ${hasLiveGps ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              {hasLiveGps ? 'GPS UPDATED WITHIN 60 SECONDS' : demoSandboxEnabled && !isRealOrder ? 'DEMO SANDBOX' : hasStaleGps ? 'GPS DATA STALE' : 'GPS UNAVAILABLE'}
            </span>
            <span className="text-[11px] font-mono text-blue-300">
              {isRealOrder ? `Order #${displayOrder.id}` : 'Fleet Patrol Demo'}
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-400" />
            Delivery Location & Dispatch Status
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            {hasLiveGps
              ? 'A rider GPS update was recorded within the last 60 seconds. Turn-by-turn routing and ETA are not connected.'
              : demoSandboxEnabled && !isRealOrder
                ? 'Illustrative sample only. No real driver, GPS telemetry, route distance or ETA is represented.'
                : hasStaleGps
                  ? 'A prior coordinate exists but is stale or missing a valid timestamp. Current rider location is unavailable.'
                  : 'No verified rider GPS coordinate is available for this order yet. A driver is not considered assigned until the order records an authorized assignment.'}
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {demoSandboxEnabled && onSimulateStep && (
            <button
              onClick={() => onSimulateStep(displayOrder.id)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Demo Sandbox only: simulate a sample order"
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
          {/* Only display values backed by the actual order document. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assigned Courier</span>
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1 truncate">
                <Bike className="w-4 h-4 text-blue-600 flex-shrink-0" />
                {displayOrder.riderId
                  ? (displayOrder.riderName || 'Assigned rider')
                  : displayOrder.runnerId
                    ? (displayOrder.runnerName || 'Assigned runner')
                    : demoSandboxEnabled && !isRealOrder ? 'Demo sample only' : 'No courier assigned'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {hasAssignedCourier ? 'Assignment ID recorded' : 'Waiting for authorized dispatch'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">GPS Status</span>
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-blue-600" />
                {hasLiveGps ? 'Coordinates recorded' : 'Unavailable'}
              </span>
              <span className="text-[10px] text-slate-500 block">Coordinates are current only when the last GPS timestamp is under 60 seconds old</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Route Distance / ETA</span>
              <span className="font-mono font-bold text-slate-900 text-sm block">Unavailable</span>
              <span className="text-[10px] text-slate-500 block">Verified routing is not connected</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Handover Tag</span>
              <span className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                {displayOrder.runnerTagId || 'Not recorded'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {displayOrder.runnerTagId ? 'Recorded reference; integrity not implied' : 'No tag reference recorded'}
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
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="font-bold text-slate-800">
                {displayOrder.customerCity || 'City unavailable'}: {displayOrder.customerAddress || 'Delivery address not recorded'}
              </span>
            </div>
          </div>

          {/* Bottom Action Footer with Secondary Text Prompt */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs" title="A verified courier phone number is not stored in the order record">
                <Phone className="w-3.5 h-3.5" />
                <span>Courier phone unavailable</span>
              </span>

              <button
                disabled={!hasAssignedCourier}
                onClick={() => { if (hasAssignedCourier) onOpenChat?.(displayOrder); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition cursor-pointer border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
