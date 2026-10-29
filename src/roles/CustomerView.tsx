import { useState, useMemo, useEffect, useRef } from 'react';
import { Batch, Order, PaymentMethod, ChatMessage, OrderStatus } from '../types';
import { CITIES, MAMILAS } from '../data';
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Package, 
  Smartphone, 
  CreditCard, 
  Store, 
  Bike, 
  XCircle, 
  AlertTriangle, 
  RotateCcw, 
  History, 
  ShoppingBag, 
  User, 
  Plus, 
  Minus, 
  MessageSquare, 
  Star, 
  ShieldAlert, 
  PhoneCall, 
  Search, 
  Sparkles,
  FileText,
  FastForward,
  Navigation,
  Map as MapIcon,
  Maximize2,
  Camera,
  Zap,
  HardDrive,
  UploadCloud,
  MessageCircle,
  Leaf,
  LogIn,
  Save,
  Check,
  Mic,
  Bell,
  BellRing,
  ListFilter,
  SlidersHorizontal,
  Hotel as HotelIcon,
  Award,
  Headphones,
  AlertOctagon,
  Compass,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadOrderReceiptToDrive } from '../services/googleDrive';
import { getAccessToken, googleSignIn } from '../services/googleAuth';
import { OrderMapPreview } from '../components/map/OrderMapPreview';
import { DeliveryLocationPickerMap } from '../components/map/DeliveryLocationPickerMap';
import { DeliveryRouteMapBanner } from '../components/map/DeliveryRouteMapBanner';
import { WhatsAppDispatchModal } from '../components/communication/WhatsAppDispatchModal';
import { BookParcelModal } from '../components/parcel/BookParcelModal';
import { BookRideModal } from '../components/ride/BookRideModal';
import { BookEeuModal } from '../components/eeu/BookEeuModal';
import { KhatMarketplaceModal } from '../components/khat/KhatMarketplaceModal';
import { EeuCustodyStepper } from '../components/eeu/EeuCustodyStepper';
import { MamilaGallery, MamilaGalleryItem } from '../components/mamila/MamilaGallery';
import { FoodDiscovery } from '../components/customer/FoodDiscovery';
import { ServiceGrid, ServiceTarget } from '../components/customer/ServiceGrid';
import { BottomNav, CustomerNavTab } from '../components/customer/BottomNav';
import { CartDrawer } from '../components/customer/CartDrawer';
import { HotelBookingModal } from '../components/hotel/HotelBookingModal';
import { LoyaltyCard } from '../components/loyalty/LoyaltyCard';
import { HelpCenterModal } from '../components/communication/HelpCenterModal';
import { PhoneOtpModal } from '../components/auth/PhoneOtpModal';
import { HOTELS_DATA, SERVICEABILITY_ZONES } from '../data';
import { Cart, CartItem, getCustomerFriendlyStatus, HotelReservation, SupportTicket } from '../types';
import { CommunicationBridgeModal, ModalTab } from '../components/communication/CommunicationBridgeModal';
import { OrderHistory } from '../components/orders/OrderHistory';
import { SimplifiedOrderHistory } from '../components/orders/SimplifiedOrderHistory';
import { OrderProgressStepper } from '../components/orders/OrderProgressStepper';
import { 
  notifyOrderStatusChange, 
  getNotificationPermission, 
  requestNotificationPermission, 
  isPushSupported 
} from '../services/notificationService';
import { LatLng, DEFAULT_CUSTOMER_COORDINATES, CITY_COORDINATES } from '../utils/geo';
import { AppUserProfile } from '../types';
import { NearbyServicesModal } from '../components/nearby/NearbyServicesModal';

interface Props {
  inventory: Batch[];
  myOrders: Order[];
  currentUser?: any;
  customerProfile?: AppUserProfile | null;
  orderMessages?: Record<string, ChatMessage[]>;
  onSignIn?: () => void;
  onUpdateProfile?: (updates: Partial<AppUserProfile>) => Promise<void>;
  onSendMessage?: (orderId: string, message: Omit<ChatMessage, 'id' | 'orderId'>) => void;
  onPlaceOrder: (
    batch: Batch, 
    payment: PaymentMethod,
    options?: {
      quantity?: number;
      deliveryFee?: number;
      specialInstructions?: string;
      cookingInstruction?: string;
      deliveryCity?: string;
      customerAddress?: string;
      customerPlusCode?: string;
      customerCoordinates?: { lat: number; lng: number };
    }
  ) => void;
  onCancelOrder?: (orderId: string) => void;
  onRateOrder?: (orderId: string, rating: number, comment?: string) => void;
  onDisputeOrder?: (orderId: string, reason: string, comment: string) => void;
  onSimulateNextStep?: (orderId: string) => void;
  onOpenMapPreview?: (order: Order) => void;
  onBookParcel?: (order: Partial<Order>) => void;
  onBookRide?: (order: Partial<Order>) => void;
  onBookEeu?: (order: Partial<Order>) => void;
  onBookKhat?: (order: Partial<Order>) => void;
  onBookNearbyService?: (order: Partial<Order>) => void;
}

type TabType = 'batches' | 'services' | 'tracking' | 'history' | 'profile';

