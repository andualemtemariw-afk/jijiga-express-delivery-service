import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  getDocs, 
  getDocFromServer,
  query, 
  where,
  limit,
  serverTimestamp,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { auth, db } from './googleAuth';
import { Order, Batch, Mamila, ChatMessage, DeliveryEvent, Role } from '../types';
import { INITIAL_BATCHES, MAMILAS } from '../data';

/**
 * Validates connection to Cloud Firestore upon initial boot.
 */
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (
      error instanceof Error &&
      (error.message.includes('the client is offline') ||
       error.message.includes('unavailable') ||
       (error as any).code === 'unavailable')
    ) {
      console.info("Firestore client is offline or connecting. Local IndexedDB persistence is active.");
    }
  }
}
testConnection();

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
  let q;

  // Structure queries so they satisfy the security rules constraints
  if (userRole === 'admin') {
    q = query(ordersRef, limit(100));
  } else if (userRole === 'runner') {
    q = query(
      ordersRef,
      where('status', 'in', ['PENDING', 'TRANSACTION_PENDING', 'RUNNER_ASSIGNED', 'VERIFIED_READY', 'READY_FOR_RIDER']),
      limit(50)
    );
  } else if (userRole === 'rider') {
    q = query(
      ordersRef,
      where('status', 'in', ['READY_FOR_RIDER', 'RIDER_DISPATCHED', 'RIDER_ACCEPTED', 'IN_TRANSIT', 'PICKED_UP', 'DELIVERED']),
      limit(50)
    );
  } else {
    // Default to Customer: strictly query own orders
    q = query(
      ordersRef,
      where('customerId', '==', userUid),
      limit(50)
    );
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const loadedOrders: Order[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt || Date.now()),
        } as Order;
      });

      loadedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onOrdersUpdated(loadedOrders);
    },
    (err) => {
      console.warn('Firestore subscription notice:', err.message);
      onError?.(err);
    }
  );
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
 * Saves a new order to Cloud Firestore using an auto-generated or collision-resistant ID.
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

  try {
    await setDoc(docRef, serializedOrder, { merge: true });
    return orderId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
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
