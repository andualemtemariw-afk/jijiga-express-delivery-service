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

  if (process.env.PROFILE_DENY_ALL === '1') {
    try {
      await updateDoc(profileRef, { active: true });
      console.log('DENY_ALL_DIAGNOSTIC result=unexpectedly-allowed');
    } catch (error) {
      console.log(`DENY_ALL_DIAGNOSTIC code=${error?.code || 'no-code'} message=${String(error?.message || error).replace(/\\s+/g, ' ').slice(0, 1000)}`);
    }
    process.exit(0);
  }

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
    const message = String(caught.message || caught);
    if (/maximum of 1000 expressions|Unable to evaluate the expression|evaluation error at L[0-9]+|Service call error/i.test(message)) {
      throw new Error(`FAIL ${label}: Firestore returned a rules evaluation error instead of a clean denial: ${message}`);
    }
    if (caught.code !== 'permission-denied') {
      throw new Error(`FAIL ${label}: expected permission-denied, got ${caught.code || 'no-code'}: ${message}`);
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
