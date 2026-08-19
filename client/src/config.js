// Local dev → talks to localhost:5001. Production → same origin (https/wss).
export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001' : '');

export const WS_URL = API_URL
  ? API_URL.replace(/^http/i, 'ws')
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;