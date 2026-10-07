import { apiClient } from '@/lib/api';

export interface CategoryItem {
  id: string;
  businessId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent: { id: string; name: string } | null;
  productsCount: number;
  subcategoriesCount: number;
}

export interface CategoryTreeItem extends CategoryItem {
  children: CategoryTreeItem[];
}

export interface CategoryStats {
  totalCategories: number;
  rootCategories: number;
  subCategories: number;
  categorizedProducts: number;
}

export interface CategoryProduct {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  unit: string;
  isActive: boolean;
}

export interface CategoryDetail extends CategoryItem {
  children: Array<{
    id: string;
    name: string;
    isActive: boolean;
    _count: { products: number };
  }>;
  products: CategoryProduct[];
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  parentId?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
}

export const categoryService = {
  async getCategories(params?: {
    search?: string;
    isActive?: boolean;
    parentId?: string;
  }): Promise<CategoryItem[]> {
    const response = await apiClient.get<CategoryItem[]>('/categories', { params });
    return response.data;
  },

  async getTree(): Promise<CategoryTreeItem[]> {
    const response = await apiClient.get<CategoryTreeItem[]>('/categories/tree');
    return response.data;
  },

  async getStats(): Promise<CategoryStats> {
    const response = await apiClient.get<CategoryStats>('/categories/stats');
    return response.data;
  },

  async getCategory(id: string): Promise<CategoryDetail> {
    const response = await apiClient.get<CategoryDetail>(`/categories/${id}`);
    return response.data;
  },

  async createCategory(payload: CreateCategoryPayload): Promise<CategoryItem> {
    const response = await apiClient.post<CategoryItem>('/categories', payload);
    return response.data;
  },

  async updateCategory(id: string, payload: UpdateCategoryPayload): Promise<CategoryItem> {
    const response = await apiClient.patch<CategoryItem>(`/categories/${id}`, payload);
    return response.data;
  },

  async toggleStatus(id: string): Promise<CategoryItem> {
    const response = await apiClient.patch<CategoryItem>(`/categories/${id}/toggle-status`);
    return response.data;
  },

  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  },
};
