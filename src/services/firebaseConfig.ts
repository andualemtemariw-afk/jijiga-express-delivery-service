import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  connectFirestoreEmulator,
  persistentLocalCache, 
  persistentMultipleTabManager, 
  enableIndexedDbPersistence, 
  Firestore 
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import baseAppletConfig from '../../firebase-applet-config.json';

export interface FirebaseEnvironmentConfig {
  apiKey: string;
  projectId: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

export interface FirebaseEnvironmentInfo {
  projectId: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket?: string;
  isDev: boolean;
  isProd: boolean;
  isEmulated: boolean;
  isNative: boolean;
  platform: string;
}

/**
 * Sanitizes raw environment strings by stripping extraneous quotes, commas,
 * semicolon delimiters, whitespace, and accidental variable-assignment prefixes.
 */
export function sanitizeEnvValue(val?: string | null): string {
  if (!val) return '';
  let cleaned = String(val).trim();
  if (cleaned.includes('=')) {
    const parts = cleaned.split('=');
    cleaned = parts[parts.length - 1].trim();
  }
  return cleaned.replace(/^['"]|['",;\s]+$/g, '').trim();
}

/**
 * Resolves Firebase configuration with secure per-environment precedence:
 * 1. Explicit Vite environment variables (VITE_FIREBASE_*, VITE_FIRESTORE_DATABASE_ID)
 * 2. Static application config (firebase-applet-config.json)
 */
export function resolveFirebaseConfig(): FirebaseEnvironmentConfig {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {} as Record<string, string>;

  const projectId = sanitizeEnvValue(env.VITE_FIREBASE_PROJECT_ID) || baseAppletConfig.projectId || '';
  const apiKey = sanitizeEnvValue(env.VITE_FIREBASE_API_KEY) || baseAppletConfig.apiKey || '';
  const authDomain = sanitizeEnvValue(env.VITE_FIREBASE_AUTH_DOMAIN) || baseAppletConfig.authDomain || (projectId ? `${projectId}.firebaseapp.com` : '');
  const firestoreDatabaseId = sanitizeEnvValue(env.VITE_FIRESTORE_DATABASE_ID || env.VITE_FIREBASE_DATABASE_ID) || (baseAppletConfig as any).firestoreDatabaseId || '(default)';
  const storageBucket = sanitizeEnvValue(env.VITE_FIREBASE_STORAGE_BUCKET) || baseAppletConfig.storageBucket || (projectId ? `${projectId}.firebasestorage.app` : '');
  const messagingSenderId = sanitizeEnvValue(env.VITE_FIREBASE_MESSAGING_SENDER_ID) || baseAppletConfig.messagingSenderId || '';
  const appId = sanitizeEnvValue(env.VITE_FIREBASE_APP_ID) || baseAppletConfig.appId || '';
  const measurementId = sanitizeEnvValue(env.VITE_FIREBASE_MEASUREMENT_ID) || (baseAppletConfig as any).measurementId || '';
  const oAuthClientId = sanitizeEnvValue(env.VITE_FIREBASE_OAUTH_CLIENT_ID) || (baseAppletConfig as any).oAuthClientId || '';
  const recaptchaSiteKey = sanitizeEnvValue(env.VITE_FIREBASE_RECAPTCHA_SITE_KEY) || (baseAppletConfig as any).recaptchaSiteKey || '';

  // Defensive validation in development / startup
  if (!apiKey || !projectId) {
    console.warn(
      '[FirebaseConfig] Missing critical Firebase parameters (apiKey or projectId). ' +
      'Check your environment variables or firebase-applet-config.json.'
    );
  }

  return {
    apiKey,
    projectId,
    authDomain,
    firestoreDatabaseId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
    oAuthClientId,
    recaptchaSiteKey
  };
}

export const firebaseConfig = resolveFirebaseConfig();

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

/**
 * Check if Firebase local emulators are enabled.
 */
export const usingFirebaseEmulators =
  typeof import.meta !== 'undefined' &&
  Boolean(import.meta.env?.DEV) &&
  sanitizeEnvValue(import.meta.env?.VITE_USE_FIREBASE_EMULATORS).toLowerCase() === 'true';

// 1. Initialize Singleton FirebaseApp
export const app: FirebaseApp = (() => {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }
  return initializeApp({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
    measurementId: firebaseConfig.measurementId,
  });
})();

// 2. Initialize Singleton Auth
export const auth: Auth = getAuth(app);

// 3. Initialize Singleton Firestore with persistent caching & long polling
export const db: Firestore = (() => {
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';

  if (typeof window !== 'undefined') {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        experimentalForceLongPolling: true,
      }, dbId);
    } catch (err: any) {
      console.warn('[FirebaseConfig] Persistent cache notice, falling back to default instance:', err?.message || err);
      const fallbackDb = getFirestore(app, dbId);
      try {
        enableIndexedDbPersistence(fallbackDb).catch((persistErr) => {
          console.warn('[FirebaseConfig] IndexedDB persistence fallback notice:', persistErr?.code || persistErr?.message);
        });
      } catch {}
      return fallbackDb;
    }
  }
  return getFirestore(app, dbId);
})();

// 4. Connect to emulators if configured for isolated testing
if (usingFirebaseEmulators) {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {} as Record<string, string>;
  const authHost = env.VITE_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  const firestoreHost = env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
  const firestorePort = parseInt(env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT || '8080', 10);

  try {
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
    connectFirestoreEmulator(db, firestoreHost, firestorePort);
    console.info(`[FirebaseConfig] Connected to Firebase Emulators (Auth: ${authHost}, Firestore: ${firestoreHost}:${firestorePort})`);
  } catch (emuErr) {
    console.warn('[FirebaseConfig] Emulator connection notice:', emuErr);
  }
}

/**
 * Returns safe environment diagnostic information (no secret disclosure).
 */
export function getFirebaseEnvironmentInfo(): FirebaseEnvironmentInfo {
  const isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);
  return {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
    storageBucket: firebaseConfig.storageBucket,
    isDev,
    isProd: !isDev,
    isEmulated: usingFirebaseEmulators,
    isNative: isCapacitorNative(),
    platform: isCapacitorAndroid() ? 'android' : (isCapacitorNative() ? 'ios' : 'web'),
  };
}
