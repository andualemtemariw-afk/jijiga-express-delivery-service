import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import './index.css';

// Global Google Maps Authentication Error Handler
(window as any).gm_authFailure = () => {
  window.dispatchEvent(
    new CustomEvent('gmp-auth-failed', { detail: { error: 'Authentication failed (InvalidKeyMapError or BillingNotEnabled).' } })
  );
};

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(' ');
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
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);

// Register service worker for offline app shell and asset caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
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
}
