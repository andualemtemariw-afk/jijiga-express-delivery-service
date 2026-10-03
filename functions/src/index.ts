import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';

initializeApp();

const FIRESTORE_DATABASE_ID = 'ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286';
const db = getFirestore(FIRESTORE_DATABASE_ID);
const auth = getAuth();

const STAFF_ROLES = new Set(['mamila', 'runner', 'rider']);
const PAYMENT_STATUSES = new Set(['PAID_CONFIRMED', 'FAILED', 'REFUNDED']);
const PAYMENT_PROVIDERS = new Set(['TELEBIRR', 'EBIRR', 'CBE_BIRR', 'COOP_PAY', 'SAHAL', 'ZAAD', 'E_DAHAB']);
const paymentWebhookSecret = defineSecret('PAYMENT_WEBHOOK_SECRET');

async function requireAdmin(uid?: string): Promise<void> {
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication is required.');

  const token = await auth.getUser(uid);
  if (token.customClaims?.role === 'admin' && token.customClaims?.active === true) return;

  const userSnap = await db.doc(`users/${uid}`).get();
  const profile = userSnap.data() || {};
  if (
    !userSnap.exists
    || profile.role !== 'admin'
    || profile.active !== true
  ) {
    throw new HttpsError('permission-denied', 'Administrator privileges are required.');
  }
}

const PAYMENT_METHODS = new Set([...PAYMENT_PROVIDERS, 'COD']);

function isSafeOrderId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(value);
}

function asBoundedString(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new HttpsError('invalid-argument', `Invalid ${field}.`);
  }
  return value.trim();
}

function paymentStateFor(method: string): string {
  return method === 'COD' ? 'UNPAID' : 'PAYMENT_PENDING';
}

function calculateParcelPricing(details: Record<string, unknown>) {
  const senderCity = asBoundedString(details.senderCity, 'parcelDetails.senderCity', 100);
  const receiverCity = asBoundedString(details.receiverCity, 'parcelDetails.receiverCity', 100);
  const weightCategory = asBoundedString(details.weightCategory, 'parcelDetails.weightCategory', 30);
  const weightAddons: Record<string, number> = {
    '< 1 kg': 50,
    '1 - 3 kg': 100,
    '3 - 5 kg': 180,
    '5 - 10 kg': 250,
  };
  const weightAddon = weightAddons[weightCategory];
  if (weightAddon === undefined) throw new HttpsError('invalid-argument', 'Invalid parcel weight category.');
  const tamperSeal = details.tamperSealRequested === true;
  const deliveryFee = senderCity !== receiverCity ? 200 : 120;
  const price = weightAddon + (tamperSeal ? 30 : 0);
  return { quantity: 1, price, deliveryFee, totalPrice: price + deliveryFee };
}

function calculateRidePricing(details: Record<string, unknown>) {
  const vehicleType = asBoundedString(details.vehicleType, 'rideDetails.vehicleType', 40);
  if (!['MARHABA_TAXI', 'MARHABA_MOTO'].includes(vehicleType)) {
    throw new HttpsError('invalid-argument', 'Invalid ride vehicle type.');
  }
  const distanceKm = vehicleType === 'MARHABA_TAXI' ? 6.8 : 5.4;
  const baseFare = vehicleType === 'MARHABA_TAXI' ? 120 : 60;
  const perKmRate = vehicleType === 'MARHABA_TAXI' ? 24 : 14;
  const price = Math.round(baseFare + distanceKm * perKmRate);
  return {
    quantity: 1,
    price,
    deliveryFee: 0,
    totalPrice: price,
    distanceKm,
    etaMinutes: Math.round(distanceKm * 2.2 + 3),
  };
}

