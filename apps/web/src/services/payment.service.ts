import { apiClient } from '@/lib/api';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
export type PaymentDirection = 'INCOMING' | 'OUTGOING';

export interface PaymentRecord {
  id: string;
  businessId: string;
  saleId?: string | null;
  invoiceId?: string | null;
  purchaseId?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
  recordedById: string;
  direction: PaymentDirection;
  partyName: string;
  sale?: {
    id: string;
    saleNumber: string;
    total: number;
    customer?: {
      id: string;
      name: string;
      phone?: string | null;
    } | null;
  } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    status: string;
  } | null;
  purchase?: {
    id: string;
    orderNumber: string;
    total: number;
    supplier?: {
      id: string;
      companyName: string;
      phone?: string | null;
    } | null;
  } | null;
  recordedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDetail extends PaymentRecord {
  business: {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    currency: string;
  };
}

export interface PaymentStats {
  totalPaymentsCount: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  byMethod: {
    cash: number;
    card: number;
    bankTransfer: number;
    other: number;
  };
  today: {
    inflows: number;
    outflows: number;
    net: number;
  };
}

export interface PaymentsResponse {
  items: PaymentRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecordPaymentPayload {
  amount: number;
  paymentMethod: PaymentMethod;
  saleId?: string;
  invoiceId?: string;
  purchaseId?: string;
  paymentDate?: string;
  reference?: string;
  notes?: string;
}

export const paymentService = {
  async getPayments(params?: {
    search?: string;
    type?: 'INCOMING' | 'OUTGOING';
    paymentMethod?: PaymentMethod;
    saleId?: string;
    invoiceId?: string;
    purchaseId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaymentsResponse> {
    const response = await apiClient.get<PaymentsResponse>('/payments', {
      params,
    });
    return response.data;
  },

  async getStats(): Promise<PaymentStats> {
    const response = await apiClient.get<PaymentStats>('/payments/stats');
    return response.data;
  },

  async getPayment(id: string): Promise<PaymentDetail> {
    const response = await apiClient.get<PaymentDetail>(`/payments/${id}`);
    return response.data;
  },

  async recordPayment(payload: RecordPaymentPayload): Promise<PaymentRecord> {
    const response = await apiClient.post<PaymentRecord>('/payments', payload);
    return response.data;
  },
};
