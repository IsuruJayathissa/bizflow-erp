import { apiClient } from '@/lib/api';

export interface UserItem {
  id: string;
  businessId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES_STAFF' | 'INVENTORY_STAFF' | 'ACCOUNTANT';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface UpdateStaffPayload {
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}

export const userService = {
  async getUsers(params?: { search?: string; role?: string; isActive?: boolean }): Promise<UserItem[]> {
    const response = await apiClient.get<UserItem[]>('/users', { params });
    return response.data;
  },

  async createUser(payload: CreateStaffPayload): Promise<UserItem> {
    const response = await apiClient.post<UserItem>('/users', payload);
    return response.data;
  },

  async updateUser(id: string, payload: UpdateStaffPayload): Promise<UserItem> {
    const response = await apiClient.patch<UserItem>(`/users/${id}`, payload);
    return response.data;
  },

  async toggleStatus(id: string): Promise<UserItem> {
    const response = await apiClient.patch<UserItem>(`/users/${id}/toggle-status`);
    return response.data;
  },

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
};
