import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref, uploadBytes, getBytes } from 'firebase/storage';

const require = createRequire(import.meta.url);
const admin = require('../functions/node_modules/firebase-admin');
const projectId = 'sunny-discipline-hvd6f';
const databaseId = 'ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286';
const bucket = `${projectId}.firebasestorage.app`;

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';

admin.initializeApp({ projectId, storageBucket: bucket });
const adminDb = admin.firestore(databaseId);
const adminAuth = admin.auth();

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: bucket,
};

const users = {};
async function createUser(key, role, active = true) {
  const email = `${key}@example.test`;
  const password = 'TestPassword-123!';
  const user = await adminAuth.createUser({ email, password, displayName: `${key} User` });
  await adminDb.doc(`users/${user.uid}`).set({
    uid: user.uid, displayName: `${key} User`, email, role, active, createdAt: new Date().toISOString()
  });
  users[key] = { uid: user.uid, email, password, role };
  return user.uid;
}

async function clientFor(key) {
  const app = initializeApp(firebaseConfig, `test-${key}-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app, databaseId);
  const storage = getStorage(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  await signInWithEmailAndPassword(auth, users[key].email, users[key].password);
  return { app, auth, db, storage };
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
  const riderUid = await createUser('rider', 'rider');
  const inactiveRiderUid = await createUser('inactive-rider', 'rider', false);
  const strangerUid = await createUser('stranger', 'customer');

  const validOrder = {
    id: 'test-paid-order', serviceType: 'RIDE', batchId: 'ride-taxi', batchName: 'Test ride',
    mamilaId: 'm4', mamilaName: 'Test', mamilaLocation: 'Jijiga', price: 100, quantity: 1,
    deliveryFee: 0, totalPrice: 100, status: 'PICKED_UP', paymentMethod: 'TELEBIRR',
    paymentStatus: 'PAID_CONFIRMED', customerId: customerUid, customerName: 'Customer User',
    customerPhone: '', customerCity: 'Jijiga', customerPlusCode: '', customerAddress: 'Test address',
    createdAt: new Date().toISOString(), riderId, riderName: 'rider User'
  };
  await adminDb.doc(`orders/${validOrder.id}`).set(validOrder);

  const customer = await clientFor('customer');
  await expectDenied('customer cannot inject runnerId on creation', async () => {
    await setDoc(doc(customer.db, 'orders', 'malicious-order'), {
      id: 'malicious-order', serviceType: 'RIDE', batchId: 'ride', batchName: 'Ride',
      mamilaId: 'm4', mamilaName: 'Test', mamilaLocation: 'Jijiga', price: 100, quantity: 1,
      deliveryFee: 0, totalPrice: 100, status: 'PENDING', paymentMethod: 'COD', paymentStatus: 'UNPAID',
      customerId: customerUid, customerName: 'Customer User', customerPhone: '', customerCity: 'Jijiga',
      customerPlusCode: '', customerAddress: 'Test', createdAt: new Date().toISOString(), runnerId: strangerUid
    });
  });

  const inactive = await clientFor('inactive-rider');
  await expectDenied('inactive rider cannot read assigned order', async () => {
    await getDoc(doc(inactive.db, 'orders', validOrder.id));
  });

  const rider = await clientFor('rider');
  const unpaidOrder = { ...validOrder, id: 'test-unpaid-order', paymentStatus: 'PAYMENT_PENDING' };
  await adminDb.doc(`orders/${unpaidOrder.id}`).set(unpaidOrder);
  await expectDenied('rider cannot deliver non-COD unpaid order', async () => {
    await updateDoc(doc(rider.db, 'orders', unpaidOrder.id), { status: 'DELIVERED' });
  });
  await updateDoc(doc(rider.db, 'orders', validOrder.id), { status: 'DELIVERED' });
  console.log('PASS rider can deliver PAID_CONFIRMED non-COD order');

  const receiptPath = `eeuReceipts/${validOrder.id}/rider.jpg`;
  await uploadBytes(ref(rider.storage, receiptPath), new Uint8Array([1, 2, 3]), {
    contentType: 'image/jpeg', customMetadata: { orderId: validOrder.id, riderId }
  });
  console.log('PASS rider can create correctly scoped receipt');
  await expectDenied('rider cannot overwrite receipt', async () => {
    await uploadBytes(ref(rider.storage, receiptPath), new Uint8Array([4, 5, 6]), {
      contentType: 'image/jpeg', customMetadata: { orderId: validOrder.id, riderId }
    });
  });
  const stranger = await clientFor('stranger');
  await expectDenied('unrelated customer cannot read receipt', async () => {
    await getBytes(ref(stranger.storage, receiptPath));
  });
  const customerBytes = await getBytes(ref(customer.storage, receiptPath));
  if (customerBytes.length !== 3) throw new Error('customer receipt read returned unexpected size');
  console.log('PASS order customer can read receipt');

  await Promise.all([signOut(customer.auth), signOut(rider.auth), signOut(inactive.auth), signOut(stranger.auth)]);
  for (const ctx of [customer, rider, inactive, stranger]) await deleteApp(ctx.app);
  await admin.app().delete();
  console.log('All rules smoke tests passed.');
}

main().catch(async (error) => {
  console.error(error);
  try { await admin.app().delete(); } catch {}
  process.exit(1);
});