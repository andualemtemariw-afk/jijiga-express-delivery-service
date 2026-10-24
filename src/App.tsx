import { Suspense, useState, useEffect } from 'react';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { APIProvider } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_LIBRARIES: ('marker' | 'places' | 'routes' | 'geometry' | 'visualization')[] = ['marker', 'places', 'routes', 'geometry', 'visualization'];
import { User } from 'firebase/auth';
import { Role, Order, Batch, Mamila, PaymentMethod, ChatMessage, AppUserProfile } from './types';
import { INITIAL_BATCHES, MAMILAS } from './data';
import { INITIAL_ORDER_CHATS } from './data/vernacularPhrases';
import { MapPreviewModal } from './components/map/MapPreviewModal';
import { UpdateApiKeyModal } from './components/map/UpdateApiKeyModal';
import { GoogleDriveSyncModal } from './components/drive/GoogleDriveSyncModal';
import { GmailNotificationModal } from './components/gmail/GmailNotificationModal';
import { AuthModal } from './components/auth/AuthModal';
import { subscribeToNetworkStatus, isCapacitorAndroid } from './services/googleAuth';
import { useAuth } from './context/AuthContext';
import { 
  claimOrderAsRunner, 
  claimOrderAsRider, 
  adminReassignOrder 
} from './services/dispatchService';
import { 
  subscribeToOrdersByRole, 
  saveOrderToFirestore, 
  updateOrderInFirestore, 
  cancelOrderInFirestore,
  saveChatMessageToFirestore, 
  logDeliveryEventToFirestore, 
  generateOrderId,
  subscribeToFirestoreBatches,
  subscribeToFirestoreMamilas
} from './services/firestoreSync';
import { MAMILA_COORDINATES } from './utils/geo';
import { 
  Package2, 
  Users, 
  Bike, 
  Shield, 
  ShoppingBag, 
  Store, 
  KeyRound, 
  HardDrive, 
  Mail, 
  LogIn, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  Database, 
  Flame, 
  UserCheck,
  UserPlus,
  Wifi,
  WifiOff 
} from 'lucide-react';


import { CustomerView } from './roles/CustomerView';
import { RunnerView } from './roles/RunnerView';
import { RiderView } from './roles/RiderView';
import { AdminView } from './roles/AdminView';
import { MamilaView } from './roles/MamilaView';

