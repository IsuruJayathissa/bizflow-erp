import { apiClient } from '@/lib/api';

export interface CustomerItem {
  id: string;
  businessId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalOrders: number;
  totalSpent: number;
  outstandingBalance: number;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  outstandingReceivables: number;
}

export interface CustomerPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference: string | null;
}

export interface CustomerSale {
  id: string;
  saleNumber: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'CANCELLED';
  notes: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    dueDate: string | null;
    issueDate: string;
  } | null;
  payments: CustomerPayment[];
}

export interface CustomerDetail extends CustomerItem {
  sales: CustomerSale[];
}

export interface CreateCustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerPayload {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export const customerService = {
  async getCustomers(params?: { search?: string; isActive?: boolean }): Promise<CustomerItem[]> {
    const response = await apiClient.get<CustomerItem[]>('/customers', { params });
    return response.data;
  },

  async getStats(): Promise<CustomerStats> {
    const response = await apiClient.get<CustomerStats>('/customers/stats');
    return response.data;
  },

  async getCustomer(id: string): Promise<CustomerDetail> {
    const response = await apiClient.get<CustomerDetail>(`/customers/${id}`);
    return response.data;
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<CustomerItem> {
    const response = await apiClient.post<CustomerItem>('/customers', payload);
    return response.data;
  },

  async updateCustomer(id: string, payload: UpdateCustomerPayload): Promise<CustomerItem> {
    const response = await apiClient.patch<CustomerItem>(`/customers/${id}`, payload);
    return response.data;
  },

  async toggleStatus(id: string): Promise<CustomerItem> {
    const response = await apiClient.patch<CustomerItem>(`/customers/${id}/toggle-status`);
    return response.data;
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  },
};
