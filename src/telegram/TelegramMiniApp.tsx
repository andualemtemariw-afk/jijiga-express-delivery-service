import { useEffect, useState } from 'react';
import { signInWithCustomToken, updateProfile } from 'firebase/auth';
import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { auth } from '../services/googleAuth';
import App from '../App';

interface TelegramBootstrapUser { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string }
interface TelegramAuthResponse { customToken: string; user: TelegramBootstrapUser }
interface TelegramWebApp { initData?: string; ready?: () => void; expand?: () => void }
declare global { interface Window { Telegram?: { WebApp?: TelegramWebApp } } }

function LoadingState() {
  return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm" role="status" aria-live="polite">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
      <h1 className="text-lg font-bold text-slate-900">Opening Jijiga Express</h1>
      <p className="mt-2 text-sm text-slate-600">Verifying your Telegram session securely…</p>
    </div>
  </div>;
}
function ErrorState({ message }: { message: string }) {
  return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm" role="alert">
      <h1 className="text-lg font-bold text-slate-900">Jijiga Express could not sign in</h1>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Try again</button>
    </div>
  </div>;
}

export default function TelegramMiniApp() {
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();

    const bootstrap = async () => {
      const initData = webApp?.initData;
      if (!initData) throw new Error('Please open Jijiga Express from the @JijigaExpressBot chat in Telegram.');
      if (initData.length > 8192) throw new Error('Telegram session data is too large. Close and reopen the Mini App.');
      let response: Response;
      try {
        response = await fetch('/api/telegram/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ initData }),
        });
      } catch {
        throw new Error('Could not reach the secure sign-in service. Check the connection and try again.');
      }
      if (!response.ok) {
        if (response.status === 401) throw new Error('Your Telegram session expired. Close and reopen the Mini App.');
        if (response.status === 503) throw new Error('Telegram sign-in is not configured on this deployment yet.');
        throw new Error('Secure sign-in could not be completed. Please try again later.');
      }
      const result = await response.json() as TelegramAuthResponse;
      if (!result || typeof result.customToken !== 'string' || !result.customToken || !result.user
        || !Number.isSafeInteger(result.user.id) || typeof result.user.first_name !== 'string') {
        throw new Error('The sign-in service returned an invalid response. Please try again later.');
      }
      const credential = await signInWithCustomToken(auth, result.customToken);
      const displayName = [result.user.first_name, result.user.last_name].filter(Boolean).join(' ').slice(0, 128) || 'Jijiga Express Customer';
      try {
        await updateProfile(credential.user, { displayName, ...(result.user.photo_url ? { photoURL: result.user.photo_url } : {}) });
      } catch {
        // Authentication is valid even if the optional profile display update fails.
      }
      if (active) setReady(true);
    };
    bootstrap().catch((error: unknown) => {
      if (active) setErrorMessage(error instanceof Error ? error.message : 'Secure sign-in could not be completed.');
    });
    return () => { active = false; };
  }, []);

  if (errorMessage) return <ErrorState message={errorMessage} />;
  if (!ready) return <LoadingState />;
  return <AppErrorBoundary><ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider></AppErrorBoundary>;
}
