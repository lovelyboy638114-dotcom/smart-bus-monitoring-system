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

