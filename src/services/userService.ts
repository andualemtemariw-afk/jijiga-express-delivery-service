import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './googleAuth';
import { AppUserProfile } from '../types';
import { removeUndefinedFields } from './firestoreSync';

const USERS_COLLECTION = 'users';

/**
 * Synchronizes an authenticated Firebase user with the users/{uid} document.
 * First-time accounts always begin as customer. Staff/admin roles are provisioned
 * by the trusted backend workflow, never by a client-side email allowlist.
 */
export async function syncUserProfile(user: User): Promise<AppUserProfile> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return snap.data() as AppUserProfile;
  }

  const newProfile: AppUserProfile = {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Jijiga Express Customer',
    email: user.email || '',
    photoURL: user.photoURL || '',
    phone: user.phoneNumber || '',
    city: 'Jijiga',
    address: '',
    plusCode: '',
    role: 'customer',
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
