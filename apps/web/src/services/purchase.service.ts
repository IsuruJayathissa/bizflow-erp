import { apiClient } from '@/lib/api';

export type PurchaseStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED';

export interface PurchaseItemProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  barcode?: string | null;
  currentStock?: number;
  costPrice?: number;
  sellingPrice?: number;
}

export interface PurchaseItemRecord {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  total: number;
  product: PurchaseItemProduct;
}

export interface PurchaseRecord {
  id: string;
  businessId: string;
  supplierId: string;
  orderNumber: string;
  purchaseDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: PurchaseStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  paidAmount: number;
  balanceDue: number;
  itemsCount: number;
  totalUnits: number;
  supplier: {
    id: string;
    companyName: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  items: PurchaseItemRecord[];
  payments?: {
    id: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
  }[];
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
}

export interface PurchaseStats {
  totalOrders: number;
  totalSpend: number;
  pendingOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
  totalPaid: number;
  totalOutstandingPayables: number;
}

export interface PurchasesResponse {
  items: PurchaseRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePurchasePayload {
  supplierId: string;
  orderNumber?: string;
  purchaseDate?: string;
  discount?: number;
  tax?: number;
  status?: PurchaseStatus;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    unitCost: number;
  }[];
}

export const purchaseService = {
  async getPurchases(params?: {
    search?: string;
    supplierId?: string;
    status?: PurchaseStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PurchasesResponse> {
    const response = await apiClient.get<PurchasesResponse>('/purchases', {
      params,
    });
    return response.data;
  },

  async getStats(): Promise<PurchaseStats> {
    const response = await apiClient.get<PurchaseStats>('/purchases/stats');
    return response.data;
  },

  async getPurchase(id: string): Promise<PurchaseRecord> {
    const response = await apiClient.get<PurchaseRecord>(`/purchases/${id}`);
    return response.data;
  },

  async createPurchase(payload: CreatePurchasePayload): Promise<PurchaseRecord> {
    const response = await apiClient.post<PurchaseRecord>('/purchases', payload);
    return response.data;
  },

  async receivePurchase(id: string): Promise<PurchaseRecord> {
    const response = await apiClient.patch<PurchaseRecord>(`/purchases/${id}/receive`);
    return response.data;
  },

  async cancelPurchase(id: string): Promise<PurchaseRecord> {
    const response = await apiClient.patch<PurchaseRecord>(`/purchases/${id}/cancel`);
    return response.data;
  },

  async deletePurchase(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/purchases/${id}`);
    return response.data;
  },
};