function calculateEeuPricing(details: Record<string, unknown>) {
  const rechargeAmount = Number(details.rechargeAmount);
  if (!Number.isInteger(rechargeAmount) || rechargeAmount < 100 || rechargeAmount > 15000 || rechargeAmount % 50 !== 0) {
    throw new HttpsError('invalid-argument', 'Recharge amount must be ETB 100-15000 in 50 ETB increments.');
  }
  const meterNumber = String(details.meterNumber || '').replace(/\D/g, '');
  if (meterNumber.length !== 13) {
    throw new HttpsError('invalid-argument', 'EEU meter number must contain exactly 13 digits.');
  }
  const serviceFee = 75;
  return {
    quantity: 1,
    price: rechargeAmount,
    deliveryFee: serviceFee,
    totalPrice: rechargeAmount + serviceFee,
    rechargeAmount,
    meterNumber,
    kwhUnits: Math.round((rechargeAmount / 2.15) * 10) / 10,
  };
}

function sanitizeParcelDetails(input: Record<string, unknown>) {
  return {
    senderName: asBoundedString(input.senderName, 'parcelDetails.senderName', 120),
    senderPhone: asBoundedString(input.senderPhone, 'parcelDetails.senderPhone', 40),
    senderCity: asBoundedString(input.senderCity, 'parcelDetails.senderCity', 100),
    senderAddress: asBoundedString(input.senderAddress, 'parcelDetails.senderAddress', 300),
    receiverName: asBoundedString(input.receiverName, 'parcelDetails.receiverName', 120),
    receiverPhone: asBoundedString(input.receiverPhone, 'parcelDetails.receiverPhone', 40),
    receiverCity: asBoundedString(input.receiverCity, 'parcelDetails.receiverCity', 100),
    receiverAddress: asBoundedString(input.receiverAddress, 'parcelDetails.receiverAddress', 300),
    parcelCategory: asBoundedString(input.parcelCategory, 'parcelDetails.parcelCategory', 40),
    weightCategory: asBoundedString(input.weightCategory, 'parcelDetails.weightCategory', 30),
    description: asBoundedString(input.description, 'parcelDetails.description', 500),
    isFragile: input.isFragile === true,
    tamperSealRequested: input.tamperSealRequested === true,
    trackingCode: '',
  };
}

function sanitizeRideDetails(input: Record<string, unknown>, pricing: ReturnType<typeof calculateRidePricing>) {
  return {
    vehicleType: asBoundedString(input.vehicleType, 'rideDetails.vehicleType', 40),
    pickupLocation: asBoundedString(input.pickupLocation, 'rideDetails.pickupLocation', 300),
    dropoffLocation: asBoundedString(input.dropoffLocation, 'rideDetails.dropoffLocation', 300),
    city: asBoundedString(input.city, 'rideDetails.city', 100),
    tripDistanceKm: pricing.distanceKm,
    tripDurationMins: pricing.etaMinutes,
    rideStatus: 'REQUESTED',
  };
}

function sanitizeEeuDetails(input: Record<string, unknown>, pricing: ReturnType<typeof calculateEeuPricing>, hubName: string) {
  const cardSerialNumber = typeof input.cardSerialNumber === 'string'
    ? input.cardSerialNumber.trim().slice(0, 100)
    : '';
  return {
    meterNumber: pricing.meterNumber,
    cardSerialNumber: cardSerialNumber || undefined,
    rechargeAmount: pricing.rechargeAmount,
    serviceFee: pricing.deliveryFee,
    eeuHubName: hubName,
    custodyPhase: 'WITH_CUSTOMER',
    custodyLabel: 'WITH_CUSTOMER',
    custodyTimeline: [{
      phase: 'WITH_CUSTOMER',
      label: 'WITH_CUSTOMER',
      timestamp: new Date().toISOString(),
      note: 'Service request created; physical smart card remains with customer pending rider pickup.',
      actor: 'Customer',
    }],
    kwhUnits: pricing.kwhUnits,
  };
}

