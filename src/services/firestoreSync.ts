import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  getDocs, 
  getDoc,
  getDocFromServer,
  query, 
  where,
  limit,
  serverTimestamp,
  Timestamp,
  addDoc,
  runTransaction
} from 'firebase/firestore';
import { auth, db } from './googleAuth';
import { Order, Batch, Mamila, ChatMessage, DeliveryEvent, Role } from '../types';
import { INITIAL_BATCHES, MAMILAS } from '../data';

/**
 * Validates connection to Cloud Firestore if invoked explicitly.
 */
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info(`[FirestoreSync] Connection validated successfully.`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.warn('[FirestoreSync] Operating in offline cache mode until connection handshake completes:', msg);
    } else {
      console.warn('[FirestoreSync] Initial connection notice:', msg);
    }
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const ORDERS_COLLECTION = 'orders';
const BATCHES_COLLECTION = 'batches';
const MAMILAS_COLLECTION = 'mamilas';
const EVENTS_COLLECTION = 'deliveryEvents';

/**
 * Generates a collision-resistant Firestore document ID.
 */
export function generateOrderId(): string {
  return doc(collection(db, ORDERS_COLLECTION)).id;
}

/**
 * Subscribes to real-time order updates based on the user's role and authorization.
 */
export function subscribeToOrdersByRole(
  userRole: string,
  userUid: string,
  onOrdersUpdated: (orders: Order[]) => void,
  onError?: (err: Error) => void
) {
  const ordersRef = collection(db, ORDERS_COLLECTION);
  const queries = [];

  if (userRole === 'admin') {
    queries.push(query(ordersRef, limit(100)));
  } else if (userRole === 'runner') {
    // Assigned work is queried by identity; the public queue is limited to explicit-null assignment.
    // Legacy documents without runnerId need an authorized migration before they enter this queue.
    queries.push(query(ordersRef, where('runnerId', '==', userUid), limit(50)));
    queries.push(query(
      ordersRef,
      where('runnerId', '==', null),
      where('status', 'in', ['PENDING', 'TRANSACTION_PENDING']),
      limit(50)
    ));
  } else if (userRole === 'rider') {
    queries.push(query(ordersRef, where('riderId', '==', userUid), limit(50)));
    queries.push(query(
      ordersRef,
      where('riderId', '==', null),
      where('status', 'in', ['READY_FOR_RIDER', 'VERIFIED_READY']),
      limit(50)
    ));
  } else {
    // Customer queries remain strictly scoped to the authenticated identity.
    queries.push(query(ordersRef, where('customerId', '==', userUid), limit(50)));
  }

  const snapshotsByQuery: (Order[] | undefined)[] = Array(queries.length).fill(undefined);
  const unsubscribers = queries.map((orderQuery, index) => onSnapshot(
    orderQuery,
    (snapshot) => {
      snapshotsByQuery[index] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt || Date.now()),
        } as Order;
      });

      if (snapshotsByQuery.every((orders): orders is Order[] => orders !== undefined)) {
        const mergedOrders = new Map<string, Order>();
        snapshotsByQuery.forEach((orders) => orders?.forEach((order) => mergedOrders.set(order.id, order)));
        const result = [...mergedOrders.values()];
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onOrdersUpdated(result);
      }
    },
    (err) => {
      console.warn('Firestore subscription notice:', err.message);
      onError?.(err);
    }
  ));

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

/**
 * Recursively strips `undefined` fields from an object or array.
 * Cloud Firestore setDoc/updateDoc strictly disallows `undefined`.
 */
export function removeUndefinedFields<T>(val: T): T {
  if (val === undefined) {
    return undefined as any;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val.toISOString() as any;
  }
  // Check if it's a Firestore FieldValue / serverTimestamp
  if (val && typeof (val as any).isEqual === 'function') {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => removeUndefinedFields(item)) as any;
  }
  const result: any = {};
  for (const [key, v] of Object.entries(val)) {
    if (v !== undefined) {
      result[key] = removeUndefinedFields(v);
    }
  }
  return result;
}

/**
 * Saves a new order to Cloud Firestore.
 * For FOOD and KHAT orders with active Firestore batch tracking, performs the
 * atomic inventory reservation and stock decrement required by security rules.
 */
export async function saveOrderToFirestore(order: Order): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to place an order.');
  }

  const orderId = order.id && order.id.length > 10
    ? order.id
    : generateOrderId();

  const docRef = doc(db, ORDERS_COLLECTION, orderId);

  const rawOrder: any = {
    ...order,
    id: orderId,
    customerId: user.uid,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : (order.createdAt || new Date().toISOString()),
    updatedAt: serverTimestamp(),
  };

  const serializedOrder = removeUndefinedFields(rawOrder);

  if (order.serviceType === 'FOOD' || order.serviceType === 'KHAT') {
    const batchRef = doc(db, BATCHES_COLLECTION, order.batchId);
    const reservationRef = doc(db, 'inventoryReservations', orderId);

    try {
      await runTransaction(db, async (tx) => {
        const batchSnap = await tx.get(batchRef);
        if (!batchSnap.exists()) {
          throw new Error('This batch is no longer available. Refresh the live catalog and try again.');
        }

        const batchData = batchSnap.data();
        const availableStock = batchData.available || 0;
        const requestedQty = order.quantity || 1;

        if (availableStock < requestedQty) {
          throw new Error('Insufficient stock for ' + order.batchName + ': ' + availableStock + ' available, ' + requestedQty + ' requested.');
        }

        tx.update(batchRef, {
          available: availableStock - requestedQty,
          lastReservationId: orderId,
          updatedAt: new Date().toISOString(),
        });

        tx.set(reservationRef, {
          orderId,
          batchId: order.batchId,
          customerId: user.uid,
          quantity: requestedQty,
          action: 'RESERVE',
          createdAt: new Date().toISOString(),
        });

        tx.set(docRef, serializedOrder);
      });
      return orderId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    }
  } else {
    try {
      await setDoc(docRef, serializedOrder);
      return orderId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    }
  }
}

