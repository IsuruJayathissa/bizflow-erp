import { apiClient } from '@/lib/api';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
export type InvoiceStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'CANCELLED';

export interface SaleItemProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  unit: string;
  currentStock: number;
  sellingPrice?: number;
  costPrice?: number;
}

export interface SaleItemRecord {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product: SaleItemProduct;
}

export interface SaleRecord {
  id: string;
  businessId: string;
  customerId: string | null;
  saleNumber: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  paidAmount: number;
  balanceDue: number;
  itemsCount: number;
  totalUnits: number;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  items: SaleItemRecord[];
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
  } | null;
  payments?: {
    id: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    reference?: string | null;
  }[];
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
}

export interface SaleStats {
  totalOrders: number;
  totalRevenue: number;
  totalUnitsSold: number;
  totalCollected: number;
  outstandingReceivables: number;
  today: {
    count: number;
    revenue: number;
  };
}

export interface SalesResponse {
  items: SaleRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateSalePayload {
  customerId?: string;
  saleNumber?: string;
  saleDate?: string;
  discount?: number;
  tax?: number;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  payment?: {
    amount: number;
    paymentMethod: PaymentMethod;
    reference?: string;
    notes?: string;
  };
  createInvoice?: boolean;
}

export const saleService = {
  async getSales(params?: {
    search?: string;
    customerId?: string;
    status?: InvoiceStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<SalesResponse> {
    const response = await apiClient.get<SalesResponse>('/sales', { params });
    return response.data;
  },

  async getStats(): Promise<SaleStats> {
    const response = await apiClient.get<SaleStats>('/sales/stats');
    return response.data;
  },

  async getSale(id: string): Promise<SaleRecord> {
    const response = await apiClient.get<SaleRecord>(`/sales/${id}`);
    return response.data;
  },

  async createSale(payload: CreateSalePayload): Promise<SaleRecord> {
    const response = await apiClient.post<SaleRecord>('/sales', payload);
    return response.data;
  },

  async cancelSale(id: string): Promise<SaleRecord> {
    const response = await apiClient.patch<SaleRecord>(`/sales/${id}/cancel`);
    return response.data;
  },
};
