import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Order, Batch, ServiceType } from '../../types';
import { User } from 'firebase/auth';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Search, 
  RefreshCw, 
  Receipt, 
  RotateCcw, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Calendar, 
  Package, 
  Leaf, 
  Zap, 
  Car, 
  Layers, 
  AlertCircle, 
  ShieldCheck, 
  LogIn,
  ExternalLink,
  Map as MapIcon,
  ShoppingBag,
  Building2
} from 'lucide-react';

interface SimplifiedOrderHistoryProps {
  currentUser?: User | null;
  fallbackOrders?: Order[];
  inventory?: Batch[];
  onOpenReceipt?: (order: Order) => void;
  onOpenMapPreview?: (order: Order) => void;
  onRateOrder?: (order: Order) => void;
  onDisputeOrder?: (order: Order) => void;
  onReOrder?: (batch: Batch) => void;
  onSignIn?: () => void;
  className?: string;
}

const SERVICE_ICONS: Record<ServiceType, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; label: string }> = {
  FOOD: { icon: Package, bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', label: 'Food' },
  KHAT: { icon: Leaf, bg: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-400', label: 'Khat' },
  PARCEL: { icon: Layers, bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400', label: 'Parcel' },
  RIDE: { icon: Car, bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', label: 'Ride' },
  EEU_RECHARGE: { icon: Zap, bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-400', label: 'EEU Utility' },
  GROCERY: { icon: ShoppingBag, bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-400', label: 'Taiwan Grocery' },
  HOTEL: { icon: Building2, bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-400', label: 'Hotel Booking' },
};

const COMPLETED_STATUSES = ['DELIVERED', 'RATED'];
const CANCELLED_STATUSES = ['CANCELLED', 'DEFECT_REJECTED'];

export function SimplifiedOrderHistory({
  currentUser,
  fallbackOrders = [],
  inventory = [],
  onOpenReceipt,
  onOpenMapPreview,
  onRateOrder,
  onDisputeOrder,
  onReOrder,
  onSignIn,
  className = '',
}: SimplifiedOrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Firestore query for customer's historical orders
  useEffect(() => {
    if (!currentUser?.uid) {
      // Filter fallback orders for completed / cancelled
      const filtered = fallbackOrders.filter(o => 
        COMPLETED_STATUSES.includes(o.status) || CANCELLED_STATUSES.includes(o.status)
      );
      setOrders(filtered);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorNotice(null);

    try {
      const ordersRef = collection(db, 'orders');
      // Query customer's orders; filter completed/cancelled in-memory to avoid missing composite index
      const q = query(ordersRef, where('customerId', '==', currentUser.uid));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const loadedOrders: Order[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Order;
            const fullOrder: Order = { ...data, id: docSnap.id };
            if (
              COMPLETED_STATUSES.includes(fullOrder.status) || 
              CANCELLED_STATUSES.includes(fullOrder.status)
            ) {
              loadedOrders.push(fullOrder);
            }
          });

          // Sort descending by creation date
          loadedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          setOrders(loadedOrders);
          setIsLoading(false);
          setIsRefreshing(false);
        },
        (err) => {
          console.warn('[SimplifiedOrderHistory] Firestore snapshot listener notice:', err.message);
          const filtered = fallbackOrders.filter(o => 
            COMPLETED_STATUSES.includes(o.status) || CANCELLED_STATUSES.includes(o.status)
          );
          setOrders(filtered);
          setIsLoading(false);
          setIsRefreshing(false);
          setErrorNotice('Operating with cached historical records.');
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.warn('[SimplifiedOrderHistory] Failed to initialize query:', err?.message);
      const filtered = fallbackOrders.filter(o => 
        COMPLETED_STATUSES.includes(o.status) || CANCELLED_STATUSES.includes(o.status)
      );
      setOrders(filtered);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser?.uid, fallbackOrders]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    if (!currentUser?.uid) return;
    setIsRefreshing(true);
    setErrorNotice(null);

    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('customerId', '==', currentUser.uid));
      const snap = await getDocs(q);
      const loaded: Order[] = [];
      snap.forEach((d) => {
        const data = d.data() as Order;
        const full = { ...data, id: d.id };
        if (COMPLETED_STATUSES.includes(full.status) || CANCELLED_STATUSES.includes(full.status)) {
          loaded.push(full);
        }
      });
      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(loaded);
    } catch (err: any) {
      console.warn('[SimplifiedOrderHistory] Manual refresh notice:', err?.message);
      setErrorNotice('Could not refresh from cloud. Cached orders displayed.');
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser?.uid]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (filterType === 'COMPLETED') {
      result = result.filter(o => COMPLETED_STATUSES.includes(o.status));
    } else if (filterType === 'CANCELLED') {
      result = result.filter(o => CANCELLED_STATUSES.includes(o.status));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o => 
        o.id.toLowerCase().includes(q) ||
        (o.batchName || '').toLowerCase().includes(q) ||
        (o.mamilaName || '').toLowerCase().includes(q) ||
        (o.customerCity || '').toLowerCase().includes(q) ||
        (o.customerAddress || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, filterType, searchQuery]);

  const completedCount = useMemo(() => orders.filter(o => COMPLETED_STATUSES.includes(o.status)).length, [orders]);
  const cancelledCount = useMemo(() => orders.filter(o => CANCELLED_STATUSES.includes(o.status)).length, [orders]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Title, Stats & Refresh */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Order History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Archived record of all your completed deliveries and cancelled orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Refresh order history from Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, item name, or merchant..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilterType('COMPLETED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterType === 'COMPLETED'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setFilterType('CANCELLED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterType === 'CANCELLED'
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3 h-3 text-rose-500" />
              Cancelled ({cancelledCount})
            </button>
          </div>
        </div>

        {errorNotice && (
          <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}
      </div>

      {/* Auth Gate for Unauthenticated Users */}
      {!currentUser && orders.length === 0 && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-base">Sign In to View Past Orders</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Your delivered batches, verified receipts, and cancelled orders are securely tied to your Google account.
          </p>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Google
            </button>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="space-y-1.5">
                  <div className="w-32 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-48 h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded" />
                </div>
              </div>
              <div className="w-20 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredOrders.length === 0 && (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2.5 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Past Orders Found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {searchQuery 
              ? 'No historical orders matched your search criteria.' 
              : filterType === 'COMPLETED' 
                ? 'You do not have any completed deliveries on record.' 
                : filterType === 'CANCELLED'
                  ? 'No cancelled orders on record.'
                  : 'You have not placed any orders yet. Fresh morning batches are ready for dispatch!'}
          </p>
        </div>
      )}

      {/* Simplified List View */}
      {!isLoading && filteredOrders.length > 0 && (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const isCompleted = COMPLETED_STATUSES.includes(order.status);
            const isCancelled = CANCELLED_STATUSES.includes(order.status);
            const isExpanded = expandedOrderId === order.id;
            const service = SERVICE_ICONS[order.serviceType || 'FOOD'] || SERVICE_ICONS.FOOD;
            const ServiceIcon = service.icon;

            const matchingBatch = inventory.find(b => b.id === order.batchId);
            const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs overflow-hidden"
              >
                {/* Main List Row */}
                <div 
                  className="p-3.5 md:p-4 flex items-center justify-between gap-3 cursor-pointer"
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                >
                  {/* Left: Service Icon + Order Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${service.bg} ${service.text}`}>
                      <ServiceIcon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs md:text-sm truncate">
                          {order.batchName || `${service.label} Order`}
                        </span>
                        <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                          #{order.id.slice(0, 10)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        <span>{order.mamilaName || 'Jijiga Express'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formattedDate} at {formattedTime}</span>
                        {order.customerCity && (
                          <>
                            <span aria-hidden="true" className="hidden sm:inline">·</span>
                            <span className="hidden sm:inline">{order.customerCity}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Pill, Price & Action Indicator */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Status Pill */}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{order.status === 'RATED' ? 'Rated' : 'Delivered'}</span>
                      </span>
                    )}

                    {isCancelled && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>{order.status === 'DEFECT_REJECTED' ? 'Rejected' : 'Cancelled'}</span>
                      </span>
                    )}

                    {/* Price */}
                    <div className="text-right hidden sm:block">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {order.totalPrice || order.price || 0} ETB
                      </div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300 uppercase font-mono">
                        {order.paymentMethod || 'COD'}
                      </div>
                    </div>

                    {/* Expand/Collapse Chevron */}
                    <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Simplified Detail View */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs space-y-3">
                    {/* Key Attributes Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-600 dark:text-slate-300">
                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block font-medium">Quantity</span>
                        <span className="font-bold text-slate-900 dark:text-white">{order.quantity || 1} package(s)</span>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block font-medium">Delivery Fee</span>
                        <span className="font-bold text-slate-900 dark:text-white">{order.deliveryFee || 50} ETB</span>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block font-medium">Payment State</span>
                        <span className="font-semibold text-slate-900 dark:text-white capitalize">
                          {(order.paymentStatus || 'UNPAID').replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block font-medium">Destination</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block">
                          {order.customerAddress || order.customerCity || 'Jijiga'}
                        </span>
                      </div>
                    </div>

                    {/* Khat or EEU specific metadata */}
                    {order.khatDetails && (
                      <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50 text-[11px] text-emerald-900 dark:text-emerald-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Khat Quality Record: {order.khatDetails.grade} ({order.khatDetails.origin})</span>
                        </div>
                        <p className="text-emerald-800/80 dark:text-emerald-300/80">
                          Batch: {order.khatDetails.arrivalBatchTime} · Wrap: {order.khatDetails.bundleWrapType} · Units: {order.khatDetails.bundlesCount} bundle(s)
                        </p>
                      </div>
                    )}

                    {order.eeuDetails && (
                      <div className="p-2.5 bg-purple-50/80 dark:bg-purple-950/30 rounded-xl border border-purple-200/70 dark:border-purple-800/50 text-[11px] text-purple-900 dark:text-purple-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-purple-600" />
                          <span>EEU Meter #{order.eeuDetails.meterNumber} ({order.eeuDetails.rechargeAmount} ETB)</span>
                        </div>
                        {order.eeuDetails.tokenCode && (
                          <div className="font-mono text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border border-purple-200 dark:border-purple-700 inline-block font-bold">
                            Token: {order.eeuDetails.tokenCode}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Actions Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        {onOpenReceipt && (
                          <button
                            type="button"
                            onClick={() => onOpenReceipt(order)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Receipt className="w-3.5 h-3.5 text-blue-600" />
                            <span>Digital Receipt</span>
                          </button>
                        )}

                        {onOpenMapPreview && (
                          <button
                            type="button"
                            onClick={() => onOpenMapPreview(order)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <MapIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Route Map</span>
                          </button>
                        )}

                        {isCompleted && order.status !== 'RATED' && onRateOrder && (
                          <button
                            type="button"
                            onClick={() => onRateOrder(order)}
                            className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>Rate Delivery</span>
                          </button>
                        )}
                      </div>

                      {matchingBatch && onReOrder && (
                        <button
                          type="button"
                          onClick={() => onReOrder(matchingBatch)}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-blue-600 dark:hover:bg-blue-700 text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Re-order Batch</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
