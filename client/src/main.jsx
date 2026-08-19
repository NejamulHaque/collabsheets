import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

document.documentElement.setAttribute('data-theme', localStorage.getItem('cs-theme') || 'dark');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

// ✅ No StrictMode — prevents double-mounted WebSockets (Yjs crashes)
createRoot(document.getElementById('root')).render(<App />);