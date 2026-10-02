import { useState, useMemo, useEffect } from 'react';
import { Order, Batch, AppUserProfile } from '../types';
import { MAMILAS, CITIES } from '../data';
import { OrderSearchFilterBar, OrderFilterState } from '../components/orders/OrderSearchFilterBar';
import { extractAvailableCities, applyOrderFilters } from '../utils/orderFilterUtils';
import { WhatsAppDispatchModal } from '../components/communication/WhatsAppDispatchModal';
import { fetchEligibleStaff } from '../services/dispatchService';
import { 
  Activity, 
  Package, 
  DollarSign, 
  Users, 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Store, 
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Star,
  CheckCircle,
  RotateCcw,
  MapPin,
  MessageSquare,
  MessageCircle,
  Search,
  Wallet,
  Truck,
  Map as MapIcon,
  UserCheck,
  Edit3,
  X,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

interface Props {
  orders: Order[];
  inventory: Batch[];
  onResolveDispute?: (orderId: string, status: 'RESOLVED' | 'REFUNDED', resolutionNote?: string) => void;
  onOpenMapPreview?: (order: Order) => void;
  onReassignOrder?: (orderId: string, assignment: { runnerId?: string; runnerName?: string; riderId?: string; riderName?: string; status?: Order['status'] }) => Promise<void>;
}

type ChartViewMode = 'grouped' | 'stacked' | 'totals';

const MAMILA_CONFIG: Record<string, { name: string; color: string; fill: string; lightBg: string }> = {
  m1: {
    name: 'Fresh Morning Farms',
    color: '#10b981',
    fill: '#10b981',
    lightBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  m2: {
    name: 'Arada Bakery',
    color: '#f59e0b',
    fill: '#f59e0b',
    lightBg: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  m3: {
    name: 'Sheger Dairy',
    color: '#6366f1',
    fill: '#6366f1',
    lightBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }
};

function isSameCalendarDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: any;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    const totalDayOrders = (dataItem['Fresh Morning Farms'] || 0) + 
                           (dataItem['Arada Bakery'] || 0) + 
                           (dataItem['Sheger Dairy'] || 0);

    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[220px]">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
          <span className="font-semibold text-slate-200 text-sm">{dataItem.dayLabel}</span>
          <span className="bg-slate-800 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded-full font-medium">
            {totalDayOrders} total
          </span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={`tooltip-item-${index}`} className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="truncate max-w-[120px]">{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-white ml-2 tabular-nums">{entry.value} orders</span>
            </div>
          ))}
        </div>
        {dataItem.totalRevenue > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px] text-slate-400">
            <span>Day Revenue:</span>
            <span className="font-mono font-semibold text-emerald-400 tabular-nums">{dataItem.totalRevenue.toLocaleString()} ETB</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const TotalsTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[190px]">
        <div className="font-semibold text-sm mb-1 text-slate-100">{item.name}</div>
        <div className="text-slate-400 text-[11px] mb-2">{item.location}</div>
        <div className="flex justify-between items-center py-1 border-t border-slate-800">
          <span className="text-slate-300">7-Day Orders:</span>
          <span className="font-mono font-bold text-white tabular-nums">{item.totalOrders} orders</span>
        </div>
        <div className="flex justify-between items-center py-1 border-t border-slate-800">
          <span className="text-slate-300">Total Revenue:</span>
          <span className="font-mono font-bold text-emerald-400 tabular-nums">{item.totalRevenue.toLocaleString()} ETB</span>
        </div>
        <div className="flex justify-between items-center py-1 border-t border-slate-800">
          <span className="text-slate-300">Daily Average:</span>
          <span className="font-mono font-semibold text-slate-200 tabular-nums">{item.avgPerDay} / day</span>
        </div>
      </div>
    );
  }
  return null;
};

