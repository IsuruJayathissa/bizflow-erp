import { apiClient } from '@/lib/api';

export interface BusinessProfile {
  id: string;
  name: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  registrationNo: string | null;
  currency: string;
  taxRate: number;
  invoicePrefix: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    products: number;
    customers: number;
    suppliers: number;
    sales: number;
    purchases: number;
  };
}

export interface UpdateBusinessPayload {
  name?: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  registrationNo?: string;
  currency?: string;
  taxRate?: number;
  invoicePrefix?: string;
}

export const businessService = {
  async getBusiness(): Promise<BusinessProfile> {
    const response = await apiClient.get<BusinessProfile>('/business');
    return response.data;
  },

  async updateBusiness(payload: UpdateBusinessPayload): Promise<BusinessProfile> {
    const response = await apiClient.patch<BusinessProfile>('/business', payload);
    return response.data;
  },
};