export function CustomerView({ 
  inventory, 
  myOrders, 
  currentUser,
  customerProfile,
  orderMessages,
  onSignIn,
  onUpdateProfile,
  onSendMessage,
  onPlaceOrder, 
  onCancelOrder,
  onRateOrder,
  onDisputeOrder,
  onSimulateNextStep,
  onOpenMapPreview,
  onBookParcel,
  onBookRide,
  onBookEeu,
  onBookKhat,
  onBookNearbyService,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('batches');
  const [historyViewFormat, setHistoryViewFormat] = useState<'simplified' | 'detailed'>('simplified');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedCity, setSelectedCity] = useState(customerProfile?.city || 'Jijiga');
  const [address, setAddress] = useState(customerProfile?.address || 'Kebele 04, Jijiga');
  const [plusCode, setPlusCode] = useState(customerProfile?.plusCode || '8F2P+5H Jijiga');
  const [customerCoords, setCustomerCoords] = useState<LatLng>(DEFAULT_CUSTOMER_COORDINATES);
  const [showCheckoutMap, setShowCheckoutMap] = useState(true);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [cookingInstruction, setCookingInstruction] = useState('Please cook it well done, no pink inside.');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  
  // Profile edit form state
  const [editPhone, setEditPhone] = useState(customerProfile?.phone || '');
  const [editCity, setEditCity] = useState(customerProfile?.city || 'Jijiga');
  const [editAddress, setEditAddress] = useState(customerProfile?.address || '');
  const [editPlusCode, setEditPlusCode] = useState(customerProfile?.plusCode || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  
  // Super-app services modals
  const [showBookParcelModal, setShowBookParcelModal] = useState(false);
  const [showBookRideModal, setShowBookRideModal] = useState(false);
  const [showBookEeuModal, setShowBookEeuModal] = useState(false);
  const [showKhatModal, setShowKhatModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [showHelpCenterModal, setShowHelpCenterModal] = useState(false);
  const [showNearbyServicesModal, setShowNearbyServicesModal] = useState(false);
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [activeRideConflictNotice, setActiveRideConflictNotice] = useState<string | null>(null);
  const [hotelReservations, setHotelReservations] = useState<HotelReservation[]>([]);

  // Cart State (Real Multi-Item Cart)
  const [cart, setCart] = useState<Cart>({
    vendorId: null,
    vendorName: null,
    items: [],
    subtotal: 0,
    deliveryFee: 60,
    serviceFee: 25,
    total: 85,
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartVendorConflict, setCartVendorConflict] = useState<string | null>(null);

  // Batch display view mode: Standard Grid vs Live Mamila Photo Gallery
  const [batchDisplayMode, setBatchDisplayMode] = useState<'grid' | 'gallery'>('grid');

  // Search & category filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState<'featured' | 'rating' | 'price-low' | 'availability'>('featured');


  // Checkout & process state
  const [txLogs, setTxLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [driveSaving, setDriveSaving] = useState(false);
  const [driveSaveSuccess, setDriveSaveSuccess] = useState<string | null>(null);
  const [driveSaveError, setDriveSaveError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelToast, setCancelToast] = useState<string | null>(null);
  


  const handleSelectFromGallery = (galleryItem: MamilaGalleryItem) => {
    const matching = inventory.find(b => b.name === galleryItem.batchName) || {
      id: galleryItem.id,
      mamilaId: galleryItem.mamilaId,
      name: galleryItem.batchName,
      description: `${galleryItem.grade} · ${galleryItem.notes}`,
      price: galleryItem.pricePerUnit,
      available: galleryItem.availableUnits,
      expiry: `Today (Vault stamped ${galleryItem.timestamp})`,
      imageUrl: galleryItem.imageUrl,
      category: galleryItem.category,
      unit: galleryItem.unitLabel
    };
    setSelectedBatch(matching);
  };
  
  // Rating & Dispute modal states
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [stars, setStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [disputeOrder, setDisputeOrder] = useState<Order | null>(null);
  const [disputeReason, setDisputeReason] = useState('Damaged item packaging');
  const [disputeComment, setDisputeComment] = useState('');
  
  // Contact & Communication modals
  const [communicationTarget, setCommunicationTarget] = useState<{
    role: 'RUNNER' | 'RIDER';
    name: string;
    phone: string;
    order: Order;
    initialTab?: ModalTab;
  } | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [whatsAppOrder, setWhatsAppOrder] = useState<Order | null>(null);
  const [notificationPermissionState, setNotificationPermissionState] = useState<string>(() => getNotificationPermission());

  // Sync profile fields from authenticated profile
  useMemo(() => {
    if (customerProfile) {
      if (customerProfile.phone) setEditPhone(customerProfile.phone);
      if (customerProfile.city) {
        setEditCity(customerProfile.city);
        setSelectedCity(customerProfile.city);
      }
      if (customerProfile.address) {
        setEditAddress(customerProfile.address);
        setAddress(customerProfile.address);
      }
      if (customerProfile.plusCode) {
        setEditPlusCode(customerProfile.plusCode);
        setPlusCode(customerProfile.plusCode);
      }
    }
  }, [customerProfile]);

  const requireAuth = (callback: () => void) => {
    if (!currentUser && onSignIn) {
      onSignIn();
      return;
    }
    callback();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateProfile) return;
    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        phone: editPhone.trim(),
        city: editCity,
        address: editAddress.trim(),
        plusCode: editPlusCode.trim(),
      });
      setAddress(editAddress.trim());
      setSelectedCity(editCity);
      setPlusCode(editPlusCode.trim());
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Active in-flight order
  const activeOrder = myOrders.find(
    o => o.status !== 'RATED' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED'
  );

  // Automated Web Push & Audio chime on order status transitions
  const previousStatusRef = useRef<OrderStatus | undefined>(activeOrder?.status);
  const previousOrderIdRef = useRef<string | undefined>(activeOrder?.id);

  useEffect(() => {
    if (!activeOrder) {
      previousStatusRef.current = undefined;
      previousOrderIdRef.current = undefined;
      return;
    }

    // New active order initialized
    if (previousOrderIdRef.current !== activeOrder.id) {
      previousOrderIdRef.current = activeOrder.id;
      previousStatusRef.current = activeOrder.status;
      notifyOrderStatusChange(activeOrder, undefined);
      return;
    }

    // Active order advanced stage
    if (previousStatusRef.current !== activeOrder.status) {
      const prev = previousStatusRef.current;
      previousStatusRef.current = activeOrder.status;
      notifyOrderStatusChange(activeOrder, prev);
    }
  }, [activeOrder?.id, activeOrder?.status]);

  const handleOpenNotificationCenter = async () => {
    if (isPushSupported() && Notification.permission === 'default') {
      const res = await requestNotificationPermission();
      setNotificationPermissionState(res);
    }

    const targetOrder = activeOrder || myOrders[0] || ({
      id: 'SYS-NOTIF',
      batchId: 'BATCH-01',
      batchName: 'Jijiga Express Delivery Hub',
      mamilaId: 'MAMILA-01',
      mamilaName: 'Central Dispatch Hub',
      mamilaLocation: 'Taiwan Market, Jijiga',
      price: 0,
      totalPrice: 0,
      paymentMethod: 'COD',
      status: 'PENDING',
      placedAt: new Date().toISOString(),
      customerPhone: customerProfile?.phone || '0911234567',
      customerCity: selectedCity,
      customerAddress: address,
    } as unknown as Order);

    setCommunicationTarget({
      role: targetOrder.riderId ? 'RIDER' : 'RUNNER',
      name: targetOrder.riderName || targetOrder.runnerName || 'Central Courier Dispatch',
      phone: targetOrder.riderId ? '+251 94 555 4433' : '+251 92 888 7766',
      order: targetOrder,
      initialTab: 'notifications'
    });
  };

  const handleOpenCheckout = (batch: Batch) => {
    setSelectedBatch(batch);
    setQuantity(1);
    setSpecialInstructions('');
    if (batch.name.toLowerCase().includes('babay') || batch.category?.includes('Restaurant')) {
      setCookingInstruction('Please cook it well done, no pink inside.');
    } else {
      setCookingInstruction('');
    }
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      onSignIn?.();
      return;
    }
    if (!selectedBatch) return;
    setIsProcessing(true);
    setTxLogs([]);

    const deliveryFee = currentZone.baseFee;
    const itemSubtotal = selectedBatch.price * quantity;
    const totalCost = itemSubtotal + deliveryFee;

    const steps = [
      "BEGIN TRANSACTION [ISOLATION: SERIALIZABLE]",
      `Lock batch row ID #${selectedBatch.id}`,
      `Validate stock available: ${selectedBatch.available} >= ${quantity}`,
      `Freshness timestamp check: Valid until ${selectedBatch.expiry}`,
      `Atomically reserve ${quantity} unit(s) (${itemSubtotal.toLocaleString()} ETB)`,
      `Calculate dispatch tariff for ${selectedCity} (+${deliveryFee} ETB | Total: ${totalCost.toLocaleString()} ETB)`,
      `Attach cooking instruction: "${cookingInstruction.trim() || 'Standard'}"`,
      "Persist immutable order state & event log",
      "Assign verified runner for photo verification",
      "COMMIT TRANSACTION SUCCESSFUL"
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 240));
      setTxLogs(prev => [...prev, step]);
    }

    await new Promise(r => setTimeout(r, 400));
    onPlaceOrder(selectedBatch, paymentMethod, {
      quantity,
      deliveryFee,
      specialInstructions: specialInstructions.trim() || undefined,
      cookingInstruction: cookingInstruction.trim() || undefined,
      deliveryCity: selectedCity,
      customerAddress: address,
      customerPlusCode: plusCode,
      customerCoordinates: customerCoords,
    });

    setSelectedBatch(null);
    setIsProcessing(false);
    setActiveTab('tracking');
  };

  const handleConfirmCancel = () => {
    if (!activeOrder || !onCancelOrder) return;
    const orderBatchName = activeOrder.batchName;
    onCancelOrder(activeOrder.id);
    setShowCancelConfirm(false);
    setCancelToast(`Order for "${orderBatchName}" cancelled. Stock restored to Mamila.`);
    setTimeout(() => setCancelToast(null), 5000);
  };

  const submitRating = () => {
    if (!ratingOrder || !onRateOrder) return;
    const feedback = selectedTags.length > 0 
      ? `[${selectedTags.join(', ')}] ${ratingComment}` 
      : ratingComment;
    onRateOrder(ratingOrder.id, stars, feedback.trim() || undefined);
    setRatingOrder(null);
    setRatingComment('');
    setSelectedTags([]);
  };

  const submitDispute = () => {
    if (!disputeOrder || !onDisputeOrder) return;
    onDisputeOrder(disputeOrder.id, disputeReason, disputeComment);
    setDisputeOrder(null);
    setDisputeComment('');
  };

  const PAYMENT_PROVIDERS = [
    { id: 'COD', label: 'Cash on Delivery', sub: 'Pay the courier at handover', icon: CreditCard, color: 'text-slate-700' },
  ];

  // Serviceability Zone Check
  const currentZone = SERVICEABILITY_ZONES[selectedCity] || {
    isServiceable: true,
    zoneName: `${selectedCity} Zone`,
    baseFee: 60,
    etaMins: 30,
    minOrderEtb: 150,
  };

  // Active in-flight ride check (guardrail against conflicting duplicate active rides)
  const activeRideOrder = useMemo(() => {
    return myOrders.find(
      o => o.serviceType === 'RIDE' && ['PENDING', 'RUNNER_ASSIGNED', 'RIDER_ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)
    );
  }, [myOrders]);

  // Cart operations (one-vendor per cart rule, live revalidation, COD total)
  const handleAddToCart = (batch: Batch) => {
    const mamila = MAMILAS.find(m => m.id === batch.mamilaId);
    const mamilaName = mamila?.name || (batch as any).mamilaName || 'Local Producer';

    if (cart.vendorId && cart.vendorId !== batch.mamilaId && cart.items.length > 0) {
      setCartVendorConflict(`Your cart already contains items from "${cart.vendorName}". Clear your cart first to add items from "${mamilaName}".`);
      setIsCartOpen(true);
      return;
    }

    setCart(prev => {
      const existing = prev.items.find(i => i.batchId === batch.id);
      let updatedItems: CartItem[];
      if (existing) {
        updatedItems = prev.items.map(i => i.batchId === batch.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        updatedItems = [...prev.items, {
          id: `cart-${batch.id}-${Date.now()}`,
          batchId: batch.id,
          name: batch.name,
          price: batch.price,
          quantity: 1,
          imageUrl: batch.imageUrl,
          category: batch.category,
          mamilaId: batch.mamilaId,
          mamilaName,
        }];
      }
      const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryFee = currentZone.isServiceable ? currentZone.baseFee : 60;
      const serviceFee = 25;
      return {
        vendorId: batch.mamilaId,
        vendorName: mamilaName,
        items: updatedItems,
        subtotal,
        deliveryFee,
        serviceFee,
        total: subtotal + deliveryFee + serviceFee,
      };
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (batchId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(batchId);
      return;
    }
    setCart(prev => {
      const updated = prev.items.map(i => i.batchId === batchId ? { ...i, quantity: newQty } : i);
      const subtotal = updated.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      return {
        ...prev,
        items: updated,
        subtotal,
        total: subtotal + prev.deliveryFee + prev.serviceFee,
      };
    });
  };

  const handleRemoveCartItem = (batchId: string) => {
    setCart(prev => {
      const updated = prev.items.filter(i => i.batchId !== batchId);
      if (updated.length === 0) {
        return {
          vendorId: null,
          vendorName: null,
          items: [],
          subtotal: 0,
          deliveryFee: currentZone.isServiceable ? currentZone.baseFee : 60,
          serviceFee: 25,
          total: (currentZone.isServiceable ? currentZone.baseFee : 60) + 25,
        };
      }
      const subtotal = updated.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      return {
        ...prev,
        items: updated,
        subtotal,
        total: subtotal + prev.deliveryFee + prev.serviceFee,
      };
    });
  };

  const handleClearCart = () => {
    setCart({
      vendorId: null,
      vendorName: null,
      items: [],
      subtotal: 0,
      deliveryFee: currentZone.isServiceable ? currentZone.baseFee : 60,
      serviceFee: 25,
      total: (currentZone.isServiceable ? currentZone.baseFee : 60) + 25,
    });
    setCartVendorConflict(null);
  };

  const handleCartCheckout = async (orderPayloads: Partial<Order>[]) => {
    for (const payload of orderPayloads) {
      const batch = inventory.find(b => b.id === payload.batchId);
      if (batch) {
        onPlaceOrder(batch, 'COD', {
          quantity: payload.quantity,
          specialInstructions: payload.specialInstructions,
          deliveryCity: payload.customerCity,
          customerAddress: payload.customerAddress,
          customerPlusCode: payload.customerPlusCode,
        });
      }
    }
  };

  const handleServiceGridSelect = (service: ServiceTarget) => {
    switch (service) {
      case 'RIDE_TAXI':
      case 'RIDE_MOTO':
        if (activeRideOrder) {
          setActiveRideConflictNotice(`You already have an active ride request (#${activeRideOrder.id.slice(0, 8)}). Please view live tracking or wait for completion before booking another.`);
          setActiveTab('tracking');
          return;
        }
        requireAuth(() => setShowBookRideModal(true));
        break;
      case 'FOOD':
      case 'GROCERY':
        setCategoryFilter(service === 'GROCERY' ? 'Fresh Farm Produce' : 'ALL');
        setActiveTab('batches');
        break;
      case 'PARCEL':
        requireAuth(() => setShowBookParcelModal(true));
        break;
      case 'HOTEL':
        setShowHotelModal(true);
        break;
      case 'EEU':
        requireAuth(() => setShowBookEeuModal(true));
        break;
      case 'KHAT':
        requireAuth(() => setShowKhatModal(true));
        break;
      case 'SUPPORT':
        setShowHelpCenterModal(true);
        break;
      case 'BUSINESS':
        requireAuth(() => setShowBookParcelModal(true));
        break;
      case 'NEARBY_SERVICES':
        requireAuth(() => setShowNearbyServicesModal(true));
        break;
    }
  };

  // Filtered and sorted batches
  const filteredBatches = useMemo(() => {
    const matching = inventory.filter(b => {
      const vendor = MAMILAS.find(m => m.id === b.mamilaId);
      const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory = categoryFilter === 'ALL' || b.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    return [...matching].sort((a, b) => {
      if (sortOption === 'price-low') return a.price - b.price;
      if (sortOption === 'availability') return b.available - a.available;
      if (sortOption === 'rating') {
        const aRating = MAMILAS.find(m => m.id === a.mamilaId)?.rating || 0;
        const bRating = MAMILAS.find(m => m.id === b.mamilaId)?.rating || 0;
        return bRating - aRating;
      }
      return 0; // 'featured'
    });
  }, [inventory, searchQuery, categoryFilter, sortOption]);

  // Categories list
  const categories = ['ALL', 'Restaurant & Drinks', 'Bakery & Pastries', 'Fresh Farm Produce', 'Dairy & Eggs', 'Hotel & Restaurant', 'Khat Marketplace'];



  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {cancelToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{cancelToast}</span>
            </div>
            <button
              onClick={() => setCancelToast(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-Navigation Bar */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('batches')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'batches'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Food & Goods</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'services'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Services Grid</span>
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tracking'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>Live Tracking</span>
            {activeOrder && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Orders</span>
            <span className="font-mono text-xs text-slate-500 ml-0.5">({myOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Cart</span>
            {cart.items.length > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {cart.items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>

          {/* Help Center Trigger */}
          <button
            onClick={() => setShowHelpCenterModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer whitespace-nowrap border border-slate-300 shadow-2xs"
          >
            <Headphones className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Help</span>
          </button>

          {/* Phone OTP Login button for guests */}
          {!currentUser && (
            <button
              onClick={() => setShowPhoneOtpModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>OTP Login</span>
            </button>
          )}

          {/* Automated Notifications & Push Alerts Center Button */}
          <button
            onClick={handleOpenNotificationCenter}
            title={`Live Alerts & Web Push (${notificationPermissionState})`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer whitespace-nowrap border border-slate-300 shadow-2xs"
          >
            {notificationPermissionState === 'granted' ? (
              <div className="relative">
                <BellRing className="w-3.5 h-3.5 text-blue-600" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            ) : (
              <Bell className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span className="hidden sm:inline">Alerts</span>
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 text-xs text-slate-500 border-l border-slate-200">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setEditCity(e.target.value);
              }}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="Jijiga">Jijiga (Urban)</option>
              <option value="Babile">Babile</option>
              <option value="Kurfa Chele">Kurfa Chele</option>
              <option value="Girawa">Girawa</option>
              <option value="Badeno">Badeno</option>
              <option value="Dawee">Dawee</option>
              <option value="Mombas">Mombas</option>
              <option value="Hargeisa">Hargeisa (Airport)</option>
              <option value="Dire Dawa">Dire Dawa</option>
              <option value="Harar">Harar</option>
              <option value="Addis Ababa">Addis Ababa</option>
              <option value="Remote Somali Region Outskirts">Remote Outskirts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Horn of Africa Multi-Service Super-App Banner (Walkthrough features) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div 
          onClick={() => requireAuth(() => setShowKhatModal(true))}
          className="p-3.5 bg-gradient-to-br from-emerald-500/15 via-emerald-50 to-teal-50 border-2 border-emerald-500/60 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-md transition-all ring-2 ring-emerald-500/15 relative overflow-hidden group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
              🌿
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-slate-900 tracking-tight">Khat Marketplace</span>
                <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                  New
                </span>
              </div>
              <div className="text-[11px] text-emerald-800 font-medium line-clamp-1">Preferred Mamilas • Fresh Batches</div>
            </div>
          </div>
          <span className="text-emerald-800 font-black text-xs">Open →</span>
        </div>

        <div 
          onClick={() => setActiveTab('batches')}
          className="p-3.5 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-xs transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              🍱
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Food & Restaurant</div>
              <div className="text-[11px] text-slate-500">Hassan Wali Hotel, Local Kitchens, Farms</div>
            </div>
          </div>
          <span className="text-amber-700 font-bold text-xs">Browse →</span>
        </div>

        <div 
          onClick={() => requireAuth(() => setShowBookParcelModal(true))}
          className="p-3.5 bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-xs transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              📦
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Book Express Parcel</div>
              <div className="text-[11px] text-slate-500">Babile, Kurfa Chele, Girawa, Badeno, Dawee, Mombas & more</div>
            </div>
          </div>
          <span className="text-blue-700 font-bold text-xs">Dispatch →</span>
        </div>

        <div 
          onClick={() => requireAuth(() => setShowBookRideModal(true))}
          className="p-3.5 bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-xs transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              🚖
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Jijiga Express Taxi & Moto</div>
              <div className="text-[11px] text-slate-500">Instant ride dispatch & airport pickup</div>
            </div>
          </div>
          <span className="text-emerald-700 font-bold text-xs">Book →</span>
        </div>

        <div 
          onClick={() => requireAuth(() => setShowBookEeuModal(true))}
          className="p-3.5 bg-linear-to-r from-amber-50 to-yellow-50 border border-amber-300 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-xs transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              ⚡
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">EEU Prepaid Recharge</div>
              <div className="text-[11px] text-slate-500">13-digit meter • Round-trip custody</div>
            </div>
          </div>
          <span className="text-amber-800 font-bold text-xs">Recharge →</span>
        </div>

        <div 
          onClick={() => requireAuth(() => setShowNearbyServicesModal(true))}
          className="p-3.5 bg-linear-to-r from-teal-50 to-emerald-50 border border-teal-300 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-xs transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              🧭
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Nearby Services Radar</div>
              <div className="text-[11px] text-slate-500">Water tankers, solar tech, plumbers & errando</div>
            </div>
          </div>
          <span className="text-teal-800 font-bold text-xs">Radar →</span>
        </div>
      </div>

      {/* Active Ride Conflict Guardrail Alert */}
      {activeRideConflictNotice && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{activeRideConflictNotice}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('tracking');
                setActiveRideConflictNotice(null);
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
            >
              View Active Ride Tracking →
            </button>
            <button
              onClick={() => setActiveRideConflictNotice(null)}
              className="p-1.5 text-amber-700 hover:text-amber-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Serviceability Zone Check Banner (When user selects unserviceable outskirts) */}
      {!currentZone.isServiceable && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-950 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm">Delivery Service Unavailable in {selectedCity}</div>
              <p className="text-[11px] text-rose-800">
                {currentZone.reason || 'We do not currently operate delivery fleets in this exact location. Please select an active city center.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedCity('Jijiga')}
            className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
          >
            Switch to Jijiga Metro
          </button>
        </div>
      )}

      {/* SERVICES TAB VIEW (Full Mobile & Desktop Grid) */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <ServiceGrid 
            onSelectService={handleServiceGridSelect} 
            activeOrdersCount={myOrders.filter(o => !['RATED', 'DELIVERED', 'CANCELLED', 'DEFECT_REJECTED'].includes(o.status)).length} 
          />
          <LoyaltyCard />
        </div>
      )}

      {/* CORE INTEGRATION: DELIVERY ROUTE MAP & REAL-TIME COURIER TRACKING BANNER */}
      <DeliveryRouteMapBanner
        activeOrder={activeOrder}
        onOpenMapModal={onOpenMapPreview}
        onBookParcel={() => setShowBookParcelModal(true)}
        onSimulateStep={onSimulateNextStep}
        onOpenChat={(order) => {
          setCommunicationTarget({
            order,
            role: 'RIDER',
            name: order.riderName || 'Staff Rider',
            phone: order.customerPhone || '+251 91 123 4567',
          });
        }}
      />

      {/* TAB 1: FRESH BATCHES & FOOD DISCOVERY */}
      {activeTab === 'batches' && (
        <div className="space-y-6">
          {/* Mobile Service Grid on Home */}
          <ServiceGrid onSelectService={handleServiceGridSelect} />

          {/* Loyalty & Rewards Card */}
          <LoyaltyCard />

          {/* BANA-inspired Food Discovery Component */}
          <FoodDiscovery
            inventory={inventory}
            mamilas={MAMILAS}
            onCategorySelect={(cat) => {
              setCategoryFilter(cat);
              setActiveTab('batches');
              window.scrollTo({ top: 500, behavior: 'smooth' });
            }}
            onSearch={(query) => {
              setSearchQuery(query);
              setCategoryFilter('ALL');
              setActiveTab('batches');
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
            {/* Search and Category Filters */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Today's Fresh Batches</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>Direct producer fulfillment</span>
                    <span aria-hidden="true">·</span>
                    <span>Verified Runner tagging</span>
                    <span aria-hidden="true">·</span>
                    <span>100% freshness guarantee</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setBatchDisplayMode('grid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95 ${
                        batchDisplayMode === 'grid'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Product Grid</span>
                    </button>
                    <button
                      onClick={() => setBatchDisplayMode('gallery')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95 ${
                        batchDisplayMode === 'gallery'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mamila Proof Vault</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </button>
                  </div>

                  <div className="relative w-full sm:w-52">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search fresh harvest..."
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Category Segmented Control */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer ${
                      categoryFilter === cat 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </button>
                ))}
              </div>

              {/* Sort and Filter Bar */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <ListFilter className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sort food & batches:</span>
                </div>
                <select
                  aria-label="Sort food and delivery results"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                >
                  <option value="featured">Featured Picks</option>
                  <option value="rating">Top Rated Vendors</option>
                  <option value="price-low">Lowest Price First</option>
                  <option value="availability">Highest Stock Available</option>
                </select>
              </div>
            </div>
            
            {/* Products Display: Standard Grid vs Live Mamila Photo Proof Gallery */}
            {batchDisplayMode === 'gallery' ? (
              <div className="space-y-4">
                <MamilaGallery
                  allowUpload={false}
                  onBatchSelected={handleSelectFromGallery}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredBatches.map(batch => (
                  <div 
                    key={batch.id} 
                    className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                      batch.available > 0 
                        ? 'border-slate-200 hover:shadow-lg hover:border-slate-300 cursor-pointer' 
                        : 'border-slate-200 opacity-60'
                    }`}
                    onClick={() => batch.available > 0 && handleOpenCheckout(batch)}
                  >
                    <div className="relative">
                      <img 
                        src={batch.imageUrl} 
                        alt={batch.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-48 object-cover" 
                        onError={(e) => {
                          // Fallback gracefully
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                        {batch.category || 'Fresh Batch'}
                      </div>
                      <div className="absolute top-3 right-3 bg-white/95 text-slate-900 text-xs font-mono font-bold px-2.5 py-1 rounded-lg shadow-sm">
                        {batch.available > 0 ? `${batch.available} left` : 'Sold out'}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-slate-900 text-lg">{batch.name}</h3>
                          <span className="font-extrabold text-lg text-blue-600 font-mono tabular-nums">{batch.price} ETB</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{batch.description}</p>
                        
                        {batch.unit && (
                          <div className="text-[11px] text-slate-500 mt-2 font-medium">
                            Package size: {batch.unit}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> 
                            <span className="truncate">Mamila: {batch.mamilaId}</span>
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 text-amber-500" /> 
                            <span>{batch.expiry}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            disabled={batch.available === 0 || !currentZone.isServiceable}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(batch);
                            }}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                              batch.available > 0 && currentZone.isServiceable
                                ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 cursor-pointer' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Add to Cart</span>
                          </button>
                          <button 
                            type="button"
                            disabled={batch.available === 0 || !currentZone.isServiceable}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCheckout(batch);
                            }}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                              batch.available > 0 && currentZone.isServiceable
                                ? 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <span>Quick Order</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredBatches.length === 0 && (
                  <div className="col-span-2 p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
                    No batches matching your search query. Try searching for different items.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Checkout Drawer */}
          <div className="lg:col-span-4">
            <AnimatePresence mode="wait">
              {selectedBatch ? (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 15 }} 
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-24 space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-900">Atomic Reservation</h3>
                    <button 
                      onClick={() => setSelectedBatch(null)} 
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 p-1 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  {/* Selected Batch Header */}
                  <div className="flex gap-3 pb-3 border-b border-slate-100">
                    <img 
                      src={selectedBatch.imageUrl} 
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200" 
                      alt="" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">{selectedBatch.name}</h4>
                      <p className="text-xs text-blue-600 font-semibold font-mono">{selectedBatch.price} ETB / bundle</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Expires: {selectedBatch.expiry}</p>
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Quantity</span>
                        <span className="text-[10px] text-slate-500">{selectedBatch.available} bundles left in batch</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 disabled:opacity-40 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold font-mono text-sm w-5 text-center tabular-nums">{quantity}</span>
                        <button 
                          type="button"
                          onClick={() => setQuantity(Math.min(selectedBatch.available, quantity + 1))}
                          disabled={quantity >= selectedBatch.available}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 disabled:opacity-40 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Quantity Presets */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] text-slate-400 font-medium">Quick Select:</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[1, 2, 3, 5, 10].filter(n => n <= selectedBatch.available).map(qtyPreset => (
                          <button
                            key={qtyPreset}
                            type="button"
                            onClick={() => setQuantity(qtyPreset)}
                            className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-bold transition-all cursor-pointer ${
                              quantity === qtyPreset
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {qtyPreset}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cooking & Preparation Instructions (from walkthrough video at 01:04) */}
                  <div className="space-y-1.5 p-3 bg-amber-50/60 rounded-xl border border-amber-200/70">
                    <label className="text-xs font-bold text-amber-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                        Cooking & Preparation Instruction
                      </span>
                      <span className="text-[10px] text-amber-700 font-semibold">e.g. Hassan Wali Hotel</span>
                    </label>
                    <textarea
                      value={cookingInstruction}
                      onChange={(e) => setCookingInstruction(e.target.value)}
                      placeholder='e.g., "Please cook it well done, no pink inside."'
                      rows={2}
                      className="w-full text-xs p-2.5 rounded-lg border border-amber-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 font-medium"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {[
                        "Please cook it well done, no pink inside.",
                        "Pack with extra lime & fresh mint",
                        "Mild berbere, no spicy chili",
                        "Separate cold bottled drinks"
                      ].map(pill => (
                        <button
                          key={pill}
                          type="button"
                          onClick={() => setCookingInstruction(pill)}
                          className="text-[10px] bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        >
                          "{pill.length > 28 ? pill.slice(0, 28) + '...' : pill}"
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* General Delivery Handling Note */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      Delivery Driver Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder='e.g., "Call upon arrival at main gate" or "Leave with receptionist"'
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>

                  {/* Destination City & Plus Code */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        Delivery Destination City
                      </label>
                      <span className="text-[11px] font-mono text-blue-600 font-semibold">
                        Zone Tariff: +{currentZone.baseFee} ETB
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {CITIES.map(c => {
                        const zone = SERVICEABILITY_ZONES[c.name];
                        const fee = zone?.baseFee ?? 60;
                        const eta = zone?.etaMins ?? 30;
                        const isSelected = selectedCity === c.name;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCity(c.name);
                              setPlusCode(`${c.defaultPlusCode} ${c.name}`);
                            }}
                            className={`p-2.5 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer relative ${
                              isSelected 
                                ? 'border-blue-600 bg-blue-50/90 text-blue-950 ring-1 ring-blue-600/30 shadow-xs' 
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold truncate">{c.name}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                +{fee} ETB
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-normal mt-1">
                              <span className="truncate">{c.region.split(',')[0]}</span>
                              <span className="font-mono text-slate-500">~{eta}m</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address / landmark"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />

                    {/* Interactive Dropoff Map Preview */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between pb-1.5">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <MapIcon className="w-3.5 h-3.5 text-blue-600" />
                          Doorstep Pinpoint Map Preview
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCheckoutMap(prev => !prev)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                        >
                          {showCheckoutMap ? 'Hide Map' : 'Show Map'}
                        </button>
                      </div>

                      {showCheckoutMap && (
                        <DeliveryLocationPickerMap
                          city={selectedCity}
                          initialCoordinates={customerCoords}
                          onLocationSelect={(coords, derivedCode) => {
                            setCustomerCoords(coords);
                            setPlusCode(derivedCode);
                          }}
                          heightClass="h-[180px]"
                        />
                      )}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      Payment Method
                    </label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {PAYMENT_PROVIDERS.map(method => (
                        <label 
                          key={method.id} 
                          className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            paymentMethod === method.id 
                              ? 'border-blue-600 bg-blue-50 text-blue-900' 
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="payment" 
                            checked={paymentMethod === method.id} 
                            onChange={() => setPaymentMethod(method.id as PaymentMethod)} 
                            className="hidden" 
                          />
                          <method.icon className={`w-4 h-4 ${method.color}`} />
                          <div className="flex-1">
                            <span className="font-semibold text-xs block">{method.label}</span>
                            <span className="text-[10px] text-slate-500">{method.sub}</span>
                          </div>
                          {paymentMethod === method.id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Real-Time Price & Delivery Preview */}
                  {(() => {
                    const unitPrice = selectedBatch.price;
                    const itemSubtotal = unitPrice * quantity;
                    const deliveryFee = currentZone.baseFee;
                    const totalCost = itemSubtotal + deliveryFee;
                    const isBelowMin = itemSubtotal < currentZone.minOrderEtb;

                    return (
                      <div className="p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 rounded-2xl border border-blue-200/80 text-xs space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="font-bold text-slate-900 tracking-tight">Real-Time Price & Tariff Preview</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                            {selectedCity} Express
                          </span>
                        </div>

                        {/* Items Subtotal */}
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <span className="font-medium">Item Subtotal</span>
                            <span className="text-[11px] text-slate-400 font-mono">({quantity} × {unitPrice.toLocaleString()} ETB)</span>
                          </span>
                          <span className="font-bold font-mono text-slate-900 tabular-nums">
                            {itemSubtotal.toLocaleString()} ETB
                          </span>
                        </div>

                        {/* Delivery Corridor Fee */}
                        <div className="flex justify-between items-center text-slate-700">
                          <div>
                            <div className="font-medium text-slate-800">
                              Delivery to {selectedCity}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <span>{currentZone.zoneName}</span>
                              <span>•</span>
                              <span className="font-mono text-blue-600 font-semibold">~{currentZone.etaMins} mins ETA</span>
                            </div>
                          </div>
                          <span className="font-bold font-mono text-blue-700 tabular-nums">
                            +{deliveryFee} ETB
                          </span>
                        </div>

                        {/* Minimum Order Advisory (if applicable) */}
                        {isBelowMin && (
                          <div className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center justify-between">
                            <span>Standard zone min: {currentZone.minOrderEtb} ETB</span>
                            <span className="font-semibold text-amber-700">Small batch tariff applied</span>
                          </div>
                        )}

                        {/* Total Cost Highlight */}
                        <div className="flex justify-between items-baseline pt-2.5 border-t border-blue-200/80">
                          <div>
                            <span className="text-slate-900 font-extrabold text-sm block">Total Due</span>
                            <span className="text-[10px] text-slate-500">Subtotal + Doorstep courier included</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black font-mono text-blue-700 tabular-nums">
                              {totalCost.toLocaleString()} ETB
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Transaction Terminal Logs or Place Order Button */}
                  {isProcessing ? (
                    <div className="bg-slate-950 text-emerald-400 p-3.5 rounded-xl font-mono text-[11px] overflow-hidden h-44 flex flex-col justify-end border border-slate-800">
                      {txLogs.map((log, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                          <span className="text-slate-500">&gt;</span> {log}
                        </motion.div>
                      ))}
                      <div className="animate-pulse text-emerald-500 mt-1">_ executing atomic reservation...</div>
                    </div>
                  ) : (
                    <div>
                      {currentUser ? (
                        <button 
                          onClick={handleCheckout} 
                          className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          Confirm Order • {((selectedBatch.price * quantity) + currentZone.baseFee).toLocaleString()} ETB
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={onSignIn} 
                          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                          <LogIn className="w-4 h-4" />
                          Sign In with Google to Complete Order
                        </button>
                      )}
                      <p className="text-[11px] text-slate-500 text-center font-medium mt-2">
                        To request custom delivery features, ask support.
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-300 text-center text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm">Cart is Empty</h4>
                  <p className="text-xs text-slate-500">
                    Select any fresh batch from the left to configure quantity, special cooking instructions, and delivery location.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    )}

      {/* TAB 2: LIVE ORDER TRACKING & TRANSIT SIMULATOR */}
      {activeTab === 'tracking' && (
        <div className="max-w-3xl mx-auto space-y-6">
          {!currentUser ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Bike className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sign In to Track Deliveries</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                  Real-time GPS tracking and courier transit milestone updates require Google authentication.
                </p>
              </div>
              <button
                type="button"
                onClick={onSignIn}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs inline-flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In with Google
              </button>
            </div>
          ) : !activeOrder ? (
            <div className="space-y-6">
              <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Bike className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">No In-Flight Orders</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                    You don't have an active batch delivery in progress. Select a batch to order or review past orders below.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('batches')}
                    className="px-6 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
                  >
                    Browse Fresh Batches
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    Manage Past Orders
                  </button>
                </div>
              </div>

              {/* Embedded Simplified Order History for quick access */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Recent Completed & Cancelled Orders</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Full History View &rarr;
                  </button>
                </div>
                <SimplifiedOrderHistory
                  currentUser={currentUser}
                  fallbackOrders={myOrders}
                  inventory={inventory}
                  onOpenReceipt={(order) => setReceiptOrder(order)}
                  onOpenMapPreview={onOpenMapPreview}
                  onRateOrder={(order) => setRatingOrder(order)}
                  onDisputeOrder={(order) => setDisputeOrder(order)}
                  onReOrder={(batch) => {
                    handleOpenCheckout(batch);
                    setActiveTab('batches');
                  }}
                  onSignIn={onSignIn}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Live Order Fulfillment</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>Order #{activeOrder.id}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-blue-600">{activeOrder.status.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                {/* Instant Simulation Stepper Button for Testing */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">
                    To request custom delivery features, ask support.
                  </span>
                  {onSimulateNextStep && (
                    <button
                      onClick={() => onSimulateNextStep(activeOrder.id)}
                      className="px-3.5 py-1.5 bg-slate-900 text-emerald-400 border border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                      title="Advance order through simulation pipeline"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      Advance Pipeline State
                    </button>
                  )}
                  {activeOrder.status === 'RUNNER_ASSIGNED' && (
                    <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Can Cancel
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
                {/* Header Summary */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-xl text-slate-900">{activeOrder.batchName}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Mamila: {activeOrder.mamilaName} ({activeOrder.mamilaLocation})
                    </p>
                    <p className="text-xs text-slate-500">
                      Destination: {activeOrder.customerAddress || activeOrder.customerCity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                      {activeOrder.totalPrice || activeOrder.price} ETB
                    </p>
                    <span className="text-xs text-slate-500 block font-medium mt-0.5">
                      {activeOrder.paymentMethod}
                    </span>
                  </div>
                </div>

                {/* Special Instructions Note */}
                {activeOrder.specialInstructions && (
                  <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2 text-xs text-amber-950">
                    <MessageSquare className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Your Instructions to Runner & Rider: </span>
                      <span>"{activeOrder.specialInstructions}"</span>
                    </div>
                  </div>
                )}

                {/* Courier Voice Delivery Note */}
                {activeOrder.courierDeliveryNote && (
                  <div className="p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-xs text-indigo-950">
                    <span className="p-1 rounded-md bg-indigo-600 text-white mt-0.5 shadow-2xs shrink-0">
                      <Mic className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider">
                          Courier Audio Delivery Note ({activeOrder.courierNoteAuthor || 'Courier'})
                        </span>
                        {activeOrder.courierNoteUpdatedAt && (
                          <span className="text-[10px] text-indigo-500 font-mono">
                            {new Date(activeOrder.courierNoteUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-indigo-900 italic font-medium">"{activeOrder.courierDeliveryNote}"</p>
                    </div>
                  </div>
                )}

                {/* 4-Stage Intuitive Fulfillment Progress Stepper (Pending, Runner, Rider, Delivered) */}
                <div className="space-y-4">
                  <OrderProgressStepper order={activeOrder} variant="expanded" />

                  {/* Supplemental EEU Custody Stepper if EEU Recharge */}
                  {activeOrder.serviceType === 'EEU_RECHARGE' && (
                    <div className="pt-2">
                      <div className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-600" />
                        <span>Prepaid Card Physical Custody Chain:</span>
                      </div>
                      <EeuCustodyStepper order={activeOrder} />
                    </div>
                  )}
                </div>

                {/* Interactive Google Maps Order Map Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-blue-600" />
                      Live Route Map Preview & Courier Telemetry
                    </span>
                    {onOpenMapPreview && (
                      <button
                        onClick={() => onOpenMapPreview(activeOrder)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        Expand Fullscreen Map
                      </button>
                    )}
                  </div>

                  <OrderMapPreview 
                    order={activeOrder} 
                    heightClass="h-[360px]"
                    onExpandFullscreen={onOpenMapPreview ? () => onOpenMapPreview(activeOrder) : undefined}
                    showControls={true}
                  />
                </div>

                {/* Assigned Personnel & Contact Section */}
                {activeOrder.serviceType === 'RIDE' ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Driver</span>
                      <span className="text-sm font-bold text-slate-900">
                        {activeOrder.riderName || 'Awaiting Driver Acceptance...'}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {activeOrder.riderId ? 'Jijiga Express Verified Fleet Driver' : 'Request broadcast to verified drivers in ' + (activeOrder.customerCity || 'Jijiga')}
                      </span>
                    </div>
                    {activeOrder.riderId ? (
                      <button 
                        onClick={() => setCommunicationTarget({ 
                          role: 'RIDER', 
                          name: activeOrder.riderName || 'Fleet Driver', 
                          phone: activeOrder.riderPhone || 'In-App Encrypted Channel',
                          order: activeOrder
                        })}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                        title="Contact Driver"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Chat with Driver</span>
                      </button>
                    ) : (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Waiting for Driver
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Runner</span>
                        <span className="text-xs font-bold text-slate-900">
                          {activeOrder.runnerName || (activeOrder.runnerId ? 'Staff Runner' : 'Awaiting Runner Claim...')}
                        </span>
                        <span className="text-[11px] text-slate-500 block">Bundle Quality & Photo Verifier</span>
                      </div>
                      {activeOrder.runnerId ? (
                        <button 
                          onClick={() => setCommunicationTarget({ 
                            role: 'RUNNER', 
                            name: activeOrder.runnerName || 'Staff Runner', 
                            phone: activeOrder.runnerPhone || 'In-App Encrypted Channel',
                            order: activeOrder
                          })}
                          className="p-2 bg-white rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                          title="Contact Runner"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Chat</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md font-semibold">
                          In Dispatch Pool
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Rider</span>
                        <span className="text-xs font-bold text-slate-900">
                          {activeOrder.riderName || (activeOrder.riderId ? 'Staff Rider' : 'Matching courier rider...')}
                        </span>
                        <span className="text-[11px] text-slate-500 block">Express Delivery Courier</span>
                      </div>
                      {activeOrder.riderId ? (
                        <button 
                          onClick={() => setCommunicationTarget({ 
                            role: 'RIDER', 
                            name: activeOrder.riderName || 'Staff Rider', 
                            phone: activeOrder.riderPhone || 'In-App Encrypted Channel',
                            order: activeOrder
                          })}
                          className="p-2 bg-white rounded-lg border border-slate-200 text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                          title="Contact Rider"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Chat</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Assigning on pickup...</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Driver Vernacular Quick-Chat & SMS Bridge Card */}
                <div className="p-4 bg-gradient-to-r from-blue-50/90 via-sky-50/90 to-indigo-50/90 rounded-2xl border border-blue-200/90 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">Driver Vernacular Quick-Chat & SMS Bridge</h4>
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Bridge
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Af-Soomaali · አማርኛ · English 1-Tap Quick-Pills, Direct Voice Notes & Encrypted Phone Relay
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setCommunicationTarget({
                          role: activeOrder.riderId ? 'RIDER' : 'RUNNER',
                          name: activeOrder.riderName || activeOrder.runnerName || 'Courier',
                          phone: (activeOrder.riderId ? activeOrder.riderPhone : activeOrder.runnerPhone) || 'In-App Encrypted Channel',
                          order: activeOrder,
                          initialTab: 'chat'
                        })}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Quick-Chat & Audio</span>
                      </button>

                      <button
                        onClick={() => setCommunicationTarget({
                          role: activeOrder.riderId ? 'RIDER' : 'RUNNER',
                          name: activeOrder.riderName || activeOrder.runnerName || 'Courier',
                          phone: (activeOrder.riderId ? activeOrder.riderPhone : activeOrder.runnerPhone) || 'In-App Encrypted Channel',
                          order: activeOrder,
                          initialTab: 'notifications'
                        })}
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        title="Configure Web Push, SMS & WhatsApp automated dispatch alerts"
                      >
                        <BellRing className="w-3.5 h-3.5 text-blue-600" />
                        <span>Push & SMS Alerts</span>
                      </button>
                    </div>
                  </div>

                  {/* Latest Message Preview snippet */}
                  {(() => {
                    const thread = (orderMessages && orderMessages[activeOrder.id]) || [];
                    const latest = thread[thread.length - 1];
                    if (!latest) return null;
                    return (
                      <div 
                        onClick={() => setCommunicationTarget({
                          role: activeOrder.riderId ? 'RIDER' : 'RUNNER',
                          name: activeOrder.riderName || activeOrder.runnerName || 'Courier',
                          phone: activeOrder.riderId ? '+251 94 555 4433' : '+251 92 888 7766',
                          order: activeOrder
                        })}
                        className="p-2.5 bg-white/95 rounded-xl border border-blue-200/80 flex items-center justify-between gap-3 text-xs hover:border-blue-400 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${
                            latest.senderRole === 'RIDER' ? 'bg-emerald-100 text-emerald-800' :
                            latest.senderRole === 'RUNNER' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {latest.senderName}
                          </span>
                          <span className="text-slate-700 truncate font-medium">
                            {latest.isVoiceNote ? `🎙️ ${latest.text}` : `"${latest.text}"`}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{latest.timestamp}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Cancel Order Section (Only for RUNNER_ASSIGNED status) */}
                {activeOrder.status === 'RUNNER_ASSIGNED' && (
                  <div className="pt-2">
                    {!showCancelConfirm ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">Need to cancel this order?</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Before the runner verifies and tags the bundle, you can cancel and release stock back to the Mamila.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowCancelConfirm(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 hover:text-rose-800 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel Order
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-rose-50/80 rounded-xl border border-rose-200 text-rose-950 space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-rose-900">Confirm Order Cancellation</h4>
                            <p className="text-xs text-rose-700 mt-1">
                              Cancel Order #{activeOrder.id.toUpperCase()}? Your {activeOrder.quantity || 1} bundle(s) will be restored to available stock.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={() => setShowCancelConfirm(false)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            Keep Order
                          </button>
                          <button
                            onClick={handleConfirmCancel}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            Yes, Cancel Order
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ORDER HISTORY & RECEIPTS */}
      {activeTab === 'history' && (
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Format Toggle Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 pl-2">
              <History className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">View Format:</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setHistoryViewFormat('simplified')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyViewFormat === 'simplified'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Simplified List
              </button>
              <button
                type="button"
                onClick={() => setHistoryViewFormat('detailed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyViewFormat === 'detailed'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Detailed Management View
              </button>
            </div>
          </div>

          {/* Render Active View Format */}
          {historyViewFormat === 'simplified' ? (
            <SimplifiedOrderHistory
              currentUser={currentUser}
              fallbackOrders={myOrders}
              inventory={inventory}
              onOpenReceipt={(order) => setReceiptOrder(order)}
              onOpenMapPreview={onOpenMapPreview}
              onRateOrder={(order) => setRatingOrder(order)}
              onDisputeOrder={(order) => setDisputeOrder(order)}
              onReOrder={(batch) => {
                handleOpenCheckout(batch);
                setActiveTab('batches');
              }}
              onSignIn={onSignIn}
            />
          ) : (
            <OrderHistory
              currentUser={currentUser}
              fallbackOrders={myOrders}
              inventory={inventory}
              onOpenReceipt={(order) => setReceiptOrder(order)}
              onOpenWhatsApp={(order) => setWhatsAppOrder(order)}
              onOpenMapPreview={onOpenMapPreview}
              onRateOrder={(order) => setRatingOrder(order)}
              onDisputeOrder={(order) => setDisputeOrder(order)}
              onReOrder={(batch) => {
                handleOpenCheckout(batch);
                setActiveTab('batches');
              }}
              onCancelOrder={onCancelOrder}
              onSignIn={onSignIn}
            />
          )}
        </div>
      )}

      {/* TAB 4: PROFILE & SAVED ADDRESSES */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {!currentUser ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Customer Account & Profile</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                Sign in with your Google account to view your verified account UID, save default delivery addresses, and manage mobile payment methods.
              </p>
              <button
                type="button"
                onClick={onSignIn}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In with Google
              </button>
            </div>
          ) : (
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-2xs" 
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-bold font-mono shadow-2xs">
                    {(customerProfile?.displayName || currentUser.displayName || currentUser.email || 'CU').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-slate-900 truncate">
                    {customerProfile?.displayName || currentUser.displayName || 'Customer Account'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono truncate">{currentUser.email}</p>
                  <div className="flex items-center gap-2 text-[11px] font-medium mt-1">
                    <span className="text-slate-400 font-mono">UID: {currentUser.uid.slice(0, 12)}...</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                      Role: {customerProfile?.role || 'Customer'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Profile & Saved Address Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">Delivery Address & Contact Preferences</h4>
                  {profileSaveSuccess && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Saved to Cloud Firestore!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Contact Phone Number</label>
                    <input 
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+251 91 123 4567"
                      className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Primary City</label>
                    <select
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    >
                      {CITIES.map(c => (
                        <option key={c.id} value={c.name}>{c.name} ({c.region})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Doorstep Street Address & Landmarks</label>
                  <input 
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Kebele 04, near Central Plaza, Jijiga"
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Plus Code / Digital Pin</label>
                  <input 
                    type="text"
                    value={editPlusCode}
                    onChange={(e) => setEditPlusCode(e.target.value)}
                    placeholder="8F2P+5H Jijiga"
                    className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isSavingProfile ? 'Saving...' : 'Save Profile & Address'}</span>
                  </button>
                </div>
              </form>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-sm text-slate-900">Supported Mobile Payment Methods</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { name: 'Telebirr', desc: '*127# Mobile Pay' },
                    { name: 'Zaad', desc: 'Telesom Money' },
                    { name: 'eBIRR', desc: '*841# Wallet' },
                    { name: 'CBE Birr', desc: 'Commercial Bank' },
                  ].map(w => (
                    <div key={w.name} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                      <span className="font-semibold text-xs text-slate-900 block">{w.name}</span>
                      <span className="text-[10px] text-slate-500 block">{w.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECEIPT MODAL */}
      <AnimatePresence>
        {receiptOrder && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Digital Delivery Receipt</h3>
                  <p className="text-xs text-slate-500 font-mono">Order #{receiptOrder.id}</p>
                </div>
                <button onClick={() => setReceiptOrder(null)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold">{receiptOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination:</span>
                  <span className="font-semibold">{receiptOrder.customerCity} ({receiptOrder.customerPlusCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fulfilled By Mamila:</span>
                  <span className="font-semibold">{receiptOrder.mamilaName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Gateway:</span>
                  <span className="font-semibold">{receiptOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Verification Seal:</span>
                  <span className="font-mono text-emerald-600 font-bold">{receiptOrder.runnerTagId || 'TAG-ET-91820'}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{receiptOrder.quantity || 1}x {receiptOrder.batchName}:</span>
                  <span className="font-mono tabular-nums">{receiptOrder.price} ETB</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Regional Delivery Tariff:</span>
                  <span className="font-mono tabular-nums">{receiptOrder.deliveryFee || 150} ETB</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                  <span>Total Paid:</span>
                  <span className="font-mono text-blue-600 tabular-nums">{receiptOrder.totalPrice || receiptOrder.price} ETB</span>
                </div>
              </div>

              {driveSaveSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  <span>{driveSaveSuccess}</span>
                </div>
              )}

              {driveSaveError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium text-center flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{driveSaveError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setDriveSaving(true);
                      setDriveSaveError(null);
                      let activeToken = await getAccessToken();
                      if (!activeToken) {
                        const res = await googleSignIn();
                        activeToken = res?.accessToken || null;
                      }
                      if (!activeToken) throw new Error('Google Sign-In was cancelled or failed.');
                      await uploadOrderReceiptToDrive(activeToken, receiptOrder);
                      setDriveSaveSuccess('Archived to Google Drive folder!');
                      setTimeout(() => setDriveSaveSuccess(null), 3500);
                    } catch (err: any) {
                      console.error('Drive save error:', err);
                      setDriveSaveError(err.message || 'Could not archive to Google Drive');
                      setTimeout(() => setDriveSaveError(null), 5000);
                    } finally {
                      setDriveSaving(false);
                    }
                  }}
                  disabled={driveSaving}
                  className="flex-1 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Archive official delivery receipt to Google Drive"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-700" />
                  <span>{driveSaving ? 'Saving...' : 'Save to Google Drive'}</span>
                </button>

                <button
                  onClick={() => setReceiptOrder(null)}
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RATING MODAL */}
      <AnimatePresence>
        {ratingOrder && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Rate Your Experience</h3>
                  <p className="text-xs text-slate-500">Order #{ratingOrder.id} · {ratingOrder.batchName}</p>
                </div>
                <button onClick={() => setRatingOrder(null)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Star Selector */}
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStars(val)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star className={`w-8 h-8 ${val <= stars ? 'fill-amber-400' : 'text-slate-200'}`} />
                  </button>
                ))}
              </div>

              {/* Quick Tags */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">What went great?</span>
                <div className="flex flex-wrap gap-1.5">
                  {["Crisp & Fresh", "Speedy Delivery", "Friendly Courier", "Secure Packaging", "As Requested"].map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTags(prev => 
                          isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                        )}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text comment */}
              <div>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Share details about the quality of the batch and delivery..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRatingOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRating}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs cursor-pointer"
                >
                  Submit Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DISPUTE MODAL */}
      <AnimatePresence>
        {disputeOrder && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Report an Issue / Dispute</h3>
                    <p className="text-xs text-slate-500">Order #{disputeOrder.id}</p>
                  </div>
                </div>
                <button onClick={() => setDisputeOrder(null)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Reason for Dispute</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Damaged item packaging">Damaged item packaging</option>
                  <option value="Missing items from bundle">Missing items from bundle</option>
                  <option value="Batch spoiled or past expiry">Batch spoiled or past expiry</option>
                  <option value="Excessive delivery delay">Excessive delivery delay</option>
                  <option value="Wrong batch delivered">Wrong batch delivered</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Detailed Explanation</label>
                <textarea
                  value={disputeComment}
                  onChange={(e) => setDisputeComment(e.target.value)}
                  placeholder="Describe what went wrong with your bundle or delivery..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDisputeOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={submitDispute}
                  disabled={!disputeComment.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-xs cursor-pointer"
                >
                  Submit Dispute Claim
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRIVER & RUNNER VERNACULAR COMMUNICATION BRIDGE MODAL */}
      {communicationTarget && (
        <CommunicationBridgeModal
          isOpen={!!communicationTarget}
          onClose={() => setCommunicationTarget(null)}
          order={communicationTarget.order}
          currentUserRole="CUSTOMER"
          targetRole={communicationTarget.role}
          targetName={communicationTarget.name}
          targetPhone={communicationTarget.phone}
          messages={(orderMessages && orderMessages[communicationTarget.order.id]) || []}
          onSendMessage={onSendMessage || (() => {})}
          initialTab={communicationTarget.initialTab}
        />
      )}
      {/* BOOK PARCEL MODAL */}
      <BookParcelModal
        isOpen={showBookParcelModal}
        onClose={() => setShowBookParcelModal(false)}
        onBookParcel={(order) => {
          onBookParcel?.(order);
          setActiveTab('tracking');
        }}
        senderProfile={{
          name: customerProfile?.displayName || 'Customer',
          phone: customerProfile?.phone || '',
          city: customerProfile?.city || selectedCity,
          address: customerProfile?.address || address,
          plusCode: customerProfile?.plusCode || plusCode,
          ...(customerProfile ? { uid: customerProfile.uid } : {}),
        } as any}
      />

      {/* BOOK RIDE MODAL */}
      <BookRideModal
        isOpen={showBookRideModal}
        onClose={() => setShowBookRideModal(false)}
        onBookRide={(order) => {
          onBookRide?.(order);
          setActiveTab('tracking');
        }}
        customerProfile={{
          name: customerProfile?.displayName || 'Customer',
          phone: customerProfile?.phone || '',
          city: customerProfile?.city || selectedCity,
          ...(customerProfile ? { uid: customerProfile.uid } : {}),
        } as any}
      />

      {/* BOOK EEU PREPAID ELECTRICITY RECHARGE MODAL */}
      <BookEeuModal
        isOpen={showBookEeuModal}
        onClose={() => setShowBookEeuModal(false)}
        customerProfile={{
          name: customerProfile?.displayName || 'Customer',
          phone: customerProfile?.phone || '',
          city: customerProfile?.city || selectedCity,
          address: customerProfile?.address || address,
          plusCode: customerProfile?.plusCode || plusCode,
          ...(customerProfile ? { uid: customerProfile.uid } : {}),
        } as any}
        onSubmit={(order) => {
          onBookEeu?.(order);
          setActiveTab('tracking');
        }}
      />

      {/* NEW SERVICE A: KHAT MARKETPLACE MODAL (PRESERVE PREFERRED MAMILA RELATIONSHIP) */}
      <KhatMarketplaceModal
        isOpen={showKhatModal}
        onClose={() => setShowKhatModal(false)}
        mamilas={MAMILAS}
        inventory={inventory}
        customerProfile={{
          name: customerProfile?.displayName || 'Customer',
          phone: customerProfile?.phone || '',
          city: customerProfile?.city || selectedCity,
          address: customerProfile?.address || address,
          plusCode: customerProfile?.plusCode || plusCode,
          ...(customerProfile ? { uid: customerProfile.uid } : {}),
        } as any}
        onConfirmOrder={(order) => {
          onBookKhat?.(order);
          setActiveTab('tracking');
        }}
      />

      {/* WHATSAPP DISPATCH & SHARE MODAL */}
      <WhatsAppDispatchModal
        isOpen={Boolean(whatsAppOrder)}
        onClose={() => setWhatsAppOrder(null)}
        order={whatsAppOrder}
      />

      {/* MOBILE BOTTOM NAVIGATION */}
      <BottomNav
        activeTab={
          activeTab === 'batches' ? 'home'
          : activeTab === 'services' ? 'services'
          : activeTab === 'history' ? 'orders'
          : activeTab === 'profile' ? 'profile'
          : 'home'
        }
        onSelectTab={(tab) => {
          if (tab === 'home') setActiveTab('batches');
          else if (tab === 'services') setActiveTab('services');
          else if (tab === 'orders') setActiveTab('history');
          else if (tab === 'help') setShowHelpCenterModal(true);
          else if (tab === 'profile') setActiveTab('profile');
        }}
        cartItemCount={cart.items.reduce((s, i) => s + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        activeOrdersCount={myOrders.filter(o => !['RATED', 'DELIVERED', 'CANCELLED', 'DEFECT_REJECTED'].includes(o.status)).length}
      />

      {/* MULTI-ITEM CART DRAWER */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        inventory={inventory}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onCheckout={handleCartCheckout}
        customerProfile={{
          uid: customerProfile?.uid || currentUser?.uid,
          id: customerProfile?.uid || currentUser?.uid,
          name: customerProfile?.displayName || currentUser?.displayName || 'Customer',
          phone: customerProfile?.phone || editPhone,
          city: selectedCity,
          address: address,
          plusCode: plusCode,
        }}
      />

      {/* HOTEL BOOKING BOUNDED SERVICE MODAL */}
      <HotelBookingModal
        isOpen={showHotelModal}
        onClose={() => setShowHotelModal(false)}
        customerProfile={{
          name: customerProfile?.displayName || currentUser?.displayName || 'Customer',
          phone: customerProfile?.phone || editPhone,
          city: selectedCity,
        }}
        onConfirmReservation={(res) => {
          setHotelReservations(prev => [res, ...prev]);
        }}
      />

      {/* UNIFIED CATEGORIZED HELP CENTER MODAL */}
      <HelpCenterModal
        isOpen={showHelpCenterModal}
        onClose={() => setShowHelpCenterModal(false)}
        orders={myOrders}
        customerProfile={{
          name: customerProfile?.displayName || currentUser?.displayName || 'Customer',
          phone: customerProfile?.phone || editPhone,
          city: selectedCity,
        }}
      />

      {/* NEARBY SERVICES RADAR & DISPATCH MODAL */}
      <NearbyServicesModal
        isOpen={showNearbyServicesModal}
        onClose={() => setShowNearbyServicesModal(false)}
        customerProfile={{
          name: customerProfile?.displayName || currentUser?.displayName || 'Customer',
          phone: customerProfile?.phone || editPhone,
          city: selectedCity,
          address: address,
          plusCode: plusCode,
          coordinates: customerCoords,
        }}
        onConfirmOrder={(order) => {
          if (onBookNearbyService) {
            onBookNearbyService(order);
          } else {
            const batch: Batch = {
              id: order.batchId || 'nearby_svc',
              mamilaId: order.mamilaId || 'nearby_provider',
              name: order.batchName || 'Nearby Service Dispatch',
              description: order.specialInstructions || 'On-Demand Local Service',
              price: order.price || 200,
              available: 99,
              expiry: 'Today',
              imageUrl: '/src/assets/images/nearby_water_service_1793264616951.jpg',
            };
            onPlaceOrder(batch, order.paymentMethod || 'TELEBIRR', {
              quantity: 1,
              specialInstructions: order.specialInstructions,
              deliveryCity: order.customerCity,
              customerAddress: order.customerAddress,
              customerPlusCode: order.customerPlusCode,
              customerCoordinates: order.customerCoordinates,
            });
          }
          setActiveTab('tracking');
        }}
      />

      {/* PHONE-FIRST OTP ONBOARDING MODAL */}
      <PhoneOtpModal
        isOpen={showPhoneOtpModal}
        onClose={() => setShowPhoneOtpModal(false)}
        onLoginSuccess={(prof) => {
          onUpdateProfile?.({
            displayName: prof.displayName,
            phone: prof.phone,
            role: 'customer',
          });
        }}
        onSwitchToGoogleAuth={onSignIn}
      />
    </div>
  );
}

