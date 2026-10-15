import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(businessId: string, query?: QueryDashboardDto) {
    const period = query?.period || '30d';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);

    // Determine period start date
    let daysBack = 30;
    if (period === '7d') daysBack = 7;
    else if (period === '90d') daysBack = 90;
    else if (period === 'year') daysBack = 365;

    const periodStartDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    periodStartDate.setHours(0, 0, 0, 0);

    // 1. Fetch sales for analytics (last 6 months to cover period & monthly trends)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

    const [
      sales,
      expenses,
      products,
      customersCount,
      suppliersCount,
      unpaidInvoices,
      recentSales,
      recentExpenses,
      recentInvoices,
      allPayments,
    ] = await Promise.all([
      // Sales since 6 months ago
      this.prisma.sale.findMany({
        where: {
          businessId,
          saleDate: { gte: sixMonthsAgo },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  costPrice: true,
                  categoryId: true,
                  category: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { saleDate: 'asc' },
      }),

      // Expenses since 6 months ago
      this.prisma.expense.findMany({
        where: {
          businessId,
          expenseDate: { gte: sixMonthsAgo },
        },
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy: { expenseDate: 'asc' },
      }),

      // Products (for inventory valuation & low-stock counts)
      this.prisma.product.findMany({
        where: { businessId, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
          costPrice: true,
          sellingPrice: true,
          currentStock: true,
          minStock: true,
          category: { select: { name: true } },
        },
        orderBy: { currentStock: 'asc' },
      }),

      // Total customers count
      this.prisma.customer.count({
        where: { businessId, isActive: true },
      }),

      // Total suppliers count
      this.prisma.supplier.count({
        where: { businessId, isActive: true },
      }),

      // Unpaid or partially paid invoices
      this.prisma.invoice.findMany({
        where: {
          businessId,
          status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        },
        include: {
          payments: { select: { amount: true } },
        },
      }),

      // Recent 5 sales
      this.prisma.sale.findMany({
        where: { businessId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          items: {
            select: {
              id: true,
              quantity: true,
              product: { select: { name: true, sku: true } },
            },
          },
        },
      }),

      // Recent 5 expenses
      this.prisma.expense.findMany({
        where: { businessId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          recordedBy: { select: { firstName: true, lastName: true } },
        },
      }),

      // Recent 5 invoices
      this.prisma.invoice.findMany({
        where: { businessId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          sale: {
            select: {
              customer: { select: { name: true } },
            },
          },
        },
      }),

      // Payments for method distribution
      this.prisma.payment.findMany({
        where: {
          businessId,
          createdAt: { gte: periodStartDate },
        },
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          paymentDate: true,
        },
      }),
    ]);

    // ==========================================
    // 2. METRICS & KPI CALCULATIONS
    // ==========================================

    let todaySalesRevenue = 0;
    let todaySalesCount = 0;
    let yesterdaySalesRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let thisMonthCOGS = 0;

    let todayExpenses = 0;
    let thisMonthExpenses = 0;
    let lastMonthExpenses = 0;

    // Process Sales
    for (const sale of sales) {
      const sDate = new Date(sale.saleDate);
      const total = Number(sale.total) || 0;

      // Today
      if (sDate >= todayStart) {
        todaySalesRevenue += total;
        todaySalesCount += 1;
      }
      // Yesterday
      else if (sDate >= yesterdayStart && sDate < todayStart) {
        yesterdaySalesRevenue += total;
      }

      // This Month
      if (sDate >= thisMonthStart) {
        thisMonthRevenue += total;

        // Calculate Cost of Goods Sold (COGS)
        for (const item of sale.items) {
          const cost = Number(item.product?.costPrice) || 0;
          thisMonthCOGS += (Number(item.quantity) || 0) * cost;
        }
      }
      // Last Month
      else if (sDate >= lastMonthStart && sDate < thisMonthStart) {
        lastMonthRevenue += total;
      }
    }

    // Process Expenses
    for (const exp of expenses) {
      const eDate = new Date(exp.expenseDate);
      const amount = Number(exp.amount) || 0;

      if (eDate >= todayStart) {
        todayExpenses += amount;
      }
      if (eDate >= thisMonthStart) {
        thisMonthExpenses += amount;
      } else if (eDate >= lastMonthStart && eDate < thisMonthStart) {
        lastMonthExpenses += amount;
      }
    }

    // Growth rates
    const todaySalesGrowth =
      yesterdaySalesRevenue > 0
        ? ((todaySalesRevenue - yesterdaySalesRevenue) / yesterdaySalesRevenue) * 100
        : todaySalesRevenue > 0
          ? 100
          : 0;

    const monthlyRevenueGrowth =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : thisMonthRevenue > 0
          ? 100
          : 0;

    // Profit calculations
    const thisMonthGrossProfit = thisMonthRevenue - thisMonthCOGS;
    const thisMonthNetProfit = thisMonthGrossProfit - thisMonthExpenses;
    const netProfitMargin =
      thisMonthRevenue > 0 ? (thisMonthNetProfit / thisMonthRevenue) * 100 : 0;

    // Inventory metrics
    let totalInventoryValue = 0;
    let lowStockCount = 0;
    const lowStockProductsList: any[] = [];

    for (const prod of products) {
      const stock = Number(prod.currentStock) || 0;
      const cost = Number(prod.costPrice) || 0;
      totalInventoryValue += stock * cost;

      if (stock <= prod.minStock) {
        lowStockCount++;
        if (lowStockProductsList.length < 5) {
          lowStockProductsList.push({
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            category: prod.category?.name || 'General',
            currentStock: stock,
            minStock: prod.minStock,
            unit: prod.unit,
          });
        }
      }
    }

    // Receivables (Unpaid invoices balance)
    let unpaidInvoicesBalance = 0;
    for (const inv of unpaidInvoices) {
      const invTotal = Number(inv.total) || 0;
      const paid = inv.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      unpaidInvoicesBalance += Math.max(0, invTotal - paid);
    }

    // ==========================================
    // 3. PERIOD TRENDS (Daily timeline)
    // ==========================================
    // Generate buckets for each day in `periodStartDate` -> `now`
    const daysCount = Math.min(daysBack, 90);
    const trendMap = new Map<
      string,
      {
        date: string;
        rawDate: string;
        revenue: number;
        expenses: number;
        netProfit: number;
        salesCount: number;
      }
    >();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;
      trendMap.set(key, {
        date: label,
        rawDate: key,
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        salesCount: 0,
      });
    }

    // Populate sales into trend buckets
    for (const sale of sales) {
      const sDate = new Date(sale.saleDate);
      const key = `${sDate.getFullYear()}-${(sDate.getMonth() + 1).toString().padStart(2, '0')}-${sDate.getDate().toString().padStart(2, '0')}`;
      const bucket = trendMap.get(key);
      if (bucket) {
        const total = Number(sale.total) || 0;
        bucket.revenue += total;
        bucket.salesCount += 1;
        bucket.netProfit += total;
      }
    }

    // Populate expenses into trend buckets
    for (const exp of expenses) {
      const eDate = new Date(exp.expenseDate);
      const key = `${eDate.getFullYear()}-${(eDate.getMonth() + 1).toString().padStart(2, '0')}-${eDate.getDate().toString().padStart(2, '0')}`;
      const bucket = trendMap.get(key);
      if (bucket) {
        const amount = Number(exp.amount) || 0;
        bucket.expenses += amount;
        bucket.netProfit -= amount;
      }
    }

    const revenueExpenseTrends = Array.from(trendMap.values());

    // ==========================================
    // 4. MONTHLY COMPARISON (Last 6 Months)
    // ==========================================
    const monthlyComparison: {
      month: string;
      year: number;
      revenue: number;
      expenses: number;
      netProfit: number;
    }[] = [];

    for (let m = 5; m >= 0; m--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const monthLabel = monthNames[targetMonth];

      let mRevenue = 0;
      let mExpenses = 0;

      for (const sale of sales) {
        const s = new Date(sale.saleDate);
        if (s.getFullYear() === targetYear && s.getMonth() === targetMonth) {
          mRevenue += Number(sale.total) || 0;
        }
      }

      for (const exp of expenses) {
        const e = new Date(exp.expenseDate);
        if (e.getFullYear() === targetYear && e.getMonth() === targetMonth) {
          mExpenses += Number(exp.amount) || 0;
        }
      }

      monthlyComparison.push({
        month: monthLabel,
        year: targetYear,
        revenue: Math.round(mRevenue),
        expenses: Math.round(mExpenses),
        netProfit: Math.round(mRevenue - mExpenses),
      });
    }

    // ==========================================
    // 5. SALES BY CATEGORY BREAKDOWN
    // ==========================================
    const categorySalesMap = new Map<string, { name: string; revenue: number; itemsCount: number }>();
    let totalCategorizedRevenue = 0;

    for (const sale of sales) {
      for (const item of sale.items) {
        const catName = item.product?.category?.name || 'Uncategorized';
        const itemTotal = Number(item.total) || (Number(item.quantity) * Number(item.unitPrice)) || 0;
        totalCategorizedRevenue += itemTotal;

        const existing = categorySalesMap.get(catName) || { name: catName, revenue: 0, itemsCount: 0 };
        existing.revenue += itemTotal;
        existing.itemsCount += Number(item.quantity) || 0;
        categorySalesMap.set(catName, existing);
      }
    }

    const salesByCategory = Array.from(categorySalesMap.values())
      .map((cat) => ({
        name: cat.name,
        revenue: Math.round(cat.revenue),
        itemsCount: cat.itemsCount,
        percentage:
          totalCategorizedRevenue > 0
            ? Math.round((cat.revenue / totalCategorizedRevenue) * 100 * 10) / 10
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // ==========================================
    // 6. PAYMENT METHODS DISTRIBUTION
    // ==========================================
    const paymentMethodsSummary = {
      CASH: { count: 0, amount: 0 },
      CARD: { count: 0, amount: 0 },
      BANK_TRANSFER: { count: 0, amount: 0 },
      OTHER: { count: 0, amount: 0 },
    };

    let totalPaymentAmount = 0;
    for (const p of allPayments) {
      const amt = Number(p.amount) || 0;
      totalPaymentAmount += amt;
      const method = (p.paymentMethod || 'OTHER') as keyof typeof paymentMethodsSummary;
      if (paymentMethodsSummary[method]) {
        paymentMethodsSummary[method].count += 1;
        paymentMethodsSummary[method].amount += amt;
      } else {
        paymentMethodsSummary.OTHER.count += 1;
        paymentMethodsSummary.OTHER.amount += amt;
      }
    }

    const paymentMethodsDistribution = [
      {
        name: 'Cash',
        method: 'CASH',
        amount: Math.round(paymentMethodsSummary.CASH.amount),
        count: paymentMethodsSummary.CASH.count,
        percentage:
          totalPaymentAmount > 0
            ? Math.round((paymentMethodsSummary.CASH.amount / totalPaymentAmount) * 100)
            : 0,
      },
      {
        name: 'Card',
        method: 'CARD',
        amount: Math.round(paymentMethodsSummary.CARD.amount),
        count: paymentMethodsSummary.CARD.count,
        percentage:
          totalPaymentAmount > 0
            ? Math.round((paymentMethodsSummary.CARD.amount / totalPaymentAmount) * 100)
            : 0,
      },
      {
        name: 'Bank Transfer',
        method: 'BANK_TRANSFER',
        amount: Math.round(paymentMethodsSummary.BANK_TRANSFER.amount),
        count: paymentMethodsSummary.BANK_TRANSFER.count,
        percentage:
          totalPaymentAmount > 0
            ? Math.round((paymentMethodsSummary.BANK_TRANSFER.amount / totalPaymentAmount) * 100)
            : 0,
      },
      {
        name: 'Other',
        method: 'OTHER',
        amount: Math.round(paymentMethodsSummary.OTHER.amount),
        count: paymentMethodsSummary.OTHER.count,
        percentage:
          totalPaymentAmount > 0
            ? Math.round((paymentMethodsSummary.OTHER.amount / totalPaymentAmount) * 100)
            : 0,
      },
    ];

    // ==========================================
    // 7. FORMAT RECENT ACTIVITY LISTS
    // ==========================================
    const formattedRecentSales = recentSales.map((s) => ({
      id: s.id,
      saleNumber: s.saleNumber,
      customerName: s.customer?.name || 'Walk-in Customer',
      total: s.total,
      itemsCount: s.items?.reduce((acc, i) => acc + i.quantity, 0) || 0,
      status: s.status,
      saleDate: s.saleDate,
      createdAt: s.createdAt,
    }));

    const formattedRecentExpenses = recentExpenses.map((e) => ({
      id: e.id,
      title: e.title,
      categoryName: e.category?.name || 'General',
      amount: e.amount,
      paymentMethod: e.paymentMethod,
      expenseDate: e.expenseDate,
      recordedBy: e.recordedBy ? `${e.recordedBy.firstName} ${e.recordedBy.lastName}` : null,
    }));

    const formattedRecentInvoices = recentInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.sale?.customer?.name || 'Walk-in Customer',
      total: inv.total,
      status: inv.status,
      issueDate: inv.issueDate,
    }));

    return {
      kpi: {
        todaySalesRevenue: Math.round(todaySalesRevenue),
        todaySalesCount,
        todaySalesGrowth: Math.round(todaySalesGrowth * 10) / 10,
        thisMonthRevenue: Math.round(thisMonthRevenue),
        lastMonthRevenue: Math.round(lastMonthRevenue),
        monthlyRevenueGrowth: Math.round(monthlyRevenueGrowth * 10) / 10,
        todayExpenses: Math.round(todayExpenses),
        thisMonthExpenses: Math.round(thisMonthExpenses),
        lastMonthExpenses: Math.round(lastMonthExpenses),
        thisMonthGrossProfit: Math.round(thisMonthGrossProfit),
        thisMonthNetProfit: Math.round(thisMonthNetProfit),
        netProfitMargin: Math.round(netProfitMargin * 10) / 10,
        totalInventoryValue: Math.round(totalInventoryValue),
        lowStockCount,
        totalCustomers: customersCount,
        totalSuppliers: suppliersCount,
        unpaidInvoicesCount: unpaidInvoices.length,
        unpaidInvoicesBalance: Math.round(unpaidInvoicesBalance),
      },
      charts: {
        revenueExpenseTrends,
        monthlyComparison,
        salesByCategory,
        paymentMethodsDistribution,
      },
      lists: {
        recentSales: formattedRecentSales,
        lowStockProducts: lowStockProductsList,
        recentExpenses: formattedRecentExpenses,
        recentInvoices: formattedRecentInvoices,
      },
    };
  }
}
