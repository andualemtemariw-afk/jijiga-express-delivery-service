import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { parseAndVerifyTelebirrNotification, getTelebirrSignature, generateTelebirrMerchantOrderId } from './payments/telebirr';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { randomBytes } from 'node:crypto';

initializeApp();

const FIRESTORE_DATABASE_ID = 'ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286';
const db = getFirestore(FIRESTORE_DATABASE_ID);
const auth = getAuth();

const STAFF_ROLES = new Set(['mamila', 'runner', 'rider']);
const PAYMENT_STATUSES = new Set(['PAID_CONFIRMED', 'FAILED', 'REFUNDED']);
// Only provider-specific adapters implemented in production may settle payments.
const PAYMENT_PROVIDERS = new Set(['TELEBIRR']);
const paymentWebhookSecret = defineSecret('PAYMENT_WEBHOOK_SECRET');
const telebirrFabricAppId = defineSecret('TELEBIRR_FABRIC_APP_ID');
const telebirrAppSecret = defineSecret('TELEBIRR_APP_SECRET');
const telebirrMerchantAppId = defineSecret('TELEBIRR_MERCHANT_APP_ID');
const telebirrMerchantCode = defineSecret('TELEBIRR_MERCHANT_CODE');
const telebirrPrivateKey = defineSecret('TELEBIRR_PRIVATE_KEY');
const telebirrPublicKey = defineSecret('TELEBIRR_PUBLIC_KEY');
const telebirrNotifyUrl = defineSecret('TELEBIRR_NOTIFY_URL');
const telebirrRedirectUrl = defineSecret('TELEBIRR_REDIRECT_URL');

const TELEBIRR_API_BASE =
  'https://superapp.ethiomobilemoney.et:38443/apiaccess/payment/gateway';
const TELEBIRR_WEB_BASE =
  'https://superapp.ethiomobilemoney.et:38443/payment/web/paygate?';

async function requireAdmin(uid?: string): Promise<void> {
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication is required.');

  const token = await auth.getUser(uid);
  const userSnap = await db.doc(`users/${uid}`).get();
  const profile = userSnap.data() || {};

  if (
    !userSnap.exists
    || profile.role !== 'admin'
    || profile.active !== true
    || token.customClaims?.role !== 'admin'
    || token.customClaims?.active !== true
  ) {
    throw new HttpsError('permission-denied', 'Administrator privileges are required.');
  }
}

const PAYMENT_METHODS = new Set(['TELEBIRR', 'COD']);
// Only providers with a live, verified adapter are offered for new customer orders.

function isSafeOrderId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(value);
}

