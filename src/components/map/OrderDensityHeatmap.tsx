import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Map, 
  useMap, 
  useMapsLibrary,
  useApiLoadingStatus, 
  APILoadingStatus 
} from '@vis.gl/react-google-maps';
import { Order } from '../../types';
import { 
  CITY_COORDINATES, 
  LatLng 
} from '../../utils/geo';
import { MapErrorBoundary } from './MapErrorBoundary';
import { getGoogleMapsMapId } from '../../services/mapsConfig';
import { 
  Flame, 
  Activity, 
  TrendingUp, 
  Eye, 
  EyeOff,
  Sparkles
} from 'lucide-react';

export interface HotspotPoint extends LatLng {
  weight: number;
  label?: string;
  category?: 'order_pickup' | 'order_delivery';
}

interface OrderDensityHeatmapProps {
  orders: Order[];
  portalRole?: 'ADMIN' | 'RUNNER';
  heightClass?: string;
  defaultRadius?: number;
  showControls?: boolean;
  className?: string;
}

/**
 * Native Google Maps Heatmap Layer sub-component
 * Uses the official google.maps.visualization.HeatmapLayer
 */
function GoogleMapsHeatmapLayer({
  points,
  radius,
  opacity,
  maxIntensity,
  visible
}: {
  points: HotspotPoint[];
  radius: number;
  opacity: number;
  maxIntensity: number;
  visible: boolean;
}) {
  const map = useMap();
  const visualization = useMapsLibrary('visualization');
  const heatmapRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !visualization) return;

    try {
      const data = points.map(pt => ({
        location: new google.maps.LatLng(pt.lat, pt.lng),
        weight: pt.weight || 1
      }));

      // High-visibility gradient tuned for urban density and logistics dispatching
      const gradient = [
        'rgba(16, 185, 129, 0)',
        'rgba(16, 185, 129, 0.4)',
        'rgba(59, 130, 246, 0.65)',
        'rgba(139, 92, 246, 0.75)',
        'rgba(245, 158, 11, 0.85)',
        'rgba(239, 68, 68, 0.95)'
      ];

      const HeatmapCtor = (visualization as any).HeatmapLayer;
      if (!HeatmapCtor) return;

      if (!heatmapRef.current) {
        heatmapRef.current = new HeatmapCtor({
          data,
          map: visible ? map : null,
          radius,
          opacity,
          maxIntensity,
          dissipating: true,
          gradient
        });
      } else {
        heatmapRef.current.setData?.(data);
        heatmapRef.current.setOptions?.({
          radius,
          opacity,
          maxIntensity,
          gradient
        });
        heatmapRef.current.setMap?.(visible ? map : null);
      }
    } catch (err) {
      console.warn('Google Maps HeatmapLayer initialization notice:', err);
    }

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap?.(null);
        heatmapRef.current = null;
      }
    };
  }, [map, visualization, points, radius, opacity, maxIntensity, visible]);

  return null;
}

/**
 * Beautiful SVG/Canvas simulation fallback when offline, demo, or if Google Maps WebGL is unavailable
 */
