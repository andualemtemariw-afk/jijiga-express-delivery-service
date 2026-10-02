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

const ORDERS_COLLECTION = 'orders';
const USERS_COLLECTION = 'users';

/**
 * Queries active verified staff members from `/users` by role.
 */
export async function fetchEligibleStaff(role: 'runner' | 'rider'): Promise<AppUserProfile[]> {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('role', '==', role)
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
