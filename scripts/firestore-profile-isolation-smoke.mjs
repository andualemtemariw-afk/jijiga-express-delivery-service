import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-profile-rules-isolation';
const app = initializeApp({
  apiKey: 'demo-api-key',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId
}, `profile-isolation-${Date.now()}`);

try {
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);

  const suffix = Date.now();
  const email = `profile-isolation-${suffix}@example.test`;
  const credential = await createUserWithEmailAndPassword(auth, email, 'TestPassword-123!');
  const uid = credential.user.uid;
  const profileRef = doc(db, 'users', uid);

  await setDoc(profileRef, {
    uid,
    displayName: 'Test Customer',
    email,
    photoURL: '',
    phone: '',
    city: 'Jijiga',
    address: '',
    plusCode: '',
    role: 'customer',
    createdAt: new Date().toISOString()
  });
  console.log('PASS minimal-rules customer profile creation');

  await updateDoc(profileRef, { displayName: 'Updated Test Customer' });
  console.log('PASS minimal-rules allowed displayName update');

  async function expectCleanDenial(label, action) {
    let caught;
    try {
      await action();
    } catch (error) {
      caught = error;
    }
    if (!caught) throw new Error(`FAIL ${label}: update unexpectedly succeeded`);
    if (caught.code !== 'permission-denied') {
      throw new Error(`FAIL ${label}: expected permission-denied, got ${caught.code || 'no-code'}: ${caught.message || caught}`);
    }
    console.log(`PASS minimal-rules clean denial: ${label}`);
  }

  await expectCleanDenial('adding active', () => updateDoc(profileRef, { active: true }));
  await expectCleanDenial('adding isAdmin', () => updateDoc(profileRef, { isAdmin: true }));
  await expectCleanDenial('adding mamilaId', () => updateDoc(profileRef, { mamilaId: 'diagnostic-mamila' }));
  console.log('PASS minimal-rules protected-key isolation test');
} finally {
  await deleteApp(app);
}