/**
 * Cancels an order in Firestore, atomically releasing reserved batch inventory per security rules.
 */
export async function cancelOrderInFirestore(order: Order): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to cancel an order.');
  }

  const orderRef = doc(db, ORDERS_COLLECTION, order.id);

  if (order.serviceType === 'FOOD' || order.serviceType === 'KHAT') {
    const batchRef = doc(db, BATCHES_COLLECTION, order.batchId);
    const releaseReservationRef = doc(db, 'inventoryReservations', `${order.id}-release`);

    try {
      await runTransaction(db, async (tx) => {
        const batchSnap = await tx.get(batchRef);
        const orderSnap = await tx.get(orderRef);

        if (!orderSnap.exists()) {
          throw new Error(`Order #${order.id} not found.`);
        }

        const requestedQty = order.quantity || 1;

        if (batchSnap.exists()) {
          const currentAvailable = batchSnap.data().available || 0;
          tx.update(batchRef, {
            available: currentAvailable + requestedQty,
            lastReservationId: `${order.id}-release`,
            updatedAt: new Date().toISOString(),
          });

          tx.set(releaseReservationRef, {
            orderId: order.id,
            batchId: order.batchId,
            customerId: user.uid,
            quantity: requestedQty,
            action: 'RELEASE',
            createdAt: new Date().toISOString(),
          });
        }

        tx.update(orderRef, {
          status: 'CANCELLED',
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  } else {
    await updateOrderInFirestore(order.id, { status: 'CANCELLED' });
  }
}

/**
 * Updates an existing order in Firestore.
 */
export async function updateOrderInFirestore(orderId: string, updates: Partial<Order>): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  try {
    const rawPayload: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    if (updates.createdAt instanceof Date) {
      rawPayload.createdAt = updates.createdAt.toISOString();
    }
    const cleanPayload = removeUndefinedFields(rawPayload);
    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
  }
}

/**
 * Persists an order chat message into the subcollection `/orders/{orderId}/messages/{messageId}`.
 */
export async function saveChatMessageToFirestore(
  orderId: string, 
  message: Omit<ChatMessage, 'id' | 'orderId'> | Omit<ChatMessage, 'id'>
): Promise<string> {
  try {
    const messagesCol = collection(db, ORDERS_COLLECTION, orderId, 'messages');
    const rawMsg = {
      ...message,
      senderId: auth.currentUser?.uid,
      orderId,
      timestamp: message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(messagesCol, removeUndefinedFields(rawMsg));
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}/messages`);
  }
}

/**
 * Subscribes to real-time chat messages for an order.
 */
export function subscribeToOrderMessages(
  orderId: string,
  onMessages: (msgs: ChatMessage[]) => void
) {
  const messagesCol = collection(db, ORDERS_COLLECTION, orderId, 'messages');
  return onSnapshot(messagesCol, (snapshot) => {
    const msgs: ChatMessage[] = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as ChatMessage));
    onMessages(msgs);
  }, (err) => {
    console.warn(`Order ${orderId} messages subscription notice:`, err.message);
  });
}

/**
 * Logs an immutable delivery milestone event in `/deliveryEvents`.
 */
export async function logDeliveryEventToFirestore(event: Omit<DeliveryEvent, 'id'>): Promise<void> {
  try {
    const eventsCol = collection(db, EVENTS_COLLECTION);
    const rawEvent = {
      ...event,
      createdAt: serverTimestamp(),
    };
    await addDoc(eventsCol, removeUndefinedFields(rawEvent));
  } catch (err) {
    console.warn('Could not log delivery event to Firestore:', err);
  }
}

/**
 * Seeds initial Mamilas & Batches to Firestore if empty, enabling full production functionality.
 */
export async function seedCatalogIfEmpty(): Promise<void> {
  try {
    const batchesSnap = await getDocs(query(collection(db, BATCHES_COLLECTION), limit(1)));
    if (batchesSnap.empty) {
      console.log('Seeding initial product catalog to Cloud Firestore...');
      // Seed Mamilas
      for (const m of MAMILAS) {
        await setDoc(doc(db, MAMILAS_COLLECTION, m.id), m);
      }
      // Seed Batches
      for (const b of INITIAL_BATCHES) {
        await setDoc(doc(db, BATCHES_COLLECTION, b.id), b);
      }
      console.log('Catalog seeding complete.');
    }
  } catch (err) {
    console.warn('Notice: Catalog seeding skipped or already present:', err);
  }
}

/**
 * Subscribes to Batches in Firestore.
 */
export function subscribeToFirestoreBatches(onBatches: (batches: Batch[]) => void) {
  return onSnapshot(collection(db, BATCHES_COLLECTION), (snapshot) => {
    if (!snapshot.empty) {
      const loaded = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Batch));
      onBatches(loaded);
    }
  }, (err) => {
    console.warn('Batches subscription fallback to local cache:', err.message);
  });
}

/**
 * Subscribes to Mamilas in Firestore.
 */
export function subscribeToFirestoreMamilas(onMamilas: (mamilas: Mamila[]) => void) {
  return onSnapshot(collection(db, MAMILAS_COLLECTION), (snapshot) => {
    if (!snapshot.empty) {
      const loaded = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Mamila));
      onMamilas(loaded);
    }
  }, (err) => {
    console.warn('Mamilas subscription fallback to local cache:', err.message);
  });
}
