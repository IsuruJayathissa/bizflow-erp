'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Package,
  Calendar,
  DollarSign,
  AlertCircle,
  Eye,
  RefreshCw,
  X,
  Loader2,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Printer,
  Ban,
  ArrowDownRight,
  Boxes,
  Building2,
  FileText,
  User,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  purchaseService,
  PurchaseRecord,
  PurchaseStats,
  PurchaseStatus,
  CreatePurchasePayload,
} from '@/services/purchase.service';
import { supplierService, SupplierItem } from '@/services/supplier.service';
import { productService, ProductItem } from '@/services/product.service';
import { formatCurrency, formatDate } from '@/lib/utils';

interface OrderItemFormRow {
  productId: string;
  quantity: number;
  unitCost: number;
}

export default function PurchasesPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  // Data states
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | 'ALL'>('ALL');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Toast Feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
  const [receivingPurchase, setReceivingPurchase] = useState<PurchaseRecord | null>(null);

  // Create Form State
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formOrderNumber, setFormOrderNumber] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [formDiscount, setFormDiscount] = useState<number>(0);
  const [formTax, setFormTax] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');
  const [formImmediateReceive, setFormImmediateReceive] = useState(false);
  const [formItems, setFormItems] = useState<OrderItemFormRow[]>([
    { productId: '', quantity: 10, unitCost: 0 },
  ]);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload when query filters change
  useEffect(() => {
    if (!loading) {
      loadPurchasesList();
    }
  }, [page, statusFilter, selectedSupplierId, startDate, endDate]);

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [statsRes, supRes, prodRes] = await Promise.all([
        purchaseService.getStats(),
        supplierService.getSuppliers(),
        productService.getProducts({ isActive: true }),
      ]);
      setStats(statsRes);
      setSuppliers(supRes);
      setProducts(prodRes);

      const purchasesRes = await purchaseService.getPurchases({
        page: 1,
        limit: 15,
      });
      setPurchases(purchasesRes.items);
      setTotalPages(purchasesRes.totalPages);
      setTotalCount(purchasesRes.total);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load purchase records');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchasesList = async () => {
    try {
      const res = await purchaseService.getPurchases({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        supplierId: selectedSupplierId === 'ALL' ? undefined : selectedSupplierId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setPurchases(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err: any) {
      setErrorMsg('Failed to update purchases list');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      const [statsRes, purchasesRes] = await Promise.all([
        purchaseService.getStats(),
        purchaseService.getPurchases({
          page,
          limit: 15,
          search: search.trim() || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          supplierId: selectedSupplierId === 'ALL' ? undefined : selectedSupplierId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      ]);
      setStats(statsRes);
      setPurchases(purchasesRes.items);
      setTotalPages(purchasesRes.totalPages);
      setTotalCount(purchasesRes.total);
      setSuccessMsg('Purchase records refreshed');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPurchasesList();
  };

  // Line item helpers
  const handleProductSelect = (index: number, productId: string) => {
    const matched = products.find((p) => p.id === productId);
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId,
        unitCost: matched ? matched.costPrice : 0,
      };
      return updated;
    });
  };

  const handleItemChange = (index: number, field: 'quantity' | 'unitCost', value: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const addItemRow = () => {
    setFormItems((prev) => [...prev, { productId: '', quantity: 1, unitCost: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live order calculations
  const orderSubtotal = useMemo(() => {
    return formItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0);
  }, [formItems]);

  const orderGrandTotal = useMemo(() => {
    return Math.max(0, orderSubtotal - (Number(formDiscount) || 0) + (Number(formTax) || 0));
  }, [orderSubtotal, formDiscount, formTax]);

  // Open Create Modal
  const openCreateModal = () => {
    setFormSupplierId(suppliers.length > 0 ? suppliers[0].id : '');
    setFormOrderNumber('');
    setFormPurchaseDate(new Date().toISOString().slice(0, 10));
    setFormDiscount(0);
    setFormTax(0);
    setFormNotes('');
    setFormImmediateReceive(false);
    setFormItems(
      products.length > 0
        ? [{ productId: products[0].id, quantity: 10, unitCost: products[0].costPrice }]
        : [{ productId: '', quantity: 1, unitCost: 0 }],
    );
    setIsCreateModalOpen(true);
  };

  // Submit Create Purchase Order
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplierId) {
      setErrorMsg('Please select a supplier');
      return;
    }
    const invalidItem = formItems.find((i) => !i.productId || i.quantity <= 0);
    if (invalidItem) {
      setErrorMsg('Please make sure all order items have a valid product and positive quantity');
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    try {
      const payload: CreatePurchasePayload = {
        supplierId: formSupplierId,
        orderNumber: formOrderNumber.trim() || undefined,
        purchaseDate: formPurchaseDate || undefined,
        discount: Number(formDiscount) || 0,
        tax: Number(formTax) || 0,
        status: formImmediateReceive ? 'RECEIVED' : 'PENDING',
        notes: formNotes.trim() || undefined,
        items: formItems.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
        })),
      };

      const created = await purchaseService.createPurchase(payload);
      setSuccessMsg(
        `Purchase order ${created.orderNumber} created successfully! ${
          formImmediateReceive ? 'Goods added to inventory.' : 'Marked as Pending delivery.'
        }`,
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      setIsCreateModalOpen(false);

      // Refresh list and stats
      handleRefresh();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  // Receive goods action
  const handleConfirmReceive = async () => {
    if (!receivingPurchase) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const updated = await purchaseService.receivePurchase(receivingPurchase.id);
      setSuccessMsg(
        `Goods for PO ${updated.orderNumber} successfully received into warehouse! Stock updated and IN movements recorded.`,
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      setReceivingPurchase(null);
      if (selectedPurchase?.id === updated.id) {
        setSelectedPurchase(updated);
      }
      handleRefresh();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to receive purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel order action
  const handleCancelOrder = async (order: PurchaseRecord) => {
    if (!confirm(`Are you sure you want to cancel purchase order ${order.orderNumber}?`)) {
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await purchaseService.cancelPurchase(order.id);
      setSuccessMsg(`Purchase order ${order.orderNumber} has been cancelled.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      if (selectedPurchase?.id === order.id) {
        setIsDetailModalOpen(false);
      }
      handleRefresh();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to cancel purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Feedback */}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Procurement & Supply Chain Management</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Purchase Orders & Receiving
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Create supplier orders, track inbound shipments, and streamline automated warehouse stock receiving.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition-all hover:bg-slate-800 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Spend */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Total PO Spend</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {stats ? formatCurrency(stats.totalSpend, currency) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Across {stats?.totalOrders || 0} purchase orders</span>
          </div>
        </div>

        {/* Pending Shipments */}
        <div
          onClick={() => {
            setStatusFilter('PENDING');
            setPage(1);
          }}
          className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-amber-500/40 rounded-2xl relative overflow-hidden group cursor-pointer transition-all"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/15 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">To Receive</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 tracking-tight flex items-center gap-2">
            <span>{stats ? stats.pendingOrders : '—'}</span>
            {stats && stats.pendingOrders > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                Awaiting
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Pending warehouse arrival</span>
          </div>
        </div>

        {/* Received Shipments */}
        <div
          onClick={() => {
            setStatusFilter('RECEIVED');
            setPage(1);
          }}
          className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl relative overflow-hidden group cursor-pointer transition-all"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/15 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Received & Stocked</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {stats ? stats.receivedOrders : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Completed deliveries</span>
          </div>
        </div>

        {/* Total Paid */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Paid to Suppliers</span>
            <Check className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {stats ? formatCurrency(stats.totalPaid, currency) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Settled settlements</span>
          </div>
        </div>

        {/* Outstanding Payables */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group col-span-2 md:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/15 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Outstanding Dues</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-400 tracking-tight">
            {stats ? formatCurrency(stats.totalOutstandingPayables, currency) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Accounts payable balance</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search PO number, supplier, or remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs font-semibold">
            {(['ALL', 'PENDING', 'RECEIVED', 'CANCELLED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Supplier Dropdown */}
          <select
            value={selectedSupplierId}
            onChange={(e) => {
              setSelectedSupplierId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Purchases Data Table */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-medium">Loading purchase orders...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No purchase orders found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first purchase order to replenish warehouse stock and manage supplier procurement.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Purchase Order</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">PO Number</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Items / Quantity</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                {purchases.map((p) => {
                  const isPending = p.status === 'PENDING';
                  const isReceived = p.status === 'RECEIVED';
                  const isCancelled = p.status === 'CANCELLED';

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* PO Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                          <span>{p.orderNumber}</span>
                          <button
                            onClick={() => copyToClipboard(p.orderNumber, p.id)}
                            className="p-1 hover:text-indigo-400 text-slate-500 transition-colors"
                            title="Copy PO Number"
                          >
                            {copiedId === p.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {p.createdBy && (
                          <div className="text-[10px] text-slate-500">
                            By {p.createdBy.firstName} {p.createdBy.lastName}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                        <div>{formatDate(p.purchaseDate)}</div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white line-clamp-1">
                          {p.supplier?.companyName || 'Unknown Supplier'}
                        </div>
                        {p.supplier?.phone && (
                          <div className="text-[10px] text-slate-500">{p.supplier.phone}</div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-semibold text-slate-200">
                            {p.itemsCount} {p.itemsCount === 1 ? 'item' : 'items'}
                          </span>
                          <span className="text-[10px] text-slate-500">({p.totalUnits} units)</span>
                        </div>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-sm text-white">
                        {formatCurrency(p.total, currency)}
                        {p.discount > 0 && (
                          <div className="text-[10px] text-emerald-400 font-normal">
                            Disc: -{formatCurrency(p.discount, currency)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isReceived
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isReceived && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          {isCancelled && <XCircle className="w-3 h-3" />}
                          <span>{p.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Receive Goods Button */}
                          {isPending && (
                            <button
                              onClick={() => setReceivingPurchase(p)}
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 shadow-sm"
                              title="Receive Goods into Inventory"
                            >
                              <Boxes className="w-3.5 h-3.5" />
                              <span>Receive</span>
                            </button>
                          )}

                          {/* View Detail Button */}
                          <button
                            onClick={() => {
                              setSelectedPurchase(p);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"
                            title="View Purchase Order"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Cancel Order Button */}
                          {!isCancelled && (
                            <button
                              onClick={() => handleCancelOrder(p)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg transition-all"
                              title="Cancel Order"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <span className="font-semibold text-white">{page}</span> of{' '}
              <span className="font-semibold text-white">{totalPages}</span> ({totalCount} orders)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE PURCHASE ORDER                                              */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">New Purchase Order</h3>
                  <p className="text-xs text-slate-400">Create an inbound supplier procurement order.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              {/* Top Row: Supplier & Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Supplier */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Supplier *
                  </label>
                  <select
                    required
                    value={formSupplierId}
                    onChange={(e) => setFormSupplierId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="" disabled>Choose supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} {s.contactPerson ? `(${s.contactPerson})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Order Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formPurchaseDate}
                    onChange={(e) => setFormPurchaseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Purchased Line Items ({formItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {formItems.map((row, index) => {
                    const rowLineTotal = (Number(row.quantity) || 0) * (Number(row.unitCost) || 0);

                    return (
                      <div
                        key={index}
                        className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl grid grid-cols-12 gap-3 items-center"
                      >
                        {/* Product Dropdown */}
                        <div className="col-span-12 sm:col-span-5">
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">
                            Product
                          </label>
                          <select
                            required
                            value={row.productId}
                            onChange={(e) => handleProductSelect(index, e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="" disabled>Select product...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Stock: {p.currentStock} {p.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={row.quantity}
                            onChange={(e) =>
                              handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))
                            }
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold text-center focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* Unit Cost */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">
                            Unit Cost
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={row.unitCost}
                            onChange={(e) =>
                              handleItemChange(index, 'unitCost', Math.max(0, parseFloat(e.target.value) || 0))
                            }
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold text-right focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="col-span-3 sm:col-span-2 text-right">
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">
                            Line Total
                          </label>
                          <div className="text-xs font-mono font-bold text-emerald-400 py-2">
                            {formatCurrency(rowLineTotal, currency)}
                          </div>
                        </div>

                        {/* Delete Row Button */}
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            disabled={formItems.length === 1}
                            onClick={() => removeItemRow(index)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Financials & Discounts */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">
                    Discount Amount ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">
                    Tax Amount ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formTax}
                    onChange={(e) => setFormTax(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Calculation breakdown */}
                <div className="text-right space-y-1">
                  <div className="text-xs text-slate-400">
                    Subtotal: <span className="font-mono text-white">{formatCurrency(orderSubtotal, currency)}</span>
                  </div>
                  <div className="text-sm font-bold text-white">
                    Grand Total: <span className="font-mono text-emerald-400">{formatCurrency(orderGrandTotal, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Immediate Receiving Checkbox */}
              <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="immediateReceive"
                  checked={formImmediateReceive}
                  onChange={(e) => setFormImmediateReceive(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                />
                <label htmlFor="immediateReceive" className="text-xs font-medium text-slate-300 cursor-pointer">
                  <span className="font-bold text-white block">Receive Goods Immediately</span>
                  <span>Direct delivery: Automatically increment warehouse product stock and log Stock IN movements right now.</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Internal Remarks / Delivery Notes <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Delivered by truck #WP-4921, payment terms: 30 days"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
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
                  <span>Place Purchase Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW PURCHASE ORDER DETAILS & INVOICE SLIP                         */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedPurchase.orderNumber}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        selectedPurchase.status === 'RECEIVED'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : selectedPurchase.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {selectedPurchase.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Ordered on {formatDate(selectedPurchase.purchaseDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
                  title="Print Purchase Order"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6">
              {/* Supplier & Business Info Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                    Supplier (Vendor)
                  </div>
                  <div className="font-bold text-white text-sm">{selectedPurchase.supplier?.companyName}</div>
                  {selectedPurchase.supplier?.contactPerson && (
                    <div className="text-slate-400 mt-0.5">Attn: {selectedPurchase.supplier.contactPerson}</div>
                  )}
                  {selectedPurchase.supplier?.phone && (
                    <div className="text-slate-400">Tel: {selectedPurchase.supplier.phone}</div>
                  )}
                  {selectedPurchase.supplier?.email && (
                    <div className="text-slate-400">Email: {selectedPurchase.supplier.email}</div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                    Delivery & Receiving
                  </div>
                  <div className="text-slate-300">
                    Status: <span className="font-bold text-white">{selectedPurchase.status}</span>
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    Total Units: <span className="font-mono font-bold text-white">{selectedPurchase.totalUnits}</span>
                  </div>
                  {selectedPurchase.createdBy && (
                    <div className="text-slate-500 mt-1">
                      Created by {selectedPurchase.createdBy.firstName} {selectedPurchase.createdBy.lastName}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Item / SKU</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Cost</th>
                      <th className="py-2.5 px-4 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {selectedPurchase.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{item.product?.name || 'Item'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.product?.sku}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {item.quantity} {item.product?.unit || 'units'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatCurrency(item.unitCost, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {formatCurrency(item.total, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                <div className="text-slate-400 space-y-0.5">
                  {selectedPurchase.notes && (
                    <div>
                      <span className="font-semibold text-slate-300">Notes: </span>
                      <span>{selectedPurchase.notes}</span>
                    </div>
                  )}
                </div>

                <div className="text-right space-y-1 font-mono">
                  <div className="text-slate-400">
                    Subtotal: <span>{formatCurrency(selectedPurchase.subtotal, currency)}</span>
                  </div>
                  {selectedPurchase.discount > 0 && (
                    <div className="text-emerald-400">
                      Discount: -{formatCurrency(selectedPurchase.discount, currency)}
                    </div>
                  )}
                  {selectedPurchase.tax > 0 && (
                    <div className="text-slate-400">
                      Tax: +{formatCurrency(selectedPurchase.tax, currency)}
                    </div>
                  )}
                  <div className="text-base font-bold text-white pt-1 border-t border-slate-800">
                    Total: <span className="text-emerald-400">{formatCurrency(selectedPurchase.total, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions inside Modal */}
              <div className="pt-2 flex items-center justify-end gap-3">
                {selectedPurchase.status === 'PENDING' && (
                  <button
                    onClick={() => {
                      setReceivingPurchase(selectedPurchase);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5"
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Receive Goods & Restock</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION DIALOG: RECEIVE GOODS                                        */}
      {/* ========================================================================= */}
      {receivingPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Boxes className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Confirm Warehouse Goods Receiving</h3>
              <p className="text-xs text-slate-400">
                Are you sure all items for PO <span className="font-mono text-white font-bold">{receivingPurchase.orderNumber}</span> have arrived?
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Supplier:</span>
                <span className="font-semibold text-white">{receivingPurchase.supplier?.companyName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Items:</span>
                <span className="font-bold text-white">{receivingPurchase.itemsCount} SKUs ({receivingPurchase.totalUnits} units)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Order Total:</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(receivingPurchase.total, currency)}</span>
              </div>
            </div>

            <p className="text-[11px] text-amber-400/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              ⚡ Executing this will instantly increment product stock levels and create verified Stock IN ledger records.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReceivingPurchase(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmReceive}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Confirm & Restock</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
