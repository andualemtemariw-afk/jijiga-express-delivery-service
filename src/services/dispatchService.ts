import { 
  doc, 
  collection, 
  query, 
  where, 
  getDocs, 
  runTransaction, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './googleAuth';
import { Order, OrderStatus, AppUserProfile, UserRole } from '../types';
import { removeUndefinedFields, logDeliveryEventToFirestore } from './firestoreSync';
import { isValidRunnerTag, generateRunnerTag } from '../utils/tagGenerator';

const ORDERS_COLLECTION = 'orders';
const USERS_COLLECTION = 'users';

/**
 * Queries active verified staff members from `/users` by role.
 */
export async function fetchEligibleStaff(role: 'runner' | 'rider'): Promise<AppUserProfile[]> {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('role', '==', role),
      where('active', '==', true)
    );
    const snap = await getDocs(q);
    const staff: AppUserProfile[] = [];
    snap.forEach((docSnap) => {
      staff.push({ uid: docSnap.id, ...(docSnap.data() as any) });
    });
    return staff;
  } catch (err: any) {
    console.warn(`Could not query staff for role ${role}:`, err.message);
    return [];
  }
}

/**
 * Atomically claims an unassigned order for a Runner using a Firestore transaction.
 * Prevents race conditions where two runners attempt to claim the same job simultaneously.
 */
export async function claimOrderAsRunner(
  orderId: string,
  runner: { uid: string; displayName?: string }
): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error(`Order #${orderId.slice(-6)} does not exist.`);
    }

    const data = orderDoc.data() as Order;

    // Concurrency guard: check if already claimed
    if (data.runnerId) {
      if (data.runnerId === runner.uid) {
        return; // Already claimed by this runner
      }
      throw new Error(`Race condition: Order #${orderId.slice(-6)} was already claimed by ${data.runnerName || 'another runner'}.`);
    }

    if (data.status === 'CANCELLED' || data.status === 'DELIVERED') {
      throw new Error(`Order #${orderId.slice(-6)} is in terminal status '${data.status}' and cannot be claimed.`);
    }

    if (data.status !== 'PENDING' && data.status !== 'TRANSACTION_PENDING') {
      throw new Error(`Order #${orderId.slice(-6)} is in status '${data.status}' and cannot be claimed by a runner.`);
    }

    const updates = removeUndefinedFields({
      runnerId: runner.uid,
      runnerName: runner.displayName || 'Verified Staff Runner',
      status: 'RUNNER_ASSIGNED' as OrderStatus,
      updatedAt: serverTimestamp(),
    });

    transaction.update(orderRef, updates);
  });

  // Log milestone audit event
  await logDeliveryEventToFirestore({
    orderId,
    status: 'RUNNER_ASSIGNED',
    timestamp: new Date().toISOString(),
    actorRole: 'RUNNER',
    actorId: runner.uid,
    actorName: runner.displayName || 'Verified Staff Runner',
    note: `Order claimed for physical quality inspection by runner ${runner.displayName || runner.uid.slice(0, 6)}.`
  });
}

/**
 * Atomically seals an inspected order, persists the unique runner tag in format TAG-ET-#####,
 * and advances the order status to READY_FOR_RIDER.
 * Ensures the exact tag displayed to the runner is persisted without mutation or regeneration.
 */
