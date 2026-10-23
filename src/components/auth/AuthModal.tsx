import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Smartphone, 
  Globe,
  Loader2
} from 'lucide-react';
import { 
  isCapacitorAndroid,
  isCapacitorNative
} from '../../services/googleAuth';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultTab?: 'signin' | 'register';
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  defaultTab = 'signin',
}: AuthModalProps) {
  const { signInWithGoogle, signInWithEmail, registerWithEmail } = useAuth();
  const isAndroid = isCapacitorAndroid();
  const isNative = isCapacitorNative();
  const [tab, setTab] = useState<'signin' | 'register'>(defaultTab);

  // Form states (kept only in component memory during entry)
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setDisplayName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (tab === 'register') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (tab === 'signin') {
        await signInWithEmail(trimmedEmail, password);
      } else {
        await registerWithEmail(trimmedEmail, password, displayName.trim());
      }
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed. Please try Email & Password on Android.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <LogIn className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                {tab === 'signin' ? 'Sign In to Jijiga Express' : 'Create Customer Account'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Secure customer access for doorstep tracking & orders
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Status Badge */}
        {isNative ? (
          <div className="bg-emerald-50 px-5 py-2.5 border-b border-emerald-100 flex items-center gap-2 text-xs text-emerald-900 font-medium">
            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Android Native Session — Use Email & Password for reliable mobile auth.</span>
          </div>
        ) : (
          <div className="bg-slate-50 px-5 py-2 border-b border-slate-100 flex items-center gap-2 text-xs text-slate-600">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Web Platform — Sign in with Google or Email & Password.</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="p-5 pb-0">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setTab('signin'); setErrorMessage(null); }}
              className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'signin' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setErrorMessage(null); }}
              className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'register' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Authentication Notice</span>
                <p className="text-[11px] leading-relaxed text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name / Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. Andualem Awraris"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password {tab === 'register' && <span className="text-slate-400 font-normal">(min 6 chars)</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {tab === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>{tab === 'signin' ? 'Sign In with Email' : 'Register Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* Alternative Web Google Sign-In */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="relative flex items-center justify-center text-[10px] text-slate-400 uppercase font-semibold">
              <span className="bg-white px-2 z-10">Or</span>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold rounded-xl text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>
            {isAndroid && (
              <p className="text-[10px] text-center text-slate-400">
                Tip: On Android devices, Email & Password is recommended to bypass WebView popup restrictions.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
