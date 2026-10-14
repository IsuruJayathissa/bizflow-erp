import { apiClient } from '@/lib/api';

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';
export type AdjustmentMode = 'ADD' | 'DEDUCT' | 'RECONCILE';

export interface MovementProductInfo {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStock: number;
  category?: { id: string; name: string } | null;
}

export interface StockMovementRecord {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  referenceId: string | null;
  createdAt: string;
  product: MovementProductInfo;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface MovementsResponse {
  items: StockMovementRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LowStockAlertItem {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  costPrice: number;
  sellingPrice: number;
  shortfall: number;
  estimatedReorderCost: number;
  status: 'LOW_STOCK' | 'OUT_OF_STOCK';
  category: { id: string; name: string } | null;
  supplier: {
    id: string;
    companyName: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  updatedAt: string;
}

export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number;
  totalValuation: number;
  potentialRevenue: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentActivity: {
    totalMovementsCount: number;
    unitsIn7Days: number;
    unitsOut7Days: number;
    unitsAdjusted7Days: number;
  };
}

export interface CreateMovementPayload {
  productId: string;
  type: StockMovementType;
  quantity: number;
  adjustmentMode?: AdjustmentMode;
  reason: string;
  referenceId?: string;
}

export interface AdjustmentResponse {
  movement: StockMovementRecord;
  previousStock: number;
  newStock: number;
  product: MovementProductInfo;
}

export const inventoryService = {
  async getSummary(): Promise<InventorySummary> {
    const response = await apiClient.get<InventorySummary>('/inventory/summary');
    return response.data;
  },

  async getMovements(params?: {
    search?: string;
    productId?: string;
    type?: StockMovementType;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<MovementsResponse> {
    const response = await apiClient.get<MovementsResponse>('/inventory/movements', {
      params,
    });
    return response.data;
  },

  async getAlerts(): Promise<LowStockAlertItem[]> {
    const response = await apiClient.get<LowStockAlertItem[]>('/inventory/alerts');
    return response.data;
  },

  async recordMovement(payload: CreateMovementPayload): Promise<AdjustmentResponse> {
    const response = await apiClient.post<AdjustmentResponse>(
      '/inventory/adjust',
      payload,
    );
    return response.data;
  },
};
