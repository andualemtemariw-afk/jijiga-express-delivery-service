import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Order, Batch, AppUserProfile } from '../types';
import { MAMILAS, CITIES } from '../data';
import { OrderSearchFilterBar, OrderFilterState } from '../components/orders/OrderSearchFilterBar';
import { extractAvailableCities, applyOrderFilters } from '../utils/orderFilterUtils';
import { WhatsAppDispatchModal } from '../components/communication/WhatsAppDispatchModal';
import { fetchEligibleStaff } from '../services/dispatchService';
import { calculatePlatformTotals, calculateOrderRevenue } from '../utils/revenueAccounting';
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
  Check,
  Receipt
} from 'lucide-react';
import { OrderDensityHeatmap } from '../components/map/OrderDensityHeatmap';

const AdminDashboard = lazy(() => import('../components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

interface Props {
  orders: Order[];
  inventory: Batch[];
  onResolveDispute?: (orderId: string, status: 'RESOLVED' | 'REFUNDED', resolutionNote?: string) => void;
  onOpenMapPreview?: (order: Order) => void;
  onReassignOrder?: (orderId: string, assignment: { runnerId?: string; runnerName?: string; riderId?: string; riderName?: string; status?: Order['status'] }) => Promise<void>;
  onConfirmPayment?: (orderId: string, receiptReference: string) => Promise<void>;
}

function isSameCalendarDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

const MAMILA_COLOR_MAP: Record<string, string> = {
  m1: '#10b981',
  m2: '#f59e0b',
  m3: '#6366f1',
  m4: '#ec4899',
  m5: '#14b8a6',
  khat_central: '#84cc16'
};

export function AdminView({ orders, inventory, onResolveDispute, onOpenMapPreview, onReassignOrder, onConfirmPayment }: Props) {
  const [orderFilters, setOrderFilters] = useState<OrderFilterState>({
    searchQuery: '',
    status: 'ALL',
    city: 'ALL',
    startDate: '',
    endDate: '',
  });
  const [whatsAppDispatchOrder, setWhatsAppDispatchOrder] = useState<Order | null>(null);

  // Dynamic courier staffing & reassignment
  const [reassignOrder, setReassignOrder] = useState<Order | null>(null);
  const [availableRunners, setAvailableRunners] = useState<AppUserProfile[]>([]);
  const [availableRiders, setAvailableRiders] = useState<AppUserProfile[]>([]);
  const [selectedRunnerUid, setSelectedRunnerUid] = useState<string>('');
  const [selectedRiderUid, setSelectedRiderUid] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Explicit Admin Payment Verification state
  const [paymentConfirmOrder, setPaymentConfirmOrder] = useState<Order | null>(null);
  const [receiptReference, setReceiptReference] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  const handleConfirmPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentConfirmOrder || !onConfirmPayment) return;
    setIsSubmittingPayment(true);
    try {
      await onConfirmPayment(paymentConfirmOrder.id, receiptReference.trim() || 'VERIFIED_BY_ADMIN');
      setPaymentConfirmOrder(null);
      setReceiptReference('');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

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
  
  // Platform financial breakdown from certified accounting model
  const platformFinancials = useMemo(() => calculatePlatformTotals(orders), [orders]);

  // Today's platform earnings (fees & fares excluding EEU electricity principal)
  const todayRevenue = useMemo(() => {
    return orders
      .filter(o => isSameCalendarDay(new Date(o.createdAt), new Date()) && o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED')
      .reduce((sum, o) => sum + calculateOrderRevenue(o).platformRevenue, 0);
  }, [orders]);

  const grossPlatformGMV = platformFinancials.grossPlatformGMV;
  const mamilaPayouts = platformFinancials.totalMerchantPayouts;
  const eeuUtilityPrincipal = platformFinancials.totalUtilityPrincipal;

  // Disputed orders
  const disputedOrders = useMemo(() => {
    return orders.filter(o => Boolean(o.dispute));
  }, [orders]);

  // Filtered dispatch orders
  const filteredDispatch = useMemo(() => {
    return applyOrderFilters(orders, orderFilters);
  }, [orders, orderFilters]);

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
            <span className="font-semibold text-sm">Today's Platform Revenue</span>
          </div>
          <p className="text-3xl font-bold font-mono text-slate-900 tabular-nums">{todayRevenue.toLocaleString()} ETB</p>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">Platform fees & transport fares</span>
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
          <span className="text-xs text-purple-600 font-medium mt-1 inline-block truncate" title={`Mamila Payouts: ${mamilaPayouts.toLocaleString()} ETB · EEU Utility: ${eeuUtilityPrincipal.toLocaleString()} ETB`}>
            Mamilas: {mamilaPayouts.toLocaleString()} ETB · EEU: {eeuUtilityPrincipal.toLocaleString()} ETB
          </span>
        </div>
      </div>

      {/* RECHARTS COMPONENT: 7-Day Order Volume Trends Dashboard */}
      <Suspense fallback={
        <div className="w-full h-80 bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading Recharts 7-Day Trend Analytics...</p>
        </div>
      }>
        <AdminDashboard orders={orders} inventory={inventory} />
      </Suspense>

      {/* CITY ORDER DENSITY & DEMAND HOTSPOT HEATMAP */}
      <OrderDensityHeatmap 
        orders={orders} 
        portalRole="ADMIN"
        heightClass="h-[460px]"
        showControls={true}
      />

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

                      {/* Explicit Payment Verification Status & Admin Confirmation Button */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {order.paymentStatus === 'PAYMENT_PENDING' && (
                          <>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Pay: PENDING ({order.paymentMethod})
                            </span>
                            {onConfirmPayment && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentConfirmOrder(order);
                                  setReceiptReference('');
                                }}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1"
                              >
                                <Receipt className="w-2.5 h-2.5" />
                                <span>Verify Slip</span>
                              </button>
                            )}
                          </>
                        )}
                        {order.paymentStatus === 'PAID_CONFIRMED' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            ✓ PAID ({order.paymentMethod}{order.paymentReference ? ` · Ref: ${order.paymentReference}` : ''})
                          </span>
                        )}
                        {order.paymentStatus === 'COLLECTED_BY_RIDER' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                            ✓ COD Collected ({order.totalPrice || order.price} ETB)
                          </span>
                        )}
                        {order.paymentStatus === 'UNPAID' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
                            COD Unpaid ({order.totalPrice || order.price} ETB)
                          </span>
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
                        {order.runnerTagId && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Seal:</span>
                            <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {order.runnerTagId}
                            </span>
                          </div>
                        )}
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
                  const color = MAMILA_COLOR_MAP[batch.mamilaId] || '#94a3b8';
                  return (
                    <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{batch.name}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
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

      {/* Explicit Admin Payment Verification Modal */}
      {paymentConfirmOrder && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPaymentConfirmOrder(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-900 text-base">Verify Payment Slip</h4>
              </div>
              <button
                type="button"
                onClick={() => setPaymentConfirmOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-bold text-slate-900">#{paymentConfirmOrder.id.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900">{paymentConfirmOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Gateway:</span>
                <span className="font-bold text-emerald-700 uppercase">{paymentConfirmOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-bold text-slate-900 tabular-nums font-mono">{paymentConfirmOrder.totalPrice || paymentConfirmOrder.price} ETB</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank / Gateway Transaction Reference / Slip ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TXN-9842103847 or CBE-REF-0982"
                  value={receiptReference}
                  onChange={(e) => setReceiptReference(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Cross-reference with your Telebirr / CBE / e-Dahab merchant statement before confirming.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentConfirmOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmittingPayment ? 'Confirming...' : 'Confirm & Mark Paid'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
