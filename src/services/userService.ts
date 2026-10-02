import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './googleAuth';
import { AppUserProfile, UserRole } from '../types';
import { removeUndefinedFields } from './firestoreSync';

export const ADMIN_BOOTSTRAP_EMAILS = [
  'andualemawraris4@gmail.com',
  'andualemawraris104@gmail.com',
  'andualemawraris3@gmail.com'
];

const USERS_COLLECTION = 'users';

/**
 * Synchronizes user authentication with the Firestore `/users/{uid}` document.
 * Bootstraps the platform owner email as 'admin'.
 */
export async function syncUserProfile(user: User): Promise<AppUserProfile> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const snap = await getDoc(userRef);

  const isAdminEmail = user.email && ADMIN_BOOTSTRAP_EMAILS.includes(user.email.toLowerCase());

  if (snap.exists()) {
    const existing = snap.data() as AppUserProfile;
    // If user is designated bootstrap admin, ensure role is 'admin'
    if (isAdminEmail && existing.role !== 'admin') {
      await updateDoc(userRef, { role: 'admin', updatedAt: new Date().toISOString() });
      return { ...existing, role: 'admin' };
    }
    return existing;
  }

  // First-time login: create user record
  const initialRole: UserRole = isAdminEmail ? 'admin' : 'customer';
  const newProfile: AppUserProfile = {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Jijiga Express Customer',
    email: user.email || '',
    photoURL: user.photoURL || '',
    phone: user.phoneNumber || '+251 91 123 4567',
    city: 'Jijiga',
    address: 'Kebele 04, Central Sector, Jijiga',
    plusCode: '8F2P+5H Jijiga',
    role: initialRole,
    createdAt: new Date().toISOString(),
  };

  const cleanProfile = removeUndefinedFields(newProfile);
  await setDoc(userRef, cleanProfile);
  return cleanProfile;
}

/**
 * Updates user profile information (phone, city, address, plusCode).
 */
export async function updateUserProfile(uid: string, updates: Partial<AppUserProfile>): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  // Strip immutable security fields
  const safeUpdates = { ...updates };
  delete (safeUpdates as any).uid;
  delete (safeUpdates as any).role;
  delete (safeUpdates as any).createdAt;

  const cleanUpdates = removeUndefinedFields({
    ...safeUpdates,
    updatedAt: new Date().toISOString(),
  });

  await updateDoc(userRef, cleanUpdates);
}

/**
 * Fetches user profile by UID.
 */
export async function getUserProfile(uid: string): Promise<AppUserProfile | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as AppUserProfile;
}
