import { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Package, 
  Store, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Car, 
  Leaf, 
  Layers,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { Order, Batch, ServiceType } from '../../types';
import { calculateCollectedOrderValue } from '../../utils/accounting';

interface AdminDashboardProps {
  orders: Order[];
  inventory?: Batch[];
  className?: string;
}

type DashboardMetricView = 'trend' | 'service' | 'merchant' | 'status';

const SERVICE_CONFIG: Record<ServiceType, { label: string; color: string; icon: any }> = {
  FOOD: { label: 'Food Batches', color: '#10b981', icon: Package },
  KHAT: { label: 'Fresh Khat', color: '#059669', icon: Leaf },
  PARCEL: { label: 'Express Parcel', color: '#3b82f6', icon: Layers },
  RIDE: { label: 'Taxi & Moto', color: '#f59e0b', icon: Car },
  EEU_RECHARGE: { label: 'EEU Electricity', color: '#8b5cf6', icon: Zap },
};

const MAMILA_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#84cc16'];

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function AdminDashboard({ orders, inventory = [], className = '' }: AdminDashboardProps) {
  const [metricView, setMetricView] = useState<DashboardMetricView>('trend');
  const [selectedService, setSelectedService] = useState<string>('ALL');

  // Derive merchant IDs and display names from the actual order records, not bundled examples.
  const mamilaSeries = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const order of orders) {
      if (!order.mamilaId) continue;
      const previous = counts.get(order.mamilaId);
      counts.set(order.mamilaId, {
        name: order.mamilaName || order.mamilaId,
        count: (previous?.count || 0) + 1,
      });
    }
    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name))
      .slice(0, MAMILA_COLORS.length)
      .map(([id, value], index) => ({
        id,
        name: value.name,
        dataKey: `mamila_${id}`,
        color: MAMILA_COLORS[index],
      }));
  }, [orders]);


  // Generate 7-day chronological historical timeline (D-6 to D-0)
  const daysData = useMemo(() => {
    const now = new Date();
    const list = [];

    for (let i = 6; i >= 0; i--) {
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
      const isToday = i === 0;

      const fullLabel = isToday
        ? 'Today'
        : target.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const axisLabel = isToday
        ? 'Today'
        : target.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

      // Match orders created on target calendar day
      const dayOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return isSameDay(orderDate, target);
      });

      const validOrders = dayOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED');

      // Breakdown by service type
      const foodCount = validOrders.filter(o => o.serviceType === 'FOOD').length;
      const khatCount = validOrders.filter(o => o.serviceType === 'KHAT').length;
      const parcelCount = validOrders.filter(o => o.serviceType === 'PARCEL').length;
      const rideCount = validOrders.filter(o => o.serviceType === 'RIDE').length;
      const eeuCount = validOrders.filter(o => o.serviceType === 'EEU_RECHARGE').length;

      // Breakdown by status
      const deliveredCount = dayOrders.filter(o => o.status === 'DELIVERED' || o.status === 'RATED').length;
      const activeCount = dayOrders.filter(o => 
        o.status === 'PENDING' || 
        o.status === 'RUNNER_ASSIGNED' || 
        o.status === 'VERIFIED_READY' || 
        o.status === 'READY_FOR_RIDER' || 
        o.status === 'RIDER_ACCEPTED' || 
        o.status === 'IN_TRANSIT' || 
        o.status === 'PICKED_UP'
      ).length;
      const cancelledCount = dayOrders.filter(o => o.status === 'CANCELLED' || o.status === 'DEFECT_REJECTED').length;

      // Breakdown by Mamila
      const mamilaCounts: Record<string, number> = {};
      mamilaSeries.forEach(m => {
        mamilaCounts[m.dataKey] = validOrders.filter(order => order.mamilaId === m.id).length;
      });

      const dayCollectedOrderValue = validOrders.reduce((sum, order) => sum + calculateCollectedOrderValue(order), 0);

      list.push({
        dateStr: target.toISOString().split('T')[0],
        dayLabel: fullLabel,
        axisLabel,
        isToday,
        totalOrders: validOrders.length,
        grossOrders: dayOrders.length,
        delivered: deliveredCount,
        inTransit: activeCount,
        cancelled: cancelledCount,
        collectedOrderValue: dayCollectedOrderValue,
        Food: foodCount,
        Khat: khatCount,
        Parcel: parcelCount,
        Ride: rideCount,
        EEU: eeuCount,
        ...mamilaCounts,
      });
    }

    return list;
  }, [orders, mamilaSeries]);

  // Executive 7-day KPIs
  const kpis = useMemo(() => {
    const total7Days = daysData.reduce((sum, d) => sum + d.totalOrders, 0);
    const delivered7Days = daysData.reduce((sum, d) => sum + d.delivered, 0);
    const collectedOrderValue7Days = daysData.reduce((sum, d) => sum + d.collectedOrderValue, 0);
    const dailyAvg = (total7Days / 7).toFixed(1);

    // Peak day
    let peakDay = daysData[0];
    for (const d of daysData) {
      if (d.totalOrders > peakDay.totalOrders) {
        peakDay = d;
      }
    }

    const completionRate = total7Days > 0 ? Math.round((delivered7Days / total7Days) * 100) : 0;

    return {
      total7Days,
      delivered7Days,
      collectedOrderValue7Days,
      dailyAvg,
      peakDayLabel: peakDay.dayLabel,
      peakDayCount: peakDay.totalOrders,
      completionRate,
    };
  }, [daysData]);

  // Top services in this period
  const serviceDistribution = useMemo(() => {
    const counts: Record<ServiceType, number> = {
      FOOD: 0,
      KHAT: 0,
      PARCEL: 0,
      RIDE: 0,
      EEU_RECHARGE: 0,
    };

    daysData.forEach(d => {
      counts.FOOD += d.Food;
      counts.KHAT += d.Khat;
      counts.PARCEL += d.Parcel;
      counts.RIDE += d.Ride;
      counts.EEU_RECHARGE += d.EEU;
    });

    return Object.entries(counts).map(([type, count]) => ({
      type: type as ServiceType,
      label: SERVICE_CONFIG[type as ServiceType].label,
      color: SERVICE_CONFIG[type as ServiceType].color,
      count,
      pct: kpis.total7Days > 0 ? Math.round((count / kpis.total7Days) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [daysData, kpis.total7Days]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">7-Day Total Orders</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
              {kpis.total7Days}
            </p>
            <span className="text-xs text-slate-500 font-medium">orders</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-emerald-600">Avg {kpis.dailyAvg}</span> per day
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Fulfillment Rate</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 tabular-nums">
              {kpis.completionRate}%
            </p>
            <span className="text-xs text-slate-500 font-medium">delivered</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {kpis.delivered7Days} successfully completed
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Peak Daily Volume</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
              {kpis.peakDayCount}
            </p>
            <span className="text-xs text-slate-500 font-medium">peak</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate" title={kpis.peakDayLabel}>
            on {kpis.peakDayLabel}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">7-Day Collected Order Value</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
              {kpis.collectedOrderValue7Days.toLocaleString()}
            </p>
            <span className="text-xs font-bold text-slate-600">ETB</span>
          </div>
          <p className="text-[11px] text-purple-600 font-medium mt-1">
            Excludes unpaid/refunded orders and EEU electricity principal; not platform profit.
          </p>
        </div>
      </div>

      {/* Main Interactive Recharts Visualization Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
        {/* Header & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Order Volume Trends (Last 7 Days)
                </h3>
                <p className="text-xs text-slate-500">
                  Daily velocity, dispatch distribution, and fulfillment trajectory in Jijiga
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setMetricView('trend')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                metricView === 'trend'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Volume Curve
            </button>
            <button
              onClick={() => setMetricView('service')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                metricView === 'service'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Service
            </button>
            <button
              onClick={() => setMetricView('merchant')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                metricView === 'merchant'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Merchant
            </button>
            <button
              onClick={() => setMetricView('status')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                metricView === 'status'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fulfillment
            </button>
          </div>
        </div>

        {/* Chart View Rendering */}
        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            {metricView === 'trend' ? (
              <AreaChart data={daysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="orderVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="axisLabel" 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<VolumeCustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="totalOrders" 
                  name="Total Orders"
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#orderVolumeGrad)" 
                  activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : metricView === 'service' ? (
              <BarChart data={daysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="axisLabel" 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ServiceCustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Food" stackId="service" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Khat" stackId="service" fill="#059669" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Parcel" stackId="service" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Ride" stackId="service" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="EEU" stackId="service" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : metricView === 'merchant' ? (
              <BarChart data={daysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="axisLabel" 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<MerchantCustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {mamilaSeries.map((mamila) => (
                  <Bar
                    key={mamila.id}
                    dataKey={mamila.dataKey}
                    name={mamila.name}
                    fill={mamila.color}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : (
              <BarChart data={daysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="axisLabel" 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<StatusCustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="delivered" name="Delivered / Rated" fill="#10b981" stackId="st" radius={[0, 0, 0, 0]} />
                <Bar dataKey="inTransit" name="In Transit / Courier" fill="#3b82f6" stackId="st" radius={[0, 0, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#f43f5e" stackId="st" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Service Type 7-Day Performance Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          {serviceDistribution.map(svc => {
            const Icon = SERVICE_CONFIG[svc.type].icon;
            return (
              <div 
                key={svc.type} 
                className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[11px] font-semibold text-slate-600 truncate">{svc.label}</span>
                  <div 
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" 
                    style={{ backgroundColor: `${svc.color}15`, color: svc.color }}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base sm:text-lg font-bold font-mono text-slate-900">{svc.count}</span>
                    <span className="text-[10px] font-mono text-slate-500">{svc.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${svc.pct}%`, backgroundColor: svc.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Custom Tooltip Components
function VolumeCustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[200px]">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
          <span className="font-bold text-slate-200">{data.dayLabel}</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-mono text-[10px] font-bold">
            {data.totalOrders} Orders
          </span>
        </div>
        <div className="space-y-1 text-slate-300">
          <div className="flex justify-between">
            <span>Delivered:</span>
            <span className="font-mono text-emerald-400 font-bold">{data.delivered}</span>
          </div>
          <div className="flex justify-between">
            <span>In-Transit / Courier:</span>
            <span className="font-mono text-blue-400 font-bold">{data.inTransit}</span>
          </div>
          <div className="flex justify-between">
            <span>Cancelled:</span>
            <span className="font-mono text-rose-400 font-bold">{data.cancelled}</span>
          </div>
          {data.collectedOrderValue > 0 && (
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-slate-400 font-medium">
              <span>Day Collected Order Value:</span>
              <span className="font-mono text-white font-bold">{data.collectedOrderValue.toLocaleString()} ETB</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

function ServiceCustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[210px]">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
          <span className="font-bold text-slate-200">{data.dayLabel}</span>
          <span className="font-mono text-[10px] text-slate-400">{data.totalOrders} total</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-white tabular-nums">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function MerchantCustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[220px]">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
          <span className="font-bold text-slate-200">{data.dayLabel}</span>
          <span className="font-mono text-[10px] text-slate-400">Merchant breakdown</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-slate-300 truncate max-w-[140px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="truncate">{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-white tabular-nums">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function StatusCustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[210px]">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
          <span className="font-bold text-slate-200">{data.dayLabel}</span>
          <span className="font-mono text-[10px] text-slate-400">{data.grossOrders} total entries</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-white tabular-nums">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
