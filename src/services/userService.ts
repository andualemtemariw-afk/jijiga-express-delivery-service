import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './googleAuth';
import { AppUserProfile } from '../types';
import { removeUndefinedFields } from './firestoreSync';

const USERS_COLLECTION = 'users';

export const ADMIN_EMAILS = [
  'andualemawraris4@gmail.com',
  'andualemawraris104@gmail.com',
  'andualemawraris3@gmail.com'
];

/**
 * Synchronizes an authenticated Firebase user with the users/{uid} document.
 * Allowlisted owner emails automatically receive administrative privileges,
 * while standard accounts start as verified customers.
 */
export async function syncUserProfile(user: User): Promise<AppUserProfile> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const snap = await getDoc(userRef);

  const isAdminEmail = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim()));

  if (snap.exists()) {
    const existing = snap.data() as AppUserProfile;
    if (isAdminEmail && existing.role !== 'admin') {
      try {
        await updateDoc(userRef, { role: 'admin', active: true, updatedAt: new Date().toISOString() });
        return { ...existing, role: 'admin', active: true };
      } catch (err) {
        console.warn('Admin self-elevation notice:', err);
      }
    }
    return existing;
  }

  const newProfile: AppUserProfile = {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || (isAdminEmail ? 'Admin' : 'Jijiga Express Customer'),
    email: user.email || '',
    photoURL: user.photoURL || '',
    phone: user.phoneNumber || '',
    city: 'Jijiga',
    address: '',
    plusCode: '',
    role: isAdminEmail ? 'admin' : 'customer',
    active: true,
    createdAt: new Date().toISOString(),
  };

  const cleanProfile = removeUndefinedFields(newProfile);
  await setDoc(userRef, cleanProfile);
  return cleanProfile;
}

export async function updateUserProfile(uid: string, updates: Partial<AppUserProfile>): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const safeUpdates = { ...updates };
  delete (safeUpdates as any).uid;
  delete (safeUpdates as any).role;
  delete (safeUpdates as any).createdAt;
  delete (safeUpdates as any).active;
  delete (safeUpdates as any).mamilaId;

  const cleanUpdates = removeUndefinedFields({
    ...safeUpdates,
    updatedAt: new Date().toISOString(),
  });

  await updateDoc(userRef, cleanUpdates);
}

export async function getUserProfile(uid: string): Promise<AppUserProfile | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as AppUserProfile;
}
