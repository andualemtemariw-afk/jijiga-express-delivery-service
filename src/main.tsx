import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx';
import './index.css';

// Global Google Maps Authentication & Quota Error Handler
(window as any).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  window.dispatchEvent(
    new CustomEvent('gmp-auth-failed', { detail: { error: 'Authentication failed (InvalidKeyMapError or BillingNotEnabled).' } })
  );
};

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
  if (
    msg.includes('Google Maps JavaScript API error: InvalidKeyMapError') ||
    msg.includes('Google Maps JavaScript API error: BillingNotEnabledMapError') ||
    msg.includes('Google Maps JavaScript API error: ApiNotActivatedMapError') ||
    msg.includes('Google Maps JavaScript API error: RefererNotAllowedMapError') ||
    msg.includes('Google Maps JavaScript API error: DeletedKeyMapError')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-auth-failed', { detail: { error: msg } }));
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
);

// Register service worker in production; clear caches in development to prevent stale module caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.info('[SW] New version available for Jijiga Express.');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[SW] Service worker registration notice:', err);
        });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        const scriptUrl =
          registration.active?.scriptURL ||
          registration.installing?.scriptURL ||
          registration.waiting?.scriptURL ||
          '';
        if (scriptUrl.endsWith('/sw.js') || scriptUrl.includes('/sw.js')) {
          registration.unregister();
        }
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          if (key.startsWith('jijiga-express-')) {
            caches.delete(key);
          }
        }
      });
    }
  }
}
