import { apiClient } from '@/lib/api';

export type InvoiceStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'CANCELLED';

export interface InvoicePaymentRecord {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string | null;
}

export interface InvoiceRecord {
  id: string;
  businessId: string;
  saleId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  paidAmount: number;
  balanceDue: number;
  isOverdue: boolean;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  itemsCount: number;
  totalUnits: number;
  payments?: InvoicePaymentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDetailItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string | null;
    unit: string;
  };
}

export interface InvoiceDetail extends InvoiceRecord {
  business: {
    id: string;
    name: string;
    logo?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    registrationNo?: string | null;
    currency: string;
  };
  sale: {
    id: string;
    saleNumber: string;
    saleDate: string;
    notes?: string | null;
    createdBy?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
    } | null;
  };
  items: InvoiceDetailItem[];
}

export interface InvoiceStats {
  totalInvoices: number;
  totalBilled: number;
  totalCollected: number;
  outstandingReceivables: number;
  paidInvoicesCount: number;
  unpaidInvoicesCount: number;
  overdueCount: number;
}

export interface InvoicesResponse {
  items: InvoiceRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateInvoicePayload {
  dueDate?: string;
  status?: InvoiceStatus;
}

export const invoiceService = {
  async getInvoices(params?: {
    search?: string;
    customerId?: string;
    status?: InvoiceStatus;
    isOverdue?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<InvoicesResponse> {
    const response = await apiClient.get<InvoicesResponse>('/invoices', { params });
    return response.data;
  },

  async getStats(): Promise<InvoiceStats> {
    const response = await apiClient.get<InvoiceStats>('/invoices/stats');
    return response.data;
  },

  async getInvoice(id: string): Promise<InvoiceDetail> {
    const response = await apiClient.get<InvoiceDetail>(`/invoices/${id}`);
    return response.data;
  },

  async updateInvoice(id: string, payload: UpdateInvoicePayload): Promise<InvoiceRecord> {
    const response = await apiClient.patch<InvoiceRecord>(`/invoices/${id}`, payload);
    return response.data;
  },
};
