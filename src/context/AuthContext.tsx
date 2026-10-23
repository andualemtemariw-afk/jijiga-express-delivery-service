import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  auth, 
  appSignInWithGoogle, 
  signInWithEmail as apiSignInWithEmail, 
  registerWithEmail as apiRegisterWithEmail, 
  logout as apiLogout, 
  subscribeToAuthState,
  isAuthReady as checkIsAuthReady 
} from '../services/googleAuth';
import { syncUserProfile, updateUserProfile as apiUpdateUserProfile, ADMIN_EMAILS } from '../services/userService';
import { AppUserProfile } from '../types';

export interface AuthContextValue {
  currentUser: User | null;
  userProfile: AppUserProfile | null;
  isAuthReady: boolean;
  authLoading: boolean;
  isAdmin: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<User>;
  signInWithEmail: (email: string, pass: string) => Promise<User>;
  registerWithEmail: (email: string, pass: string, displayName?: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<AppUserProfile>) => Promise<void>;
  refreshProfile: () => Promise<AppUserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(() => checkIsAuthReady());
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const syncProfileForUser = useCallback(async (user: User | null): Promise<AppUserProfile | null> => {
    if (!user) {
      setUserProfile(null);
      return null;
    }
    try {
      const profile = await syncUserProfile(user);
      setUserProfile(profile);
      return profile;
    } catch (err: any) {
      console.warn('[AuthProvider] Profile synchronization notice:', err?.message || err);
      // Fallback local representation while maintaining offline resilience
      const fallbackProfile: AppUserProfile = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Customer',
        email: user.email || '',
        photoURL: user.photoURL || undefined,
        role: (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim())) ? 'admin' : 'customer',
        active: true,
        createdAt: new Date().toISOString()
      };
      setUserProfile(fallbackProfile);
      return fallbackProfile;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user: User | null) => {
      setAuthLoading(true);
      setCurrentUser(user);
      setIsAuthReady(true);
      if (user) {
        await syncProfileForUser(user);
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [syncProfileForUser]);

  const signInWithGoogle = async (): Promise<User> => {
    setError(null);
    setAuthLoading(true);
    try {
      const user = await appSignInWithGoogle();
      setCurrentUser(user);
      await syncProfileForUser(user);
      return user;
    } catch (err: any) {
      const msg = err?.message || 'Google sign-in failed.';
      setError(msg);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<User> => {
    setError(null);
    setAuthLoading(true);
    try {
      const user = await apiSignInWithEmail(email, pass);
      setCurrentUser(user);
      await syncProfileForUser(user);
      return user;
    } catch (err: any) {
      const msg = err?.message || 'Email sign-in failed.';
      setError(msg);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, displayName?: string): Promise<User> => {
    setError(null);
    setAuthLoading(true);
    try {
      const user = await apiRegisterWithEmail(email, pass, displayName);
      setCurrentUser(user);
      await syncProfileForUser(user);
      return user;
    } catch (err: any) {
      const msg = err?.message || 'Registration failed.';
      setError(msg);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setAuthLoading(true);
    try {
      await apiLogout();
      setCurrentUser(null);
      setUserProfile(null);
    } catch (err: any) {
      console.error('[AuthProvider] Sign-out error:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<AppUserProfile>): Promise<void> => {
    if (!currentUser) throw new Error('Cannot update profile: user is not authenticated.');
    await apiUpdateUserProfile(currentUser.uid, updates);
    setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const refreshProfile = async (): Promise<AppUserProfile | null> => {
    return syncProfileForUser(currentUser);
  };

  const isAdmin = Boolean(
    userProfile?.role === 'admin' ||
    (currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim()))
  );

  const value: AuthContextValue = {
    currentUser,
    userProfile,
    isAuthReady,
    authLoading,
    isAdmin,
    error,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    logout,
    updateProfile,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
};
