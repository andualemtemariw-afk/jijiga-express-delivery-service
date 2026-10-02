import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator,
  signInWithPopup, 
  signOut,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  connectFirestoreEmulator, 
  getFirestore,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send',
];

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId;
export const db: Firestore = getFirestore(app, firestoreDbId);

/**
 * Utility helper to subscribe to browser online/offline status changes.
 */
export function subscribeToNetworkStatus(callback: (isOnline: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  callback(navigator.onLine);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export const usingFirebaseEmulators =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

if (usingFirebaseEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// 1. Basic Google Auth Provider for App Login (Clean, instant, no unnecessary Workspace prompts)
const basicProvider = new GoogleAuthProvider();
basicProvider.setCustomParameters({ prompt: 'select_account' });

// 2. Extended Workspace Provider for Google Drive & Gmail modals
const workspaceProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => {
  workspaceProvider.addScope(scope);
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Signs in using Firebase Google Authentication.
 */
export const appSignInWithGoogle = async (): Promise<User> => {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, basicProvider);
    return result.user;
  } catch (error: any) {
    // If auth/network-request-failed occurs due to iframe handshake delay, retry once with backoff
    if (error?.code === 'auth/network-request-failed' || error?.message?.includes('network-request-failed')) {
      console.warn('Network request failed during Google sign-in handshake, attempting retry in 800ms...');
      await new Promise(r => setTimeout(r, 800));
      try {
        const retryResult = await signInWithPopup(auth, basicProvider);
        return retryResult.user;
      } catch (retryErr: any) {
        console.error('Google Sign-in retry failed:', retryErr);
        throw retryErr;
      }
    }
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Google Sign-in with Workspace Drive / Gmail scopes.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, workspaceProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.error('Workspace Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken && onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};
