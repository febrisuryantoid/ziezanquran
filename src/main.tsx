import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register Service Worker for offline PWA support with safe error handling
registerSW({
  immediate: true,
  onRegisterError() {
    // Fail silently in environments where Service Workers are restricted
  },
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
