import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/bootstrap-admin.mjs admin@example.com');
  process.exit(2);
}

const FIRESTORE_DATABASE_ID = 'ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286';
const app = initializeApp();
const auth = getAuth(app);
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

try {
  const existingAdmins = await db.collection('users').where('role', '==', 'admin').limit(1).get();
  if (!existingAdmins.empty) {
    throw new Error('An administrator already exists. Use provisionStaff/setStaffActive through the existing admin account.');
  }

  const user = await auth.getUserByEmail(email);
  if (user.emailVerified !== true) {
    throw new Error('The target Firebase Auth account must verify its email before administrator bootstrap.');
  }
  await db.doc(`users/${user.uid}`).set({
    uid: user.uid,
    displayName: user.displayName || email.split('@')[0],
    email: user.email || email,
    role: 'admin',
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await auth.setCustomUserClaims(user.uid, { role: 'admin', active: true });

  console.log(`Bootstrapped administrator ${email} (${user.uid}).`);
} finally {
  await deleteApp(app);
}