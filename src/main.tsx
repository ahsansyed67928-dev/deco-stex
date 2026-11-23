import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW() {
      // Service worker registered for offline exam prep
    },
    onRegisterError() {
      // Keep app functional even if SW registration fails in restricted preview
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