function asString(value: unknown): string {
  return typeof value === 'string'
    ? value.trim()
    : value !== undefined && value !== null
      ? String(value).trim()
      : '';
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
  if (profile.role !== 'customer') {
    throw new HttpsError('permission-denied', 'Only customer accounts can create service orders.');
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

type SettledPaymentEvent = {
  eventId: string;
  orderId: string;
  provider: string;
  reference: string;
  status: 'PAID_CONFIRMED' | 'FAILED' | 'REFUNDED';
  amount: number;
  currency: 'ETB';
};

async function settlePaymentEvent(orderRef: FirebaseFirestore.DocumentReference, event: SettledPaymentEvent): Promise<void> {
  const paymentEventRef = db.doc(`paymentEvents/${event.eventId}`);

  await db.runTransaction(async (tx) => {
    const [orderSnap, previousEventSnap] = await Promise.all([
      tx.get(orderRef),
      tx.get(paymentEventRef),
    ]);

    if (!orderSnap.exists) throw new Error('ORDER_NOT_FOUND');
    const order = orderSnap.data() || {};

    const normalizedProvider = event.provider.toUpperCase();
    if (!PAYMENT_PROVIDERS.has(normalizedProvider)) {
      throw new Error('UNSUPPORTED_PROVIDER');
    }

    if (previousEventSnap.exists) {
      const previous = previousEventSnap.data() || {};
      const sameEvent =
        previous.orderId === event.orderId
        && String(previous.provider || '').toUpperCase() === normalizedProvider
        && previous.reference === event.reference
        && previous.status === event.status
        && Number(previous.amount) === event.amount
        && previous.currency === 'ETB';

      if (!sameEvent) throw new Error('PAYMENT_EVENT_CONFLICT');
      return;
    }

    if (String(order.paymentMethod || '').toUpperCase() !== normalizedProvider) {
      throw new Error('PAYMENT_PROVIDER_MISMATCH');
    }

    if (order.paymentStatus === 'PAID_CONFIRMED') {
      if (
        event.status === 'PAID_CONFIRMED'
        && order.paymentProvider === normalizedProvider
        && order.paymentReference === event.reference
      ) {
        return;
      }
      if (event.status !== 'REFUNDED') {
        throw new Error('PAYMENT_STATE_CONFLICT');
      }
      if (order.paymentReference && order.paymentReference !== event.reference) {
        throw new Error('PAYMENT_ALREADY_CONFIRMED');
      }
    }

    if (event.status === 'REFUNDED' && order.paymentStatus !== 'PAID_CONFIRMED') {
      throw new Error('INVALID_REFUND_STATE');
    }

    if (order.paymentStatus === 'REFUNDED' && event.status !== 'REFUNDED') {
      throw new Error('PAYMENT_STATE_CONFLICT');
    }

    if (Math.abs(Number(order.totalPrice || 0) - event.amount) > 0.01) {
      throw new Error('AMOUNT_MISMATCH');
    }

    tx.set(paymentEventRef, {
      eventId: event.eventId,
      orderId: event.orderId,
      provider: normalizedProvider,
      reference: event.reference,
      status: event.status,
      amount: event.amount,
      currency: 'ETB',
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.update(orderRef, {
      paymentStatus: event.status,
      paymentProvider: normalizedProvider,
      paymentReference: event.reference,
      paymentVerifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const auditRef = db.collection('deliveryEvents').doc();
    tx.set(auditRef, {
      orderId: event.orderId,
      actorRole: 'PAYMENT_PROVIDER',
      actorId: normalizedProvider,
      actorName: normalizedProvider,
      status: order.status || 'PENDING',
      eventType: 'PAYMENT_VERIFIED',
      paymentStatus: event.status,
      paymentReference: event.reference,
      amount: event.amount,
      eventId: event.eventId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

async function telebirrPostJson(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  const raw = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    const json = raw ? JSON.parse(raw) : {};
    if (json && typeof json === 'object' && !Array.isArray(json)) parsed = json;
  } catch {
    // Preserve an HTTP error response even when it is not JSON.
  }

  if (!response.ok) {
    throw new Error(`TELEBIRR_HTTP_${response.status}`);
  }

  return parsed;
}

function asMillis(value: unknown): number | null {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildTelebirrCheckoutUrl(
  prepayId: string,
  merchantAppId: string,
  merchantCode: string,
  privateKey: string,
): string {
  const params = {
    appid: merchantAppId,
    merch_code: merchantCode,
    nonce_str: randomBytes(16).toString('hex').toUpperCase(),
    prepay_id: prepayId,
    timestamp: Math.floor(Date.now() / 1000).toString(),
  };

  const sign = getTelebirrSignature(params, privateKey);
  const query = Object.entries({
    ...params,
    sign,
    sign_type: 'SHA256WithRSA',
    version: '1.0',
    trade_type: 'Checkout',
  }).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');

  return `${TELEBIRR_WEB_BASE}${query}`;
}

/**
 * Creates a server-side Telebirr H5 checkout and binds the provider's
 * merchant-order identifier to the internal order before returning the URL.
 */
export const createTelebirrCheckout = onCall({
  secrets: [
    telebirrFabricAppId,
    telebirrAppSecret,
    telebirrMerchantAppId,
    telebirrMerchantCode,
    telebirrPrivateKey,
    telebirrNotifyUrl,
    telebirrRedirectUrl,
  ],
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication is required.');

  const data = (request.data || {}) as Record<string, unknown>;
  const orderId = asBoundedString(data.orderId, 'orderId', 128);
  const orderRef = db.doc(`orders/${orderId}`);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found.');
  const order = orderSnap.data() || {};

  if (order.customerId !== uid) {
    throw new HttpsError('permission-denied', 'You can only pay for your own order.');
  }
  if (String(order.paymentMethod || '').toUpperCase() !== 'TELEBIRR') {
    throw new HttpsError('failed-precondition', 'This order is not configured for Telebirr.');
  }
  if (order.paymentStatus !== 'PAYMENT_PENDING') {
    throw new HttpsError('failed-precondition', 'This order is not awaiting payment.');
  }
  if (['CANCELLED', 'DELIVERED', 'RATED', 'DECLINED', 'DEFECT_REJECTED'].includes(String(order.status || ''))) {
    throw new HttpsError('failed-precondition', 'This order is no longer eligible for payment.');
  }

  const totalAmount = Number(order.totalPrice);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new HttpsError('failed-precondition', 'Order amount is invalid.');
  }

  const merchantOrderId = generateTelebirrMerchantOrderId();
  const fabricAppId = telebirrFabricAppId.value().trim();
  const appSecret = telebirrAppSecret.value();
  const merchantAppId = telebirrMerchantAppId.value().trim();
  const merchantCode = telebirrMerchantCode.value().trim();
  const privateKey = telebirrPrivateKey.value();
  const notifyUrl = telebirrNotifyUrl.value().trim();
  const redirectUrl = telebirrRedirectUrl.value().trim();

  const existingPrepayId = asString(order.paymentCheckoutPrepayId);
  const existingMerchantOrderId = asString(order.paymentMerchantOrderId);
  const existingCreatedAt = asMillis(order.paymentCheckoutCreatedAt);
  if (existingPrepayId && existingMerchantOrderId && existingCreatedAt && Date.now() - existingCreatedAt < 110 * 60 * 1000) {
    return {
      checkoutUrl: buildTelebirrCheckoutUrl(existingPrepayId, merchantAppId, merchantCode, privateKey),
      paymentMerchantOrderId: existingMerchantOrderId,
      prepayId: existingPrepayId,
    };
  }

  if (!fabricAppId || !appSecret || !merchantAppId || !merchantCode || !privateKey || !notifyUrl) {
    throw new HttpsError('failed-precondition', 'Telebirr production credentials are not configured.');
  }
  if (!/^\d{6}$/.test(merchantCode)) {
    throw new HttpsError('failed-precondition', 'Telebirr merchant code must be six digits.');
  }

  try {
    const tokenResponse = await telebirrPostJson(
      `${TELEBIRR_API_BASE}/payment/v1/token`,
      {
        'Content-Type': 'application/json',
        'X-APP-Key': fabricAppId,
      },
      { appSecret },
    );

    const fabricToken = typeof tokenResponse.token === 'string' ? tokenResponse.token.trim() : '';
    if (!fabricToken) throw new Error('TELEBIRR_TOKEN_MISSING');

    const bizContent: Record<string, unknown> = {
      notify_url: notifyUrl,
      appid: merchantAppId,
      merch_code: merchantCode,
      merch_order_id: merchantOrderId,
      trade_type: 'Checkout',
      title: `Jijiga Express Order ${orderId.slice(-8)}`,
      total_amount: totalAmount.toFixed(2),
      trans_currency: 'ETB',
      timeout_express: '120m',
      business_type: 'BuyGoods',
      payee_identifier: merchantCode,
      payee_identifier_type: '04',
      payee_type: '5000',
    };
    if (redirectUrl) bizContent.redirect_url = redirectUrl;

    const requestBody: Record<string, unknown> = {
      timestamp: Math.floor(Date.now() / 1000).toString(),
      nonce_str: randomBytes(16).toString('hex').toUpperCase(),
      method: 'payment.preorder',
      version: '1.0',
      biz_content: bizContent,
    };
    requestBody.sign = getTelebirrSignature(requestBody, privateKey);
    requestBody.sign_type = 'SHA256WithRSA';

    const createOrderResponse = await telebirrPostJson(
      `${TELEBIRR_API_BASE}/payment/v1/merchant/preOrder`,
      {
        'Content-Type': 'application/json',
        Authorization: fabricToken,
        'X-APP-Key': fabricAppId,
      },
      requestBody,
    );

    const responseBiz = createOrderResponse.biz_content;
    const prepayId = responseBiz && typeof responseBiz === 'object'
      ? String((responseBiz as Record<string, unknown>).prepay_id || '')
      : '';
    if (!prepayId) throw new Error('TELEBIRR_PREPAY_ID_MISSING');

    await orderRef.set({
      paymentMerchantOrderId: merchantOrderId,
      paymentCheckoutPrepayId: prepayId,
      paymentCheckoutCreatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      checkoutUrl: buildTelebirrCheckoutUrl(prepayId, merchantAppId, merchantCode, privateKey),
      paymentMerchantOrderId: merchantOrderId,
      prepayId,
    };
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : 'TELEBIRR_CHECKOUT_FAILED';
    logger.error('Telebirr checkout failed', { orderId, code });
    throw new HttpsError('failed-precondition', 'Telebirr checkout could not be created.');
  }
});

/**
 * Generic normalized webhook contract. External payment providers must first
 * pass their real signature verification and then call/forward a normalized
 * event to this endpoint using the shared secret.
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
  const provider = typeof body.provider === 'string' ? body.provider.trim().toUpperCase() : '';
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  const status = body.status;
  const amount = body.amount;

  if (provider === 'TELEBIRR') {
    res.status(400).send('TELEBIRR_REQUIRES_PROVIDER_WEBHOOK');
    return;
  }

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

  try {
    await settlePaymentEvent(db.doc(`orders/${orderId}`), {
      eventId,
      orderId,
      provider,
      reference,
      status: status as SettledPaymentEvent['status'],
      amount,
      currency: 'ETB',
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
      PAYMENT_STATE_CONFLICT: 409,
    };
    res.status(responseCodes[code] || 400).send(code);
  }
});

/**
 * Real Telebirr provider callback. Unlike paymentWebhook, this route verifies
 * the RSA-PSS signature from Telebirr itself and validates our merchant identity
 * before settling the internal order.
 */
export const telebirrWebhook = onRequest({
  secrets: [telebirrPublicKey, telebirrMerchantAppId, telebirrMerchantCode, telebirrNotifyUrl],
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const rawBody = (() => {
    const candidate = (req as typeof req & { rawBody?: Buffer }).rawBody;
    if (candidate instanceof Buffer) return candidate.toString('utf8');
    if (typeof req.body === 'string') return req.body;
    return JSON.stringify(req.body ?? {});
  })();

  try {
    const publicKey = telebirrPublicKey.value().trim();
    const merchantAppId = telebirrMerchantAppId.value().trim();
    const merchantCode = telebirrMerchantCode.value().trim();
    const notifyUrl = telebirrNotifyUrl.value().trim();
    if (!publicKey || !merchantAppId || !merchantCode || !notifyUrl) {
      throw new Error('TELEBIRR_NOT_CONFIGURED');
    }

    const notification = parseAndVerifyTelebirrNotification(rawBody, publicKey);

    if (
      notification.appId !== merchantAppId
      || notification.merchCode !== merchantCode
      || notification.notifyUrl !== notifyUrl
    ) {
      res.status(401).json({ ok: false, error: 'MERCHANT_IDENTITY_MISMATCH' });
      return;
    }

    const orderQuery = await db.collection('orders')
      .where('paymentMerchantOrderId', '==', notification.merchantOrderId)
      .limit(1)
      .get();

    if (orderQuery.empty) {
      res.status(404).json({ ok: false, error: 'ORDER_NOT_FOUND' });
      return;
    }

    const orderDoc = orderQuery.docs[0];
    await settlePaymentEvent(orderDoc.ref, {
      eventId: notification.eventId,
      orderId: orderDoc.id,
      provider: 'TELEBIRR',
      reference: notification.reference,
      status: notification.status,
      amount: notification.amount,
      currency: 'ETB',
    });

    res.status(200).json({ ok: true });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : 'TELEBIRR_WEBHOOK_FAILED';
    const responseCodes: Record<string, number> = {
      INVALID_JSON: 400,
      INVALID_PAYLOAD: 400,
      INVALID_SIGNATURE: 401,
      INVALID_PAYMENT_FIELDS: 400,
      UNSUPPORTED_TRADE_STATUS: 400,
      TELEBIRR_NOT_CONFIGURED: 503,
      ORDER_NOT_FOUND: 404,
      PAYMENT_EVENT_CONFLICT: 409,
      PAYMENT_ALREADY_CONFIRMED: 409,
      INVALID_REFUND_STATE: 409,
      AMOUNT_MISMATCH: 409,
      PAYMENT_STATE_CONFLICT: 409,
    };
    const statusCode = responseCodes[code] || (code.startsWith('TELEBIRR_') ? 400 : 400);
    logger.warn('Telebirr webhook rejected', { code });
    res.status(statusCode).json({ ok: false, error: code });
  }
});
