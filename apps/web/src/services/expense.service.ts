import { apiClient } from '@/lib/api';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  expensesCount: number;
  totalAmount: number;
}

export interface ExpenseRecord {
  id: string;
  businessId: string;
  categoryId: string;
  title: string;
  amount: number;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  recordedById?: string | null;
  category: {
    id: string;
    name: string;
    description?: string | null;
  };
  recordedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryExpenseBreakdown {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

export interface ExpenseStats {
  totalExpensesCount: number;
  totalAmount: number;
  thisMonthAmount: number;
  todayAmount: number;
  byPaymentMethod: {
    cash: number;
    card: number;
    bankTransfer: number;
    other: number;
  };
  byCategory: CategoryExpenseBreakdown[];
  topCategory?: CategoryExpenseBreakdown | null;
}

export interface ExpensesResponse {
  items: ExpenseRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateExpensePayload {
  categoryId: string;
  title: string;
  amount: number;
  expenseDate?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface UpdateExpensePayload {
  categoryId?: string;
  title?: string;
  amount?: number;
  expenseDate?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface CreateExpenseCategoryPayload {
  name: string;
  description?: string;
}

export const expenseService = {
  // Categories
  async getCategories(): Promise<ExpenseCategory[]> {
    const response = await apiClient.get<ExpenseCategory[]>('/expenses/categories');
    return response.data;
  },

  async createCategory(payload: CreateExpenseCategoryPayload): Promise<ExpenseCategory> {
    const response = await apiClient.post<ExpenseCategory>('/expenses/categories', payload);
    return response.data;
  },

  async updateCategory(id: string, payload: CreateExpenseCategoryPayload): Promise<ExpenseCategory> {
    const response = await apiClient.patch<ExpenseCategory>(`/expenses/categories/${id}`, payload);
    return response.data;
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/expenses/categories/${id}`);
    return response.data;
  },

  // Expense Records
  async getExpenses(params?: {
    search?: string;
    categoryId?: string;
    paymentMethod?: PaymentMethod;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ExpensesResponse> {
    const response = await apiClient.get<ExpensesResponse>('/expenses', { params });
    return response.data;
  },

  async getStats(): Promise<ExpenseStats> {
    const response = await apiClient.get<ExpenseStats>('/expenses/stats');
    return response.data;
  },

  async getExpense(id: string): Promise<ExpenseRecord> {
    const response = await apiClient.get<ExpenseRecord>(`/expenses/${id}`);
    return response.data;
  },

  async createExpense(payload: CreateExpensePayload): Promise<ExpenseRecord> {
    const response = await apiClient.post<ExpenseRecord>('/expenses', payload);
    return response.data;
  },

  async updateExpense(id: string, payload: UpdateExpensePayload): Promise<ExpenseRecord> {
    const response = await apiClient.patch<ExpenseRecord>(`/expenses/${id}`, payload);
    return response.data;
  },

  async deleteExpense(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/expenses/${id}`);
    return response.data;
  },
};