function VectorHeatmapFallback({
  points,
  radius,
  opacity,
  visible,
  heightClass = 'h-[420px]'
}: {
  points: HotspotPoint[];
  radius: number;
  opacity: number;
  visible: boolean;
  heightClass?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Jijiga coordinate bounding box
  const minLat = 9.330;
  const maxLat = 9.375;
  const minLng = 42.780;
  const maxLng = 42.825;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw street grid backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw simulated street grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Render radial gradient heat blobs
    points.forEach(pt => {
      const px = ((pt.lng - minLng) / (maxLng - minLng)) * width;
      const py = (1 - (pt.lat - minLat) / (maxLat - minLat)) * height;
      const r = Math.max(25, radius * 1.5 * (pt.weight || 1));

      const radGrad = ctx.createRadialGradient(px, py, 0, px, py, r);
      radGrad.addColorStop(0, `rgba(239, 68, 68, ${opacity * 0.9})`);
      radGrad.addColorStop(0.3, `rgba(245, 158, 11, ${opacity * 0.7})`);
      radGrad.addColorStop(0.6, `rgba(59, 130, 246, ${opacity * 0.4})`);
      radGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Label landmarks
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    points.filter(p => p.label).forEach(pt => {
      const px = ((pt.lng - minLng) / (maxLng - minLng)) * width;
      const py = (1 - (pt.lat - minLat) / (maxLat - minLat)) * height;
      ctx.fillText(pt.label!, px + 8, py - 4);
    });
  }, [points, radius, opacity, visible]);

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-700 shadow-inner bg-slate-900`}>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={450} 
        className="w-full h-full object-cover" 
      />
      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Illustrative map grid · loaded order coordinates only</span>
      </div>
    </div>
  );
}

export function OrderDensityHeatmap({
  orders,
  portalRole = 'ADMIN',
  heightClass = 'h-[440px]',
  defaultRadius = 32,
  showControls = true,
  className = ''
}: OrderDensityHeatmapProps) {
  const loadingStatus = useApiLoadingStatus();
  const isApiReady = loadingStatus === APILoadingStatus.LOADED;

  const [isHeatmapVisible, setIsHeatmapVisible] = useState(true);
  const [radius, setRadius] = useState(defaultRadius);
  const [opacity, setOpacity] = useState(0.8);
  const [maxIntensity, setMaxIntensity] = useState(4);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED'>('ALL');

  // Filter orders according to selection
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ACTIVE') {
      return orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED');
    }
    if (statusFilter === 'DELIVERED') {
      return orders.filter(o => o.status === 'DELIVERED' || o.status === 'RATED');
    }
    return orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED');
  }, [orders, statusFilter]);

  // Plot only coordinates actually stored on loaded order records. Never substitute
  // fixed city hubs or default coordinates, which would manufacture demand hotspots.
  const heatmapPoints = useMemo<HotspotPoint[]>(() => {
    const points: HotspotPoint[] = [];

    // Recorded pickup coordinates
    filteredOrders.forEach(order => {
      const pickup = order.mamilaCoordinates;
      if (pickup && typeof pickup.lat === 'number' && typeof pickup.lng === 'number') {
        points.push({
          lat: pickup.lat,
          lng: pickup.lng,
          weight: 1,
          label: `${order.mamilaName} (${order.batchName})`,
          category: 'order_pickup'
        });
      }

      // Add a destination only when the customer explicitly saved coordinates.
      const dest = order.customerCoordinates;
      if (dest && typeof dest.lat === 'number' && typeof dest.lng === 'number') {
        points.push({
          lat: dest.lat,
          lng: dest.lng,
          weight: 1,
          label: `Delivery location (${order.customerCity || 'Jijiga'})`,
          category: 'order_delivery'
        });
      }
    });

    return points;
  }, [filteredOrders]);

  const topSector = heatmapPoints.length > 0
    ? 'Recorded order locations'
    : 'No verified order coordinates';

  const centerCoordinates = useMemo(() => {
    return CITY_COORDINATES.Jijiga || { lat: 9.3547, lng: 42.7955 };
  }, []);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Flame className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-base md:text-lg tracking-tight">
              {portalRole === 'ADMIN' ? 'Recorded Order Location Density' : 'Recorded Order Locations'}
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Order Locations
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {portalRole === 'ADMIN' 
              ? 'Heatmap from coordinates stored on the currently loaded orders only. Unrecorded locations are excluded; this is not a demand forecast.'
              : 'Shows only recorded order coordinates from the currently loaded records. Static demand estimates and simulated locations are excluded.'}
          </p>
        </div>

        {/* Quick stat chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">Recorded points:</span>
            <span className="font-bold font-mono text-white">{heatmapPoints.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300">Data scope:</span>
            <span className="font-semibold text-white">{topSector}</span>
          </div>
        </div>
      </div>

      {/* Control bar */}
      {showControls && (
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Heatmap Visibility Toggle */}
            <button
              type="button"
              onClick={() => setIsHeatmapVisible(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 duration-150 ${
                isHeatmapVisible 
                  ? 'bg-amber-500 text-slate-950 border border-amber-600' 
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              {isHeatmapVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{isHeatmapVisible ? 'Heatmap Active' : 'Heatmap Paused'}</span>
            </button>

            {/* Status filter selector */}
            <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer active:scale-95 ${
                  statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Orders ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer active:scale-95 ${
                  statusFilter === 'ACTIVE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Open Orders
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('DELIVERED')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer active:scale-95 ${
                  statusFilter === 'DELIVERED' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Delivered
              </button>
            </div>
          </div>

          {/* Interactive Density Tuning Controls */}
          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Radius:</span>
              <input 
                type="range" 
                min={15} 
                max={55} 
                value={radius} 
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-20 accent-amber-600 cursor-pointer"
                title={`Heatmap Radius: ${radius}px`}
              />
              <span className="font-mono w-6 text-slate-800 font-bold">{radius}px</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Intensity:</span>
              <input 
                type="range" 
                min={1} 
                max={6} 
                step={0.5}
                value={maxIntensity} 
                onChange={(e) => setMaxIntensity(Number(e.target.value))}
                className="w-16 accent-red-600 cursor-pointer"
                title={`Max Intensity: ${maxIntensity}`}
              />
              <span className="font-mono w-6 text-slate-800 font-bold">{maxIntensity}x</span>
            </div>
          </div>
        </div>
      )}

      {/* Map Rendering Container */}
      <div className={`relative w-full ${heightClass}`}>
        <MapErrorBoundary fallback={<VectorHeatmapFallback points={heatmapPoints} radius={radius} opacity={opacity} visible={isHeatmapVisible} heightClass={heightClass} />}>
          {!isApiReady ? (
            <VectorHeatmapFallback 
              points={heatmapPoints} 
              radius={radius} 
              opacity={opacity} 
              visible={isHeatmapVisible} 
              heightClass={heightClass} 
            />
          ) : (
            <Map
              defaultCenter={centerCoordinates}
              defaultZoom={13}
              mapId={getGoogleMapsMapId()}
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="w-full h-full"
            >
              {/* Native Google Maps Heatmap Layer */}
              <GoogleMapsHeatmapLayer
                points={heatmapPoints}
                radius={radius}
                opacity={opacity}
                maxIntensity={maxIntensity}
                visible={isHeatmapVisible}
              />

            </Map>
          )}
        </MapErrorBoundary>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200/90 shadow-md text-[11px] text-slate-700 space-y-1.5 max-w-xs pointer-events-auto">
          <div className="flex items-center justify-between font-bold text-slate-900 text-[11px]">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-500" />
              Density Gradient
            </span>
            <span className="font-mono text-[10px] text-slate-500">{heatmapPoints.length} points</span>
          </div>
          
          <div className="w-full h-2 rounded-full bg-linear-to-r from-emerald-500 via-blue-500 via-purple-500 via-amber-500 to-red-600" />
          
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>Lower density</span>
            <span>Medium density</span>
            <span>Higher overlap</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDensityHeatmap;
