import { initializeApp, deleteApp as deleteClientApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, runTransaction, writeBatch } from 'firebase/firestore';

import { createRequire } from 'node:module';
const requireFromFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFromFunctions('firebase-admin/app');
const { getAuth: getAdminAuth } = requireFromFunctions('firebase-admin/auth');
const { getFirestore: getAdminFirestore } = requireFromFunctions('firebase-admin/firestore');

const projectId = 'sunny-discipline-hvd6f';
const databaseId = '(default)';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

const adminApp = initializeAdminApp({ projectId });
const adminDb = getAdminFirestore(adminApp);
const adminAuth = getAdminAuth(adminApp);

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
};

const users = {};
async function createUser(key, role, active = true, emailVerified = role === 'admin', emailOverride) {
  const email = emailOverride || `${key}@example.test`;
  const password = 'TestPassword-123!';
  const user = await adminAuth.createUser({
    email,
    password,
    displayName: `${key} User`,
    emailVerified
  });
  await adminDb.doc(`users/${user.uid}`).set({
    uid: user.uid, displayName: `${key} User`, email, role, active, createdAt: new Date().toISOString()
  });
  users[key] = { uid: user.uid, email, password, role };
  return user.uid;
}

async function clientFor(key) {
  const app = initializeApp(firebaseConfig, `test-${key}-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  await signInWithEmailAndPassword(auth, users[key].email, users[key].password);
  return { app, auth, db };
}

async function registerCustomerClient() {
  const suffix = Date.now();
  const email = `new-customer-${suffix}@example.test`;
  const password = 'TestPassword-123!';
  const app = initializeApp(firebaseConfig, `test-registered-customer-${suffix}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;
  // syncUserProfile first reads the possibly-missing document before creating it.
  // That initial self-read must be allowed, otherwise profile creation never runs.
  const missingProfile = await getDoc(doc(db, 'users', uid));
  if (missingProfile.exists()) throw new Error('Newly registered customer unexpectedly already has a profile');
  // Matches the profile shape written by syncUserProfile for a first-time customer.
  await setDoc(doc(db, 'users', uid), {
    uid,
    displayName: 'New Test Customer',
    email,
    photoURL: '',
    phone: '',
    city: 'Jijiga',
    address: '',
    plusCode: '',
    role: 'customer',
    createdAt: new Date().toISOString()
  });
  return { app, auth, db, uid, email, password };
}

async function expectDenied(label, action) {
  try {
    await action();
    throw new Error(`${label}: expected denial but operation succeeded`);
  } catch (error) {
    const code = error?.code || '';
    if (!String(code).includes('permission-denied') && !String(code).includes('storage/unauthorized')) {
      throw error;
    }
    console.log(`PASS ${label}`);
  }
}

async function main() {
  const customerUid = await createUser('customer', 'customer');
  await createUser('admin', 'admin', true, true, 'andualemawraris4@gmail.com');
  await createUser('unverified-admin', 'admin', true, false, 'andualemawraris104@gmail.com');
  await createUser('nonallowlisted-admin', 'admin', true, true, 'outside-admin@example.test');
  const runnerUid = await createUser('runner', 'runner');
  const otherRunnerUid = await createUser('other-runner', 'runner');
  const riderUid = await createUser('rider', 'rider');
  const otherRiderUid = await createUser('other-rider', 'rider');
  const inactiveRiderUid = await createUser('inactive-rider', 'rider', false);
  const strangerUid = await createUser('stranger', 'customer');

  const validOrder = {
    id: 'test-paid-order', serviceType: 'RIDE', batchId: 'ride-taxi', batchName: 'Test ride',
    mamilaId: 'm4', mamilaName: 'Test', mamilaLocation: 'Jijiga', price: 100, quantity: 1,
    deliveryFee: 0, totalPrice: 100, status: 'PICKED_UP', paymentMethod: 'TELEBIRR',
    paymentStatus: 'PAID_CONFIRMED', customerId: customerUid, customerName: 'Customer User',
    customerPhone: '', customerCity: 'Jijiga', customerPlusCode: '', customerAddress: 'Test address',
    createdAt: new Date().toISOString(), riderId: riderUid, riderName: 'rider User'
  };
  await adminDb.doc(`orders/${validOrder.id}`).set(validOrder);

  const customer = await clientFor('customer');
  // Register through Firebase Auth Emulator, create a customer-only profile, then reauthenticate
  // to exercise the profile lookup performed after an app relaunch without relying on active=true.
  const profileWithoutActive = await registerCustomerClient();
  const profileWithoutActiveUid = profileWithoutActive.uid;
  const ownProfile = await getDoc(doc(profileWithoutActive.db, 'users', profileWithoutActiveUid));
  if (!ownProfile.exists()) throw new Error('FAIL newly registered customer cannot read own profile');
  await signOut(profileWithoutActive.auth);
  await signInWithEmailAndPassword(profileWithoutActive.auth, profileWithoutActive.email, profileWithoutActive.password);
  const profileAfterReauthentication = await getDoc(doc(profileWithoutActive.db, 'users', profileWithoutActiveUid));
  if (!profileAfterReauthentication.exists()) throw new Error('FAIL customer cannot read own profile after reauthentication');
  console.log('PASS customer registration/profile read after reauthentication');
  await expectDenied('customer cannot read another customer profile', async () => {
    await getDoc(doc(customer.db, 'users', profileWithoutActiveUid));
  });
  await expectDenied('customer cannot self-activate by updating profile', async () => {
    await updateDoc(doc(profileWithoutActive.db, 'users', profileWithoutActiveUid), { active: true });
  });
  await expectDenied('customer cannot promote own profile to admin', async () => {
    await updateDoc(doc(profileWithoutActive.db, 'users', profileWithoutActiveUid), { role: 'admin' });
  });

  const validCustomerOrder = {
    id: 'customer-create-invalid-service',
    serviceType: 'RIDE',
    batchId: 'ride-marhaba-taxi',
    batchName: 'Test ride',
    mamilaId: 'm4',
    mamilaName: 'Test',
    mamilaLocation: 'Jijiga',
    price: 283,
    quantity: 1,
    deliveryFee: 0,
    totalPrice: 283,
    status: 'PENDING',
    paymentMethod: 'TELEBIRR',
    paymentStatus: 'PAYMENT_PENDING',
    customerId: customerUid,
    customerName: 'Customer User',
    customerPhone: '',
    customerCity: 'Jijiga',
    customerPlusCode: '',
    customerAddress: 'Kebele 04',
    rideDetails: {
      vehicleType: 'MARHABA_TAXI',
      pickupLocation: 'Kebele 04',
      dropoffLocation: 'Taiwan Market',
      city: 'Jijiga',
      rideStatus: 'REQUESTED'
    },
    createdAt: new Date().toISOString()
  };

  await expectDenied('customer cannot create a RIDE order with online payment disabled', async () => {
    await setDoc(doc(customer.db, 'orders', validCustomerOrder.id), validCustomerOrder);
  });

  await expectDenied('customer cannot create a ride on behalf of another customer', async () => {
    await setDoc(doc(customer.db, 'orders', 'ride-forged-customer'), {
      ...validCustomerOrder,
      id: 'ride-forged-customer',
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      customerId: strangerUid
    });
  });
  await expectDenied('customer cannot create an already-paid service order directly', async () => {
    await setDoc(doc(customer.db, 'orders', 'malicious-paid-create'), {
      ...validCustomerOrder,
      id: 'malicious-paid-create',
      paymentMethod: 'COD',
      paymentStatus: 'PAID_CONFIRMED'
    });
  });
  await expectDenied('customer cannot add payment verification fields on direct create', async () => {
    await setDoc(doc(customer.db, 'orders', 'malicious-payment-fields'), {
      ...validCustomerOrder,
      id: 'malicious-payment-fields',
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      paymentReference: 'FAKE-REF'
    });
  });


  await adminDb.doc('batches/test-food').set({
    id: 'test-food', mamilaId: 'm1', name: 'Test food', description: 'Test',
    price: 100, available: 5, expiry: 'test', imageUrl: '/test.jpg'
  });
  await expectDenied('customer cannot arbitrarily change batch stock', async () => {
    await updateDoc(doc(customer.db, 'batches', 'test-food'), { available: 999 });
  });

  const validFoodId = 'valid-food-order';
  await runTransaction(customer.db, async (tx) => {
    const batchRef = doc(customer.db, 'batches', 'test-food');
    const orderRef = doc(customer.db, 'orders', validFoodId);
    const reservationRef = doc(customer.db, 'inventoryReservations', validFoodId);
    const batchSnap = await tx.get(batchRef);
    if (!batchSnap.exists()) throw new Error('test batch missing');
    tx.update(batchRef, {
      available: batchSnap.data().available - 1,
      lastReservationId: validFoodId,
      updatedAt: new Date().toISOString()
    });
    tx.set(orderRef, {
      id: validFoodId, serviceType: 'FOOD', batchId: 'test-food', batchName: 'Test food',
      mamilaId: 'm1', mamilaName: 'Test', mamilaLocation: 'Jijiga',
      price: 100, quantity: 1, deliveryFee: 20, totalPrice: 120,
      status: 'PENDING', paymentMethod: 'COD', paymentStatus: 'UNPAID',
      customerId: customerUid, customerName: 'Customer User', customerPhone: '',
      customerCity: 'Jijiga', customerPlusCode: '', customerAddress: 'Test',
      createdAt: new Date().toISOString()
    });
    tx.set(reservationRef, {
      orderId: validFoodId, batchId: 'test-food', customerId: customerUid,
      quantity: 1, action: 'RESERVE', createdAt: new Date().toISOString()
    });
  });
  console.log('PASS valid FOOD order creation with inventory reservation');

  const directParcelId = 'valid-parcel-' + Date.now();
  await setDoc(doc(profileWithoutActive.db, 'orders', directParcelId), {
    id: directParcelId, serviceType: 'PARCEL', batchId: 'parcel-dispatch', batchName: 'Test parcel',
    mamilaId: 'm1', mamilaName: 'Jijiga Express Delivery Service Hub', mamilaLocation: 'Jijiga',
    price: 80, quantity: 1, deliveryFee: 120, totalPrice: 200, status: 'PENDING',
    paymentMethod: 'COD', paymentStatus: 'UNPAID', customerId: profileWithoutActiveUid,
    customerName: 'New Test Customer', customerPhone: '', customerCity: 'Jijiga',
    customerPlusCode: '', customerAddress: 'Kebele 04',
    parcelDetails: {
      senderName: 'Sender', senderPhone: '0911000000', senderCity: 'Jijiga', senderAddress: 'Origin',
      receiverName: 'Receiver', receiverPhone: '0911000001', receiverCity: 'Jijiga', receiverAddress: 'Destination',
      parcelCategory: 'DOCUMENTS', weightCategory: '< 1 kg', description: 'Test parcel',
      isFragile: false, tamperSealRequested: true, trackingCode: 'PARCEL-TEST'
    },
    createdAt: new Date().toISOString()
  });
  console.log('PASS COD parcel order created directly with rules-validated pricing');

  const directRideId = 'valid-ride-' + Date.now();
  await setDoc(doc(profileWithoutActive.db, 'orders', directRideId), {
    id: directRideId, serviceType: 'RIDE', batchId: 'ride-marhaba-taxi', batchName: 'Test taxi',
    mamilaId: 'm4', mamilaName: 'Jijiga Express Fleet', mamilaLocation: 'Jijiga',
    price: 283, quantity: 1, deliveryFee: 0, totalPrice: 283, status: 'PENDING',
    paymentMethod: 'COD', paymentStatus: 'UNPAID', customerId: profileWithoutActiveUid,
    customerName: 'New Test Customer', customerPhone: '', customerCity: 'Jijiga',
    customerPlusCode: '', customerAddress: 'Kebele 04',
    rideDetails: {
      vehicleType: 'MARHABA_TAXI', pickupLocation: 'Kebele 04', dropoffLocation: 'Taiwan Market',
      city: 'Jijiga', tripDistanceKm: 6.8, tripDurationMins: 18, rideStatus: 'REQUESTED'
    },
    distanceKm: 6.8, etaMinutes: 18, createdAt: new Date().toISOString()
  });
  console.log('PASS COD ride order created directly with rules-validated fare');

  const directEeuId = 'valid-eeu-' + Date.now();
  await setDoc(doc(profileWithoutActive.db, 'orders', directEeuId), {
    id: directEeuId, serviceType: 'EEU_RECHARGE', batchId: 'eeu-jijiga', batchName: 'EEU recharge test',
    mamilaId: 'eeu_hub', mamilaName: 'EEU Jijiga Test Hub', mamilaLocation: 'Jijiga',
    price: 500, quantity: 1, deliveryFee: 75, totalPrice: 575, status: 'PENDING',
    paymentMethod: 'COD', paymentStatus: 'UNPAID', customerId: profileWithoutActiveUid,
    customerName: 'New Test Customer', customerPhone: '', customerCity: 'Jijiga',
    customerPlusCode: '', customerAddress: 'Kebele 04',
    eeuDetails: {
      meterNumber: '0142-8839-1029-3', cardSerialNumber: 'EEU-TEST-01',
      rechargeAmount: 500, serviceFee: 75, eeuHubName: 'EEU Jijiga Test Hub',
      custodyPhase: 'WITH_CUSTOMER', custodyLabel: 'WITH_CUSTOMER', customerAuthorized: true,
      custodyTimeline: [{ phase: 'WITH_CUSTOMER', label: 'WITH_CUSTOMER', timestamp: new Date().toISOString(), note: 'Customer authorized physical card service', actor: 'Customer' }],
      kwhUnits: 232.6
    },
    createdAt: new Date().toISOString()
  });
  console.log('PASS COD EEU order created directly with meter, amount, and authorization validation');

  const zeroParcelId = 'zero-price-parcel-' + Date.now();
  await expectDenied('customer cannot set Parcel price to zero when tariff is nonzero', async () => {
    await setDoc(doc(profileWithoutActive.db, 'orders', zeroParcelId), {
      id: zeroParcelId, serviceType: 'PARCEL', batchId: 'parcel-dispatch', batchName: 'Zero-priced parcel',
      mamilaId: 'm1', mamilaName: 'Jijiga Express Delivery Service Hub', mamilaLocation: 'Jijiga',
      price: 0, quantity: 1, deliveryFee: 120, totalPrice: 120, status: 'PENDING',
      paymentMethod: 'COD', paymentStatus: 'UNPAID', customerId: profileWithoutActiveUid,
      customerName: 'New Test Customer', customerPhone: '', customerCity: 'Jijiga',
      customerPlusCode: '', customerAddress: 'Kebele 04',
      parcelDetails: {
        senderName: 'Sender', senderPhone: '0911000000', senderCity: 'Jijiga', senderAddress: 'Origin',
        receiverName: 'Receiver', receiverPhone: '0911000001', receiverCity: 'Jijiga', receiverAddress: 'Destination',
        parcelCategory: 'DOCUMENTS', weightCategory: '< 1 kg', description: 'Test zero-priced parcel',
        isFragile: false, tamperSealRequested: false, trackingCode: 'PARCEL-ZERO'
      },
      createdAt: new Date().toISOString()
    });
  });

  const zeroRideId = 'zero-price-ride-' + Date.now();
  await expectDenied('customer cannot set Ride price to zero instead of the fixed fare', async () => {
    await setDoc(doc(profileWithoutActive.db, 'orders', zeroRideId), {
      id: zeroRideId, serviceType: 'RIDE', batchId: 'ride-marhaba-taxi', batchName: 'Zero-priced taxi',
      mamilaId: 'm4', mamilaName: 'Jijiga Express Fleet', mamilaLocation: 'Jijiga',
      price: 0, quantity: 1, deliveryFee: 0, totalPrice: 0, status: 'PENDING',
      paymentMethod: 'COD', paymentStatus: 'UNPAID', customerId: profileWithoutActiveUid,
      customerName: 'New Test Customer', customerPhone: '', customerCity: 'Jijiga',
      customerPlusCode: '', customerAddress: 'Kebele 04',
      rideDetails: {
        vehicleType: 'MARHABA_TAXI', pickupLocation: 'Kebele 04', dropoffLocation: 'Taiwan Market',
        city: 'Jijiga', tripDistanceKm: 6.8, tripDurationMins: 18, rideStatus: 'REQUESTED'
      },
      distanceKm: 6.8, etaMinutes: 18, createdAt: new Date().toISOString()
    });
  });

  const mismatchedEeuId = 'mismatched-price-eeu-' + Date.now();
  await expectDenied('customer cannot make EEU price differ from the recharge amount', async () => {
    await setDoc(doc(profileWithoutActive.db, 'orders', mismatchedEeuId), {
      id: mismatchedEeuId, serviceType: 'EEU_RECHARGE', batchId: 'eeu-jijiga',
      batchName: 'Mismatched-price EEU recharge', mamilaId: 'eeu_hub',
      mamilaName: 'EEU Jijiga Test Hub', mamilaLocation: 'Jijiga',
      price: 0, quantity: 1, deliveryFee: 75, totalPrice: 75, status: 'PENDING',
      paymentMethod: 'COD', paymentStatus: 'UNPAID', customerId: profileWithoutActiveUid,
      customerName: 'New Test Customer', customerPhone: '', customerCity: 'Jijiga',
      customerPlusCode: '', customerAddress: 'Kebele 04',
      eeuDetails: {
        meterNumber: '0142-8839-1029-3', cardSerialNumber: 'EEU-TEST-02',
        rechargeAmount: 500, serviceFee: 75, eeuHubName: 'EEU Jijiga Test Hub',
        custodyPhase: 'WITH_CUSTOMER', custodyLabel: 'WITH_CUSTOMER', customerAuthorized: true,
        custodyTimeline: [{
          phase: 'WITH_CUSTOMER', label: 'WITH_CUSTOMER', timestamp: new Date().toISOString(),
          note: 'Customer authorized physical card service', actor: 'Customer'
        }],
        kwhUnits: 232.6
      },
      createdAt: new Date().toISOString()
    });
  });


  // Exercise the full protected customer-order path for a normal profile with no active field.
  const profileOrderId = 'profile-no-active-food-' + Date.now();
  await runTransaction(profileWithoutActive.db, async (tx) => {
    const batchRef = doc(profileWithoutActive.db, 'batches', 'test-food');
    const orderRef = doc(profileWithoutActive.db, 'orders', profileOrderId);
    const reservationRef = doc(profileWithoutActive.db, 'inventoryReservations', profileOrderId);
    const batchSnap = await tx.get(batchRef);
    if (!batchSnap.exists()) throw new Error('test batch missing for profile-without-active order');
    tx.update(batchRef, {
      available: batchSnap.data().available - 1,
      lastReservationId: profileOrderId,
      updatedAt: new Date().toISOString()
    });
    tx.set(orderRef, {
      id: profileOrderId, serviceType: 'FOOD', batchId: 'test-food', batchName: 'Test food',
      mamilaId: 'm1', mamilaName: 'Test', mamilaLocation: 'Jijiga',
      price: 100, quantity: 1, deliveryFee: 20, totalPrice: 120,
      status: 'PENDING', paymentMethod: 'COD', paymentStatus: 'UNPAID',
      customerId: profileWithoutActiveUid, customerName: 'profile-without-active User',
      customerPhone: '', customerCity: 'Jijiga', customerPlusCode: '', customerAddress: 'Test',
      createdAt: new Date().toISOString()
    });
    tx.set(reservationRef, {
      orderId: profileOrderId, batchId: 'test-food', customerId: profileWithoutActiveUid,
      quantity: 1, action: 'RESERVE', createdAt: new Date().toISOString()
    });
  });
  const createdProfileOrder = await getDoc(doc(profileWithoutActive.db, 'orders', profileOrderId));
  if (!createdProfileOrder.exists() || createdProfileOrder.data().customerId !== profileWithoutActiveUid) {
    throw new Error('FAIL customer without active field cannot persist/read own FOOD order');
  }
  console.log('PASS customer without active field can persist and read own FOOD order');
  await expectDenied('customer cannot read another customer order', async () => {
    await getDoc(doc(customer.db, 'orders', profileOrderId));
  });
  // Seed a privileged fixture for the customer's release-quantity attack test.
  const releaseOrderId = 'food-release-' + Date.now();
  const releaseBatchId = 'batch-release-' + Date.now();
  const releaseReservationRef = adminDb.collection('inventoryReservations').doc(releaseOrderId);
  const releaseBatchRef = adminDb.collection('batches').doc(releaseBatchId);
  const releaseOrderRef = adminDb.collection('orders').doc(releaseOrderId);
  await releaseOrderRef.set({
    id: releaseOrderId, customerId: customerUid, serviceType: 'FOOD', status: 'CANCELLED',
    price: 10, quantity: 2, deliveryFee: 0, totalPrice: 20, paymentMethod: 'COD', paymentStatus: 'UNPAID'
  });
  await releaseReservationRef.set({
    orderId: releaseOrderId, customerId: customerUid, batchId: releaseBatchId,
    quantity: 2, action: 'RESERVE', createdAt: new Date().toISOString()
  });
  await releaseBatchRef.set({
    id: releaseBatchId, mamilaId: 'mamila-release', price: 10, available: 8,
    lastReservationId: releaseOrderId
  });
  const badReleaseRef = doc(customer.db, 'inventoryReservations', releaseOrderId + '-release');
  await expectDenied('customer cannot release more than originally reserved quantity', async () => {
    await setDoc(badReleaseRef, {
      orderId: releaseOrderId, customerId: customerUid, batchId: releaseBatchId,
      quantity: 3, action: 'RELEASE', createdAt: new Date().toISOString()
    });
  });

  await expectDenied('customer cannot create an order with mismatched total', async () => {
    await setDoc(doc(customer.db, 'orders', 'malicious-total'), {
      ...validCustomerOrder,
      id: 'malicious-total',
      serviceType: 'RIDE',
      totalPrice: 1
    });
  });

  await expectDenied('customer cannot reserve stock while underpricing FOOD order', async () => {
    const orderId = 'malicious-underpriced-food';
    const orderRef = doc(customer.db, 'orders', orderId);
    const batchRef = doc(customer.db, 'batches', 'test-food');
    const reservationRef = doc(customer.db, 'inventoryReservations', orderId);
    await runTransaction(customer.db, async (tx) => {
      const batchSnap = await tx.get(batchRef);
      if (!batchSnap.exists()) throw new Error('test batch missing');
      tx.update(batchRef, {
        available: batchSnap.data().available - 1,
        lastReservationId: orderId,
        updatedAt: new Date().toISOString()
      });
      tx.set(orderRef, {
        id: orderId, serviceType: 'FOOD', batchId: 'test-food', batchName: 'Test food',
        mamilaId: 'm1', mamilaName: 'Test', mamilaLocation: 'Jijiga',
        price: 1, quantity: 1, deliveryFee: 20, totalPrice: 21,
        status: 'PENDING', paymentMethod: 'COD', paymentStatus: 'UNPAID',
        customerId: customerUid, customerName: 'Customer User', customerPhone: '',
        customerCity: 'Jijiga', customerPlusCode: '', customerAddress: 'Test',
        createdAt: new Date().toISOString()
      });
      tx.set(reservationRef, {
        orderId, batchId: 'test-food', customerId: customerUid,
        quantity: 1, action: 'RESERVE', createdAt: new Date().toISOString()
      });
    });
  });



  const cancelOrderId = 'cancelable-food-order';
  await runTransaction(customer.db, async (tx) => {
    const batchRef = doc(customer.db, 'batches', 'test-food');
    const orderRef = doc(customer.db, 'orders', cancelOrderId);
    const reservationRef = doc(customer.db, 'inventoryReservations', cancelOrderId);
    const batchSnap = await tx.get(batchRef);
    if (!batchSnap.exists()) throw new Error('test batch missing');
    tx.update(batchRef, {
      available: batchSnap.data().available - 1,
      lastReservationId: cancelOrderId,
      updatedAt: new Date().toISOString()
    });
    tx.set(orderRef, {
      id: cancelOrderId, serviceType: 'FOOD', batchId: 'test-food', batchName: 'Test food',
      mamilaId: 'm1', mamilaName: 'Test', mamilaLocation: 'Jijiga',
      price: 100, quantity: 1, deliveryFee: 20, totalPrice: 120,
      status: 'PENDING', paymentMethod: 'COD', paymentStatus: 'UNPAID',
      customerId: customerUid, customerName: 'Customer User', customerPhone: '',
      customerCity: 'Jijiga', customerPlusCode: '', customerAddress: 'Test',
      createdAt: new Date().toISOString()
    });
    tx.set(reservationRef, {
      orderId: cancelOrderId, batchId: 'test-food', customerId: customerUid,
      quantity: 1, action: 'RESERVE', createdAt: new Date().toISOString()
    });
  });

  await runTransaction(customer.db, async (tx) => {
    const batchRef = doc(customer.db, 'batches', 'test-food');
    const orderRef = doc(customer.db, 'orders', cancelOrderId);
    const releaseRef = doc(customer.db, 'inventoryReservations', `${cancelOrderId}-release`);
    const orderSnap = await tx.get(orderRef);
    const batchSnap = await tx.get(batchRef);
    if (!orderSnap.exists || !batchSnap.exists) throw new Error('cancellation fixtures missing');
    tx.update(batchRef, {
      available: batchSnap.data().available + 1,
      lastReservationId: `${cancelOrderId}-release`,
      updatedAt: new Date().toISOString()
    });
    tx.update(orderRef, { status: 'CANCELLED' });
    tx.set(releaseRef, {
      orderId: cancelOrderId, batchId: 'test-food', customerId: customerUid,
      quantity: 1, action: 'RELEASE', createdAt: new Date().toISOString()
    });
  });
  const missingReleaseOrderId = 'missing-release-cancel-order';
  await adminDb.doc(`orders/${missingReleaseOrderId}`).set({
    id: missingReleaseOrderId, serviceType: 'FOOD', batchId: 'test-food', batchName: 'Test food',
    mamilaId: 'm1', mamilaName: 'Test', mamilaLocation: 'Jijiga',
    price: 100, quantity: 1, deliveryFee: 20, totalPrice: 120,
    status: 'PENDING', paymentMethod: 'COD', paymentStatus: 'UNPAID',
    customerId: customerUid, customerName: 'Customer User', customerPhone: '',
    customerCity: 'Jijiga', customerPlusCode: '', customerAddress: 'Test',
    createdAt: new Date().toISOString()
  });
  await adminDb.doc(`inventoryReservations/${missingReleaseOrderId}`).set({
    orderId: missingReleaseOrderId, batchId: 'test-food', customerId: customerUid,
    quantity: 1, action: 'RESERVE', createdAt: new Date().toISOString()
  });
  await expectDenied('customer cannot cancel inventory-backed order without release transaction', async () => {
    await updateDoc(doc(customer.db, 'orders', missingReleaseOrderId), { status: 'CANCELLED' });
  });

  console.log('PASS customer can atomically cancel and release the exact reserved quantity');

  await expectDenied('customer cannot release more inventory than reserved', async () => {
    await setDoc(doc(customer.db, 'inventoryReservations', 'cancelable-food-order-bad-quantity'), {
      orderId: cancelOrderId, batchId: 'test-food', customerId: customerUid,
      quantity: 999, action: 'RELEASE', createdAt: new Date().toISOString()
    });
  });

  await expectDenied('customer cannot release inventory from a different batch', async () => {
    await setDoc(doc(customer.db, 'inventoryReservations', 'cancelable-food-order-bad-batch'), {
      orderId: cancelOrderId, batchId: 'another-batch', customerId: customerUid,
      quantity: 1, action: 'RELEASE', createdAt: new Date().toISOString()
    });
  });

  await expectDenied('customer cannot use an unintegrated payment provider', async () => {
    const orderId = 'unsupported-provider-food';
    const orderRef = doc(customer.db, 'orders', orderId);
    const batchRef = doc(customer.db, 'batches', 'test-food');
    const reservationRef = doc(customer.db, 'inventoryReservations', orderId);
    await runTransaction(customer.db, async (tx) => {
      const batchSnap = await tx.get(batchRef);
      if (!batchSnap.exists()) throw new Error('test batch missing');
      tx.update(batchRef, {
        available: batchSnap.data().available - 1,
        lastReservationId: orderId,
        updatedAt: new Date().toISOString()
      });
      tx.set(orderRef, {
        id: orderId, serviceType: 'FOOD', batchId: 'test-food', batchName: 'Test food',
        mamilaId: 'm1', mamilaName: 'Test', mamilaLocation: 'Jijiga',
        price: 100, quantity: 1, deliveryFee: 20, totalPrice: 120,
        status: 'PENDING', paymentMethod: 'CBE_BIRR', paymentStatus: 'PAYMENT_PENDING',
        customerId: customerUid, customerName: 'Customer User', customerPhone: '',
        customerCity: 'Jijiga', customerPlusCode: '', customerAddress: 'Test',
        createdAt: new Date().toISOString()
      });
      tx.set(reservationRef, {
        orderId, batchId: 'test-food', customerId: customerUid,
        quantity: 1, action: 'RESERVE', createdAt: new Date().toISOString()
      });
    });
  });

  const paidPendingOrderId = 'paid-pending-cancel-order';
  const paidPendingFixture = { ...validOrder };
  delete paidPendingFixture.riderId;
  delete paidPendingFixture.riderName;
  await adminDb.doc(`orders/${paidPendingOrderId}`).set({
    ...paidPendingFixture,
    id: paidPendingOrderId,
    status: 'PENDING',
    paymentStatus: 'PAID_CONFIRMED'
  });
  await expectDenied('customer cannot cancel a paid order', async () => {
    await updateDoc(doc(customer.db, 'orders', paidPendingOrderId), { status: 'CANCELLED' });
  });

  const inactive = await clientFor('inactive-rider');
  await expectDenied('inactive rider cannot read assigned order', async () => {
    await getDoc(doc(inactive.db, 'orders', validOrder.id));
  });
  await expectDenied('inactive rider cannot read staff profiles', async () => {
    await getDoc(doc(inactive.db, 'users', riderUid));
  });

  const admin = await clientFor('admin');
  const allowedAdminOrder = await getDoc(doc(admin.db, 'orders', validOrder.id));
  if (!allowedAdminOrder.exists()) {
    throw new Error('FAIL verified allow-listed admin profile could not read another customer order without custom claims');
  }
  console.log('PASS verified allow-listed admin profile can read order without custom claims');

  const unverifiedAdmin = await clientFor('unverified-admin');
  const nonallowlistedAdmin = await clientFor('nonallowlisted-admin');
  await expectDenied('admin account with unverified email cannot read another customer order', async () => {
    await getDoc(doc(unverifiedAdmin.db, 'orders', validOrder.id));
  });
  await expectDenied('verified admin outside the allow-list cannot read another customer order', async () => {
    await getDoc(doc(nonallowlistedAdmin.db, 'orders', validOrder.id));
  });
  await expectDenied('admin cannot directly modify Telebirr checkout mapping', async () => {
    await updateDoc(doc(admin.db, 'orders', validOrder.id), { paymentMerchantOrderId: 'FORGED-MERCHANT-ID' });
  });

  const runner = await clientFor('runner');
  const otherRunner = await clientFor('other-runner');
  const rider = await clientFor('rider');
  const otherRider = await clientFor('other-rider');

  const unassignedOrderId = 'test-unassigned-order-' + Date.now();
  await adminDb.doc(`orders/${unassignedOrderId}`).set({
    id: unassignedOrderId,
    serviceType: 'FOOD',
    batchId: 'test-food',
    batchName: 'Test food',
    mamilaId: 'm1',
    mamilaName: 'Test Mamila',
    mamilaLocation: 'Jijiga',
    price: 100,
    quantity: 1,
    deliveryFee: 20,
    totalPrice: 120,
    status: 'PENDING',
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    customerId: customerUid,
    customerName: 'Customer User',
    customerPhone: '',
    customerCity: 'Jijiga',
    customerPlusCode: '',
    customerAddress: 'Kebele 04',
    createdAt: new Date().toISOString()
  });

  // Runner can claim an unassigned pending order with RUNNER_ASSIGNED status
  await updateDoc(doc(runner.db, 'orders', unassignedOrderId), {
    runnerId: runnerUid,
    runnerName: 'runner User',
    status: 'RUNNER_ASSIGNED'
  });
  console.log('PASS runner can claim unassigned order with RUNNER_ASSIGNED status');

  // Competing runner cannot claim an already claimed order
  await expectDenied('competing runner cannot steal already claimed order', async () => {
    await updateDoc(doc(otherRunner.db, 'orders', unassignedOrderId), {
      runnerId: otherRunnerUid,
      runnerName: 'other-runner User',
      status: 'RUNNER_ASSIGNED'
    });
  });

  // Runner cannot seal with invalid tag format
  await expectDenied('runner cannot set invalid tag format', async () => {
    await updateDoc(doc(runner.db, 'orders', unassignedOrderId), {
      status: 'READY_FOR_RIDER',
      runnerTagId: 'INVALID-TAG-123'
    });
  });

  // Runner seals with valid TAG-ET-##### format
  const validTag = 'TAG-ET-48217';
  await updateDoc(doc(runner.db, 'orders', unassignedOrderId), {
    status: 'READY_FOR_RIDER',
    runnerTagId: validTag
  });
  console.log('PASS runner can seal and hand over with valid TAG-ET-##### tag');

  // Tag immutability: Runner cannot overwrite or change existing tag
  await expectDenied('runner cannot overwrite or mutate an existing saved tag', async () => {
    await updateDoc(doc(runner.db, 'orders', unassignedOrderId), {
      runnerTagId: 'TAG-ET-99999'
    });
  });

  await expectDenied('runner cannot self-assign a PENDING order without RUNNER_ASSIGNED transition', async () => {
    await updateDoc(doc(runner.db, 'orders', validFoodId), {
      runnerId: runnerUid,
      runnerName: 'runner User',
      status: 'PENDING'
    });
  });
  await expectDenied('rider cannot self-assign a PENDING order before dispatch-ready state', async () => {
    await updateDoc(doc(rider.db, 'orders', validFoodId), {
      riderId: riderUid,
      riderName: 'rider User',
      status: 'PENDING'
    });
  });
  await expectDenied('active rider cannot read unrelated customer profile', async () => {
    await getDoc(doc(rider.db, 'users', customerUid));
  });
  await expectDenied('other active rider cannot read another rider assigned order', async () => {
    await getDoc(doc(otherRider.db, 'orders', validOrder.id));
  });
  const unpaidOrder = { ...validOrder, id: 'test-unpaid-order', paymentStatus: 'PAYMENT_PENDING' };
  await adminDb.doc(`orders/${unpaidOrder.id}`).set(unpaidOrder);
  await expectDenied('rider cannot deliver non-COD unpaid order', async () => {
    await updateDoc(doc(rider.db, 'orders', unpaidOrder.id), { status: 'DELIVERED' });
  });
  await expectDenied('rider cannot confirm digital payment at delivery', async () => {
    await updateDoc(doc(rider.db, 'orders', unpaidOrder.id), { status: 'DELIVERED', paymentStatus: 'PAID_CONFIRMED' });
  });
  await expectDenied('rider cannot set digital paymentStatus directly', async () => {
    await updateDoc(doc(rider.db, 'orders', unpaidOrder.id), { paymentStatus: 'PAID_CONFIRMED' });
  });
  await updateDoc(doc(rider.db, 'orders', validOrder.id), { status: 'DELIVERED' });
  console.log('PASS rider can deliver PAID_CONFIRMED non-COD order');

  const eeuDetailsFixture = {
    meterNumber: '0142-8839-1029-3',
    cardSerialNumber: 'EEU-TEST-01',
    rechargeAmount: 500,
    serviceFee: 75,
    eeuHubName: 'EEU Jijiga Test Hub',
    custodyPhase: 'AT_EEU_HUB',
    custodyLabel: 'AT_EEU_HUB',
    customerAuthorized: true,
    custodyTimeline: [{ phase: 'WITH_CUSTOMER', label: 'WITH_CUSTOMER', timestamp: new Date().toISOString(), note: 'Test', actor: 'Customer' }],
    kwhUnits: 232.6
  };
  const eeuOrderId = 'test-eeu-custody-order';
  await adminDb.doc(`orders/${eeuOrderId}`).set({
    ...validOrder,
    id: eeuOrderId,
    serviceType: 'EEU_RECHARGE',
    batchName: 'EEU recharge',
    price: 500,
    deliveryFee: 75,
    totalPrice: 575,
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    status: 'PICKED_UP',
    eeuDetails: eeuDetailsFixture
  });
  await expectDenied('rider cannot alter EEU meter number or recharge amount with an otherwise-valid custody event', async () => {
    await updateDoc(doc(rider.db, 'orders', eeuOrderId), {
      eeuDetails: {
        ...eeuDetailsFixture,
        meterNumber: '0000-0000-0000-0',
        rechargeAmount: 1000,
        custodyTimeline: [...eeuDetailsFixture.custodyTimeline, {
          phase: 'AT_EEU_HUB', label: 'AT_EEU_HUB', timestamp: new Date().toISOString(),
          note: 'otherwise-valid timeline, but protected values are altered', actor: `Rider ${riderUid}`
        }]
      }
    });
  });
  await expectDenied('rider cannot skip EEU custody states or mark returned without receipt', async () => {
    await updateDoc(doc(rider.db, 'orders', eeuOrderId), {
      status: 'DELIVERED',
      paymentStatus: 'COLLECTED_BY_RIDER',
      eeuDetails: {
        ...eeuDetailsFixture,
        custodyPhase: 'RETURNED',
        custodyLabel: 'RETURNED',
        custodyTimeline: [...eeuDetailsFixture.custodyTimeline, {
          phase: 'RETURNED', label: 'RETURNED', timestamp: new Date().toISOString(),
          note: 'forged', actor: `Rider ${riderUid}`
        }]
      }
    });
  });

  const codOrder = { ...validOrder, id: 'test-cod-order', paymentMethod: 'COD', paymentStatus: 'UNPAID', status: 'PICKED_UP' };
  await adminDb.doc(`orders/${codOrder.id}`).set(codOrder);
  await expectDenied('rider cannot deliver COD order before collecting payment', async () => {
    await updateDoc(doc(rider.db, 'orders', codOrder.id), { status: 'DELIVERED' });
  });
  await updateDoc(doc(rider.db, 'orders', codOrder.id), { status: 'DELIVERED', paymentStatus: 'COLLECTED_BY_RIDER' });
  console.log('PASS rider can deliver COD order after collecting payment');

  const receiptTimestamp = new Date().toISOString();
  const receiptEeuDetails = {
    ...eeuDetailsFixture,
    receiptCaptured: true,
    receiptTimestamp,
    tokenCode: '',
    custodyTimeline: [...eeuDetailsFixture.custodyTimeline, {
      phase: 'AT_EEU_HUB',
      label: 'AT_EEU_HUB',
      timestamp: receiptTimestamp,
      note: 'Test terminal receipt saved in the order receipts subcollection.',
      actor: `Rider ${riderUid}`
    }]
  };
  const receiptBatch = writeBatch(rider.db);
  receiptBatch.set(doc(rider.db, 'orders', eeuOrderId, 'receipts', 'terminal'), {
    receiptImageUrl: 'data:image/jpeg;base64,AAAA',
    capturedBy: riderUid,
    capturedAt: new Date()
  });
  receiptBatch.update(doc(rider.db, 'orders', eeuOrderId), {
    eeuDetails: receiptEeuDetails,
    updatedAt: new Date().toISOString()
  });
  await receiptBatch.commit();
  console.log('PASS assigned rider can atomically attach one capped receipt in the protected subcollection at AT_EEU_HUB');

  await expectDenied('rider cannot replace an attached EEU receipt', async () => {
    await setDoc(doc(rider.db, 'orders', eeuOrderId, 'receipts', 'terminal'), {
      receiptImageUrl: 'data:image/jpeg;base64,BBBB',
      capturedBy: riderUid,
      capturedAt: new Date()
    });
  });

  const tooLargeEeuOrderId = 'test-eeu-receipt-too-large';
  await adminDb.doc(`orders/${tooLargeEeuOrderId}`).set({
    ...validOrder,
    id: tooLargeEeuOrderId,
    serviceType: 'EEU_RECHARGE',
    price: 500,
    deliveryFee: 75,
    totalPrice: 575,
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    status: 'PICKED_UP',
    riderId: riderUid,
    eeuDetails: { ...eeuDetailsFixture, receiptCaptured: false, custodyPhase: 'AT_EEU_HUB', custodyLabel: 'AT_EEU_HUB' }
  });
  await expectDenied('rider cannot attach a receipt exceeding the subcollection size cap', async () => {
    await setDoc(doc(rider.db, 'orders', tooLargeEeuOrderId, 'receipts', 'terminal'), {
      receiptImageUrl: 'data:image/jpeg;base64,' + 'A'.repeat(300001),
      capturedBy: riderUid,
      capturedAt: new Date()
    });
  });
  await expectDenied('rider cannot attach non-JPEG receipt data', async () => {
    await setDoc(doc(rider.db, 'orders', tooLargeEeuOrderId, 'receipts', 'terminal'), {
      receiptImageUrl: 'data:image/png;base64,AAAA',
      capturedBy: riderUid,
      capturedAt: new Date()
    });
  });

  const stranger = await clientFor('stranger');
  await adminDb.doc(`orders/${validFoodId}/messages/trusted-message`).set({
    orderId: validFoodId,
    senderId: customerUid,
    senderRole: 'CUSTOMER',
    senderName: 'customer User',
    text: 'Test message',
    timestamp: new Date().toISOString()
  });
  await expectDenied('outsider cannot read another order message', async () => {
    await getDoc(doc(stranger.db, 'orders', validFoodId, 'messages', 'trusted-message'));
  });
  await expectDenied('outsider cannot forge an order message', async () => {
    await setDoc(doc(stranger.db, 'orders', validFoodId, 'messages', 'forged-message'), {
      orderId: validFoodId,
      senderId: strangerUid,
      senderRole: 'CUSTOMER',
      senderName: 'stranger User',
      text: 'forged',
      timestamp: new Date().toISOString()
    });
  });

  await setDoc(doc(customer.db, 'deliveryEvents', 'valid-customer-event'), {
    orderId: validFoodId,
    status: 'PENDING',
    timestamp: new Date().toISOString(),
    actorRole: 'CUSTOMER',
    actorId: customerUid,
    actorName: 'customer User',
    note: 'Customer-created event matching persisted order status'
  });
  console.log('PASS customer can add a scoped event matching current order status');
  await expectDenied('outsider cannot forge a delivery event on another order', async () => {
    await setDoc(doc(stranger.db, 'deliveryEvents', 'forged-outsider-event'), {
      orderId: validFoodId,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      actorRole: 'CUSTOMER',
      actorId: strangerUid,
      actorName: 'stranger User',
      note: 'forged'
    });
  });
  await expectDenied('customer cannot forge DELIVERED event for a PENDING order', async () => {
    await setDoc(doc(customer.db, 'deliveryEvents', 'forged-future-event'), {
      orderId: validFoodId,
      status: 'DELIVERED',
      timestamp: new Date().toISOString(),
      actorRole: 'CUSTOMER',
      actorId: customerUid,
      actorName: 'customer User',
      note: 'forged future delivery'
    });
  });

  await expectDenied('unrelated customer cannot read an EEU order containing receipt evidence', async () => {
    await getDoc(doc(stranger.db, 'orders', eeuOrderId));
  });
  await expectDenied('outsider cannot read an order-scoped EEU receipt photo', async () => {
    await getDoc(doc(stranger.db, 'orders', eeuOrderId, 'receipts', 'terminal'));
  });
  const customerEeuOrder = await getDoc(doc(customer.db, 'orders', eeuOrderId));
  if (
    !customerEeuOrder.exists() ||
    customerEeuOrder.data().eeuDetails?.receiptCaptured !== true ||
    'receiptImageUrl' in (customerEeuOrder.data().eeuDetails || {})
  ) {
    throw new Error('Order metadata did not persist independently of the receipt photo.');
  }
  const customerEeuReceipt = await getDoc(doc(customer.db, 'orders', eeuOrderId, 'receipts', 'terminal'));
  if (!customerEeuReceipt.exists() || customerEeuReceipt.data().receiptImageUrl !== 'data:image/jpeg;base64,AAAA') {
    throw new Error('Order customer could not read their own protected EEU receipt photo.');
  }
  console.log('PASS order customer can read the protected receipt subcollection while order metadata stays image-free');

  await Promise.all([signOut(customer.auth), signOut(profileWithoutActive.auth), signOut(admin.auth), signOut(unverifiedAdmin.auth), signOut(nonallowlistedAdmin.auth), signOut(runner.auth), signOut(otherRunner.auth), signOut(rider.auth), signOut(otherRider.auth), signOut(inactive.auth), signOut(stranger.auth)]);
  for (const ctx of [customer, profileWithoutActive, admin, unverifiedAdmin, nonallowlistedAdmin, runner, otherRunner, rider, otherRider, inactive, stranger]) await deleteClientApp(ctx.app);
  await deleteAdminApp(adminApp);
  console.log('All rules smoke tests passed, including pricing and protected EEU receipt subcollection tests.');
}

main().catch(async (error) => {
  console.error(error);
  try { await deleteAdminApp(adminApp); } catch {}
  process.exit(1);
});