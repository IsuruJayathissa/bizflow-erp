'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Calendar,
  User,
  FileText,
  Check,
  Sliders,
  ShieldAlert,
  DollarSign,
  History,
  Truck,
  Phone,
  Mail,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  inventoryService,
  InventorySummary,
  StockMovementRecord,
  LowStockAlertItem,
  StockMovementType,
  AdjustmentMode,
} from '@/services/inventory.service';
import { productService, ProductItem } from '@/services/product.service';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function InventoryDashboardPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  // Navigation tab states: 'alerts' | 'ledger' | 'stocktake'
  const [activeTab, setActiveTab] = useState<'alerts' | 'ledger' | 'stocktake'>('alerts');

  // Data states
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [alerts, setAlerts] = useState<LowStockAlertItem[]>([]);
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [totalMovements, setTotalMovements] = useState(0);
  const [movementPage, setMovementPage] = useState(1);
  const [movementTotalPages, setMovementTotalPages] = useState(1);
  const [products, setProducts] = useState<ProductItem[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters for Movement Ledger
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerType, setLedgerType] = useState<StockMovementType | 'ALL'>('ALL');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  // Stocktake quick search
  const [stocktakeSearch, setStocktakeSearch] = useState('');
  const [stocktakeCounts, setStocktakeCounts] = useState<{ [productId: string]: number | '' }>({});
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal: Record Movement / Stock Adjustment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<{
    productId: string;
    type: StockMovementType;
    quantity: number;
    adjustmentMode: AdjustmentMode;
    reason: string;
    referenceId: string;
  }>({
    productId: '',
    type: 'IN',
    quantity: 1,
    adjustmentMode: 'ADD',
    reason: 'Goods Received / Stock In',
    referenceId: '',
  });

  const predefinedReasons = {
    IN: [
      'Goods Received from Supplier',
      'Customer Return to Stock',
      'Found Unrecorded Stock on Shelf',
      'Production / Assembly Completed',
      'Initial Inventory Take',
    ],
    OUT: [
      'Damaged / Broken in Transit or Storage',
      'Expired or Obsolete Write-Off',
      'Internal Business Usage / Demo',
      'Sample Dispatched to Client',
      'Inventory Shrinkage Discrepancy',
    ],
    ADJUSTMENT: [
      'Physical Stock Count Reconciliation',
      'Audit Discrepancy Correction',
      'Barcode / SKU System Reclassification',
      'Opening Balance Correction',
    ],
  };

  // Initial load
  useEffect(() => {
    loadAllData();
  }, []);

  // Fetch movements whenever page, type, search or dates change
  useEffect(() => {
    if (!loading) {
      loadLedger();
    }
  }, [movementPage, ledgerType, ledgerStartDate, ledgerEndDate]);

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [sumRes, alertsRes, prodsRes, movRes] = await Promise.all([
        inventoryService.getSummary(),
        inventoryService.getAlerts(),
        productService.getProducts({ isActive: true }),
        inventoryService.getMovements({ page: 1, limit: 15 }),
      ]);
      setSummary(sumRes);
      setAlerts(alertsRes);
      setProducts(prodsRes);
      setMovements(movRes.items);
      setTotalMovements(movRes.total);
      setMovementTotalPages(movRes.totalPages);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      await loadAllData();
      setSuccessMsg('Inventory status refreshed');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const loadLedger = async () => {
    setLedgerLoading(true);
    try {
      const res = await inventoryService.getMovements({
        page: movementPage,
        limit: 15,
        search: ledgerSearch.trim() || undefined,
        type: ledgerType === 'ALL' ? undefined : ledgerType,
        startDate: ledgerStartDate || undefined,
        endDate: ledgerEndDate || undefined,
      });
      setMovements(res.items);
      setTotalMovements(res.total);
      setMovementTotalPages(res.totalPages);
    } catch (err: any) {
      setErrorMsg('Failed to update ledger records');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleLedgerSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMovementPage(1);
    loadLedger();
  };

  // Selected product object for modal live preview
  const modalSelectedProduct = useMemo(() => {
    return products.find((p) => p.id === modalForm.productId) || null;
  }, [products, modalForm.productId]);

  // Projected new stock calculation for modal live card
  const projectedStock = useMemo(() => {
    if (!modalSelectedProduct) return 0;
    const current = modalSelectedProduct.currentStock;
    const qty = Number(modalForm.quantity) || 0;

    if (modalForm.type === 'IN') {
      return current + qty;
    }
    if (modalForm.type === 'OUT') {
      return Math.max(0, current - qty);
    }
    if (modalForm.type === 'ADJUSTMENT') {
      if (modalForm.adjustmentMode === 'ADD') return current + qty;
      if (modalForm.adjustmentMode === 'DEDUCT') return Math.max(0, current - qty);
      if (modalForm.adjustmentMode === 'RECONCILE') return qty;
    }
    return current;
  }, [modalSelectedProduct, modalForm]);

  // Open modal with preselected product (e.g. from low stock alerts or quick restock)
  const openRestockModal = (alertItem: LowStockAlertItem) => {
    setModalForm({
      productId: alertItem.id,
      type: 'IN',
      quantity: alertItem.shortfall > 0 ? alertItem.shortfall : 10,
      adjustmentMode: 'ADD',
      reason: `Restock order receiving (${alertItem.supplier?.companyName || 'Supplier'})`,
      referenceId: `PO-${Date.now().toString().slice(-6)}`,
    });
    setIsModalOpen(true);
  };

  // Submit stock adjustment / movement
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.productId) {
      setErrorMsg('Please select a product');
      return;
    }
    if (modalForm.quantity <= 0 && modalForm.adjustmentMode !== 'RECONCILE') {
      setErrorMsg('Quantity must be greater than 0');
      return;
    }
    if (modalForm.type === 'OUT' && modalSelectedProduct && modalForm.quantity > modalSelectedProduct.currentStock) {
      setErrorMsg(`Cannot deduct ${modalForm.quantity} units. Current stock is only ${modalSelectedProduct.currentStock}.`);
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    try {
      await inventoryService.recordMovement({
        productId: modalForm.productId,
        type: modalForm.type,
        quantity: Number(modalForm.quantity),
        adjustmentMode: modalForm.type === 'ADJUSTMENT' ? modalForm.adjustmentMode : undefined,
        reason: modalForm.reason.trim(),
        referenceId: modalForm.referenceId.trim() || undefined,
      });

      setSuccessMsg(`Successfully recorded stock movement for ${modalSelectedProduct?.name || 'Product'}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setIsModalOpen(false);

      // Refresh data
      loadAllData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to record movement');
    } finally {
      setActionLoading(false);
    }
  };

  // Stocktake physical count reconciliation handler
  const handlePhysicalCountReconcile = async (product: ProductItem) => {
    const entered = stocktakeCounts[product.id];
    if (entered === undefined || entered === '' || Number(entered) < 0) {
      setErrorMsg(`Please enter a valid physical count for ${product.name}`);
      return;
    }

    const targetStock = Number(entered);
    const delta = targetStock - product.currentStock;

    if (delta === 0) {
      setSuccessMsg(`Physical count matches system stock (${product.currentStock} units). No adjustment needed.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      return;
    }

    setReconcilingId(product.id);
    setErrorMsg(null);
    try {
      await inventoryService.recordMovement({
        productId: product.id,
        type: 'ADJUSTMENT',
        quantity: targetStock,
        adjustmentMode: 'RECONCILE',
        reason: `Physical Stocktake Count: shelf count was ${targetStock} (Delta: ${delta > 0 ? '+' : ''}${delta})`,
        referenceId: `STOCKTAKE-${new Date().toISOString().slice(0, 10)}`,
      });

      setSuccessMsg(`Reconciled ${product.name}: stock updated from ${product.currentStock} to ${targetStock} units`);
      setTimeout(() => setSuccessMsg(null), 4000);

      // Clear local input
      setStocktakeCounts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });

      loadAllData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to reconcile stock count');
    } finally {
      setReconcilingId(null);
    }
  };

  // Filtered products for stocktake tab
  const filteredStocktakeProducts = useMemo(() => {
    if (!stocktakeSearch.trim()) return products;
    const q = stocktakeSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)),
    );
  }, [products, stocktakeSearch]);

  // Export movement ledger to CSV
  const exportLedgerToCSV = () => {
    if (movements.length === 0) {
      setErrorMsg('No movement records to export');
      return;
    }

    const headers = [
      'Movement ID',
      'Date & Time',
      'Product Name',
      'SKU',
      'Type',
      'Quantity',
      'Unit',
      'Audit Reason',
      'Reference ID',
      'Staff Member',
    ];

    const rows = movements.map((m) => [
      `"${m.id}"`,
      `"${new Date(m.createdAt).toLocaleString()}"`,
      `"${m.product?.name?.replace(/"/g, '""') || ''}"`,
      `"${m.product?.sku || ''}"`,
      `"${m.type}"`,
      m.quantity,
      `"${m.product?.unit || 'units'}"`,
      `"${m.reason?.replace(/"/g, '""') || ''}"`,
      `"${m.referenceId || ''}"`,
      `"${m.createdBy ? `${m.createdBy.firstName} ${m.createdBy.lastName}` : 'System'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BizFlow_Stock_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessMsg('Stock movement audit ledger exported to CSV');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-emerald-400 text-sm shadow-xl shadow-emerald-500/5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between text-rose-400 text-sm shadow-xl shadow-rose-500/5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <Boxes className="w-3.5 h-3.5" />
            <span>Inventory Operations & Warehouse Ledger</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Inventory & Stock Control
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Live warehouse stock monitoring, threshold reorder alerts, and tamper-evident audit movement ledger.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition-all hover:bg-slate-800 disabled:opacity-50"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              if (products.length > 0 && !modalForm.productId) {
                setModalForm((prev) => ({ ...prev, productId: products[0].id }));
              }
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Movement / Adjust</span>
          </button>
        </div>
      </div>

      {/* 5 High-Impact Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Stock Units */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Stock on Hand</span>
            <Boxes className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {summary ? summary.totalStockUnits.toLocaleString() : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Across {summary?.totalProducts || 0} active SKUs</span>
          </div>
        </div>

        {/* Valuation (Cost Value) */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Inventory Valuation</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {summary ? formatCurrency(summary.totalValuation, currency) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>At purchase cost basis</span>
          </div>
        </div>

        {/* Potential Retail Value */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Potential Revenue</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {summary ? formatCurrency(summary.potentialRevenue, currency) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Retail value at selling price</span>
          </div>
        </div>

        {/* Low Stock Reorder Alerts */}
        <div
          onClick={() => setActiveTab('alerts')}
          className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-amber-500/40 rounded-2xl relative overflow-hidden group cursor-pointer transition-all"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/15 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Low Stock Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 tracking-tight flex items-center gap-2">
            <span>{summary ? summary.lowStockCount : '—'}</span>
            {summary && summary.lowStockCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                Action Req.
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>At or below min threshold</span>
          </div>
        </div>

        {/* Stockout / Zero Stock Count */}
        <div
          onClick={() => setActiveTab('alerts')}
          className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-rose-500/40 rounded-2xl relative overflow-hidden group cursor-pointer transition-all col-span-2 md:col-span-1"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/15 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Out of Stock</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 tracking-tight flex items-center gap-2">
            <span>{summary ? summary.outOfStockCount : '—'}</span>
            {summary && summary.outOfStockCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">
                Stockout
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Zero inventory items</span>
          </div>
        </div>
      </div>

      {/* 7-Day Activity Velocity Bar */}
      {summary && (
        <div className="px-5 py-3 bg-slate-900/40 backdrop-blur-lg border border-slate-800/70 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-400">
            <History className="w-4 h-4 text-indigo-400" />
            <span className="font-medium text-slate-300">7-Day Warehouse Velocity:</span>
            <span>{summary.recentActivity.totalMovementsCount} logged movements</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>+{summary.recentActivity.unitsIn7Days} Units IN</span>
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>-{summary.recentActivity.unitsOut7Days} Units OUT</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <Sliders className="w-3.5 h-3.5" />
              <span>±{summary.recentActivity.unitsAdjusted7Days} Units Adjusted</span>
            </span>
          </div>
        </div>
      )}

      {/* Tab Navigation Selector */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
              activeTab === 'alerts'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Threshold Reorder Alerts</span>
            {alerts.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {alerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ledger'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock Movement Audit Ledger</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
              {totalMovements}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('stocktake')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'stocktake'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Physical Stocktake Count</span>
          </button>
        </div>

        {activeTab === 'ledger' && (
          <button
            onClick={exportLedgerToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: THRESHOLD REORDER ALERTS                                            */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Active Low Stock & Stockout Warnings</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                  {alerts.length} items requiring replenishment
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically triggered when current stock falls to or below minimum reorder threshold (`minStock`).
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Checking inventory thresholds...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">All Stock Levels Healthy!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No products are currently at or below their reorder threshold. Your warehouse inventory is fully stocked.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map((item) => {
                const isOutOfStock = item.status === 'OUT_OF_STOCK';
                const stockRatio = item.minStock > 0 ? (item.currentStock / item.minStock) * 100 : 0;

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between backdrop-blur-xl ${
                      isOutOfStock
                        ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60 shadow-lg shadow-rose-950/30'
                        : 'bg-slate-900/60 border-amber-500/30 hover:border-amber-500/60 shadow-lg shadow-amber-950/20'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                isOutOfStock
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {isOutOfStock ? 'Critical Stockout' : 'Low Stock Alert'}
                            </span>
                            {item.category && (
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                                {item.category.name}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-white line-clamp-1">{item.name}</h3>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">SKU: {item.sku}</div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`text-lg font-black tracking-tight ${
                              isOutOfStock ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          >
                            {item.currentStock}{' '}
                            <span className="text-xs font-medium text-slate-400">{item.unit}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Min: {item.minStock}</div>
                        </div>
                      </div>

                      {/* Stock Level Progress Bar */}
                      <div className="space-y-1 mb-4">
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                          <span>Capacity / Threshold</span>
                          <span>{Math.round(stockRatio)}% of min</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOutOfStock ? 'w-0' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(isOutOfStock ? 0 : 5, stockRatio))}%` }}
                          />
                        </div>
                      </div>

                      {/* Replenishment calculation */}
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-4 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Required Replenishment:</span>
                          <span className="font-bold text-white">
                            +{item.shortfall} {item.unit}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Est. Reorder Cost:</span>
                          <span className="font-semibold text-emerald-400">
                            {formatCurrency(item.estimatedReorderCost, currency)}
                          </span>
                        </div>
                      </div>

                      {/* Supplier Contact Card */}
                      {item.supplier ? (
                        <div className="pt-2 border-t border-slate-800/80 mb-4 text-xs">
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                            <Truck className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-semibold text-slate-300">{item.supplier.companyName}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            {item.supplier.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{item.supplier.phone}</span>
                              </span>
                            )}
                            {item.supplier.email && (
                              <span className="flex items-center gap-1 truncate max-w-[150px]">
                                <Mail className="w-3 h-3 text-slate-500" />
                                <span className="truncate">{item.supplier.email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic mb-4">No primary supplier linked</div>
                      )}
                    </div>

                    {/* Quick Restock Action Button */}
                    <button
                      onClick={() => openRestockModal(item)}
                      className="w-full py-2.5 px-3 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Quick Restock (+{item.shortfall || 10} {item.unit})</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STOCK MOVEMENT AUDIT LEDGER                                         */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            <form onSubmit={handleLedgerSearchSubmit} className="flex items-center gap-2 w-full md:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search product, SKU, barcode, reason, ref..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              {/* Type Filter */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs font-semibold">
                {(['ALL', 'IN', 'OUT', 'ADJUSTMENT'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setLedgerType(t);
                      setMovementPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      ledgerType === t
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Date Filters */}
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="date"
                  value={ledgerStartDate}
                  onChange={(e) => {
                    setLedgerStartDate(e.target.value);
                    setMovementPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-indigo-500 text-xs"
                />
                <span className="text-slate-500 font-medium">to</span>
                <input
                  type="date"
                  value={ledgerEndDate}
                  onChange={(e) => {
                    setLedgerEndDate(e.target.value);
                    setMovementPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            {ledgerLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-xs font-medium">Loading ledger transactions...</p>
              </div>
            ) : movements.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <History className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No stock movements found</p>
                <p className="text-xs text-slate-500">
                  Try adjusting your search criteria or record a new stock movement.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Date / Time</th>
                      <th className="py-3.5 px-4">Product / SKU</th>
                      <th className="py-3.5 px-4">Movement Type</th>
                      <th className="py-3.5 px-4 text-right">Quantity</th>
                      <th className="py-3.5 px-4">Reason / Notes</th>
                      <th className="py-3.5 px-4">Reference</th>
                      <th className="py-3.5 px-4">Staff Member</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                    {movements.map((m) => {
                      const isStockIn = m.type === 'IN';
                      const isStockOut = m.type === 'OUT';
                      const isAdjustment = m.type === 'ADJUSTMENT';

                      return (
                        <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                            <div>{formatDate(m.createdAt)}</div>
                            <div className="text-[10px] text-slate-500">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Product */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white line-clamp-1">{m.product?.name || 'Unknown'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{m.product?.sku || 'N/A'}</div>
                          </td>

                          {/* Type Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                isStockIn
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : isStockOut
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {isStockIn && <ArrowDownRight className="w-3 h-3" />}
                              {isStockOut && <ArrowUpRight className="w-3 h-3" />}
                              {isAdjustment && <Sliders className="w-3 h-3" />}
                              <span>{m.type}</span>
                            </span>
                          </td>

                          {/* Quantity */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span
                              className={`font-mono font-bold text-sm ${
                                isStockIn
                                  ? 'text-emerald-400'
                                  : isStockOut
                                  ? 'text-rose-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {isStockIn ? `+${m.quantity}` : isStockOut ? `-${m.quantity}` : `±${m.quantity}`}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-1">
                              {m.product?.unit || 'units'}
                            </span>
                          </td>

                          {/* Reason */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-slate-300 text-xs line-clamp-2">{m.reason}</p>
                          </td>

                          {/* Reference */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                            {m.referenceId ? (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-400">
                                {m.referenceId}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Staff */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-xs">
                            {m.createdBy ? (
                              <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-slate-500" />
                                <span>{m.createdBy.firstName} {m.createdBy.lastName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">System Admin</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {movementTotalPages > 1 && (
              <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Showing page <span className="font-semibold text-white">{movementPage}</span> of{' '}
                  <span className="font-semibold text-white">{movementTotalPages}</span> ({totalMovements} records)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={movementPage <= 1}
                    onClick={() => setMovementPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={movementPage >= movementTotalPages}
                    onClick={() => setMovementPage((p) => Math.min(movementTotalPages, p + 1))}
                    className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PHYSICAL STOCKTAKE COUNT & RECONCILIATION                           */}
      {/* ========================================================================= */}
      {activeTab === 'stocktake' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-indigo-400" />
                <span>Physical Warehouse Stocktake & Shelf Auditing</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Compare physical shelf count against system inventory. Discrepancies update stock automatically with an audit log.
              </p>
            </div>

            <div className="w-full md:w-72 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by product, SKU, or barcode..."
                value={stocktakeSearch}
                onChange={(e) => setStocktakeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Product Title</th>
                    <th className="py-3.5 px-4">SKU / Barcode</th>
                    <th className="py-3.5 px-4 text-center">System Stock</th>
                    <th className="py-3.5 px-4 text-center">Physical Count (Shelf)</th>
                    <th className="py-3.5 px-4 text-center">Variance / Delta</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                  {filteredStocktakeProducts.map((p) => {
                    const enteredCount = stocktakeCounts[p.id];
                    const hasEntered = enteredCount !== undefined && enteredCount !== '';
                    const variance = hasEntered ? Number(enteredCount) - p.currentStock : null;
                    const isReconciling = reconcilingId === p.id;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{p.name}</div>
                          <div className="text-[10px] text-slate-500">Unit: {p.unit}</div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          <div>{p.sku}</div>
                          {p.barcode && <div className="text-[10px] text-slate-500">{p.barcode}</div>}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold font-mono text-sm text-white">
                            {p.currentStock}
                          </span>
                        </td>

                        {/* Physical Count Input */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder={p.currentStock.toString()}
                            value={enteredCount !== undefined ? enteredCount : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10));
                              setStocktakeCounts((prev) => ({
                                ...prev,
                                [p.id]: val,
                              }));
                            }}
                            className="w-24 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono font-bold text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                        </td>

                        {/* Variance Delta Indicator */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          {variance === null ? (
                            <span className="text-slate-600 text-xs">Uncounted</span>
                          ) : variance === 0 ? (
                            <span className="text-emerald-400 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                              Matches (0)
                            </span>
                          ) : variance > 0 ? (
                            <span className="text-emerald-400 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                              +{variance} Surplus
                            </span>
                          ) : (
                            <span className="text-rose-400 text-xs px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                              {variance} Shortage
                            </span>
                          )}
                        </td>

                        {/* Action Button */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            disabled={!hasEntered || isReconciling}
                            onClick={() => handlePhysicalCountReconcile(p)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md transition-all inline-flex items-center gap-1.5"
                          >
                            {isReconciling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Reconcile</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD STOCK MOVEMENT / ADJUSTMENT                                  */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Stock Movement</h3>
                  <p className="text-xs text-slate-400">Update warehouse inventory and create a tamper-evident audit entry.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {/* Product Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Product *
                </label>
                <select
                  required
                  value={modalForm.productId}
                  onChange={(e) => setModalForm({ ...modalForm, productId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>Choose a product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku}) — Current Stock: {p.currentStock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Movement Type Radio / Segmented Button */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Movement Classification *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setModalForm({
                        ...modalForm,
                        type: 'IN',
                        reason: predefinedReasons.IN[0],
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      modalForm.type === 'IN'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Stock IN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setModalForm({
                        ...modalForm,
                        type: 'OUT',
                        reason: predefinedReasons.OUT[0],
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      modalForm.type === 'OUT'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Stock OUT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setModalForm({
                        ...modalForm,
                        type: 'ADJUSTMENT',
                        reason: predefinedReasons.ADJUSTMENT[0],
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      modalForm.type === 'ADJUSTMENT'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Adjustment</span>
                  </button>
                </div>
              </div>

              {/* Adjustment Mode sub-option (if ADJUSTMENT selected) */}
              {modalForm.type === 'ADJUSTMENT' && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="block text-[11px] font-semibold text-slate-400">Adjustment Mode:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ADD', 'DEDUCT', 'RECONCILE'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setModalForm({ ...modalForm, adjustmentMode: mode })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all ${
                          modalForm.adjustmentMode === mode
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {mode === 'ADD' ? '+ Add' : mode === 'DEDUCT' ? '- Deduct' : 'Set Count'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Input & Live Preview */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {modalForm.type === 'ADJUSTMENT' && modalForm.adjustmentMode === 'RECONCILE'
                      ? 'New Target Count *'
                      : 'Quantity *'}
                  </label>
                  <input
                    required
                    type="number"
                    min={modalForm.adjustmentMode === 'RECONCILE' ? 0 : 1}
                    value={modalForm.quantity}
                    onChange={(e) =>
                      setModalForm({
                        ...modalForm,
                        quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Stock Preview Pill */}
                {modalSelectedProduct && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                    <div className="text-[11px] text-slate-400">Current Stock:</div>
                    <div className="font-mono font-bold text-white text-sm">
                      {modalSelectedProduct.currentStock} {modalSelectedProduct.unit}
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Projected:</span>
                      <span className="font-mono font-bold text-indigo-400">
                        {projectedStock} {modalSelectedProduct.unit}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Predefined Reasons & Custom Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Audit Reason / Justification *
                </label>
                <select
                  value={modalForm.reason}
                  onChange={(e) => setModalForm({ ...modalForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 mb-2"
                >
                  {predefinedReasons[modalForm.type].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="Custom Note">Other / Custom Justification...</option>
                </select>

                <input
                  type="text"
                  placeholder="Enter detailed audit reason or justification..."
                  value={modalForm.reason}
                  onChange={(e) => setModalForm({ ...modalForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Reference ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Document / Reference ID <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-2026-081, COUNT-SHEET-4, RET-1092"
                  value={modalForm.referenceId}
                  onChange={(e) => setModalForm({ ...modalForm, referenceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Commit Stock Movement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
