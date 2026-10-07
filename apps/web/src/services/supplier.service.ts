import { apiClient } from '@/lib/api';

export interface SupplierItem {
  id: string;
  businessId: string;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalOrders: number;
  productsCount: number;
  totalPurchases: number;
  outstandingDues: number;
}

export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  totalPurchasesAmount: number;
  accountsPayable: number;
  totalSuppliedProducts: number;
}

export interface SupplierPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference: string | null;
}

export interface SupplierPurchaseItem {
  id: string;
  quantity: number;
  unitCost: number;
  total: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface SupplierPurchase {
  id: string;
  orderNumber: string;
  purchaseDate: string;
  total: number;
  status: 'PENDING' | 'RECEIVED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  notes: string | null;
  items: SupplierPurchaseItem[];
  payments: SupplierPayment[];
}

export interface SupplierProduct {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  unit: string;
}

export interface SupplierDetail extends SupplierItem {
  purchases: SupplierPurchase[];
  products: SupplierProduct[];
}

export interface CreateSupplierPayload {
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateSupplierPayload {
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export const supplierService = {
  async getSuppliers(params?: { search?: string; isActive?: boolean }): Promise<SupplierItem[]> {
    const response = await apiClient.get<SupplierItem[]>('/suppliers', { params });
    return response.data;
  },

  async getStats(): Promise<SupplierStats> {
    const response = await apiClient.get<SupplierStats>('/suppliers/stats');
    return response.data;
  },

  async getSupplier(id: string): Promise<SupplierDetail> {
    const response = await apiClient.get<SupplierDetail>(`/suppliers/${id}`);
    return response.data;
  },

  async createSupplier(payload: CreateSupplierPayload): Promise<SupplierItem> {
    const response = await apiClient.post<SupplierItem>('/suppliers', payload);
    return response.data;
  },

  async updateSupplier(id: string, payload: UpdateSupplierPayload): Promise<SupplierItem> {
    const response = await apiClient.patch<SupplierItem>(`/suppliers/${id}`, payload);
    return response.data;
  },

  async toggleStatus(id: string): Promise<SupplierItem> {
    const response = await apiClient.patch<SupplierItem>(`/suppliers/${id}/toggle-status`);
    return response.data;
  },

  async deleteSupplier(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/suppliers/${id}`);
    return response.data;
  },
};
