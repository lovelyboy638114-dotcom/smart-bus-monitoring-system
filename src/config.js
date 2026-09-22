// Central Configuration for SafeBus AI Backend APIs
// Dynamically resolves to Vite proxy or backend gateway
const getBackendBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // When running via Vite dev server (port 5173) or external link, use window.location.origin so Vite proxies to 8080
    if (window.location.port === '5173' || (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
      return window.location.origin;
    }
  }
  return "http://localhost:8080";
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getBackendBaseUrl();

// Python Edge AI Computer Vision service URL (proxied via Gateway /cv or dedicated service)
const getCvServiceUrl = () => {
  if (import.meta.env.VITE_CV_URL) return import.meta.env.VITE_CV_URL;
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173' || (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
      return `${window.location.origin}/cv`;
    }
  }
  if (import.meta.env.VITE_API_BASE_URL) return `${import.meta.env.VITE_API_BASE_URL}/cv`;
  return "http://localhost:5001";
};

export const CV_SERVICE_URL = getCvServiceUrl();

// WebSocket base URL
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || (API_BASE_URL.startsWith('http') ? API_BASE_URL.replace(/^http/, 'ws') + '/ws' : (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` : 'ws://localhost:8080/ws'));

