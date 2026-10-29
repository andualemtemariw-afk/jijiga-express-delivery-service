import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../services/googleAuth';
import { Order, Batch, ServiceType } from '../../types';
import { 
  Package, 
  Bike, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Star, 
  ShieldAlert, 
  FileText, 
  Map as MapIcon, 
  MessageCircle, 
  RefreshCw, 
  RotateCcw, 
  Search, 
  Copy, 
  Check, 
  Leaf, 
  Zap, 
  Navigation, 
  ShoppingBag, 
  Sparkles, 
  MapPin, 
  CreditCard, 
  Mic, 
  ArrowRight,
  TrendingUp,
  DollarSign,
  LogIn,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderProgressStepper } from './OrderProgressStepper';

interface OrderHistoryProps {
  currentUser?: any;
  fallbackOrders?: Order[];
  inventory?: Batch[];
  onOpenReceipt?: (order: Order) => void;
  onOpenWhatsApp?: (order: Order) => void;
  onOpenMapPreview?: (order: Order) => void;
  onRateOrder?: (order: Order) => void;
  onDisputeOrder?: (order: Order) => void;
  onReOrder?: (batch: Batch) => void;
  onCancelOrder?: (orderId: string) => void;
  onSignIn?: () => void;
  className?: string;
}

type DeliveryStatusFilter = 'ALL' | 'DELIVERED' | 'ACTIVE' | 'CANCELLED';
type ServiceFilterType = 'ALL' | ServiceType;

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  currentUser,
  fallbackOrders = [],
  inventory = [],
  onOpenReceipt,
  onOpenWhatsApp,
  onOpenMapPreview,
  onRateOrder,
  onDisputeOrder,
  onReOrder,
  onCancelOrder,
  onSignIn,
  className = ''
}) => {
  const [orders, setOrders] = useState<Order[]>(fallbackOrders);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(currentUser?.uid));
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatusFilter>('ALL');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilterType>('ALL');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // --- Real-time Firestore Subscription & Fetching ---
  useEffect(() => {
    if (!currentUser?.uid) {
      setOrders(fallbackOrders);
      setIsLoading(false);
      setIsFirestoreConnected(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ordersRef = collection(db, 'orders');
      // Query customer's orders strictly matching security rules
      const q = query(
        ordersRef,
        where('customerId', '==', currentUser.uid)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedOrders: Order[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              ...data,
              id: docSnap.id,
              createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt || Date.now()),
            } as Order;
          });

          // Sort descending by date
          fetchedOrders.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          setOrders(fetchedOrders);
          setIsLoading(false);
          setIsFirestoreConnected(true);
          setLastSyncedAt(new Date());
          setError(null);
        },
        (err) => {
          console.warn('Firestore live subscription fallback:', err.message);
          // If Firestore subscription runs into permissions or offline, fall back to props
          setOrders(fallbackOrders);
          setIsLoading(false);
          setIsFirestoreConnected(false);
          setError(err.message.includes('permission') 
            ? 'Access restricted or network offline. Showing cached delivery records.' 
            : 'Unable to stream live Firestore updates. Local cache active.'
          );
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error initiating Firestore query:', err);
      setOrders(fallbackOrders);
      setIsLoading(false);
      setError(err?.message || 'Failed to connect to Cloud Firestore.');
    }
  }, [currentUser?.uid, fallbackOrders]);

  // Sync fallback orders when unauthenticated or in demo mode
  useEffect(() => {
    if (!currentUser?.uid && fallbackOrders.length > 0) {
      setOrders(fallbackOrders);
    }
  }, [currentUser?.uid, fallbackOrders]);

  // --- Manual Refresh from Firestore ---
  const handleManualRefresh = useCallback(async () => {
    if (!currentUser?.uid) {
      setOrders(fallbackOrders);
      setLastSyncedAt(new Date());
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('customerId', '==', currentUser.uid));
      const snap = await getDocs(q);

      const refreshed: Order[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt || Date.now()),
        } as Order;
      });

      refreshed.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setOrders(refreshed);
      setLastSyncedAt(new Date());
      setIsFirestoreConnected(true);
    } catch (err: any) {
      console.warn('Manual Firestore fetch error:', err);
      setError(err?.message || 'Manual sync failed. Using local cache.');
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser?.uid, fallbackOrders]);

  // --- Copy Order ID helper ---
  const handleCopyOrderId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  // --- Analytics & Summary Statistics ---
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const deliveredCount = orders.filter(
      (o) => o.status === 'DELIVERED' || o.status === 'RATED'
    ).length;
    const activeCount = orders.filter((o) => {
      const isComplete = o.status === 'DELIVERED' || o.status === 'RATED';
      const isTerminated = o.status === 'CANCELLED' || o.status === 'DEFECT_REJECTED';
      return !isComplete && !isTerminated;
    }).length;
    const totalSpent = orders
      .filter((o) => o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED')
      .reduce((sum, o) => sum + (o.totalPrice || o.price || 0), 0);

    const completionRate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 100;

    return {
      totalCount,
      deliveredCount,
      activeCount,
      totalSpent,
      completionRate
    };
  }, [orders]);

  // --- Filtering Logic ---
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      if (statusFilter === 'DELIVERED') {
        if (order.status !== 'DELIVERED' && order.status !== 'RATED') return false;
      } else if (statusFilter === 'ACTIVE') {
        const isComplete = order.status === 'DELIVERED' || order.status === 'RATED';
        const isTerminated = order.status === 'CANCELLED' || order.status === 'DEFECT_REJECTED';
        if (isComplete || isTerminated) return false;
      } else if (statusFilter === 'CANCELLED') {
        if (order.status !== 'CANCELLED' && order.status !== 'DEFECT_REJECTED') return false;
      }

      // 2. Service Type Filter
      if (serviceFilter !== 'ALL') {
        const type = order.serviceType || 'FOOD';
        if (type !== serviceFilter) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesBatch = (order.batchName || '').toLowerCase().includes(q);
        const matchesMamila = (order.mamilaName || '').toLowerCase().includes(q);
        const matchesLocation = (order.mamilaLocation || '').toLowerCase().includes(q);
        const matchesAddress = (order.customerAddress || order.customerPlusCode || '').toLowerCase().includes(q);
        const matchesCity = (order.customerCity || '').toLowerCase().includes(q);
        const matchesParcel = Boolean(order.parcelDetails?.trackingCode.toLowerCase().includes(q));
        const matchesMeter = Boolean(order.eeuDetails?.meterNumber.toLowerCase().includes(q));
        const matchesDriver = Boolean(order.rideDetails?.driverName?.toLowerCase().includes(q));

        if (!matchesId && !matchesBatch && !matchesMamila && !matchesLocation && !matchesAddress && !matchesCity && !matchesParcel && !matchesMeter && !matchesDriver) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, serviceFilter, searchQuery]);

  // --- Status Indicator Helper ---
  const renderStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-none"></span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Delivered</span>
          </span>
        );
      case 'RATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60 shadow-2xs">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Completed & Rated</span>
          </span>
        );
      case 'IN_TRANSIT':
      case 'PICKED_UP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <Bike className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Out for Delivery</span>
          </span>
        );
      case 'RIDER_DISPATCHED':
      case 'RIDER_ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/60 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Rider En Route</span>
          </span>
        );
      case 'VERIFIED_READY':
      case 'READY_FOR_RIDER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Quality Inspected</span>
          </span>
        );
      case 'RUNNER_ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-700/60 shadow-2xs">
            <ShoppingBag className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Runner Assigned</span>
          </span>
        );
      case 'PENDING':
      case 'TRANSACTION_PENDING':
      case 'PAYMENT_PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Order Placed</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Cancelled</span>
          </span>
        );
      case 'DEFECT_REJECTED':
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Quality Declined</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <span>{String(status).replace(/_/g, ' ')}</span>
          </span>
        );
    }
  };



  const serviceTypeConfig: Record<string, { label: string; icon: string; badgeClass: string }> = {
    FOOD: { label: 'Food & Groceries', icon: '🍱', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200' },
    PARCEL: { label: 'Express Parcel', icon: '📦', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200' },
    RIDE: { label: 'Marhaba Ride', icon: '🚖', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    EEU_RECHARGE: { label: 'EEU Electricity', icon: '⚡', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
    KHAT: { label: 'Khat Marketplace', icon: '🌿', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300' },
    NEARBY_SERVICE: { label: 'Nearby Services Radar', icon: '🧭', badgeClass: 'bg-teal-50 text-teal-900 border-teal-300' },
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* HEADER SECTION: Title + Firestore Live Status + Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Delivery & Order History
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Past deliveries, receipts, live parcel tracking, and verified proof-of-delivery.
              </p>
            </div>
          </div>
        </div>

        {/* Firestore Sync Badge & Refresh Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono">
            {isFirestoreConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Firestore Live</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Local Cache</span>
              </span>
            )}
            {lastSyncedAt && (
              <span className="text-[10px] text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2">
                {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            title="Refresh Deliveries from Cloud Firestore"
            aria-label="Refresh deliveries"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ERROR BANNER IF ANY */}
      {error && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px] hover:bg-amber-700 transition-colors"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Orders</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {stats.totalCount}
          </p>
          <span className="text-[10px] text-slate-400">All services combined</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Past Deliveries</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {stats.deliveredCount}
          </p>
          <span className="text-[10px] text-emerald-600/80 font-medium">{stats.completionRate}% completion rate</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>In-Transit Active</span>
            <Bike className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
            {stats.activeCount}
          </p>
          <span className="text-[10px] text-indigo-500">Live courier tracking</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Value</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {stats.totalSpent.toLocaleString()} <span className="text-xs font-sans font-semibold text-slate-500">ETB</span>
          </p>
          <span className="text-[10px] text-slate-400">Items & delivery tariffs</span>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs">
        {/* Top bar: Status Filter Tabs + Search input */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto scrollbar-none">
            {[
              { id: 'ALL', label: 'All Orders', count: stats.totalCount },
              { id: 'DELIVERED', label: 'Past Deliveries', count: stats.deliveredCount },
              { id: 'ACTIVE', label: 'In Transit', count: stats.activeCount },
              { id: 'CANCELLED', label: 'Cancelled / Declined', count: stats.totalCount - stats.deliveredCount - stats.activeCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as DeliveryStatusFilter)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === tab.id
                    ? 'bg-slate-900/10 dark:bg-white/20 text-current'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, item, vendor, tracking code..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom bar: Service Type Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Service:
          </span>
          {[
            { id: 'ALL', label: 'All Services', icon: '🌐' },
            { id: 'FOOD', label: 'Food & Restaurants', icon: '🍱' },
            { id: 'GROCERY', label: 'Taiwan Grocery', icon: '🛒' },
            { id: 'HOTEL', label: 'Hotels', icon: '🏨' },
            { id: 'PARCEL', label: 'Express Parcels', icon: '📦' },
            { id: 'NEARBY_SERVICE', label: 'Nearby Services', icon: '🧭' },
            { id: 'RIDE', label: 'Marhaba Rides', icon: '🚖' },
            { id: 'EEU_RECHARGE', label: 'EEU Electricity', icon: '⚡' },
            { id: 'KHAT', label: 'Khat Market', icon: '🌿' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setServiceFilter(tab.id as ServiceFilterType)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                serviceFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-2xs font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
          {(searchQuery || statusFilter !== 'ALL' || serviceFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setServiceFilter('ALL');
              }}
              className="ml-auto text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold whitespace-nowrap flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* SIGN IN REMINDER BANNER (If customer is browsing in guest mode) */}
      {!currentUser && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <LogIn className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Currently Browsing Local / Demo Deliveries</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Sign in with your Google account to fetch and synchronize your official Cloud Firestore delivery history.
              </p>
            </div>
          </div>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              Sign In with Google
            </button>
          )}
        </div>
      )}

      {/* SCROLLABLE LIST OF DELIVERIES CONTAINER */}
      <div 
        className="max-h-[720px] overflow-y-auto space-y-3.5 pr-1.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent rounded-2xl"
        role="region"
        aria-label="Past Deliveries and Orders List"
      >
        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
                  <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
                  <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && filteredOrders.length === 0 && (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {orders.length === 0 ? 'No Past Deliveries Recorded' : 'No Deliveries Found'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                {orders.length === 0 
                  ? 'Your completed deliveries, express parcels, EEU recharge receipts, and rides will appear here in real-time.' 
                  : 'No orders matched your current filters. Try resetting search query or selecting "All Orders".'}
              </p>
            </div>
            {(searchQuery || statusFilter !== 'ALL' || serviceFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setServiceFilter('ALL');
                }}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* DELIVERIES LIST */}
        {!isLoading && filteredOrders.map((order) => {
          const serviceConfig = serviceTypeConfig[order.serviceType || 'FOOD'] || serviceTypeConfig.FOOD;
          const isComplete = order.status === 'DELIVERED' || order.status === 'RATED';
          const isTerminated = order.status === 'CANCELLED' || order.status === 'DEFECT_REJECTED';

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow space-y-4"
            >
              {/* TOP ROW: Service Badge + Batch/Item Name + Status Indicator */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Service Type Pill */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${serviceConfig.badgeClass}`}>
                      <span>{serviceConfig.icon}</span>
                      <span>{serviceConfig.label}</span>
                    </span>

                    {/* Order ID Tag with Quick Copy */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyOrderId(order.id, e)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px] font-mono transition-colors cursor-pointer"
                      title="Click to copy Order ID"
                    >
                      <span>#{order.id.slice(0, 10)}...</span>
                      {copiedOrderId === order.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Main Title / Batch Name */}
                  <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                    {order.batchName || `${serviceConfig.label} Order`}
                  </h4>

                  {/* Date & Time Timestamp */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {new Date(order.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                </div>

                {/* Right Top: Status Badge & Total Price */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5">
                  <div>{renderStatusBadge(order.status)}</div>
                  <div className="text-right mt-1">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                      {(order.totalPrice || order.price || 0).toLocaleString()} ETB
                    </span>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                      {order.paymentMethod || 'COD'} · {order.paymentStatus || 'UNPAID'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-Stage Progress Stepper: Pending, Runner, Rider, Delivered */}
              <div className="py-2.5 px-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <OrderProgressStepper order={order} variant="compact" />
              </div>

              {/* METADATA GRID: Store, Destination, Cost Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    Store / Vendor Hub
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate block mt-0.5">
                    {order.mamilaName || 'Jijiga Express Central Hub'}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] truncate">
                    {order.mamilaLocation || 'Taiwan Market, Jijiga'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    Delivery Destination
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate block mt-0.5">
                    {order.customerCity || 'Jijiga'}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] truncate">
                    {order.customerAddress || order.customerPlusCode || 'Kebele 04, Jijiga'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    Fare & Quantity
                  </span>
                  <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-100 block mt-0.5">
                    {order.price} ETB + {order.deliveryFee || 0} ETB fee
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    Qty: {order.quantity || 1} unit(s)
                  </span>
                </div>
              </div>

              {/* COURIER / INSPECTOR INFO TAG IF AVAILABLE */}
              {(order.runnerName || order.riderName || order.runnerTagId) && (
                <div className="flex flex-wrap items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                  {order.runnerName && (
                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                      Runner: <strong>{order.runnerName}</strong>
                      {order.runnerTagId && (
                        <span className="font-mono text-[10px] bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-1.5 py-0.2 rounded font-bold">
                          Tag #{order.runnerTagId}
                        </span>
                      )}
                    </span>
                  )}
                  {order.riderName && (
                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Bike className="w-3.5 h-3.5 text-blue-600" />
                      Rider: <strong>{order.riderName}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* COURIER AUDIO / VOICE-TO-TEXT DELIVERY NOTE (From Voice Button feature) */}
              {order.courierDeliveryNote && (
                <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-200">
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Courier Audio / Voice-to-Text Note</span>
                    </span>
                    {order.courierNoteAuthor && (
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-mono">
                        by {order.courierNoteAuthor}
                      </span>
                    )}
                  </div>
                  <p className="text-indigo-900 dark:text-indigo-200 italic font-medium">
                    "{order.courierDeliveryNote}"
                  </p>
                </div>
              )}

              {/* PARCEL EXPRESS DETAILS */}
              {order.parcelDetails && (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-blue-950 dark:text-blue-200">
                    <span className="flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Tracking Code: <span className="font-mono">{order.parcelDetails.trackingCode}</span>
                    </span>
                    <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold">
                      {order.parcelDetails.weightCategory} • {order.parcelDetails.parcelCategory}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    <div><strong>From:</strong> {order.parcelDetails.senderName} ({order.parcelDetails.senderCity})</div>
                    <div><strong>To:</strong> {order.parcelDetails.receiverName} ({order.parcelDetails.receiverCity})</div>
                  </div>
                  {order.parcelDetails.tamperSealRequested && (
                    <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      🔒 Tamper-Evident Seal Applied
                    </span>
                  )}
                  {order.parcelDetails.description && (
                    <p className="text-slate-600 dark:text-slate-300 italic">"{order.parcelDetails.description}"</p>
                  )}
                </div>
              )}

              {/* RIDE DETAILS */}
              {order.rideDetails && (
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-emerald-950 dark:text-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <Bike className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      {order.rideDetails.vehicleType === 'MARHABA_TAXI' ? 'Marhaba Taxi' : 'Marhaba Moto'} • {order.rideDetails.city}
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-mono">
                      Plate: {order.rideDetails.licensePlate || 'ET-3482'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <div><strong>Pickup:</strong> {order.rideDetails.pickupLocation}</div>
                    <div><strong>Dropoff:</strong> {order.rideDetails.dropoffLocation}</div>
                  </div>
                </div>
              )}

              {/* EEU RECHARGE DETAILS */}
              {order.eeuDetails && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-amber-950 dark:text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      EEU Meter: <span className="font-mono">{order.eeuDetails.meterNumber}</span>
                    </span>
                    <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
                      {order.eeuDetails.custodyPhase.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {order.eeuDetails.tokenCode && (
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-700 font-mono text-center font-bold text-slate-900 dark:text-white tracking-widest text-sm">
                      {order.eeuDetails.tokenCode}
                    </div>
                  )}
                </div>
              )}

              {/* KHAT DETAILS */}
              {order.khatDetails && (
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-emerald-950 dark:text-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{order.khatDetails.grade} • {order.khatDetails.origin}</span>
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px]">
                      {order.khatDetails.bundlesCount} bundles ({order.khatDetails.bundleWrapType})
                    </span>
                  </div>
                  {order.khatDetails.preferredMamilaCustomerNote && (
                    <p className="text-emerald-800 dark:text-emerald-300 italic">
                      "{order.khatDetails.preferredMamilaCustomerNote}"
                    </p>
                  )}
                </div>
              )}

              {/* SPECIAL INSTRUCTIONS / COOKING NOTES */}
              {order.cookingInstruction && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold">Cooking/Preparation Note: </span>
                  <span className="italic">"{order.cookingInstruction}"</span>
                </div>
              )}

              {/* DEFECT REJECTED NOTICE */}
              {order.defectReason && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-950 dark:text-rose-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Declined on Quality Inspection:
                  </div>
                  <p className="text-rose-800 dark:text-rose-300">{order.defectReason}</p>
                </div>
              )}

              {/* RATING DISPLAY */}
              {order.rating && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < order.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold font-mono tabular-nums">Rated {order.rating}/5</span>
                  {order.reviewComment && (
                    <span className="text-slate-600 dark:text-slate-300 italic ml-1">"{order.reviewComment}"</span>
                  )}
                </div>
              )}

              {/* DISPUTE STATUS */}
              {order.dispute && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-300">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      Dispute: {order.dispute.reason}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {order.dispute.status}
                    </span>
                  </div>
                  <p className="text-rose-800 dark:text-rose-300">{order.dispute.comment}</p>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                {onOpenWhatsApp && (
                  <button
                    type="button"
                    onClick={() => onOpenWhatsApp(order)}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                    title="Notify Courier or Dispatch on WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp Dispatch</span>
                  </button>
                )}

                {onOpenMapPreview && (
                  <button
                    type="button"
                    onClick={() => onOpenMapPreview(order)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <MapIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Map Route</span>
                  </button>
                )}

                {onOpenReceipt && (
                  <button
                    type="button"
                    onClick={() => onOpenReceipt(order)}
                    className="px-3 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Receipt</span>
                  </button>
                )}

                {/* Rating Button if Delivered & Not Rated */}
                {isComplete && !order.rating && onRateOrder && (
                  <button
                    type="button"
                    onClick={() => onRateOrder(order)}
                    className="px-3 py-1.5 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Rate Experience</span>
                  </button>
                )}

                {/* Report Dispute if Delivered & Not Disputed */}
                {isComplete && !order.dispute && onDisputeOrder && (
                  <button
                    type="button"
                    onClick={() => onDisputeOrder(order)}
                    className="px-3 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>Report Issue</span>
                  </button>
                )}

                {/* Re-order Button */}
                {isComplete && onReOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      const matched = inventory.find((b) => b.id === order.batchId);
                      if (matched) {
                        onReOrder(matched);
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Order Again</span>
                  </button>
                )}

                {/* Cancel Button if Pending */}
                {(order.status === 'PENDING' || order.status === 'TRANSACTION_PENDING') && onCancelOrder && (
                  <button
                    type="button"
                    onClick={() => onCancelOrder(order.id)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cancel Order</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