export const createServiceOrder = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication is required.');

  const data = (request.data || {}) as Record<string, unknown>;
  const profileSnap = await db.doc(`users/${uid}`).get();
  if (!profileSnap.exists) {
    throw new HttpsError('permission-denied', 'A user profile is required.');
  }
  const profile = profileSnap.data() || {};
  if (profile.role !== 'customer' && profile.active !== true) {
    throw new HttpsError('permission-denied', 'This staff account is inactive.');
  }
  const serviceType = asBoundedString(data.serviceType, 'serviceType', 30);
  if (!['PARCEL', 'RIDE', 'EEU_RECHARGE'].includes(serviceType)) {
    throw new HttpsError('invalid-argument', 'Unsupported service order type.');
  }

  const paymentMethod = asBoundedString(data.paymentMethod, 'paymentMethod', 30).toUpperCase();
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    throw new HttpsError('invalid-argument', 'Unsupported payment method.');
  }

  const orderId = isSafeOrderId(data.id) ? data.id : db.collection('orders').doc().id;
  const existing = await db.doc(`orders/${orderId}`).get();
  if (existing.exists) throw new HttpsError('already-exists', 'Order ID already exists.');

  const common = {
    id: orderId,
    serviceType,
    batchId: typeof data.batchId === 'string' ? data.batchId.trim().slice(0, 128) : serviceType.toLowerCase(),
    batchName: asBoundedString(data.batchName, 'batchName', 200),
    mamilaId: typeof data.mamilaId === 'string' ? data.mamilaId.trim().slice(0, 128) : serviceType.toLowerCase(),
    mamilaName: asBoundedString(data.mamilaName, 'mamilaName', 200),
    mamilaLocation: asBoundedString(data.mamilaLocation, 'mamilaLocation', 300),
    status: 'PENDING',
    paymentMethod,
    paymentStatus: paymentStateFor(paymentMethod),
    customerId: uid,
    customerName: asBoundedString(data.customerName, 'customerName', 120),
    customerPhone: asBoundedString(data.customerPhone, 'customerPhone', 40),
    customerCity: asBoundedString(data.customerCity, 'customerCity', 100),
    customerPlusCode: typeof data.customerPlusCode === 'string' ? data.customerPlusCode.trim().slice(0, 100) : '',
    customerAddress: asBoundedString(data.customerAddress, 'customerAddress', 300),
    specialInstructions: typeof data.specialInstructions === 'string' ? data.specialInstructions.trim().slice(0, 500) : '',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  } as Record<string, unknown>;

  let derived: Record<string, unknown>;
  if (serviceType === 'PARCEL') {
    if (!data.parcelDetails || typeof data.parcelDetails !== 'object') {
      throw new HttpsError('invalid-argument', 'Parcel details are required.');
    }
    const parcelDetails = sanitizeParcelDetails(data.parcelDetails as Record<string, unknown>);
    const pricing = calculateParcelPricing(parcelDetails);
    parcelDetails.trackingCode = `PARCEL-${orderId.slice(-8).toUpperCase()}`;
    derived = { ...pricing, parcelDetails, distanceKm: pricing.deliveryFee === 200 ? 145 : 6.5, etaMinutes: pricing.deliveryFee === 200 ? 180 : 35 };
  } else if (serviceType === 'RIDE') {
    if (!data.rideDetails || typeof data.rideDetails !== 'object') {
      throw new HttpsError('invalid-argument', 'Ride details are required.');
    }
    const pricing = calculateRidePricing(data.rideDetails as Record<string, unknown>);
    derived = { ...pricing, rideDetails: sanitizeRideDetails(data.rideDetails as Record<string, unknown>, pricing) };
  } else {
    if (!data.eeuDetails || typeof data.eeuDetails !== 'object') {
      throw new HttpsError('invalid-argument', 'EEU recharge details are required.');
    }
    const details = data.eeuDetails as Record<string, unknown>;
    const pricing = calculateEeuPricing(details);
    const hubName = asBoundedString(details.eeuHubName, 'eeuDetails.eeuHubName', 200);
    derived = { ...pricing, eeuDetails: sanitizeEeuDetails(details, pricing, hubName) };
  }

  await db.doc(`orders/${orderId}`).set({ ...common, ...derived });
  return { orderId, price: derived.price, deliveryFee: derived.deliveryFee, totalPrice: derived.totalPrice, paymentStatus: common.paymentStatus };
});

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
  await auth.setCustomUserClaims(data.uid, { role: data.role, active: data.active !== false });
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
  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const provider = typeof body.provider === 'string' ? body.provider.trim() : '';
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  const status = body.status;
  const amount = body.amount;

  if (
    !eventId || eventId.length > 128 || eventId.includes('/')
    || !orderId || !provider || !reference
    || typeof status !== 'string' || !PAYMENT_STATUSES.has(status)
    || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0
    || body.currency !== 'ETB'
  ) {
    res.status(400).send('Invalid payment event');
    return;
  }

  const orderRef = db.doc(`orders/${orderId}`);
  const paymentEventRef = db.doc(`paymentEvents/${eventId}`);

  try {
    await db.runTransaction(async (tx) => {
      const [orderSnap, previousEventSnap] = await Promise.all([
        tx.get(orderRef),
        tx.get(paymentEventRef),
      ]);

      if (!orderSnap.exists) throw new Error('ORDER_NOT_FOUND');
      const order = orderSnap.data() || {};

      if (previousEventSnap.exists) {
        const previous = previousEventSnap.data() || {};
        const sameEvent =
          previous.orderId === orderId
          && previous.provider === provider
          && previous.reference === reference
          && previous.status === status
          && Number(previous.amount) === amount
          && previous.currency === 'ETB';

        if (!sameEvent) throw new Error('PAYMENT_EVENT_CONFLICT');
        return;
      }

      const normalizedProvider = provider.toUpperCase();
      if (!PAYMENT_PROVIDERS.has(normalizedProvider)) {
        throw new Error('UNSUPPORTED_PROVIDER');
      }
      if (String(order.paymentMethod || '').toUpperCase() !== normalizedProvider) {
        throw new Error('PAYMENT_PROVIDER_MISMATCH');
      }

      if (order.paymentStatus === 'PAID_CONFIRMED') {
        if (
          status === 'PAID_CONFIRMED'
          && order.paymentProvider === normalizedProvider
          && order.paymentReference === reference
        ) {
          return;
        }
        if (status !== 'REFUNDED') {
          throw new Error('PAYMENT_STATE_CONFLICT');
        }
        if (order.paymentReference && order.paymentReference !== reference) {
          throw new Error('PAYMENT_ALREADY_CONFIRMED');
        }
      }

      if (status === 'REFUNDED' && order.paymentStatus !== 'PAID_CONFIRMED') {
        throw new Error('INVALID_REFUND_STATE');
      }

      if (
        order.paymentStatus === 'REFUNDED'
        && status !== 'REFUNDED'
      ) {
        throw new Error('PAYMENT_STATE_CONFLICT');
      }

      if (Math.abs(Number(order.totalPrice || 0) - amount) > 0.01) {
        throw new Error('AMOUNT_MISMATCH');
      }

      tx.set(paymentEventRef, {
        eventId,
        orderId,
        provider: normalizedProvider,
        reference,
        status,
        amount,
        currency: 'ETB',
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(orderRef, {
        paymentStatus: status,
        paymentProvider: normalizedProvider,
        paymentReference: reference,
        paymentVerifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const auditRef = db.collection('deliveryEvents').doc();
      tx.set(auditRef, {
        orderId,
        actorRole: 'PAYMENT_PROVIDER',
        actorId: provider,
        actorName: provider,
        status: order.status || 'PENDING',
        eventType: 'PAYMENT_VERIFIED',
        paymentStatus: status,
        paymentReference: reference,
        amount,
        eventId,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    res.status(200).json({ ok: true });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : 'PAYMENT_EVENT_FAILED';
    const responseCodes: Record<string, number> = {
      ORDER_NOT_FOUND: 404,
      PAYMENT_EVENT_CONFLICT: 409,
      PAYMENT_ALREADY_CONFIRMED: 409,
      INVALID_REFUND_STATE: 409,
      AMOUNT_MISMATCH: 409,
    };
    res.status(responseCodes[code] || 400).send(code);
  }
});
