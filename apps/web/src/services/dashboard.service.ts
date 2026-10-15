import { apiClient } from '@/lib/api';

export interface DashboardKpi {
  todaySalesRevenue: number;
  todaySalesCount: number;
  todaySalesGrowth: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  monthlyRevenueGrowth: number;
  todayExpenses: number;
  thisMonthExpenses: number;
  lastMonthExpenses: number;
  thisMonthGrossProfit: number;
  thisMonthNetProfit: number;
  netProfitMargin: number;
  totalInventoryValue: number;
  lowStockCount: number;
  totalCustomers: number;
  totalSuppliers: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesBalance: number;
}

export interface RevenueExpenseTrendPoint {
  date: string;
  rawDate: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  salesCount: number;
}

export interface MonthlyComparisonPoint {
  month: string;
  year: number;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface CategorySalesPoint {
  name: string;
  revenue: number;
  itemsCount: number;
  percentage: number;
}

export interface PaymentMethodDistributionPoint {
  name: string;
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface DashboardCharts {
  revenueExpenseTrends: RevenueExpenseTrendPoint[];
  monthlyComparison: MonthlyComparisonPoint[];
  salesByCategory: CategorySalesPoint[];
  paymentMethodsDistribution: PaymentMethodDistributionPoint[];
}

export interface RecentSaleItem {
  id: string;
  saleNumber: string;
  customerName: string;
  total: number;
  itemsCount: number;
  status: string;
  saleDate: string;
  createdAt: string;
}

export interface LowStockProductItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
}

export interface RecentExpenseItem {
  id: string;
  title: string;
  categoryName: string;
  amount: number;
  paymentMethod: string;
  expenseDate: string;
  recordedBy?: string | null;
}

export interface RecentInvoiceItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: string;
  issueDate: string;
}

export interface DashboardOverview {
  kpi: DashboardKpi;
  charts: DashboardCharts;
  lists: {
    recentSales: RecentSaleItem[];
    lowStockProducts: LowStockProductItem[];
    recentExpenses: RecentExpenseItem[];
    recentInvoices: RecentInvoiceItem[];
  };
}

export interface QueryDashboardParams {
  period?: '7d' | '30d' | '90d' | 'year';
}

export const dashboardService = {
  async getOverview(params?: QueryDashboardParams): Promise<DashboardOverview> {
    const res = await apiClient.get<DashboardOverview>('/dashboard/overview', {
      params,
    });
    return res.data;
  },
};
