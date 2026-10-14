'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
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
  ArrowUpRight,
  Boxes,
  Building2,
  FileText,
  User,
  CreditCard,
  Banknote,
  Receipt,
  Scan,
  Minus,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  saleService,
  SaleRecord,
  SaleStats,
  InvoiceStatus,
  PaymentMethod,
  CreateSalePayload,
} from '@/services/sale.service';
import { customerService, CustomerItem } from '@/services/customer.service';
import { productService, ProductItem } from '@/services/product.service';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CartItem {
  product: ProductItem;
  quantity: number;
  unitPrice: number;
}

export default function SalesPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  // Active View Tab: 'pos' (POS Cashier Counter) | 'history' (Sales Orders Ledger)
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  // Data states
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [stats, setStats] = useState<SaleStats | null>(null);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // History Tab Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCustomerId, setPosCustomerId] = useState<string>('');
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posTax, setPosTax] = useState<number>(0);
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>('CASH');
  const [posTenderedAmount, setPosTenderedAmount] = useState<number>(0);
  const [posReference, setPosReference] = useState('');
  const [posNotes, setPosNotes] = useState('');

  // Modals & Slips
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Toast feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  // History list reload on filter change
  useEffect(() => {
    if (!loading && activeTab === 'history') {
      loadSalesHistory();
    }
  }, [page, statusFilter, selectedCustomerId, startDate, endDate, activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [statsRes, custRes, prodRes, salesRes] = await Promise.all([
        saleService.getStats(),
        customerService.getCustomers(),
        productService.getProducts({ isActive: true }),
        saleService.getSales({ page: 1, limit: 15 }),
      ]);
      setStats(statsRes);
      setCustomers(custRes);
      setProducts(prodRes);
      setSales(salesRes.items);
      setTotalPages(salesRes.totalPages);
      setTotalCount(salesRes.total);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesHistory = async () => {
    try {
      const res = await saleService.getSales({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        customerId: selectedCustomerId === 'ALL' ? undefined : selectedCustomerId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setSales(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err: any) {
      setErrorMsg('Failed to update sales records');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      const [statsRes, prodRes, salesRes] = await Promise.all([
        saleService.getStats(),
        productService.getProducts({ isActive: true }),
        saleService.getSales({
          page,
          limit: 15,
          search: search.trim() || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          customerId: selectedCustomerId === 'ALL' ? undefined : selectedCustomerId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      ]);
      setStats(statsRes);
      setProducts(prodRes);
      setSales(salesRes.items);
      setTotalPages(salesRes.totalPages);
      setTotalCount(salesRes.total);
      setSuccessMsg('Sales data refreshed');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // POS Cart Management
  const addToCart = (product: ProductItem) => {
    if (product.currentStock <= 0) {
      setErrorMsg(`"${product.name}" is currently out of stock!`);
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          setErrorMsg(`Cannot add more: Only ${product.currentStock} units in stock!`);
          setTimeout(() => setErrorMsg(null), 3000);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
        },
      ];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.currentStock) {
              setErrorMsg(`Maximum stock available: ${item.product.currentStock}`);
              setTimeout(() => setErrorMsg(null), 3000);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const removeCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPosDiscount(0);
    setPosTax(0);
    setPosTenderedAmount(0);
    setPosReference('');
    setPosNotes('');
  };

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const cartGrandTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - (Number(posDiscount) || 0) + (Number(posTax) || 0));
  }, [cartSubtotal, posDiscount, posTax]);

  // Set default tendered amount when total changes
  useEffect(() => {
    setPosTenderedAmount(cartGrandTotal);
  }, [cartGrandTotal]);

  const changeDue = useMemo(() => {
    return Math.max(0, (Number(posTenderedAmount) || 0) - cartGrandTotal);
  }, [posTenderedAmount, cartGrandTotal]);

  // Complete POS Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMsg('Cart is empty. Add products to proceed with checkout.');
      return;
    }

    setCheckoutLoading(true);
    setErrorMsg(null);
    try {
      const payload: CreateSalePayload = {
        customerId: posCustomerId || undefined,
        discount: Number(posDiscount) || 0,
        tax: Number(posTax) || 0,
        notes: posNotes.trim() || undefined,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        payment: {
          amount: Number(posTenderedAmount) || 0,
          paymentMethod: posPaymentMethod,
          reference: posReference.trim() || undefined,
          notes: `POS Checkout (${posPaymentMethod})`,
        },
        createInvoice: true,
      };

      const completed = await saleService.createSale(payload);

      setSuccessMsg(`Sale ${completed.saleNumber} completed successfully! Stock decremented.`);
      setTimeout(() => setSuccessMsg(null), 4000);

      // Open receipt for printing / viewing
      setSelectedSale(completed);
      setIsReceiptModalOpen(true);

      // Reset cart
      clearCart();

      // Refresh product stock and stats
      handleRefresh();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete sale');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Cancel Order action
  const handleCancelSale = async (sale: SaleRecord) => {
    if (!confirm(`Cancel sale ${sale.saleNumber}? This will return all items to warehouse stock.`)) {
      return;
    }

    try {
      await saleService.cancelSale(sale.id);
      setSuccessMsg(`Sale ${sale.saleNumber} cancelled and items returned to stock.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      handleRefresh();
      if (selectedSale?.id === sale.id) {
        setIsReceiptModalOpen(false);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to cancel sale');
    }
  };

  // Filtered products in POS Catalog
  const filteredPosProducts = useMemo(() => {
    if (!posSearch.trim()) return products;
    const q = posSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)),
    );
  }, [products, posSearch]);

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

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Sales, Point of Sale (POS) & Checkout</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Sales & Fast Checkout POS
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Process counter retail sales, generate customer receipts, and automatically debit warehouse stock in real-time.
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

          {/* Mode Selector Tabs */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'pos'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>POS Terminal</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Sales Ledger ({totalCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Revenue */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Gross Sales Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {stats ? formatCurrency(stats.totalRevenue, currency) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Across {stats?.totalOrders || 0} sales orders</span>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Today's Sales</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{stats ? formatCurrency(stats.today.revenue, currency) : '—'}</span>
            {stats && stats.today.count > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-medium">
                {stats.today.count} bills
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Daily business volume</span>
          </div>
        </div>

        {/* Items Sold */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Units Sold</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {stats ? stats.totalUnitsSold.toLocaleString() : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Dispatched products</span>
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl group-hover:bg-teal-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Cash & Cards Paid</span>
            <Banknote className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-bold text-teal-400 tracking-tight">
            {stats ? formatCurrency(stats.totalCollected, currency) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Realized bank/cash flow</span>
          </div>
        </div>

        {/* Receivables / Credit Balance */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group col-span-2 md:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Customer Credit Dues</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 tracking-tight">
            {stats ? formatCurrency(stats.outstandingReceivables, currency) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Uncollected credit receivables</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: POS TERMINAL & FAST CASHIER CHECKOUT                              */}
      {/* ========================================================================= */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Product Selection Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search Toolbar */}
            <div className="p-3 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Scan barcode or type name / SKU..."
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="text-xs text-slate-400 font-medium px-2">
                {filteredPosProducts.length} items
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredPosProducts.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                const isOutOfStock = p.currentStock <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer select-none relative group ${
                      isOutOfStock
                        ? 'bg-slate-950/40 border-slate-800/50 opacity-60 cursor-not-allowed'
                        : inCart
                        ? 'bg-indigo-950/20 border-indigo-500/50 hover:border-indigo-400 shadow-md shadow-indigo-950/20'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-mono text-slate-500 truncate">{p.sku}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isOutOfStock
                              ? 'bg-rose-500/20 text-rose-400'
                              : p.currentStock <= 5
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-2 mb-1">{p.name}</h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatCurrency(p.sellingPrice, currency)}
                      </span>

                      {inCart ? (
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                          {inCart.quantity}
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-xs transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Interactive Cart & Checkout Drawer (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-2xl">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Current Order Checkout</h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Picker */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Customer (Optional / Walk-In)
              </label>
              <select
                value={posCustomerId}
                onChange={(e) => setPosCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Walk-in Retail Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <ShoppingCart className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs">Cart is empty. Select products on the left.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">{item.product.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {formatCurrency(item.unitPrice, currency)} each
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => updateCartQty(item.product.id, -1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-white text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQty(item.product.id, 1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="w-20 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(item.quantity * item.unitPrice, currency)}
                    </div>

                    <button
                      onClick={() => removeCartItem(item.product.id)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items):</span>
                <span className="font-mono text-white">{formatCurrency(cartSubtotal, currency)}</span>
              </div>

              {/* Discount & Tax Row */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Discount ({currency})</span>
                  <input
                    type="number"
                    min="0"
                    value={posDiscount}
                    onChange={(e) => setPosDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Tax ({currency})</span>
                  <input
                    type="number"
                    min="0"
                    value={posTax}
                    onChange={(e) => setPosTax(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                <span className="text-white">Grand Total:</span>
                <span className="font-mono text-emerald-400 text-base">
                  {formatCurrency(cartGrandTotal, currency)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400">
                Payment Tender Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['CASH', 'CARD', 'BANK_TRANSFER'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPosPaymentMethod(method)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      posPaymentMethod === method
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {method === 'CASH' && <Banknote className="w-3.5 h-3.5" />}
                    {method === 'CARD' && <CreditCard className="w-3.5 h-3.5" />}
                    {method === 'BANK_TRANSFER' && <Building2 className="w-3.5 h-3.5" />}
                    <span>{method === 'BANK_TRANSFER' ? 'Transfer' : method}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Tendered & Change Due */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 grid grid-cols-2 gap-3 items-center text-xs">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                  Amount Received *
                </label>
                <input
                  type="number"
                  min="0"
                  value={posTenderedAmount}
                  onChange={(e) => setPosTenderedAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Change / Balance:</span>
                <span className="font-mono font-bold text-sm text-indigo-400">
                  {formatCurrency(changeDue, currency)}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || cart.length === 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Complete Sale & Print Receipt ({formatCurrency(cartGrandTotal, currency)})</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SALES ORDERS HISTORY & INVOICE LEDGER                             */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History Filters */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sale number, invoice, or customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              {/* Status Tabs */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs font-semibold">
                {(['ALL', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'CANCELLED'] as const).map((st) => (
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
                    {st === 'PARTIALLY_PAID' ? 'Partial' : st}
                  </button>
                ))}
              </div>

              {/* Customer Selector */}
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-xs font-medium">Loading sales history...</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No sales transactions found</p>
                <p className="text-xs text-slate-500">Try adjusting your filters or make a sale on the POS terminal.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Sale # / Invoice</th>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Items / Qty</th>
                      <th className="py-3.5 px-4 text-right">Total Amount</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                    {sales.map((s) => {
                      const isPaid = s.status === 'PAID';
                      const isPartial = s.status === 'PARTIALLY_PAID';
                      const isCancelled = s.status === 'CANCELLED';

                      return (
                        <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Sale Number & Invoice */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                              <span>{s.saleNumber}</span>
                              <button
                                onClick={() => copyToClipboard(s.saleNumber, s.id)}
                                className="p-1 hover:text-indigo-400 text-slate-500 transition-colors"
                                title="Copy Sale Number"
                              >
                                {copiedId === s.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            {s.invoice && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Inv: {s.invoice.invoiceNumber}
                              </div>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                            <div>{formatDate(s.saleDate)}</div>
                            <div className="text-[10px] text-slate-500">
                              {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-white">
                              {s.customer ? s.customer.name : 'Walk-in Customer'}
                            </div>
                            {s.customer?.phone && (
                              <div className="text-[10px] text-slate-500">{s.customer.phone}</div>
                            )}
                          </td>

                          {/* Items */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="font-semibold text-slate-200">
                                {s.itemsCount} {s.itemsCount === 1 ? 'item' : 'items'}
                              </span>
                              <span className="text-[10px] text-slate-500">({s.totalUnits} units)</span>
                            </div>
                          </td>

                          {/* Total */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-sm text-white">
                            {formatCurrency(s.total, currency)}
                            {s.balanceDue > 0 && (
                              <div className="text-[10px] text-amber-400 font-normal">
                                Due: {formatCurrency(s.balanceDue, currency)}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                isPaid
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : isPartial
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : isCancelled
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                              }`}
                            >
                              {isPaid && <CheckCircle2 className="w-3 h-3" />}
                              {isPartial && <Clock className="w-3 h-3" />}
                              {isCancelled && <XCircle className="w-3 h-3" />}
                              <span>{s.status}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Receipt */}
                              <button
                                onClick={() => {
                                  setSelectedSale(s);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"
                                title="View Receipt Slip"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Cancel Sale */}
                              {!isCancelled && (
                                <button
                                  onClick={() => handleCancelSale(s)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg transition-all"
                                  title="Cancel Sale & Revert Stock"
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
                  <span className="font-semibold text-white">{totalPages}</span> ({totalCount} records)
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE RECEIPT & INVOICE SLIP                                   */}
      {/* ========================================================================= */}
      {isReceiptModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Header Toolbar */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Payment Receipt & Tax Invoice
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"
                  title="Print Thermal Receipt"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="p-6 space-y-5 bg-slate-950/60 font-mono text-xs">
              {/* Business Header */}
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-800">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {user?.business?.name || 'BizFlow Enterprise'}
                </h2>
                {user?.business?.address && (
                  <p className="text-[11px] text-slate-400">{user.business.address}</p>
                )}
                {user?.business?.phone && (
                  <p className="text-[11px] text-slate-400">Tel: {user.business.phone}</p>
                )}
                <div className="pt-2 text-[10px] text-slate-500 uppercase">
                  {selectedSale.saleNumber} • {formatDate(selectedSale.saleDate)}
                </div>
              </div>

              {/* Customer Info */}
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Customer:</span>
                <span className="font-bold text-white">
                  {selectedSale.customer ? selectedSale.customer.name : 'Walk-in Retail'}
                </span>
              </div>

              {/* Line Items */}
              <div className="space-y-2 py-2 border-y border-dashed border-slate-800">
                {selectedSale.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start text-xs">
                    <div className="flex-1 pr-2">
                      <div className="text-white font-semibold">{item.product?.name || 'Item'}</div>
                      <div className="text-[10px] text-slate-500">
                        {item.quantity} x {formatCurrency(item.unitPrice, currency)}
                      </div>
                    </div>
                    <div className="font-bold text-white">
                      {formatCurrency(item.total, currency)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedSale.subtotal, currency)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedSale.discount, currency)}</span>
                  </div>
                )}
                {selectedSale.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>+{formatCurrency(selectedSale.tax, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                  <span>TOTAL DUE:</span>
                  <span className="text-emerald-400">{formatCurrency(selectedSale.total, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1">
                  <span>Amount Paid:</span>
                  <span className="font-semibold text-white">{formatCurrency(selectedSale.paidAmount, currency)}</span>
                </div>
                {selectedSale.balanceDue > 0 && (
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span>Balance Outstanding:</span>
                    <span>{formatCurrency(selectedSale.balanceDue, currency)}</span>
                  </div>
                )}
              </div>

              {/* Payment Details */}
              {selectedSale.payments && selectedSale.payments.length > 0 && (
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="font-bold text-white">{selectedSale.payments[0].paymentMethod}</span>
                  </div>
                  {selectedSale.payments[0].reference && (
                    <div className="flex justify-between">
                      <span>Ref / Trace:</span>
                      <span className="font-bold text-white">{selectedSale.payments[0].reference}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
                <p>Thank you for choosing {user?.business?.name || 'BizFlow ERP'}!</p>
                <p>Goods once sold are subject to our standard store policy.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
