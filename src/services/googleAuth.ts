import { 
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
  app, 
  auth, 
  db, 
  firebaseConfig, 
  isCapacitorNative, 
  isCapacitorAndroid, 
  usingFirebaseEmulators,
  getFirebaseEnvironmentInfo 
} from './firebaseConfig';

// Re-export core Firebase singletons and environment helpers
export { 
  app, 
  auth, 
  db, 
  firebaseConfig, 
  isCapacitorNative, 
  isCapacitorAndroid, 
  usingFirebaseEmulators,
  getFirebaseEnvironmentInfo 
};

// Standard scopes only; broad Gmail/Drive scopes removed to prevent Google OAuth verification review
export const WORKSPACE_SCOPES: string[] = [];

// ============================================================================
// Consistent Auth State Handling & Readiness Synchronization
// ============================================================================

let isInitialAuthResolved = false;
let authReadyResolve: (user: User | null) => void;
const authReadyPromise = new Promise<User | null>((resolve) => {
  authReadyResolve = resolve;
});

const authSubscribers = new Set<(user: User | null) => void>();

// Attach singleton listener immediately upon module load
onAuthStateChanged(auth, (user: User | null) => {
  if (!isInitialAuthResolved) {
    isInitialAuthResolved = true;
    authReadyResolve(user);
  }
  authSubscribers.forEach((callback) => {
    try {
      callback(user);
    } catch (err) {
      console.warn('[GoogleAuth] Auth subscriber notification notice:', err);
    }
  });
});

/**
 * Returns whether the initial Firebase auth check has resolved.
 */
export const isAuthReady = (): boolean => isInitialAuthResolved;

/**
 * Resolves as soon as Firebase Auth has determined initial session state from
 * IndexedDB cache or network. Prevents race conditions during cold-start.
 */
export const waitForAuthReady = (): Promise<User | null> => authReadyPromise;

/**
 * Synchronously returns auth.currentUser if already resolved, or awaits waitForAuthReady.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  if (isInitialAuthResolved) {
    return auth.currentUser;
  }
  return authReadyPromise;
};

/**
 * Subscribes to auth state changes across any module with instant replay if already resolved.
 */
export const subscribeToAuthState = (callback: (user: User | null) => void): (() => void) => {
  authSubscribers.add(callback);
  if (isInitialAuthResolved) {
    callback(auth.currentUser);
  }
  return () => {
    authSubscribers.delete(callback);
  };
};

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
      console.warn('[GoogleAuth] Network request failed during Google sign-in handshake, attempting retry in 800ms...');
      await new Promise(r => setTimeout(r, 800));
      try {
        const retryResult = await signInWithPopup(auth, basicProvider);
        return retryResult.user;
      } catch (retryErr: any) {
        console.error('[GoogleAuth] Google Sign-in retry failed:', retryErr);
        throw retryErr;
      }
    }
    console.error('[GoogleAuth] Google Sign-in error:', error);
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
    console.error('[GoogleAuth] Workspace Google Sign in error:', error);
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
    console.error('[GoogleAuth] Email sign-in error:', error?.code || error);
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
        console.warn('[GoogleAuth] Profile name update notice:', profileErr);
      }
    }
    return cred.user;
  } catch (error: any) {
    console.error('[GoogleAuth] Email registration error:', error?.code || error);
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