export default function App() {
  const { 
    currentUser, 
    userProfile, 
    authLoading, 
    isAuthReady, 
    logout: contextLogout, 
    updateProfile: contextUpdateProfile 
  } = useAuth();

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('jijiga_mode') === 'demo';
  });

  const [activeRole, setActiveRole] = useState<Role>('CUSTOMER');
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Batch[]>(() => isDemoMode ? INITIAL_BATCHES : []);
  const [mamilasList, setMamilasList] = useState<Mamila[]>(() => isDemoMode ? MAMILAS : []);
  const [orderMessages, setOrderMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_ORDER_CHATS);
  const [globalModalOrder, setGlobalModalOrder] = useState<Order | null>(null);
  const [alertNotice, setAlertNotice] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  const [apiKey, setApiKey] = useState(() => {
    return (
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      localStorage.getItem('user_google_maps_api_key') ||
      ''
    );
  });
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);

  // Network Connectivity & Offline Resilience State
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [justReconnected, setJustReconnected] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setIsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    let wasOffline = false;
    const unsub = subscribeToNetworkStatus((online) => {
      setIsOnline(online);
      if (online && wasOffline) {
        setJustReconnected(true);
        setTimeout(() => setJustReconnected(false), 5000);
      }
      if (!online) {
        wasOffline = true;
      }
    });
    return unsub;
  }, []);

  const showAlert = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setAlertNotice({ message, type });
    setTimeout(() => {
      setAlertNotice((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  // 2. Real-time synchronization with Cloud Firestore or Demo fallback
  useEffect(() => {
    if (isDemoMode) {
      setInventory(INITIAL_BATCHES);
      setMamilasList(MAMILAS);
      return;
    }

    // Subscribe to Firestore Batches & Mamilas
    const unsubBatches = subscribeToFirestoreBatches((liveBatches) => {
      setInventory(liveBatches || []);
    });
    const unsubMamilas = subscribeToFirestoreMamilas((liveMamilas) => {
      setMamilasList(liveMamilas || []);
    });

    // Subscribe to Orders based on role & UID
    let unsubOrders: (() => void) | undefined;
    if (currentUser) {
      const effectiveRole = userProfile?.role || 'customer';
      unsubOrders = subscribeToOrdersByRole(
        effectiveRole,
        currentUser.uid,
        (remoteOrders) => {
          setOrders(remoteOrders);
        },
        (err) => {
          console.warn('Firestore order sync:', err.message);
          showAlert(`Firestore sync notice: ${err.message}`, 'error');
        }
      );
    } else {
      setOrders([]);
    }

    return () => {
      unsubBatches();
      unsubMamilas();
      if (unsubOrders) unsubOrders();
    };
  }, [currentUser, userProfile?.role, isDemoMode]);

  const toggleMode = (mode: 'demo' | 'prod') => {
    const isDemo = mode === 'demo';
    setIsDemoMode(isDemo);
    localStorage.setItem('jijiga_mode', isDemo ? 'demo' : 'prod');
    showAlert(`Switched to ${isDemo ? 'DEMO Mode (bundled data)' : 'PRODUCTION Mode (live Cloud Firestore)'}`, 'info');
  };

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'register'>('signin');

  const handleOpenAuth = (tab: 'signin' | 'register' = 'signin') => {
    setAuthModalTab(tab);
    setShowAuthModal(true);
  };

  const handleSignIn = () => {
    handleOpenAuth('signin');
  };

  const handleSignOut = async () => {
    try {
      await contextLogout();
      showAlert('Signed out of Jijiga Express.', 'info');
      setActiveRole('CUSTOMER');
    } catch (err: any) {
      showAlert(`Sign out notice: ${err.message}`, 'error');
    }
  };

  // Role switching security guard
  const handleSelectRole = (targetRole: Role) => {
    if (isDemoMode) {
      setActiveRole(targetRole);
      return;
    }

    if (!currentUser) {
      showAlert('Please sign in with Google to access protected portals.', 'error');
      return;
    }

    const currentRole = userProfile?.role || 'customer';
    if (currentRole === 'admin') {
      setActiveRole(targetRole);
      return;
    }

    if (targetRole === 'CUSTOMER') {
      setActiveRole('CUSTOMER');
      return;
    }

    if (targetRole.toLowerCase() === currentRole) {
      setActiveRole(targetRole);
      return;
    }

    showAlert(
      `Access Restricted: Your verified account role is "${currentRole}". You need Admin authorization to view the ${targetRole} Portal.`,
      'error'
    );
  };

  const handlePlaceOrder = async (
    batch: Batch,
    paymentMethod: PaymentMethod,
    options?: {
      quantity?: number;
      specialInstructions?: string;
      cookingInstruction?: string;
      deliveryCity?: string;
      customerAddress?: string;
      customerPlusCode?: string;
      customerCoordinates?: { lat: number; lng: number };
    }
  ): Promise<void> => {
    if (!currentUser) {
      throw new Error('Sign in before placing an order.');
    }
    if (paymentMethod !== 'COD') {
      throw new Error('Online wallet checkout is temporarily unavailable. Select Cash on Delivery.');
    }
    if (userProfile?.city?.trim() !== 'Jijiga' || options?.deliveryCity !== 'Jijiga') {
      throw new Error('Food delivery is currently available only to customers with a saved profile city of Jijiga.');
    }

    const effectiveAddress = options?.customerAddress?.trim() || userProfile.address?.trim() || '';
    if (!effectiveAddress) {
      throw new Error('Enter your actual delivery address before placing the order.');
    }

    const quantity = options?.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new Error('Choose a valid quantity between 1 and 50.');
    }
    if (!batch.id || !Number.isFinite(batch.price) || batch.price <= 0 || batch.available < quantity) {
      throw new Error('This batch is no longer available in the live catalog. Refresh and try again.');
    }

    const mamila = mamilasList.find(m => m.id === batch.mamilaId);
    const deliveryFee = 150;
    const subtotal = batch.price * quantity;
    const totalPrice = subtotal + deliveryFee;
    const originCoords = mamila?.coordinates || MAMILA_COORDINATES[batch.mamilaId];
    const destCoords = options?.customerCoordinates;
    const orderDocId = generateOrderId();
    const effectiveCustomerId = currentUser.uid;
    const effectiveCustomerName = userProfile?.displayName || currentUser.displayName || 'Customer';

    const newOrder: Order = {
      id: orderDocId,
      serviceType: 'FOOD',
      batchId: batch.id,
      batchName: batch.name,
      mamilaId: batch.mamilaId,
      mamilaName: mamila?.name || 'Unknown Store',
      mamilaLocation: mamila?.location || 'Unknown Location',
      price: subtotal,
      quantity,
      deliveryFee,
      totalPrice,
      status: 'PENDING',
      runnerId: null,
      riderId: null,
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      customerId: effectiveCustomerId,
      customerName: effectiveCustomerName,
      customerPhone: userProfile?.phone || '',
      customerCity: 'Jijiga',
      customerPlusCode: options?.customerPlusCode?.trim() || userProfile?.plusCode?.trim() || '',
      customerAddress: effectiveAddress,
      ...(destCoords ? { customerCoordinates: destCoords } : {}),
      ...(originCoords ? { mamilaCoordinates: originCoords } : {}),
      specialInstructions: options?.specialInstructions || '',
      cookingInstruction: options?.cookingInstruction || '',
      createdAt: new Date(),
    };

    if (isDemoMode) {
      setOrders(prev => [newOrder, ...prev.filter(order => order.id !== newOrder.id)]);
      setInventory(prev => prev.map(b => b.id === batch.id
        ? { ...b, available: Math.max(0, b.available - quantity) }
        : b
      ));
      showAlert('Demo Sandbox only: order is local sample state and was not saved to production Firestore.', 'success');
      return;
    }

    try {
      await saveOrderToFirestore(newOrder);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showAlert(`Could not save order to Firestore: ${message}`, 'error');
      throw error instanceof Error ? error : new Error(message);
    }

    // The order write succeeded. Update local state only after persistence; the live listener owns stock.
    setOrders(prev => [newOrder, ...prev.filter(order => order.id !== newOrder.id)]);
    try {
      await logDeliveryEventToFirestore({
        orderId: orderDocId,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        actorRole: 'CUSTOMER',
        actorId: currentUser.uid,
        actorName: effectiveCustomerName,
        note: 'Food order submitted with COD and queued for authorized runner dispatch.'
      });
      showAlert(`Order #${orderDocId.slice(-6)} saved. Awaiting authorized fulfillment.`, 'success');
    } catch {
      showAlert(`Order #${orderDocId.slice(-6)} was saved, but its activity event could not be recorded. Please do not submit it again.`, 'error');
    }
  };

  const handleBookParcel = async (parcelOrder: Partial<Order>): Promise<void> => {
    if (!currentUser) throw new Error('Sign in before booking a parcel.');
    if (userProfile?.city?.trim() !== 'Jijiga') throw new Error('Parcel delivery requires a saved Jijiga profile.');
    if (parcelOrder.paymentMethod !== 'COD') throw new Error('Only Cash on Delivery is currently supported.');
    if (!parcelOrder.parcelDetails || parcelOrder.customerCity !== 'Jijiga') throw new Error('A valid local Jijiga parcel request is required.');

    const orderDocId = generateOrderId();
    const effectiveCustomerName = userProfile?.displayName || currentUser.displayName || parcelOrder.customerName || 'Customer';
    const fullOrder: Order = {
      ...(parcelOrder as Order),
      id: orderDocId,
      customerId: currentUser.uid,
      customerName: effectiveCustomerName,
      customerPhone: userProfile?.phone || parcelOrder.customerPhone || '',
      customerCity: 'Jijiga',
      runnerId: null,
      riderId: null,
      customerAddress: parcelOrder.customerAddress?.trim() || '',
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      status: 'PENDING',
      createdAt: new Date(),
    };

    if (isDemoMode) {
      setOrders(prev => [fullOrder, ...prev.filter(order => order.id !== fullOrder.id)]);
      showAlert('Demo Sandbox only: parcel request is local sample state and was not saved to production Firestore.', 'success');
      return;
    }

    try {
      await saveOrderToFirestore(fullOrder);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showAlert(`Could not save parcel request: ${message}`, 'error');
      throw error instanceof Error ? error : new Error(message);
    }

    setOrders(prev => [fullOrder, ...prev.filter(order => order.id !== fullOrder.id)]);
    try {
      await logDeliveryEventToFirestore({
        orderId: fullOrder.id,
        status: fullOrder.status,
        timestamp: new Date().toISOString(),
        actorRole: 'CUSTOMER',
        actorId: currentUser.uid,
        actorName: fullOrder.customerName,
        note: 'Local Jijiga parcel request created; awaiting authorized fulfillment.'
      });
      showAlert(`Parcel request #${fullOrder.id.slice(-6)} saved. Awaiting authorized fulfillment.`, 'success');
    } catch {
      showAlert(`Parcel request #${fullOrder.id.slice(-6)} was saved, but its activity event could not be recorded. Please do not submit it again.`, 'error');
    }
  };

  const handleBookRide = async (rideOrder: Partial<Order>): Promise<void> => {
    if (!currentUser) throw new Error('Sign in before requesting a ride.');
    if (userProfile?.city?.trim() !== 'Jijiga') throw new Error('Ride requests require a saved Jijiga profile.');
    if (rideOrder.paymentMethod !== 'COD' || (rideOrder.paymentStatus && rideOrder.paymentStatus !== 'UNPAID')) {
      throw new Error('Only unpaid Cash on Delivery ride requests are currently supported.');
    }
    if (rideOrder.customerCity !== 'Jijiga' || rideOrder.rideDetails?.city !== 'Jijiga') {
      throw new Error('Ride service is limited to Jijiga.');
    }

    const orderDocId = generateOrderId();
    const effectiveCustomerName = userProfile?.displayName || currentUser.displayName || rideOrder.customerName || 'Customer';
    const fullOrder: Order = {
      ...(rideOrder as Order),
      id: orderDocId,
      customerId: currentUser.uid,
      customerName: effectiveCustomerName,
      customerPhone: userProfile?.phone || rideOrder.customerPhone || '',
      customerCity: 'Jijiga',
      runnerId: null,
      riderId: null,
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      status: 'PENDING',
      createdAt: new Date(),
    };

    if (isDemoMode) {
      setOrders(prev => [fullOrder, ...prev.filter(order => order.id !== fullOrder.id)]);
      showAlert('Demo Sandbox only: ride request is local sample state and was not saved to production Firestore. No driver has been assigned.', 'success');
      return;
    }

    try {
      await saveOrderToFirestore(fullOrder);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showAlert(`Could not save ride request: ${message}`, 'error');
      throw error instanceof Error ? error : new Error(message);
    }

    setOrders(prev => [fullOrder, ...prev.filter(order => order.id !== fullOrder.id)]);
    try {
      await logDeliveryEventToFirestore({
        orderId: fullOrder.id,
        status: fullOrder.status,
        timestamp: new Date().toISOString(),
        actorRole: 'CUSTOMER',
        actorId: currentUser.uid,
        actorName: fullOrder.customerName,
        note: 'Ride request saved; waiting for authorized dispatcher assignment. No driver was pre-assigned.'
      });
      showAlert(`Ride request #${fullOrder.id.slice(-6)} saved. Waiting for dispatch; no driver has been assigned yet.`, 'success');
    } catch {
      showAlert('Ride request was saved, but its activity event could not be recorded. No driver has been assigned.', 'error');
    }
  };

  const handleBookEeu = async (eeuOrder: Partial<Order>): Promise<void> => {
    if (!currentUser) throw new Error('Sign in before booking an EEU recharge.');
    if (userProfile?.city?.trim() !== 'Jijiga') throw new Error('EEU prepaid-card service requires a saved Jijiga profile.');
    if (eeuOrder.paymentMethod !== 'COD' || (eeuOrder.paymentStatus && eeuOrder.paymentStatus !== 'UNPAID')) {
      throw new Error('Only unpaid Cash on Delivery requests are supported for EEU service.');
    }
    if (eeuOrder.customerCity !== 'Jijiga' || !eeuOrder.eeuDetails?.customerAuthorized) {
      throw new Error('A Jijiga EEU request with customer authorization is required.');
    }

    const orderDocId = generateOrderId();
    const effectiveCustomerName = userProfile?.displayName || currentUser.displayName || eeuOrder.customerName || 'Customer';
    const fullOrder: Order = {
      ...(eeuOrder as Order),
      id: orderDocId,
      customerId: currentUser.uid,
      customerName: effectiveCustomerName,
      customerPhone: userProfile?.phone || eeuOrder.customerPhone || '',
      customerCity: 'Jijiga',
      runnerId: null,
      riderId: null,
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      status: 'PENDING',
      createdAt: new Date(),
    };

    if (isDemoMode) {
      setOrders(prev => [fullOrder, ...prev.filter(order => order.id !== fullOrder.id)]);
      showAlert('Demo Sandbox only: EEU request is local sample state. No physical-card trip, STS token, receipt, or recharge has occurred.', 'success');
      return;
    }

    try {
      await saveOrderToFirestore(fullOrder);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showAlert(`Could not save EEU request: ${message}`, 'error');
      throw error instanceof Error ? error : new Error(message);
    }

    setOrders(prev => [fullOrder, ...prev.filter(order => order.id !== fullOrder.id)]);
    try {
      await logDeliveryEventToFirestore({
        orderId: fullOrder.id,
        status: fullOrder.status,
        timestamp: new Date().toISOString(),
        actorRole: 'CUSTOMER',
        actorId: currentUser.uid,
        actorName: fullOrder.customerName,
        note: 'EEU physical-card errand requested; no recharge or terminal receipt is implied by order creation.'
      });
      showAlert(`EEU request #${fullOrder.id.slice(-6)} saved. Physical-card custody is awaiting an authorized rider.`, 'success');
    } catch {
      showAlert('EEU request was saved, but its activity event could not be recorded. No recharge or receipt has occurred.', 'error');
    }
  };

  const handleBookKhat = async (khatOrder: Partial<Order>): Promise<void> => {
    if (!currentUser) throw new Error('Sign in before placing a Khat order.');
    if (userProfile?.city?.trim() !== 'Jijiga') throw new Error('Khat delivery requires a saved Jijiga profile.');
    if (khatOrder.paymentMethod !== 'COD') throw new Error('Only Cash on Delivery is currently supported.');
    if (khatOrder.customerCity !== 'Jijiga') throw new Error('Khat delivery is currently limited to Jijiga.');

    const orderDocId = generateOrderId();
    const effectiveCustomerName = userProfile?.displayName || currentUser.displayName || khatOrder.customerName || 'Customer';
    const fullOrder: Order = {
      ...(khatOrder as Order),
      id: orderDocId,
      customerId: currentUser.uid,
      customerName: effectiveCustomerName,
      customerPhone: userProfile?.phone || khatOrder.customerPhone || '',
      customerCity: 'Jijiga',
      runnerId: null,
      riderId: null,
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      status: 'PENDING',
      createdAt: new Date(),
    };

    if (isDemoMode) {
      setOrders(prev => [fullOrder, ...prev.filter(order => order.id !== fullOrder.id)]);
      showAlert('Demo Sandbox only: Khat request is local sample state and was not saved to production Firestore.', 'success');
      return;
    }

    try {
      await saveOrderToFirestore(fullOrder);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showAlert(`Could not save Khat request: ${message}`, 'error');
      throw error instanceof Error ? error : new Error(message);
    }

    setOrders(prev => [fullOrder, ...prev.filter(order => order.id !== fullOrder.id)]);
    try {
      await logDeliveryEventToFirestore({
        orderId: fullOrder.id,
        status: fullOrder.status,
        timestamp: new Date().toISOString(),
        actorRole: 'CUSTOMER',
        actorId: currentUser.uid,
        actorName: fullOrder.customerName,
        note: 'Khat order saved with COD; awaiting authorized fulfillment.'
      });
      showAlert(`Khat request #${fullOrder.id.slice(-6)} saved. Awaiting authorized fulfillment.`, 'success');
    } catch {
      showAlert('Khat request was saved, but its activity event could not be recorded. Please do not submit it again.', 'error');
    }
  };

  const handleUpdateUserProfile = async (updates: Partial<AppUserProfile>) => {
    if (!currentUser) {
      showAlert('Please sign in with Google to update your delivery profile.', 'error');
      return;
    }
    try {
      await contextUpdateProfile(updates);
      showAlert('Delivery profile and saved addresses successfully updated in Cloud Firestore!', 'success');
    } catch (err: any) {
      showAlert(`Could not update profile: ${err.message}`, 'error');
    }
  };

  const handleUpdateOrder = async (orderId: string, updates: Partial<Order>, persistToFirestore = true) => {
    if (activeRole === 'CUSTOMER' && userProfile?.role !== 'admin') {
      const protectedKeys = ['price', 'totalPrice', 'deliveryFee', 'paymentStatus', 'customerId', 'runnerId', 'riderId', 'runnerTagId', 'riderProofUrl'];
      const hasProtected = Object.keys(updates).some(key => protectedKeys.includes(key));
      if (hasProtected || (updates.status && updates.status !== 'CANCELLED')) {
        const error = new Error('Unauthorized: Customers cannot modify protected pricing, status, or courier assignment fields.');
        showAlert(error.message, 'error');
        throw error;
      }
    }

    // Persist first in production so a rejected write cannot masquerade as a successful local update.
    if (persistToFirestore && !isDemoMode && currentUser) {
      try {
        await updateOrderInFirestore(orderId, updates);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        showAlert(`Order update failed to save: ${message}`, 'error');
        throw error instanceof Error ? error : new Error(message);
      }
    }

    setOrders(prev => prev.map(order => order.id === orderId ? { ...order, ...updates } : order));

    if (persistToFirestore && !isDemoMode && currentUser && updates.status) {
      try {
        await logDeliveryEventToFirestore({
          orderId,
          status: updates.status,
          timestamp: new Date().toISOString(),
          actorRole: activeRole,
          actorId: currentUser.uid,
          actorName: userProfile?.displayName || 'Courier',
          note: `Status updated to ${updates.status} by ${activeRole}.`
        });
      } catch {
        showAlert('The order update was saved, but the activity event could not be recorded.', 'error');
      }
    }
  };

  const handleSendMessage = async (orderId: string, message: Omit<ChatMessage, 'id' | 'orderId'>) => {
    const newMsg: ChatMessage = {
      ...message,
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      orderId,
    };
    setOrderMessages(prev => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), newMsg]
    }));

    if (!isDemoMode && currentUser) {
      try {
        await saveChatMessageToFirestore(orderId, message);
      } catch (err: any) {
        console.warn('Could not save chat message to Firestore:', err);
      }
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    if (targetOrder.status === 'RUNNER_ASSIGNED' || targetOrder.status === 'PENDING' || targetOrder.status === 'TRANSACTION_PENDING') {
      const qty = targetOrder.quantity || 1;
      setInventory(prev => prev.map(b => 
        b.id === targetOrder.batchId ? { ...b, available: b.available + qty } : b
      ));

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));

      if (!isDemoMode && currentUser) {
        try {
          await cancelOrderInFirestore(targetOrder);
          await logDeliveryEventToFirestore({
            orderId,
            status: 'CANCELLED',
            timestamp: new Date().toISOString(),
            actorRole: activeRole,
            actorId: currentUser.uid,
            actorName: userProfile?.displayName || 'Customer',
            note: `Order #${orderId.slice(-6)} cancelled by customer. Stock restored.`
          });
          showAlert(`Order #${orderId.slice(-6)} cancelled and stock restored to store.`, 'info');
        } catch (err: any) {
          showAlert(`Could not cancel order: ${err.message}`, 'error');
        }
      }
    }
  };

  // Step-through simulation is strictly a Demo Sandbox feature.
  // EEU custody, terminal receipts, and STS tokens must never be simulated.
  const handleSimulateNextStep = (orderId: string) => {
    if (!isDemoMode) {
      showAlert('Step-through simulation is only available in Demo Sandbox. Production fulfillment requires authorized staff actions.', 'error');
      return;
    }

    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    if (target.serviceType === 'EEU_RECHARGE') {
      showAlert('EEU custody cannot be simulated. A real terminal receipt and the actual STS token are required.', 'error');
      return;
    }

    if (target.status === 'RUNNER_ASSIGNED' || target.status === 'PENDING' || target.status === 'TRANSACTION_PENDING') {
      handleUpdateOrder(orderId, {
        status: 'READY_FOR_RIDER',
        runnerTagId: 'TAG-ET-' + Math.floor(10000 + Math.random() * 90000)
      });
    } else if (target.status === 'READY_FOR_RIDER' || target.status === 'VERIFIED_READY') {
      handleUpdateOrder(orderId, {
        status: 'RIDER_ACCEPTED',
        riderId: currentUser?.uid || 'demo-rider',
        riderName: userProfile?.displayName || 'Demo Staff Rider'
      });
    } else if (target.status === 'RIDER_ACCEPTED' || target.status === 'RIDER_DISPATCHED') {
      handleUpdateOrder(orderId, { status: 'PICKED_UP' });
    } else if (target.status === 'PICKED_UP' || target.status === 'IN_TRANSIT') {
      handleUpdateOrder(orderId, {
        status: 'DELIVERED',
        paymentStatus: target.paymentMethod === 'COD' ? 'COLLECTED_BY_RIDER' : 'PAID_CONFIRMED'
      });
    }
  };

  // --- Dynamic Courier Dispatch Claiming Handlers ---
  const handleClaimRunnerJob = async (orderId: string) => {
    if (!currentUser) {
      showAlert('Please sign in as a runner to claim inspection jobs.', 'error');
      return;
    }
    if (!isDemoMode && userProfile?.role !== 'runner' && userProfile?.role !== 'admin') {
      showAlert('Access Restricted: Runner courier credentials required to claim inspection jobs.', 'error');
      return;
    }
    const runnerName = userProfile?.displayName || currentUser.displayName || 'Verified Staff Runner';
    try {
      if (!isDemoMode) {
        await claimOrderAsRunner(orderId, { uid: currentUser.uid, displayName: runnerName });
      }
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        runnerId: currentUser.uid,
        runnerName,
        status: 'RUNNER_ASSIGNED'
      } : o));
      showAlert(`Order #${orderId.slice(-6)} successfully claimed for quality inspection!`, 'success');
    } catch (err: any) {
      showAlert(err.message || 'Could not claim order.', 'error');
    }
  };

  const handleClaimRiderJob = async (orderId: string) => {
    if (!currentUser) {
      showAlert('Please sign in as a rider to claim delivery routes.', 'error');
      return;
    }
    if (!isDemoMode && userProfile?.role !== 'rider' && userProfile?.role !== 'admin') {
      showAlert('Access Restricted: Rider courier credentials required to claim delivery routes.', 'error');
      return;
    }
    const riderName = userProfile?.displayName || currentUser.displayName || 'Verified Staff Rider';
    try {
      if (!isDemoMode) {
        await claimOrderAsRider(orderId, { uid: currentUser.uid, displayName: riderName });
      }
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        riderId: currentUser.uid,
        riderName,
        status: 'RIDER_ACCEPTED'
      } : o));
      showAlert(`Delivery #${orderId.slice(-6)} successfully claimed for doorstep route!`, 'success');
    } catch (err: any) {
      showAlert(err.message || 'Could not claim delivery job.', 'error');
    }
  };

  const handleAdminReassign = async (
    orderId: string, 
    assignment: { runnerId?: string; runnerName?: string; riderId?: string; riderName?: string; status?: any }
  ) => {
    if (!currentUser || userProfile?.role !== 'admin') {
      showAlert('Admin privileges required to reassign staff.', 'error');
      return;
    }
    try {
      if (!isDemoMode) {
        await adminReassignOrder(orderId, assignment, {
          uid: currentUser.uid,
          displayName: userProfile?.displayName || 'Admin Dispatcher'
        });
      }
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        ...assignment
      } : o));
      showAlert(`Order #${orderId.slice(-6)} personnel reassigned.`, 'success');
    } catch (err: any) {
      showAlert(`Reassignment failed: ${err.message}`, 'error');
    }
  };

  const handleAdminConfirmPayment = async (orderId: string, receiptReference: string) => {
    if (!currentUser || userProfile?.role !== 'admin') {
      showAlert('Admin privileges required to confirm payment.', 'error');
      return;
    }

    // A trusted server-side provider-verification endpoint is not configured in this repository.
    // A receipt reference typed by a browser client must never mark a production order as paid.
    if (!isDemoMode) {
      showAlert('Payment confirmation is unavailable: trusted server-side payment verification is not configured. No payment status was changed.', 'error');
      return;
    }

    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      paymentStatus: 'PAID_CONFIRMED',
      paymentReference: receiptReference,
      paymentConfirmedBy: currentUser.email || currentUser.uid,
    } : o));
    showAlert(`DEMO ONLY: order #${orderId.slice(-6)} marked paid in local sandbox data; no real payment was verified.`, 'info');
  };

  const handleRateOrder = (orderId: string, rating: number, reviewComment?: string) => {
    handleUpdateOrder(orderId, { status: 'RATED', rating, reviewComment });
  };

  const handleDisputeOrder = (orderId: string, reason: string, comment: string) => {
    handleUpdateOrder(orderId, {
      dispute: {
        reason,
        comment,
        filedAt: new Date(),
        status: 'PENDING'
      }
    });
  };

  const handleResolveDispute = (orderId: string, status: 'RESOLVED' | 'REFUNDED', resolutionNote?: string) => {
    const target = orders.find(o => o.id === orderId);
    if (!target || !target.dispute) return;
    handleUpdateOrder(orderId, {
      dispute: {
        ...target.dispute,
        status,
        resolutionNote
      }
    });
  };

  const handleAddBatch = (newBatch: Omit<Batch, 'id'>) => {
    const batchWithId: Batch = {
      ...newBatch,
      id: 'b' + (inventory.length + 1),
    };
    setInventory(prev => [batchWithId, ...prev]);
  };

  const handleUpdateBatch = (batchId: string, updates: Partial<Batch>) => {
    setInventory(prev => prev.map(b => b.id === batchId ? { ...b, ...updates } : b));
  };

  const handleRejectDefect = (orderId: string, reason: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const qty = targetOrder.quantity || 1;
    setInventory(prev => prev.map(b => 
      b.id === targetOrder.batchId ? { ...b, available: b.available + qty } : b
    ));

    handleUpdateOrder(orderId, { 
      status: 'DEFECT_REJECTED', 
      defectReason: reason 
    });
  };

  // --- Strict Data Isolation Filtering (No Hardcoded Courier IDs) ---
  const currentUid = currentUser?.uid;
  const customerOrders = isDemoMode
    ? orders
    : orders.filter(o => o.customerId === currentUid || (userProfile?.role === 'admin' ? true : false));

  const runnerOrders = orders.filter(o => 
    o.status !== 'CANCELLED' && 
    o.status !== 'DEFECT_REJECTED' && (
      o.runnerId === currentUid || 
      (!o.runnerId && (o.status === 'PENDING' || o.status === 'TRANSACTION_PENDING' || o.status === 'RUNNER_ASSIGNED'))
    )
  );

  const riderOrders = orders.filter(o => 
    o.status !== 'CANCELLED' && 
    o.status !== 'DEFECT_REJECTED' && (
      o.riderId === currentUid || 
      ((o.status === 'READY_FOR_RIDER' || o.status === 'VERIFIED_READY') && !o.riderId)
    )
  );

  const currentMamilaId = userProfile?.mamilaId || (isDemoMode ? 'm1' : (mamilasList[0]?.id || 'm1'));
  const mamilaInventory = inventory.filter(b => b.mamilaId === currentMamilaId);
  const mamilaOrders = orders.filter(o => o.mamilaId === currentMamilaId);

  return (
    <APIProvider 
      apiKey={apiKey} 
      libraries={GOOGLE_MAPS_LIBRARIES}
      language="en" 
      region="ET"
      onError={(e) => console.warn('Google Maps Provider warning:', e)}
    >
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 pb-16">
        {/* Google Maps Quota Exhaustion Banner */}
        {isQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* Floating User-Facing Alert Banner */}
        {alertNotice && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className={`p-4 rounded-xl shadow-lg border flex items-center justify-between gap-3 ${
              alertNotice.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : alertNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                {alertNotice.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <span>{alertNotice.message}</span>
              </div>
              <button 
                onClick={() => setAlertNotice(null)}
                className="text-xs font-bold px-2 py-1 rounded hover:bg-black/5 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Demo Mode Sandbox Notice Banner */}
        {isDemoMode && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 shrink-0 text-slate-950" />
              <span>Demo Sandbox Active — using bundled walkthrough data. Changes are not persisted to live Cloud Firestore.</span>
            </div>
            <button
              onClick={() => toggleMode('prod')}
              className="px-3 py-1 bg-slate-950 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              Switch to Production
            </button>
          </div>
        )}

        {/* 3-Zone Top Bar */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3.5 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Zone 1: Wordmark & Network Status */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-slate-900 p-2.5 rounded-xl text-white shadow-xs">
                  <Package2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <a href="/" className="text-lg md:text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                    Jijiga Express
                  </a>
                  <span className="text-[10px] text-slate-500 font-medium">Horn of Africa Delivery Network</span>
                </div>
              </div>

              {!isDemoMode ? (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Production</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                  <Database className="w-3 h-3 text-amber-600" />
                  <span>Demo Sandbox</span>
                </div>
              )}
            </div>
            
            {/* Zone 2: Navigation Role Switcher (Authorized Portals Only) */}
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
              {(isDemoMode || userProfile?.role === 'admin'
                ? (['CUSTOMER', 'MAMILA', 'RUNNER', 'RIDER', 'ADMIN'] as Role[])
                : userProfile?.role === 'runner'
                ? (['CUSTOMER', 'RUNNER'] as Role[])
                : userProfile?.role === 'rider'
                ? (['CUSTOMER', 'RIDER'] as Role[])
                : userProfile?.role === 'mamila'
                ? (['CUSTOMER', 'MAMILA'] as Role[])
                : (['CUSTOMER'] as Role[])
              ).map(role => {
                const icons = {
                  CUSTOMER: ShoppingBag,
                  MAMILA: Store,
                  RUNNER: Users,
                  RIDER: Bike,
                  ADMIN: Shield
                };
                const Icon = icons[role];
                const isActive = activeRole === role;
                
                return (
                  <button
                    key={role}
                    onClick={() => handleSelectRole(role)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      isActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {role === 'CUSTOMER' ? 'Customer Portal' : `${role.charAt(0) + role.slice(1).toLowerCase()} Portal`}
                  </button>
                );
              })}

              {/* Discreet Staff Access for Courier / Admin Login */}
              {!isDemoMode && (!userProfile || userProfile.role === 'customer') && (
                <button
                  onClick={() => {
                    if (!currentUser) {
                      showAlert('Sign in with your courier or admin Google account for staff access.', 'info');
                      handleSignIn();
                    } else {
                      showAlert(`Logged in as verified customer (${currentUser.email}). Contact dispatch for courier or store authorization.`, 'info');
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer rounded-lg hover:bg-slate-200/50"
                  title="Courier & Staff Access"
                >
                  <Shield className="w-3 h-3 text-slate-400" />
                  <span className="hidden sm:inline">Staff Access</span>
                </button>
              )}
            </nav>

            {/* Zone 3: Authentication & Workspace Tools */}
            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
              <button
                onClick={() => setShowDriveModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer shadow-2xs"
                title="Google Drive Receipts Vault"
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Drive</span>
              </button>
              <button
                onClick={() => setShowGmailModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors cursor-pointer shadow-2xs"
                title="Gmail Dispatch Alerts"
              >
                <Mail className="w-3.5 h-3.5 text-red-600" />
                <span className="hidden sm:inline">Gmail</span>
              </button>

              {/* Real Firebase Authentication Button / Profile Avatar */}
              {authLoading ? (
                <div className="h-8 w-20 bg-slate-200 animate-pulse rounded-lg" />
              ) : currentUser ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="flex items-center gap-1.5" title={currentUser.email || ''}>
                    {currentUser.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt="User" 
                        className="w-7 h-7 rounded-full object-cover border border-slate-300" 
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                        {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="hidden xl:block text-left">
                      <p className="font-semibold text-xs leading-none text-slate-900 truncate max-w-[100px]">
                        {currentUser.displayName || currentUser.email?.split('@')[0]}
                      </p>
                      <span className="text-[10px] font-mono text-emerald-600 uppercase font-bold">
                        {userProfile?.role || 'customer'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Offline & Intermittent Connectivity Banner */}
        {!isOnline && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 border-b border-amber-600 shadow-xs">
            <WifiOff className="w-4 h-4 shrink-0 text-slate-950" />
            <span>Intermittent connectivity detected — Offline mode active. All orders and status updates are saved locally in IndexedDB and will sync automatically once reconnected.</span>
          </div>
        )}
        {justReconnected && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 border-b border-emerald-700 shadow-xs animate-in fade-in duration-300">
            <Wifi className="w-4 h-4 shrink-0 text-white" />
            <span>Connection restored — Synchronizing local IndexedDB queue with Cloud Firestore...</span>
          </div>
        )}

        {/* Unauthenticated Production Banner */}
        {!currentUser && !isDemoMode && (
          <div className="max-w-7xl mx-auto px-4 md:px-6 mt-3">
            <div className="p-4 bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs md:text-sm text-blue-950 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <UserCheck className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-blue-950">Customer Authentication Required for Orders</h4>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Sign in with email/password or Google to place verified orders, book express parcels, and track live deliveries.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => handleOpenAuth('signin')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => handleOpenAuth('register')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-50 text-blue-950 border border-blue-300 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  <span>Register</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <AppErrorBoundary>
        <Suspense
          fallback={
            <div className="max-w-7xl mx-auto p-6 mt-2 text-sm text-slate-500"
                 role="status" aria-live="polite">
              Loading your workspace...
            </div>
          }
        >
          <main className="max-w-7xl mx-auto p-4 md:p-6 mt-2">
          {activeRole === 'CUSTOMER' && (
            <CustomerView 
              inventory={inventory} 
              myOrders={customerOrders} isDemoMode={isDemoMode} 
              currentUser={currentUser}
              customerProfile={userProfile}
              orderMessages={orderMessages}
              onSignIn={handleSignIn}
              onUpdateProfile={handleUpdateUserProfile}
              onSendMessage={handleSendMessage}
              onPlaceOrder={handlePlaceOrder} 
              onCancelOrder={handleCancelOrder}
              onRateOrder={handleRateOrder}
              onDisputeOrder={handleDisputeOrder}
              onSimulateNextStep={isDemoMode ? handleSimulateNextStep : undefined}
              onOpenMapPreview={(order) => setGlobalModalOrder(order)}
              onBookParcel={handleBookParcel}
              onBookRide={handleBookRide}
              onBookEeu={handleBookEeu}
              onBookKhat={handleBookKhat}
            />
          )}
          {activeRole === 'MAMILA' && (
            <MamilaView 
              inventory={mamilaInventory} 
              orders={mamilaOrders}
              onAddBatch={handleAddBatch}
              onUpdateBatch={handleUpdateBatch}
            />
          )}
          {activeRole === 'RUNNER' && (
            <RunnerView 
              orders={orders} 
              currentRunnerId={currentUser?.uid}
              currentRunnerName={userProfile?.displayName || currentUser?.displayName || 'Verified Staff Runner'}
              orderMessages={orderMessages}
              onSendMessage={handleSendMessage}
              onClaimOrder={handleClaimRunnerJob}
              onUpdateStatus={(id, status, tag) => handleUpdateOrder(id, { 
                status, 
                ...(tag ? { runnerTagId: tag } : {})
              })}
              onHandoverOrder={async (id, tag) => {
                await handleUpdateOrder(id, {
                  status: 'READY_FOR_RIDER',
                  runnerTagId: tag,
                  handoverToRiderAt: new Date().toISOString()
                });
                return true;
              }}
              onRejectDefect={handleRejectDefect}
              onUpdateOrder={(id, updates) => handleUpdateOrder(id, updates)}
            />
          )}
          {activeRole === 'RIDER' && (
            <RiderView 
              orders={riderOrders} 
              orderMessages={orderMessages}
              onSendMessage={handleSendMessage}
              currentRiderId={currentUser?.uid || ''} 
              currentRiderName={userProfile?.displayName || currentUser?.displayName || 'Verified Staff Rider'}
              onClaimOrder={handleClaimRiderJob}
              onUpdateOrder={handleUpdateOrder} 
              onOpenMapPreview={(order) => setGlobalModalOrder(order)}
            />
          )}
          {activeRole === 'ADMIN' && (
            <AdminView 
              orders={orders} 
              inventory={inventory} 
              onResolveDispute={handleResolveDispute}
              onOpenMapPreview={(order) => setGlobalModalOrder(order)}
              onReassignOrder={handleAdminReassign}
              onConfirmPayment={handleAdminConfirmPayment}
            />
          )}
          </main>
        </Suspense>
        </AppErrorBoundary>

        {/* Global Map Preview Modal */}
        <MapPreviewModal
          order={globalModalOrder}
          isOpen={!!globalModalOrder}
          onClose={() => setGlobalModalOrder(null)}
        />

        {/* Google Maps API Key Modal */}
        <UpdateApiKeyModal
          isOpen={showKeyModal}
          onClose={() => setShowKeyModal(false)}
          currentKey={apiKey}
          onSaveKey={(newK) => {
            localStorage.setItem('user_google_maps_api_key', newK);
            setApiKey(newK);
            window.location.reload();
          }}
        />

        {/* Google Drive Vault Sync Modal */}
        <GoogleDriveSyncModal
          isOpen={showDriveModal}
          onClose={() => setShowDriveModal(false)}
          orders={orders}
        />

        {/* Gmail Dispatch Notifications Modal */}
        <GmailNotificationModal
          isOpen={showGmailModal}
          onClose={() => setShowGmailModal(false)}
          orders={orders}
        />

        {/* Unified Authentication Modal (Email/Password for Android & Web Google Auth) */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultTab={authModalTab}
          onSuccess={() => showAlert('Authentication successful! Welcome to Jijiga Express.', 'success')}
        />

        {/* Production Footer with Subtle Developer / Sandbox Trigger */}
        <footer className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-6 border-t border-slate-200 mt-12 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-800">Jijiga Express Delivery Service</p>
            <p className="text-[11px] text-slate-500">
              Verified local batch deliveries, regional parcels & prepaid utilities across Eastern Ethiopia & Somaliland.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            {isDemoMode ? (
              <button
                onClick={() => toggleMode('prod')}
                className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <Flame className="w-3.5 h-3.5" />
                Return to Live Production
              </button>
            ) : (
              <button
                onClick={() => toggleMode('demo')}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center gap-1"
                title="Open offline sandbox for feature walkthrough"
              >
                <Database className="w-3 h-3" />
                Developer Demo Sandbox
              </button>
            )}
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              onClick={() => setShowKeyModal(true)}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <KeyRound className="w-3 h-3" />
              Maps Config
            </button>
          </div>
        </footer>
      </div>
    </APIProvider>
  );
}
