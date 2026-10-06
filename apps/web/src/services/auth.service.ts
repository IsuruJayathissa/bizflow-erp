import { apiClient } from '@/lib/api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  role?: string;
  phone?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    businessId?: string;
    business?: {
      id: string;
      name: string;
      currency: string;
      taxRate: number;
      invoicePrefix: string;
    };
  };
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizflow_token', response.data.accessToken);
      localStorage.setItem('bizflow_refresh_token', response.data.refreshToken);
      localStorage.setItem('bizflow_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizflow_token', response.data.accessToken);
      localStorage.setItem('bizflow_refresh_token', response.data.refreshToken);
      localStorage.setItem('bizflow_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bizflow_token');
        localStorage.removeItem('bizflow_refresh_token');
        localStorage.removeItem('bizflow_user');
      }
    }
  },

  async getProfile(): Promise<any> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  getStoredUser(): any | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('bizflow_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('bizflow_token');
  },
};
