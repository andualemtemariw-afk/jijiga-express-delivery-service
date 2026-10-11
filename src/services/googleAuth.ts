import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator,
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  connectFirestoreEmulator, 
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  enableIndexedDbPersistence,
  Firestore
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import firebaseConfig from '../../firebase-applet-config.json';

// Standard scopes only; broad Gmail/Drive scopes removed to prevent Google OAuth verification review
export const WORKSPACE_SCOPES: string[] = [];

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Checks whether the app is executing inside a native Capacitor shell (Android / iOS).
 */
export const isCapacitorNative = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
};

/**
 * Specifically checks for native Android Capacitor environment.
 */
export const isCapacitorAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

// Initialize Cloud Firestore with IndexedDB multi-tab offline persistence
// and experimentalForceLongPolling for robust iframe / proxy connectivity
export const db: Firestore = (() => {
  if (typeof window !== 'undefined') {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        experimentalForceLongPolling: true,
      }, firestoreDbId);
    } catch (err: any) {
      console.warn('Firestore persistentLocalCache initialization notice:', err?.message || err);
      const fallbackDb = getFirestore(app, firestoreDbId);
      try {
        enableIndexedDbPersistence(fallbackDb).catch((persistErr) => {
          console.warn('Firestore enableIndexedDbPersistence fallback notice:', persistErr?.code || persistErr?.message);
        });
      } catch {}
      return fallbackDb;
    }
  }
  return getFirestore(app, firestoreDbId);
})();

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
 * Android-safe email/password authentication. This avoids OAuth popup/sessionStorage
 * state handling inside the Capacitor WebView.
 */
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
};

export const registerWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName?.trim()) {
    await updateProfile(result.user, { displayName: displayName.trim() });
  }
  return result.user;
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

/**
 * Maps Firebase Auth error codes into clean, actionable, human-readable user messages.
 */
export const mapAuthError = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please sign in or use a different email.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in the Firebase Console. An admin must enable Email/Password under Firebase Console > Authentication > Sign-in method.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please wait a few moments before trying again.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Authentication. On Android, please sign in with Email & Password.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked by the browser. Please allow popups or use Email sign-in.';
    default:
      if (message.includes('missing initial state') || message.includes('initial state')) {
        return 'OAuth session state failure in WebView. Please use Email & Password sign-in on Android devices.';
      }
      return message || 'An unexpected authentication error occurred. Please try again.';
  }
};

/**
 * Signs in using Firebase Email and Password.
 * Guaranteed zero password storage in localStorage/IndexedDB.
 */
export const signInWithEmail = async (email: string, pass: string): Promise<User> => {
  if (!email || !pass) {
    throw new Error('Please provide both email and password.');
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user;
  } catch (error: any) {
    console.error('Email sign-in error:', error?.code || error);
    throw new Error(mapAuthError(error));
  }
};

/**
 * Registers a new customer using Firebase Email and Password.
 * Updates user profile displayName and returns authenticated User.
 */
export const registerWithEmail = async (
  email: string, 
  pass: string, 
  displayName?: string
): Promise<User> => {
  if (!email || !pass) {
    throw new Error('Please provide both email and password.');
  }
  if (pass.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName && displayName.trim()) {
      try {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      } catch (profileErr) {
        console.warn('Profile name update notice:', profileErr);
      }
    }
    return cred.user;
  } catch (error: any) {
    console.error('Email registration error:', error?.code || error);
    throw new Error(mapAuthError(error));
  }
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
