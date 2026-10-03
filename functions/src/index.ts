import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';

initializeApp();

const db = getFirestore();
const auth = getAuth();

const STAFF_ROLES = new Set(['mamila', 'runner', 'rider']);
const PAYMENT_STATUSES = new Set(['PAID_CONFIRMED', 'FAILED', 'REFUNDED']);
const paymentWebhookSecret = defineSecret('PAYMENT_WEBHOOK_SECRET');

async function requireAdmin(uid?: string): Promise<void> {
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const token = await auth.getUser(uid);
  if (token.customClaims?.role === 'admin') return;
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Administrator privileges are required.');
  }
}

/** Provision staff through trusted Admin SDK code instead of client-side role assignment. */
export const provisionStaff = onCall(async (request) => {
  await requireAdmin(request.auth?.uid);
  const data = request.data as { uid?: string; role?: string; mamilaId?: string; active?: boolean };
  if (!data.uid || !data.role || !STAFF_ROLES.has(data.role)) {
    throw new HttpsError('invalid-argument', 'A valid staff UID and role are required.');
  }
  const user = await auth.getUser(data.uid);
  const profile: Record<string, unknown> = {
    uid: data.uid,
    role: data.role,
    active: data.active !== false,
    displayName: user.displayName || '',
    email: user.email || '',
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (data.mamilaId) profile.mamilaId = data.mamilaId;

  await db.doc(`users/${data.uid}`).set(profile, { merge: true });
  await auth.setCustomUserClaims(data.uid, { role: data.role });
  logger.info('Staff provisioned', { uid: data.uid, role: data.role, by: request.auth?.uid });
  return { ok: true };
});

/** Disable a staff account without deleting its historical delivery records. */
export const setStaffActive = onCall(async (request) => {
  await requireAdmin(request.auth?.uid);
  const data = request.data as { uid?: string; active?: boolean };
  if (!data.uid || typeof data.active !== 'boolean') {
    throw new HttpsError('invalid-argument', 'uid and active are required.');
  }
  const target = await auth.getUser(data.uid);
  const role = target.customClaims?.role;
  if (!STAFF_ROLES.has(role || '')) {
    throw new HttpsError('failed-precondition', 'Target account is not a staff account.');
  }
  await db.doc(`users/${data.uid}`).set({ active: data.active, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (!data.active) {
    await auth.setCustomUserClaims(data.uid, { role, active: false });
  } else {
    await auth.setCustomUserClaims(data.uid, { role, active: true });
  }
  return { ok: true };
});

/**
 * Provider-neutral payment webhook contract.
 * The concrete Telebirr/eBirr/CBE Birr/Coop Pay adapter should authenticate the
 * provider signature before forwarding a normalized event to this endpoint.
 */
export const paymentWebhook = onRequest({ secrets: [paymentWebhookSecret] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const expected = paymentWebhookSecret.value();
  const supplied = req.get('x-jijiga-express-signature');
  if (!expected || supplied !== expected) {
    res.status(401).send('Unauthorized');
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const provider = typeof body.provider === 'string' ? body.provider.trim() : '';
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  const status = body.status;
  const amount = body.amount;
  if (
    !orderId || !provider || !reference
    || typeof status !== 'string' || !PAYMENT_STATUSES.has(status)
    || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0
    || body.currency !== 'ETB'
  ) {
    res.status(400).send('Invalid payment event');
    return;
  }

  const orderRef = db.doc(`orders/${orderId}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new Error('ORDER_NOT_FOUND');
    const order = snap.data() || {};
    if (Math.abs(Number(order.totalPrice || 0) - amount) > 0.01) throw new Error('AMOUNT_MISMATCH');

    tx.update(orderRef, {
      paymentStatus: status,
      paymentProvider: provider,
      paymentReference: reference,
      paymentVerifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const eventRef = db.collection('deliveryEvents').doc();
    tx.set(eventRef, {
      orderId,
      actorRole: 'PAYMENT_PROVIDER',
      actorId: provider,
      actorName: provider,
      status: order.status || 'PENDING',
      eventType: 'PAYMENT_VERIFIED',
      paymentStatus: status,
      paymentReference: reference,
      amount,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  res.status(200).json({ ok: true });
});
