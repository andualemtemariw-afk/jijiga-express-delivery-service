import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './googleAuth';
import { removeUndefinedFields } from './firestoreSync';
import { Order, Batch } from '../types';

/**
 * Atomically creates an order and reserves stock. The Firestore rules verify
 * that the stock decrement matches the order quantity.
 */
export async function createOrderWithInventoryReservation(order: Order): Promise<void> {
  const orderRef = doc(db, 'orders', order.id);
  const batchRef = doc(db, 'batches', order.batchId);

  await runTransaction(db, async (tx) => {
    const [batchSnap, existingOrderSnap] = await Promise.all([
      tx.get(batchRef),
      tx.get(orderRef),
    ]);

    if (existingOrderSnap.exists()) {
      throw new Error('Order ID already exists. Please retry the order.');
    }
    if (!batchSnap.exists()) {
      throw new Error('The selected inventory batch no longer exists.');
    }

    const batch = batchSnap.data() as Batch;
    const quantity = Number(order.quantity || 1);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Invalid order quantity.');
    }
    if (Number(batch.available) < quantity) {
      throw new Error(`Only ${batch.available} unit(s) remain available.`);
    }

    const reservedBatch = removeUndefinedFields({
      available: Number(batch.available) - quantity,
      lastReservationId: order.id,
      updatedAt: serverTimestamp(),
    });

    const orderPayload = removeUndefinedFields({
      ...order,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
      updatedAt: serverTimestamp(),
    });

    const reservationRef = doc(db, 'inventoryReservations', order.id);
    tx.update(batchRef, reservedBatch);
    tx.set(orderRef, orderPayload);
    tx.set(reservationRef, {
      orderId: order.id,
      batchId: order.batchId,
      customerId: order.customerId,
      quantity,
      action: 'RESERVE',
      createdAt: serverTimestamp(),
    });
  });
}

/** Atomically cancels an eligible order and restores its reserved inventory. */
export async function cancelOrderAndRestoreInventory(orderId: string, customerUid: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found.');

    const order = orderSnap.data() as Order;
    if (order.customerId !== customerUid) throw new Error('You are not authorized to cancel this order.');
    if (!['PENDING', 'TRANSACTION_PENDING', 'RUNNER_ASSIGNED'].includes(order.status)) {
      throw new Error(`Order cannot be cancelled from status ${order.status}.`);
    }

    const batchRef = doc(db, 'batches', order.batchId);
    const batchSnap = await tx.get(batchRef);
    if (!batchSnap.exists()) throw new Error('Inventory batch no longer exists. Contact support.');

    const batch = batchSnap.data() as Batch;
    const quantity = Number(order.quantity || 1);

    const reserveRef = doc(db, 'inventoryReservations', orderId);
    const reserveSnap = await tx.get(reserveRef);
    if (!reserveSnap.exists() || reserveSnap.data().action !== 'RESERVE') {
      throw new Error('Inventory reservation record is missing or already released.');
    }
    const releaseId = `${orderId}-release`;
    const releaseRef = doc(db, 'inventoryReservations', releaseId);

    tx.update(batchRef, {
      available: Number(batch.available) + quantity,
      lastReservationId: releaseId,
      updatedAt: serverTimestamp(),
    });
    tx.update(orderRef, {
      status: 'CANCELLED',
      updatedAt: serverTimestamp(),
    });
    tx.set(releaseRef, {
      orderId,
      batchId: order.batchId,
      customerId: customerUid,
      quantity,
      action: 'RELEASE',
      createdAt: serverTimestamp(),
    });
  });
}
