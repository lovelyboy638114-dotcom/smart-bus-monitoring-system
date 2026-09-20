import { API_BASE_URL } from '../config';

export const getAuthToken = () => localStorage.getItem('safebus_token');
export const setAuthToken = (token: string) => localStorage.setItem('safebus_token', token);
export const removeAuthToken = () => localStorage.removeItem('safebus_token');

export const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (response.status === 401) {
      // Unauthorized: clear token and redirect or reload
      removeAuthToken();
      localStorage.removeItem('safebus_user_role');
      localStorage.removeItem('safebus_user_username');
      localStorage.removeItem('safebus_parent_id');
      localStorage.removeItem('safebus_user_phone');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error (Status ${response.status})`);
    }
    
    return response.json();
  },
  
  get(endpoint: string, options?: Omit<RequestInit, 'method'>) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },
  
  post(endpoint: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  
  put(endpoint: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  
  delete(endpoint: string, options?: Omit<RequestInit, 'method'>) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
};