export async function handoverOrderToRider(
  orderId: string,
  runner: { uid: string; displayName?: string },
  proposedTag?: string
): Promise<string> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  let persistedTag = '';

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error(`Order #${orderId.slice(-6)} does not exist.`);
    }

    const data = orderDoc.data() as Order;

    // Authorization guard: only assigned runner can hand over
    if (data.runnerId && data.runnerId !== runner.uid) {
      throw new Error(`Unauthorized: Order #${orderId.slice(-6)} is assigned to ${data.runnerName || 'another runner'}.`);
    }

    // Status transition guard: must be in RUNNER_ASSIGNED
    if (data.status !== 'RUNNER_ASSIGNED') {
      if (data.status === 'READY_FOR_RIDER' || data.status === 'VERIFIED_READY') {
        throw new Error(`Duplicate submission: Order #${orderId.slice(-6)} has already been sealed and handed over.`);
      }
      throw new Error(`Cannot hand over order in status '${data.status}'. Order must be RUNNER_ASSIGNED.`);
    }

    // Reuse existing tag if already persisted; otherwise validate or generate
    if (data.runnerTagId && isValidRunnerTag(data.runnerTagId)) {
      persistedTag = data.runnerTagId;
    } else if (proposedTag && isValidRunnerTag(proposedTag)) {
      persistedTag = proposedTag;
    } else {
      persistedTag = generateRunnerTag();
    }

    const updates = removeUndefinedFields({
      status: 'READY_FOR_RIDER' as OrderStatus,
      runnerTagId: persistedTag,
      updatedAt: serverTimestamp(),
    });

    transaction.update(orderRef, updates);
  });

  // Log milestone audit event with the exact persisted tag
  await logDeliveryEventToFirestore({
    orderId,
    status: 'READY_FOR_RIDER',
    timestamp: new Date().toISOString(),
    actorRole: 'RUNNER',
    actorId: runner.uid,
    actorName: runner.displayName || 'Verified Staff Runner',
    note: `Order inspected and sealed with tamper-evident tag ${persistedTag}. Transferred to rider queue.`
  });

  return persistedTag;
}

/**
 * Atomically claims an order for a Rider using a Firestore transaction.
 * Prevents race conditions where two riders attempt to accept the same route simultaneously.
 */
export async function claimOrderAsRider(
  orderId: string,
  rider: { uid: string; displayName?: string }
): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error(`Order #${orderId.slice(-6)} does not exist.`);
    }

    const data = orderDoc.data() as Order;

    // Concurrency guard: check if already claimed
    if (data.riderId) {
      if (data.riderId === rider.uid) {
        return; // Already claimed by this rider
      }
      throw new Error(`Race condition: Delivery #${orderId.slice(-6)} was already claimed by ${data.riderName || 'another rider'}.`);
    }

    if (data.status !== 'READY_FOR_RIDER' && data.status !== 'VERIFIED_READY') {
      throw new Error(`Order #${orderId.slice(-6)} is not ready for delivery dispatch (current status: ${data.status}).`);
    }

    const updates = removeUndefinedFields({
      riderId: rider.uid,
      riderName: rider.displayName || 'Verified Staff Rider',
      status: 'RIDER_ACCEPTED' as OrderStatus,
      updatedAt: serverTimestamp(),
    });

    transaction.update(orderRef, updates);
  });

  // Log milestone audit event
  await logDeliveryEventToFirestore({
    orderId,
    status: 'RIDER_ACCEPTED',
    timestamp: new Date().toISOString(),
    actorRole: 'RIDER',
    actorId: rider.uid,
    actorName: rider.displayName || 'Verified Staff Rider',
    note: `Delivery route claimed by courier rider ${rider.displayName || rider.uid.slice(0, 6)}.`
  });
}

/**
 * Allows an authorized Admin to assign or reassign any runner or rider to an order.
 */
export async function adminReassignOrder(
  orderId: string,
  assignment: {
    runnerId?: string;
    runnerName?: string;
    riderId?: string;
    riderName?: string;
    status?: OrderStatus;
  },
  adminUser: { uid: string; displayName?: string }
): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error(`Order #${orderId.slice(-6)} does not exist.`);
    }

    const updates: any = {
      ...assignment,
      updatedAt: serverTimestamp(),
    };

    transaction.update(orderRef, removeUndefinedFields(updates));
  });

  await logDeliveryEventToFirestore({
    orderId,
    status: assignment.status || 'RUNNER_ASSIGNED',
    timestamp: new Date().toISOString(),
    actorRole: 'ADMIN',
    actorId: adminUser.uid,
    actorName: adminUser.displayName || 'Admin Dispatcher',
    note: `Admin re-assigned courier personnel: Runner (${assignment.runnerName || assignment.runnerId || 'unchanged'}), Rider (${assignment.riderName || assignment.riderId || 'unchanged'}).`
  });
}