export function AdminView({ orders, inventory, onResolveDispute, onOpenMapPreview, onReassignOrder }: Props) {
  const [viewMode, setChartViewMode] = useState<ChartViewMode>('grouped');
  const [orderFilters, setOrderFilters] = useState<OrderFilterState>({
    searchQuery: '',
    status: 'ALL',
    city: 'ALL',
    startDate: '',
    endDate: '',
  });
  const [whatsAppDispatchOrder, setWhatsAppDispatchOrder] = useState<Order | null>(null);
  const [visibleMamilas, setVisibleMamilas] = useState<Record<string, boolean>>({
    m1: true,
    m2: true,
    m3: true,
  });

  // Dynamic courier staffing & reassignment
  const [reassignOrder, setReassignOrder] = useState<Order | null>(null);
  const [availableRunners, setAvailableRunners] = useState<AppUserProfile[]>([]);
  const [availableRiders, setAvailableRiders] = useState<AppUserProfile[]>([]);
  const [selectedRunnerUid, setSelectedRunnerUid] = useState<string>('');
  const [selectedRiderUid, setSelectedRiderUid] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  useEffect(() => {
    fetchEligibleStaff('runner').then(setAvailableRunners).catch(console.warn);
    fetchEligibleStaff('rider').then(setAvailableRiders).catch(console.warn);
  }, []);

  const openReassign = (order: Order) => {
    setReassignOrder(order);
    setSelectedRunnerUid(order.runnerId || '');
    setSelectedRiderUid(order.riderId || '');
  };

  const submitReassign = async () => {
    if (!reassignOrder || !onReassignOrder) return;
    setIsReassigning(true);
    const chosenRunner = availableRunners.find(r => r.uid === selectedRunnerUid);
    const chosenRider = availableRiders.find(r => r.uid === selectedRiderUid);

    await onReassignOrder(reassignOrder.id, {
      runnerId: selectedRunnerUid || undefined,
      runnerName: chosenRunner?.displayName || (selectedRunnerUid ? 'Staff Runner' : undefined),
      riderId: selectedRiderUid || undefined,
      riderName: chosenRider?.displayName || (selectedRiderUid ? 'Staff Rider' : undefined),
      status: selectedRiderUid ? 'RIDER_ACCEPTED' : selectedRunnerUid ? 'RUNNER_ASSIGNED' : reassignOrder.status
    });

    setIsReassigning(false);
    setReassignOrder(null);
  };

  const availableCities = useMemo(() => extractAvailableCities(orders), [orders]);

  const handleResetFilters = () => {
    setOrderFilters({
      searchQuery: '',
      status: 'ALL',
      city: 'ALL',
      startDate: '',
      endDate: '',
    });
  };

  const activeOrders = orders.filter(
    o => o.status !== 'DELIVERED' && o.status !== 'RATED' && o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED'
  );
  
  // Calculate today's revenue (excluding cancelled)
  const todayRevenue = orders
    .filter(o => isSameCalendarDay(new Date(o.createdAt), new Date()) && o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED')
    .reduce((sum, o) => sum + (o.totalPrice || o.price), 0);

  // Financial Ledger breakdown
  const grossPlatformGMV = orders
    .filter(o => o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED')
    .reduce((sum, o) => sum + (o.totalPrice || o.price), 0);
  
  const totalDeliveryFees = orders
    .filter(o => o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED')
    .reduce((sum, o) => sum + (o.deliveryFee || 150), 0);

  const mamilaPayouts = grossPlatformGMV - totalDeliveryFees;

  // 7-day chronological data array (Day -6 up to Day 0 / Today)
  const last7DaysData = useMemo(() => {
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);

      const isToday = i === 0;
      const dayLabel = isToday
        ? 'Today'
        : targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const axisLabel = isToday
        ? 'Today'
        : targetDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

      const dayOrders = orders.filter(
        o => isSameCalendarDay(new Date(o.createdAt), targetDate) && o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED'
      );

      const m1Orders = dayOrders.filter(o => o.mamilaId === 'm1');
      const m2Orders = dayOrders.filter(o => o.mamilaId === 'm2');
      const m3Orders = dayOrders.filter(o => o.mamilaId === 'm3');

      const totalRevenue = dayOrders.reduce((sum, o) => sum + (o.totalPrice || o.price), 0);

      result.push({
        dateStr: targetDate.toISOString().split('T')[0],
        dayLabel,
        axisLabel,
        isToday,
        'Fresh Morning Farms': m1Orders.length,
        'Arada Bakery': m2Orders.length,
        'Sheger Dairy': m3Orders.length,
        totalOrders: dayOrders.length,
        totalRevenue,
      });
    }

    return result;
  }, [orders]);

  // Aggregate stats per Mamila for the 7-day period
  const mamila7DaySummary = useMemo(() => {
    const totalPlatformOrders7Days = last7DaysData.reduce((sum, day) => sum + day.totalOrders, 0);

    return MAMILAS.map(m => {
      const mamilaOrders = orders.filter(o => {
        if (o.mamilaId !== m.id || o.status === 'CANCELLED' || o.status === 'DEFECT_REJECTED') return false;
        const orderDate = new Date(o.createdAt);
        const diffDays = (new Date().getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7.2;
      });

      const totalOrders = mamilaOrders.length;
      const totalRevenue = mamilaOrders.reduce((sum, o) => sum + (o.totalPrice || o.price), 0);
      const avgPerDay = (totalOrders / 7).toFixed(1);
      const sharePercent = totalPlatformOrders7Days > 0 
        ? Math.round((totalOrders / totalPlatformOrders7Days) * 100) 
        : 0;

      return {
        id: m.id,
        name: m.name,
        location: m.location,
        totalOrders,
        totalRevenue,
        avgPerDay,
        sharePercent,
        rating: m.rating,
        color: MAMILA_CONFIG[m.id]?.color || '#3b82f6',
        lightBg: MAMILA_CONFIG[m.id]?.lightBg || 'bg-slate-100 text-slate-700',
      };
    });
  }, [orders, last7DaysData]);

  // Total 7-day orders count across all Mamilas
  const total7DayOrders = useMemo(() => {
    return last7DaysData.reduce((sum, day) => sum + day.totalOrders, 0);
  }, [last7DaysData]);

  // Top performing Mamila over the 7 days
  const topMamila = useMemo(() => {
    if (mamila7DaySummary.length === 0) return null;
    return [...mamila7DaySummary].sort((a, b) => b.totalOrders - a.totalOrders)[0];
  }, [mamila7DaySummary]);

  // Disputed orders
  const disputedOrders = useMemo(() => {
    return orders.filter(o => Boolean(o.dispute));
  }, [orders]);

  // Filtered dispatch orders
  const filteredDispatch = useMemo(() => {
    return applyOrderFilters(orders, orderFilters);
  }, [orders, orderFilters]);

  const toggleMamilaVisibility = (mamilaId: string) => {
    setVisibleMamilas(prev => ({
      ...prev,
      [mamilaId]: !prev[mamilaId],
    }));
  };

  return (
    <div className="space-y-8">
      {/* Platform Executive KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Activity className="w-5 h-5" /> 
            <span className="font-semibold text-sm">Active Orders</span>
          </div>
          <p className="text-3xl font-bold font-mono text-slate-900 tabular-nums">{activeOrders.length}</p>
          <span className="text-xs text-slate-500 mt-1 inline-block">In Runner verification or Rider transit</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <DollarSign className="w-5 h-5" /> 
            <span className="font-semibold text-sm">Today's Revenue</span>
          </div>
          <p className="text-3xl font-bold font-mono text-slate-900 tabular-nums">{todayRevenue.toLocaleString()} ETB</p>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">Direct mobile money & cash</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <Package className="w-5 h-5" /> 
            <span className="font-semibold text-sm">Batch Capacity</span>
          </div>
          <p className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
            {inventory.reduce((sum, b) => sum + b.available, 0)}
          </p>
          <span className="text-xs text-slate-500 mt-1 inline-block">Available slots across Mamilas</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 text-purple-600 mb-2">
            <Wallet className="w-5 h-5" /> 
            <span className="font-semibold text-sm">Platform GMV</span>
          </div>
          <p className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
            {grossPlatformGMV.toLocaleString()} ETB
          </p>
          <span className="text-xs text-purple-600 font-medium mt-1 inline-block">
            Disbursing {mamilaPayouts.toLocaleString()} ETB to Mamilas
          </span>
        </div>
      </div>

      {/* RECHARTS SECTION: 7-Day Order Volumes by Mamila */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xl text-slate-900">7-Day Order Volumes by Mamila</h3>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Comparative order volume velocity across verified Mamilas over the last 7 days.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setChartViewMode('grouped')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grouped
              </button>
              <button
                onClick={() => setChartViewMode('stacked')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'stacked'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Stacked
              </button>
              <button
                onClick={() => setChartViewMode('totals')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'totals'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mamila Totals
              </button>
            </div>
          </div>
        </div>

        {/* Mamila Filter Toggles */}
        {viewMode !== 'totals' && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mamilas:</span>
            {MAMILAS.map(m => {
              const cfg = MAMILA_CONFIG[m.id];
              const isVisible = visibleMamilas[m.id];
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMamilaVisibility(m.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    isVisible
                      ? 'bg-white border-slate-300 text-slate-900 shadow-2xs hover:bg-slate-50'
                      : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isVisible ? cfg.color : '#cbd5e1' }}
                  />
                  <span>{m.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Chart Rendering Area */}
        <div className="w-full h-80 pt-2">
          {viewMode === 'totals' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mamila7DaySummary}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<TotalsTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar 
                  dataKey="totalOrders" 
                  name="7-Day Orders" 
                  radius={[8, 8, 0, 0]}
                  barSize={48}
                >
                  {mamila7DaySummary.map((entry) => (
                    <Cell key={`cell-${entry.id}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={last7DaysData}
                margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="axisLabel" 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Legend 
                  wrapperStyle={{ paddingTop: '12px' }}
                  formatter={(value) => <span className="text-xs font-medium text-slate-700">{value}</span>}
                />

                {visibleMamilas.m1 && (
                  <Bar
                    dataKey="Fresh Morning Farms"
                    fill={MAMILA_CONFIG.m1.color}
                    stackId={viewMode === 'stacked' ? 'daily' : undefined}
                    radius={viewMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                )}
                {visibleMamilas.m2 && (
                  <Bar
                    dataKey="Arada Bakery"
                    fill={MAMILA_CONFIG.m2.color}
                    stackId={viewMode === 'stacked' ? 'daily' : undefined}
                    radius={viewMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                )}
                {visibleMamilas.m3 && (
                  <Bar
                    dataKey="Sheger Dairy"
                    fill={MAMILA_CONFIG.m3.color}
                    stackId={viewMode === 'stacked' ? 'daily' : undefined}
                    radius={viewMode === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 7-Day Performance Cards per Mamila */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {mamila7DaySummary.map(m => (
            <div 
              key={m.id} 
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                  <h4 className="font-bold text-slate-900 text-sm">{m.name}</h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.lightBg}`}>
                  {m.sharePercent}% share
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{m.location}</p>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-500 block">7-Day Orders:</span>
                  <span className="font-bold font-mono text-slate-900 text-sm tabular-nums">{m.totalOrders}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Avg Volume:</span>
                  <span className="font-bold font-mono text-slate-900 text-sm tabular-nums">{m.avgPerDay} / day</span>
                </div>
                <div className="col-span-2 pt-1">
                  <span className="text-slate-500 block">7-Day Revenue:</span>
                  <span className="font-bold font-mono text-emerald-600 tabular-nums">{m.totalRevenue.toLocaleString()} ETB</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DISPUTES & QUALITY RESOLUTION SECTION */}
      {disputedOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-rose-100 bg-rose-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <div>
                <h3 className="font-bold text-lg text-slate-900">Customer Dispute Resolution Queue</h3>
                <p className="text-xs text-slate-500">Customer claims regarding damaged packages, delays, or missing items.</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-rose-100 text-rose-800 rounded-full">
              {disputedOrders.filter(d => d.dispute?.status === 'PENDING').length} Action Required
            </span>
          </div>

          <div className="p-0 divide-y divide-slate-100">
            {disputedOrders.map(order => (
              <div key={order.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">#{order.id}</span>
                    <span className="font-semibold text-slate-800 text-sm">{order.customerName} ({order.customerCity || 'Jijiga'})</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-600">{order.batchName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                      Reason: {order.dispute?.reason}
                    </span>
                    <span className="text-xs text-slate-500">
                      Filed: {new Date(order.dispute?.filedAt || order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-200/60 max-w-xl">
                    "{order.dispute?.comment}"
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {order.dispute?.status === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => onResolveDispute?.(order.id, 'REFUNDED', '100% item refund approved and disbursed.')}
                        className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                      >
                        Refund {order.price} ETB
                      </button>
                      <button
                        onClick={() => onResolveDispute?.(order.id, 'RESOLVED', 'Contacted customer, resolved amicably.')}
                        className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      Status: {order.dispute?.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Order Search & Filter Control Bar */}
      <OrderSearchFilterBar
        filters={orderFilters}
        onFilterChange={(newF) => setOrderFilters(prev => ({ ...prev, ...newF }))}
        onReset={handleResetFilters}
        availableCities={availableCities}
        totalOrders={orders.length}
        filteredOrdersCount={filteredDispatch.length}
        title="Admin Central Dispatch Search & Filter"
      />

      {/* Bottom Data Tables: Dispatch and Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Live Orders Dispatch</h3>
              <p className="text-xs text-slate-500">All registered customer orders in platform</p>
            </div>
            
            <div className="flex items-center gap-2">
              {filteredDispatch.length > 0 && (
                <button
                  type="button"
                  onClick={() => setWhatsAppDispatchOrder(filteredDispatch[0])}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                  title="Open WhatsApp Dispatch Console"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Dispatch</span>
                </button>
              )}
              <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                {filteredDispatch.length} of {orders.length} displayed
              </span>
            </div>
          </div>
          <div className="p-0 max-h-96 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">ID / Time</th>
                  <th className="px-6 py-3">Details & Destination</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Couriers & Reassignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDispatch.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-slate-900 font-bold">{order.id}</div>
                      <div className="text-xs text-slate-500 mt-1 font-mono">
                        {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{order.batchName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">{order.customerCity || 'Jijiga'}</span> · {order.paymentMethod} · <span className="font-mono tabular-nums">{order.totalPrice || order.price} ETB</span>
                      </div>
                      {order.specialInstructions && (
                        <div className="text-[11px] text-amber-800 italic mt-0.5 line-clamp-1">
                          Note: "{order.specialInstructions}"
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'CANCELLED' || order.status === 'DEFECT_REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : order.status === 'DELIVERED' || order.status === 'RATED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : order.status === 'RUNNER_ASSIGNED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setWhatsAppDispatchOrder(order)}
                          title="Dispatch via WhatsApp"
                          className="p-1 rounded-md text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        {onOpenMapPreview && (
                          <button
                            onClick={() => onOpenMapPreview(order)}
                            title="Open Map Preview"
                            className="p-1 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <MapIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Runner:</span>
                          <span className={`font-semibold ${order.runnerId ? 'text-slate-900' : 'text-amber-600 italic'}`}>
                            {order.runnerName || (order.runnerId ? 'Staff Runner' : 'Unassigned')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Rider:</span>
                          <span className={`font-semibold ${order.riderId ? 'text-slate-900' : 'text-amber-600 italic'}`}>
                            {order.riderName || (order.riderId ? 'Staff Rider' : 'Unassigned')}
                          </span>
                        </div>
                        {onReassignOrder && (
                          <button
                            type="button"
                            onClick={() => openReassign(order)}
                            className="mt-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-blue-600" />
                            <span>Reassign Staff</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDispatch.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No orders match filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Live Inventory Status</h3>
              <p className="text-xs text-slate-500">Batch availability across Mamilas</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 font-mono tabular-nums">
              {inventory.reduce((sum, b) => sum + b.available, 0)} units available
            </span>
          </div>
          <div className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-3">Batch / Mamila</th>
                  <th className="px-6 py-3">Available</th>
                  <th className="px-6 py-3">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map(batch => {
                  const mamila = MAMILAS.find(m => m.id === batch.mamilaId);
                  const cfg = MAMILA_CONFIG[batch.mamilaId];
                  return (
                    <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{batch.name}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg?.color || '#94a3b8' }} />
                          <span>{mamila?.name || batch.mamilaId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold font-mono tabular-nums ${batch.available <= 5 ? 'text-amber-600' : 'text-slate-900'}`}>
                          {batch.available}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">bundles</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 font-mono tabular-nums">{batch.price} ETB</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* WhatsApp Dispatch Modal */}
      <WhatsAppDispatchModal
        isOpen={Boolean(whatsAppDispatchOrder)}
        onClose={() => setWhatsAppDispatchOrder(null)}
        order={whatsAppDispatchOrder}
      />

      {/* Dynamic Courier Reassignment Modal */}
      {reassignOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Reassign Order Couriers</h3>
              </div>
              <button 
                onClick={() => setReassignOrder(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-900">{reassignOrder.batchName}</p>
              <p className="font-mono text-slate-500">Order #{reassignOrder.id} · {reassignOrder.customerCity || 'Jijiga'}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Runner (Packaging & Verification)
                </label>
                <select
                  value={selectedRunnerUid}
                  onChange={(e) => setSelectedRunnerUid(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">-- No Runner Assigned (Open Pool) --</option>
                  {availableRunners.map(runner => (
                    <option key={runner.uid} value={runner.uid}>
                      {runner.displayName || runner.email} ({runner.phone || 'Active Runner'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Rider (Doorstep Transit)
                </label>
                <select
                  value={selectedRiderUid}
                  onChange={(e) => setSelectedRiderUid(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">-- No Rider Assigned (Open Pool) --</option>
                  {availableRiders.map(rider => (
                    <option key={rider.uid} value={rider.uid}>
                      {rider.displayName || rider.email} ({rider.phone || 'Active Rider'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassignOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReassigning}
                onClick={submitReassign}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isReassigning ? 'Reassigning...' : 'Save Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
