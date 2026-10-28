import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { offlineSyncService } from './services/offlineSyncService';

// Register Service Worker for Offline-First PWA support with update & error hooks
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    offlineSyncService.notifyServiceWorkerRegistered(updateSW);
    // Periodically check for updates when online
    if (registration) {
      window.addEventListener('online', () => {
        registration.update().catch(() => {
          // Ignore update check failure
        });
      });
    }
  },
  onOfflineReady() {
    offlineSyncService.notifyServiceWorkerOfflineReady();
  },
  onNeedRefresh() {
    offlineSyncService.notifyServiceWorkerUpdateAvailable(updateSW);
  },
  onRegisterError(err) {
    offlineSyncService.notifyServiceWorkerError(
      err instanceof Error ? err.message : 'Service Worker dibatasi oleh lingkungan browser'
    );
  },
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
