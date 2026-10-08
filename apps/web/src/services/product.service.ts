import { apiClient } from '@/lib/api';

export interface ProductItem {
  id: string;
  businessId: string;
  categoryId: string | null;
  supplierId: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStock: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  margin: number;
  marginPercent: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  inventoryValue: number;
  potentialRevenue: number;
  category: {
    id: string;
    name: string;
    parent?: { id: string; name: string } | null;
  } | null;
  supplier: {
    id: string;
    companyName: string;
  } | null;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  totalInventoryValue: number;
  potentialRevenue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface StockMovementItem {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface ProductDetail extends ProductItem {
  stockMovements: StockMovementItem[];
  totalSalesCount: number;
  totalPurchasesCount: number;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  currentStock?: number;
  minStock?: number;
  unit?: string;
  categoryId?: string;
  supplierId?: string;
}

export interface UpdateProductPayload {
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  costPrice?: number;
  sellingPrice?: number;
  currentStock?: number;
  minStock?: number;
  unit?: string;
  categoryId?: string | null;
  supplierId?: string | null;
  isActive?: boolean;
}

export const productService = {
  async getProducts(params?: {
    search?: string;
    categoryId?: string;
    supplierId?: string;
    stockStatus?: string;
    isActive?: boolean;
  }): Promise<ProductItem[]> {
    const response = await apiClient.get<ProductItem[]>('/products', { params });
    return response.data;
  },

  async getStats(): Promise<ProductStats> {
    const response = await apiClient.get<ProductStats>('/products/stats');
    return response.data;
  },

  async getByBarcode(barcode: string): Promise<ProductItem> {
    const response = await apiClient.get<ProductItem>(`/products/barcode/${encodeURIComponent(barcode)}`);
    return response.data;
  },

  async getProduct(id: string): Promise<ProductDetail> {
    const response = await apiClient.get<ProductDetail>(`/products/${id}`);
    return response.data;
  },

  async createProduct(payload: CreateProductPayload): Promise<ProductItem> {
    const response = await apiClient.post<ProductItem>('/products', payload);
    return response.data;
  },

  async updateProduct(id: string, payload: UpdateProductPayload): Promise<ProductItem> {
    const response = await apiClient.patch<ProductItem>(`/products/${id}`, payload);
    return response.data;
  },

  async toggleStatus(id: string): Promise<ProductItem> {
    const response = await apiClient.patch<ProductItem>(`/products/${id}/toggle-status`);
    return response.data;
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },
};
