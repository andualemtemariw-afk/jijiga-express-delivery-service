import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { APIProvider } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_LIBRARIES: ('marker' | 'places' | 'routes' | 'geometry')[] = ['marker', 'places', 'routes', 'geometry'];
const DEMO_SANDBOX_ENABLED = import.meta.env.VITE_ENABLE_DEMO_SANDBOX === 'true';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Role, Order, Batch, Mamila, PaymentMethod, ChatMessage, EeuRechargeDetails, AppUserProfile } from './types';
import { INITIAL_BATCHES, MAMILAS } from './data';
import { INITIAL_ORDER_CHATS } from './data/vernacularPhrases';
import { CustomerView } from './roles/CustomerView';
import { RunnerView } from './roles/RunnerView';
import { RiderView } from './roles/RiderView';
import { AdminView } from './roles/AdminView';
import { MamilaView } from './roles/MamilaView';
import { MapPreviewModal } from './components/map/MapPreviewModal';
import { UpdateApiKeyModal } from './components/map/UpdateApiKeyModal';
import { GoogleDriveSyncModal } from './components/drive/GoogleDriveSyncModal';
import { GmailNotificationModal } from './components/gmail/GmailNotificationModal';
import {
  auth,
  appSignInWithGoogle,
  signInWithEmail,
  registerWithEmail,
  logout,
  subscribeToNetworkStatus
} from './services/googleAuth';
import { syncUserProfile, updateUserProfile } from './services/userService';
import { 
  claimOrderAsRunner, 
  claimOrderAsRider, 
  adminReassignOrder 
} from './services/dispatchService';
import { 
  subscribeToOrdersByRole, 
  saveOrderToFirestore, 
  updateOrderInFirestore, 
  saveChatMessageToFirestore, 
  logDeliveryEventToFirestore, 
  generateOrderId,
  seedCatalogIfEmpty,
  subscribeToFirestoreBatches,
  subscribeToFirestoreMamilas
} from './services/firestoreSync';
import { MAMILA_COORDINATES, DEFAULT_CUSTOMER_COORDINATES } from './utils/geo';
import { createOrderWithInventoryReservation, cancelOrderAndRestoreInventory } from './services/orderTransactionService';
import { createServiceOrder } from './services/serviceOrderFunctions';
import { getNextEeuPhase, EEU_STATE_CHAIN } from './utils/eeuStateMachine';
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
  Wifi,
  WifiOff 
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return DEMO_SANDBOX_ENABLED && localStorage.getItem('jijiga_mode') === 'demo';
  });

  const [activeRole, setActiveRole] = useState<Role>('CUSTOMER');
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Batch[]>(INITIAL_BATCHES);
  const [mamilasList, setMamilasList] = useState<Mamila[]>(MAMILAS);
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');


  // Network Connectivity & Offline Resilience State
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [justReconnected, setJustReconnected] = useState(false);

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

  // 1. Firebase Auth Observer & User Profile Synchronization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      if (user) {
        setCurrentUser(user);
        try {
          const profile = await syncUserProfile(user);
          setUserProfile(profile);
        } catch (err: any) {
          console.warn('User profile sync notice:', err);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    // Seed Firestore catalog on initial boot
    seedCatalogIfEmpty().catch(console.warn);

    return () => unsubscribe();
  }, []);

  // 2. Real-time synchronization with Cloud Firestore or Demo fallback
  useEffect(() => {
    if (isDemoMode) {
      setInventory(INITIAL_BATCHES);
      setMamilasList(MAMILAS);
      return;
    }

    // Subscribe to Firestore Batches & Mamilas
    const unsubBatches = subscribeToFirestoreBatches((liveBatches) => {
      if (liveBatches && liveBatches.length > 0) setInventory(liveBatches);
    });
    const unsubMamilas = subscribeToFirestoreMamilas((liveMamilas) => {
      if (liveMamilas && liveMamilas.length > 0) setMamilasList(liveMamilas);
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
    if (isDemo && !DEMO_SANDBOX_ENABLED) {
      showAlert('Demo Sandbox is disabled in this production build.', 'error');
      return;
    }
    setIsDemoMode(isDemo);
    localStorage.setItem('jijiga_mode', isDemo ? 'demo' : 'prod');
    showAlert(`Switched to ${isDemo ? 'DEMO Mode (bundled data)' : 'PRODUCTION Mode (live Cloud Firestore)'}`, 'info');
  };

  const handleSignIn = async () => {
    if (Capacitor.isNativePlatform()) {
      setAuthMode('signin');
      setShowAuthModal(true);
      return;
    }

    try {
      setAuthLoading(true);
      await appSignInWithGoogle();
      showAlert('Signed in successfully with Google account.', 'success');
    } catch (err: any) {
      console.error('Google sign in failed:', err);
      const isNetworkErr =
        err?.code === 'auth/network-request-failed' ||
        err?.message?.includes('network-request-failed');
      const msg = isNetworkErr
        ? 'Google sign-in was interrupted. Please try again from Chrome.'
        : `Google authentication error: ${err.message || 'Popup closed or restricted.'}`;
      showAlert(msg, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = authEmail.trim();

    if (!email || !authPassword) {
      showAlert('Enter your email address and password.', 'error');
      return;
    }

    if (authPassword.length < 6) {
      showAlert('Password must be at least 6 characters.', 'error');
      return;
    }

    try {
      setAuthLoading(true);

      if (authMode === 'signup') {
        await registerWithEmail(email, authPassword, authName);
        showAlert('Account created successfully.', 'success');
      } else {
        await signInWithEmail(email, authPassword);
        showAlert('Signed in successfully.', 'success');
      }

      setShowAuthModal(false);
      setAuthPassword('');
    } catch (err: any) {
      console.error('Email authentication failed:', err);
      const code = err?.code || '';
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'That email already has an account. Choose Sign In.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/invalid-credential': 'Email or password is incorrect.',
        'auth/user-not-found': 'No account was found for that email.',
        'auth/wrong-password': 'Email or password is incorrect.',
        'auth/weak-password': 'Choose a stronger password (6+ characters).',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network connection failed. Check your internet and try again.'
      };
      showAlert(messages[code] || `Authentication error: ${err?.message || 'Please try again.'}`, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
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
  ) => {
    if (!currentUser) {
      showAlert('Please sign in with Google to place an order.', 'error');
      return;
    }

    const mamila = mamilasList.find(m => m.id === batch.mamilaId);
    const quantity = options?.quantity || 1;
    const deliveryFee = options?.deliveryCity === 'Hargeisa' ? 200 : 150;
    const subtotal = batch.price * quantity;
    const totalPrice = subtotal + deliveryFee;

    const originCoords = mamila?.coordinates || MAMILA_COORDINATES[batch.mamilaId] || MAMILA_COORDINATES.m1;
    const destCoords = options?.customerCoordinates || DEFAULT_CUSTOMER_COORDINATES;

    const orderDocId = generateOrderId();
    const effectiveCustomerId = currentUser.uid;
    const effectiveCustomerName = userProfile?.displayName || currentUser.displayName || 'Customer';
    const effectivePhone = userProfile?.phone || '';
    const effectiveAddress = options?.customerAddress || userProfile?.address || 'Jijiga';
    const effectivePlusCode = options?.customerPlusCode || userProfile?.plusCode || '';

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
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PAYMENT_PENDING',
      customerId: effectiveCustomerId,
      customerName: effectiveCustomerName,
      customerPhone: effectivePhone,
      customerCity: options?.deliveryCity || userProfile?.city || 'Jijiga',
      customerPlusCode: effectivePlusCode,
      customerAddress: effectiveAddress,
      customerCoordinates: destCoords,
      mamilaCoordinates: originCoords,
      specialInstructions: options?.specialInstructions || '',
      cookingInstruction: options?.cookingInstruction || '',
      distanceKm: 3.2,
      etaMinutes: 14,
      createdAt: new Date(),
    };

    setOrders(prev => [newOrder, ...prev]);

    if (!isDemoMode && currentUser) {
      try {
        await createOrderWithInventoryReservation(newOrder);
        await logDeliveryEventToFirestore({
          orderId: orderDocId,
          status: 'PENDING',
          timestamp: new Date().toISOString(),
          actorRole: 'CUSTOMER',
          actorId: currentUser.uid,
          actorName: effectiveCustomerName,
          note: `Order placed for ${batch.name} (${paymentMethod}) and entered unassigned runner pool.`
        });
        showAlert(`Order #${orderDocId.slice(-6)} securely saved to Cloud Firestore!`, 'success');
      } catch (err: any) {
        console.error('Failed to save order to Firestore:', err);
        // Data integrity rollback: undo optimistic additions so React state strictly matches database truth
        setOrders(prev => prev.filter(o => o.id !== orderDocId));
        showAlert(`Could not sync order to database: ${err.message}`, 'error');
      }
    }
  };

  const handleBookParcel = async (parcelOrder: Partial<Order>) => {
    if (!currentUser) {
      showAlert('Please sign in with Google to book a parcel delivery.', 'error');
      return;
    }
    const orderDocId = generateOrderId();
    const effectiveCustomerId = currentUser.uid;
    const effectiveCustomerName = userProfile?.displayName || currentUser.displayName || parcelOrder.customerName || 'Customer';
    const effectivePhone = userProfile?.phone || parcelOrder.customerPhone || '';

    const fullOrder: Order = {
      ...(parcelOrder as Order),
      id: orderDocId,
      customerId: effectiveCustomerId,
      customerName: effectiveCustomerName,
      customerPhone: effectivePhone,
      status: 'PENDING',
      createdAt: new Date(),
    };

    setOrders(prev => [fullOrder, ...prev]);

    if (isDemoMode) {
      showAlert('Demo Mode: service order kept local; no production backend write was made.', 'info');
      return;
    }

    try {
      await createServiceOrder(fullOrder as unknown as Record<string, unknown>);
      await logDeliveryEventToFirestore({
        orderId: fullOrder.id,
        status: fullOrder.status,
        timestamp: new Date().toISOString(),
        actorRole: 'CUSTOMER',
        actorId: currentUser.uid,
        actorName: fullOrder.customerName,
        note: `Express parcel booked: ${fullOrder.batchName}.`
      });
      showAlert(`Parcel Order #${fullOrder.id.slice(-6)} saved to Cloud Firestore!`, 'success');
    } catch (err: any) {
      // Rollback state on persistence failure
      setOrders(prev => prev.filter(o => o.id !== fullOrder.id));
      showAlert(`Could not save parcel order to Firestore: ${err.message}`, 'error');
    }
  };

  const handleBookRide = async (rideOrder: Partial<Order>) => {
    if (!currentUser) {
      showAlert('Please sign in with Google to request an express ride.', 'error');
      return;
    }
    const orderDocId = generateOrderId();
    const effectiveCustomerId = currentUser.uid;
    const effectiveCustomerName = userProfile?.displayName || currentUser.displayName || rideOrder.customerName || 'Customer';

    const fullOrder: Order = {
      ...(rideOrder as Order),
      id: orderDocId,
      customerId: effectiveCustomerId,
      customerName: effectiveCustomerName,
      status: 'PENDING',
      createdAt: new Date(),
    };

    setOrders(prev => [fullOrder, ...prev]);

    if (isDemoMode) {
      showAlert('Demo Mode: service order kept local; no production backend write was made.', 'info');
      return;
    }

    try {
      await createServiceOrder(fullOrder as unknown as Record<string, unknown>);
      await logDeliveryEventToFirestore({
        orderId: fullOrder.id,
        status: fullOrder.status,
        timestamp: new Date().toISOString(),
        actorRole: 'CUSTOMER',
        actorId: currentUser.uid,
        actorName: fullOrder.customerName,
        note: `Express Bajaj ride requested.`
      });
      showAlert(`Ride #${fullOrder.id.slice(-6)} recorded in Cloud Firestore!`, 'success');
    } catch (err: any) {
      // Rollback state on persistence failure
      setOrders(prev => prev.filter(o => o.id !== fullOrder.id));
      showAlert(`Could not record ride: ${err.message}`, 'error');
    }
  };

  const handleBookEeu = async (eeuOrder: Partial<Order>) => {
    if (!currentUser) {
      showAlert('Please sign in with Google to book an EEU recharge.', 'error');
      return;
    }
    const orderDocId = generateOrderId();
    const effectiveCustomerId = currentUser.uid;
    const effectiveCustomerName = userProfile?.displayName || currentUser.displayName || eeuOrder.customerName || 'Customer';
    const effectivePhone = userProfile?.phone || eeuOrder.customerPhone || '';

    const fullOrder: Order = {
      ...(eeuOrder as Order),
      id: orderDocId,
      customerId: effectiveCustomerId,
      customerName: effectiveCustomerName,
      customerPhone: effectivePhone,
      status: 'PENDING',
      createdAt: new Date(),
    };

    setOrders(prev => [fullOrder, ...prev]);

    if (isDemoMode) {
      showAlert('Demo Mode: service order kept local; no production backend write was made.', 'info');
      return;
    }

    try {
      await createServiceOrder(fullOrder as unknown as Record<string, unknown>);
      await logDeliveryEventToFirestore({
        orderId: fullOrder.id,
        status: fullOrder.status,
        timestamp: new Date().toISOString(),
        actorRole: 'CUSTOMER',
        actorId: currentUser.uid,
        actorName: fullOrder.customerName,
        note: `EEU Prepaid electricity recharge booked.`
      });
      showAlert(`EEU Recharge Order #${fullOrder.id.slice(-6)} saved to Cloud Firestore!`, 'success');
    } catch (err: any) {
      // Rollback state on persistence failure
      setOrders(prev => prev.filter(o => o.id !== fullOrder.id));
      showAlert(`Could not save EEU order: ${err.message}`, 'error');
    }
  };

  const handleBookKhat = async (khatOrder: Partial<Order>) => {
    if (!currentUser) {
      showAlert('Please sign in with Google to order Khat.', 'error');
      return;
    }
    const orderDocId = generateOrderId();
    const effectiveCustomerId = currentUser.uid;
    const effectiveCustomerName = userProfile?.displayName || currentUser.displayName || khatOrder.customerName || 'Customer';
    const effectivePhone = userProfile?.phone || khatOrder.customerPhone || '';

    const fullOrder: Order = {
      ...(khatOrder as Order),
      id: orderDocId,
      customerId: effectiveCustomerId,
      customerName: effectiveCustomerName,
      customerPhone: effectivePhone,
      status: 'PENDING',
      createdAt: new Date(),
    };

    setOrders(prev => [fullOrder, ...prev]);

    if (isDemoMode) {
      showAlert('Demo Mode: Khat order kept local; no inventory was reserved in production.', 'info');
      return;
    }

    try {
      // Khat consumes the same inventory as FOOD and must reserve stock atomically.
      await createOrderWithInventoryReservation(fullOrder);
      await logDeliveryEventToFirestore({
        orderId: fullOrder.id,
        status: fullOrder.status,
        timestamp: new Date().toISOString(),
        actorRole: 'CUSTOMER',
        actorId: currentUser.uid,
        actorName: fullOrder.customerName,
        note: `Fresh Khat order placed from ${fullOrder.mamilaName || 'Mamila stall'} with atomic inventory reservation.`
      });
      showAlert(`Khat order #${fullOrder.id.slice(-6)} saved to Cloud Firestore!`, 'success');
    } catch (err: any) {
      // Rollback state on persistence failure
      setOrders(prev => prev.filter(o => o.id !== fullOrder.id));
      showAlert(`Could not save Khat order: ${err.message}`, 'error');
    }
  };

  const handleUpdateUserProfile = async (updates: Partial<AppUserProfile>) => {
    if (!currentUser) {
      showAlert('Please sign in with Google to update your delivery profile.', 'error');
      return;
    }
    try {
      await updateUserProfile(currentUser.uid, updates);
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      showAlert('Delivery profile and saved addresses successfully updated in Cloud Firestore!', 'success');
    } catch (err: any) {
      showAlert(`Could not update profile: ${err.message}`, 'error');
    }
  };

  const handleUpdateOrder = async (orderId: string, updates: Partial<Order>) => {
    // Prevent customer from modifying protected pricing or courier assignment fields
    if (activeRole === 'CUSTOMER' && userProfile?.role !== 'admin') {
      const protectedKeys = ['price', 'totalPrice', 'deliveryFee', 'paymentStatus', 'customerId', 'runnerId', 'riderId', 'runnerTagId', 'riderProofUrl'];
      const hasProtected = Object.keys(updates).some(k => protectedKeys.includes(k));
      if (hasProtected || (updates.status && updates.status !== 'CANCELLED')) {
        showAlert('Unauthorized: Customers cannot modify protected pricing, status, or courier assignment fields.', 'error');
        return;
      }
    }

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));

    if (!isDemoMode && currentUser) {
      try {
        await updateOrderInFirestore(orderId, updates);
        if (updates.status) {
          await logDeliveryEventToFirestore({
            orderId,
            status: updates.status,
            timestamp: new Date().toISOString(),
            actorRole: activeRole,
            actorId: currentUser.uid,
            actorName: userProfile?.displayName || 'Courier',
            note: `Status updated to ${updates.status} by ${activeRole}.`
          });
        }
      } catch (err: any) {
        // Persistence failed: restore the previous in-memory order so UI cannot
        // advertise a state that Firestore rejected.
        const fresh = orders.find(o => o.id === orderId);
        if (fresh) {
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...fresh } : o));
        }
        showAlert(`Status update failed: ${err.message}`, 'error');
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
      if (targetOrder.paymentStatus === 'PAID_CONFIRMED') {
        showAlert('Paid orders cannot be cancelled from the customer portal. Please contact support for a refund.', 'error');
        return;
      }

      if (!isDemoMode && currentUser) {
        try {
          if (targetOrder.serviceType === 'FOOD' || targetOrder.serviceType === 'KHAT') {
            await cancelOrderAndRestoreInventory(orderId, currentUser.uid);
          } else {
            await updateOrderInFirestore(orderId, { status: 'CANCELLED' });
          }
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
          await logDeliveryEventToFirestore({
            orderId, status: 'CANCELLED', timestamp: new Date().toISOString(),
            actorRole: 'CUSTOMER', actorId: currentUser.uid,
            actorName: userProfile?.displayName || 'Customer',
            note: targetOrder.serviceType === 'FOOD' || targetOrder.serviceType === 'KHAT'
              ? 'Order cancelled and reserved stock restored atomically.'
              : 'Service order cancelled before dispatch.'
          });
        } catch (err: any) {
          showAlert(`Cancellation failed: ${err.message}`, 'error');
        }
      } else {
        if (targetOrder.serviceType === 'FOOD' || targetOrder.serviceType === 'KHAT') {
          setInventory(prev => prev.map(b => b.id === targetOrder.batchId ? { ...b, available: b.available + qty } : b));
        }
        handleUpdateOrder(orderId, { status: 'CANCELLED' });
      }
    }
  };

  // Step-through simulation helper — never advances live production orders.
  const handleSimulateNextStep = (orderId: string) => {
    if (!isDemoMode) {
      showAlert('Simulation is disabled for live production orders.', 'error');
      return;
    }
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    if (target.serviceType === 'EEU_RECHARGE' && target.eeuDetails) {
      const nextPhase = getNextEeuPhase(target.eeuDetails.custodyPhase);
      if (nextPhase) {
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const stepConfig = EEU_STATE_CHAIN.find(s => s.phase === nextPhase);
        const isReturned = nextPhase === 'RETURNED';

        const updatedEeuDetails: EeuRechargeDetails = {
          ...target.eeuDetails,
          custodyPhase: nextPhase,
          custodyLabel: stepConfig ? stepConfig.label : (nextPhase as any),
          custodyTimeline: [
            ...target.eeuDetails.custodyTimeline,
            {
              phase: nextPhase,
              label: stepConfig ? stepConfig.label : nextPhase,
              timestamp: nowTime,
              note: `Step advanced to ${stepConfig ? stepConfig.title : nextPhase}.`,
              actor: 'Custody Dispatch'
            }
          ],
          receiptImageUrl: target.eeuDetails.receiptImageUrl || (nextPhase === 'WITH_RIDER_RETURN' || nextPhase === 'RETURNED'
            ? '/src/assets/images/dairy_farm_essentials_1790430944133.jpg'
            : undefined),
          receiptTimestamp: target.eeuDetails.receiptTimestamp || (nextPhase === 'WITH_RIDER_RETURN' ? `${new Date().toISOString().slice(0, 10)} ${nowTime}` : undefined),
          tokenCode: target.eeuDetails.tokenCode || '4920-1928-4820-9182-3849'
        };

        handleUpdateOrder(orderId, {
          eeuDetails: updatedEeuDetails,
          status: isReturned ? 'DELIVERED' : 'PICKED_UP',
          riderId: target.riderId || currentUser?.uid || 'simulated-rider',
          riderName: target.riderName || userProfile?.displayName || 'Staff Rider'
        });
        return;
      }
    }

    if (target.status === 'RUNNER_ASSIGNED' || target.status === 'PENDING' || target.status === 'TRANSACTION_PENDING') {
      handleUpdateOrder(orderId, { 
        status: 'READY_FOR_RIDER', 
        runnerTagId: 'TAG-ET-' + Math.floor(10000 + Math.random() * 90000) 
      });
    } else if (target.status === 'READY_FOR_RIDER' || target.status === 'VERIFIED_READY') {
      handleUpdateOrder(orderId, { 
        status: 'RIDER_ACCEPTED', 
        riderId: currentUser?.uid || 'simulated-rider', 
        riderName: userProfile?.displayName || 'Staff Rider' 
      });
    } else if (target.status === 'RIDER_ACCEPTED' || target.status === 'RIDER_DISPATCHED') {
      handleUpdateOrder(orderId, { status: 'PICKED_UP' });
    } else if (target.status === 'PICKED_UP' || target.status === 'IN_TRANSIT') {
      handleUpdateOrder(orderId, { 
        status: 'DELIVERED',
        paymentStatus: target.paymentMethod === 'COD' ? 'COLLECTED_BY_RIDER' : target.paymentStatus
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
                  <h4 className="font-bold text-sm text-blue-950">Customer Sign In Required for Orders</h4>
                  <p className="text-xs text-blue-800 mt-0.5">
                    On Android, use a free email/password account to avoid WebView Google OAuth issues. Google sign-in remains available on the web app.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={handleSignIn}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In to Continue
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto p-4 md:p-6 mt-2">
          {activeRole === 'CUSTOMER' && (
            <CustomerView 
              inventory={inventory} 
              myOrders={customerOrders} 
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
              onSimulateNextStep={isDemoMode || userProfile?.role === 'admin' ? handleSimulateNextStep : undefined}
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
              orders={runnerOrders} 
              currentRunnerId={currentUser?.uid}
              currentRunnerName={userProfile?.displayName || currentUser?.displayName || 'Verified Staff Runner'}
              orderMessages={orderMessages}
              onSendMessage={handleSendMessage}
              onClaimOrder={handleClaimRunnerJob}
              onUpdateStatus={(id, status) => handleUpdateOrder(id, { 
                status, 
                runnerTagId: 'TAG-ET-' + Math.floor(10000 + Math.random() * 90000) 
              })} 
              onRejectDefect={handleRejectDefect}
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
            />
          )}
        </main>

        {showAuthModal && !currentUser && (
          <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    {authMode === 'signin' ? 'Sign in to Jijiga Express' : 'Create your Jijiga Express account'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Free email/password login works directly inside the Android app.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-xl leading-none"
                  aria-label="Close authentication dialog"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                    <input
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    minLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm"
                >
                  {authLoading ? 'Please wait…' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  className="text-blue-700 font-semibold hover:underline"
                >
                  {authMode === 'signin' ? 'Create a new account' : 'I already have an account'}
                </button>

                {!Capacitor.isNativePlatform() && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAuthModal(false);
                      handleSignIn();
                    }}
                    className="text-slate-700 font-semibold hover:underline"
                  >
                    Use Google instead
                  </button>
                )}
              </div>

              <p className="mt-4 text-[11px] leading-4 text-slate-500">
                Your account uses the existing Firebase project. No new Firebase project or database is created.
              </p>
            </div>
          </div>
        )}

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

        {/* Production Footer with Subtle Developer / Sandbox Trigger */}
        <footer className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-6 border-t border-slate-200 mt-12 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-800">Jijiga Express Delivery Service</p>
            <p className="text-[11px] text-slate-500">
              Jijiga Express handles local parcels, documents, food, groceries, and shop orders within Jijiga.
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
            ) : DEMO_SANDBOX_ENABLED ? (
              <button
                onClick={() => toggleMode('demo')}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center gap-1"
                title="Open offline sandbox for feature walkthrough"
              >
                <Database className="w-3 h-3" />
                Developer Demo Sandbox
              </button>
            ) : null}
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
