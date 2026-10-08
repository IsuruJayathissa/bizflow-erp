'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Barcode,
  Layers,
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Boxes,
  Eye,
  Archive,
  RefreshCw,
  Download,
  Loader2,
  X,
  Scan,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  Copy,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  productService,
  ProductItem,
  ProductStats,
  ProductDetail,
  CreateProductPayload,
  UpdateProductPayload,
} from '@/services/product.service';
import { categoryService, CategoryItem } from '@/services/category.service';
import { supplierService, SupplierItem } from '@/services/supplier.service';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ProductsPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  // Data states
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Selected product states
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);

  // Barcode scanner modal states
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scannedResult, setScannedResult] = useState<ProductItem | null>(null);
  const [barcodeSearching, setBarcodeSearching] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Feedback states
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateProductPayload>({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    costPrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    minStock: 5,
    unit: 'units',
    categoryId: undefined,
    supplierId: undefined,
  });

  const canManage = ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'].includes(user?.role || '');
  const canDelete = ['ADMIN', 'MANAGER'].includes(user?.role || '');

  // Fetch products
  const fetchProducts = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== 'ALL') params.categoryId = selectedCategory;
      if (stockStatusFilter !== 'ALL') params.stockStatus = stockStatusFilter;
      if (statusFilter === 'ACTIVE') params.isActive = true;
      if (statusFilter === 'ARCHIVED') params.isActive = false;

      const data = await productService.getProducts(params);
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch stats and dropdown options
  const fetchAuxiliaryData = async () => {
    try {
      setStatsLoading(true);
      const [statsData, catData, supData] = await Promise.all([
        productService.getStats(),
        categoryService.getCategories({ isActive: true }),
        supplierService.getSuppliers({ isActive: true }),
      ]);
      setStats(statsData);
      setCategories(catData);
      setSuppliers(supData);
    } catch (err) {
      console.error('Failed to load stats/aux data:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, stockStatusFilter, statusFilter]);

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Open detail drawer
  const handleOpenDetail = async (prod: ProductItem) => {
    setSelectedProduct(prod);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const detail = await productService.getProduct(prod.id);
      setProductDetail(detail);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load product details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (prod: ProductItem) => {
    setSelectedProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      barcode: prod.barcode || '',
      description: prod.description || '',
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice,
      currentStock: prod.currentStock,
      minStock: prod.minStock,
      unit: prod.unit || 'units',
      categoryId: prod.categoryId || undefined,
      supplierId: prod.supplierId || undefined,
    });
    setErrorMsg(null);
    setIsEditModalOpen(true);
  };

  // Live profit calculation for forms
  const formMargin = useMemo(() => {
    const cost = Number(formData.costPrice) || 0;
    const sell = Number(formData.sellingPrice) || 0;
    const diff = sell - cost;
    const pct = sell > 0 ? Math.round((diff / sell) * 100 * 10) / 10 : 0;
    return { diff, pct };
  }, [formData.costPrice, formData.sellingPrice]);

  // Submit Add Product
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      setErrorMsg('Product name and SKU are required');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await productService.createProduct({
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        barcode: formData.barcode?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        currentStock: Number(formData.currentStock) || 0,
        minStock: Number(formData.minStock) || 5,
        unit: formData.unit?.trim() || 'units',
        categoryId: formData.categoryId || undefined,
        supplierId: formData.supplierId || undefined,
      });

      setSuccessMsg('Product added to catalog successfully');
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        costPrice: 0,
        sellingPrice: 0,
        currentStock: 0,
        minStock: 5,
        unit: 'units',
        categoryId: undefined,
        supplierId: undefined,
      });
      fetchProducts();
      fetchAuxiliaryData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create product');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit Product
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!formData.name.trim() || !formData.sku.trim()) {
      setErrorMsg('Product name and SKU are required');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await productService.updateProduct(selectedProduct.id, {
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        barcode: formData.barcode?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        currentStock: Number(formData.currentStock),
        minStock: Number(formData.minStock),
        unit: formData.unit?.trim() || 'units',
        categoryId: formData.categoryId || null,
        supplierId: formData.supplierId || null,
      });

      setSuccessMsg('Product updated successfully');
      setIsEditModalOpen(false);
      fetchProducts();
      fetchAuxiliaryData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update product');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle active/archive status
  const handleToggleStatus = async (prod: ProductItem) => {
    try {
      setActionLoading(true);
      await productService.toggleStatus(prod.id);
      setSuccessMsg(`Product ${prod.isActive ? 'archived' : 'reactivated'} successfully`);
      fetchProducts();
      fetchAuxiliaryData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update product status');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (prod: ProductItem) => {
    setProductToDelete(prod);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await productService.deleteProduct(productToDelete.id);
      setSuccessMsg('Product deleted successfully');
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      fetchProducts();
      fetchAuxiliaryData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete product');
      setIsDeleteModalOpen(false);
      setTimeout(() => setErrorMsg(null), 6000);
    } finally {
      setActionLoading(false);
    }
  };

  // Barcode lookup submit
  const handleBarcodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedBarcode.trim()) return;

    try {
      setBarcodeSearching(true);
      setBarcodeError(null);
      setScannedResult(null);
      const res = await productService.getByBarcode(scannedBarcode.trim());
      setScannedResult(res);
    } catch (err: any) {
      setBarcodeError(err.response?.data?.message || 'No product found with this barcode');
    } finally {
      setBarcodeSearching(false);
    }
  };

  // Copy helper
  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (products.length === 0) return;
    const headers = ['Product Name', 'SKU', 'Barcode', 'Category', 'Supplier', 'Cost Price', 'Selling Price', 'Margin %', 'Current Stock', 'Min Stock', 'Unit', 'Stock Status', 'Status'];
    const rows = products.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      `"${p.barcode || ''}"`,
      `"${p.category?.name || 'Uncategorized'}"`,
      `"${p.supplier?.companyName || 'None'}"`,
      p.costPrice,
      p.sellingPrice,
      `${p.marginPercent}%`,
      p.currentStock,
      p.minStock,
      p.unit,
      p.stockStatus,
      p.isActive ? 'Active' : 'Archived',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bizflow_products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Toast Feedback Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 animate-fade-in shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-3 animate-fade-in shadow-lg shadow-rose-500/10">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Header & Quick Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Product Catalog & Inventory</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                SKU management, barcode mapping, purchase/selling pricing, profit margins, and threshold alerts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              setScannedBarcode('');
              setScannedResult(null);
              setBarcodeError(null);
              setIsBarcodeModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-2 text-xs font-semibold"
            title="Scan or search by Barcode"
          >
            <Scan className="w-3.5 h-3.5 text-indigo-400" />
            <span>Barcode Lookup</span>
          </button>

          <button
            onClick={() => fetchProducts(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-2 text-xs font-semibold"
            title="Refresh catalog data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={products.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          {canManage && (
            <button
              onClick={() => {
                setErrorMsg(null);
                setFormData({
                  name: '',
                  sku: `SKU-${Date.now().toString().slice(-6)}`,
                  barcode: '',
                  description: '',
                  costPrice: 0,
                  sellingPrice: 0,
                  currentStock: 0,
                  minStock: 5,
                  unit: 'units',
                  categoryId: undefined,
                  supplierId: undefined,
                });
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 High-Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Catalog Items */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Catalog Items</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : (stats?.totalProducts ?? 0)}
            </span>
            <span className="text-xs text-slate-400 ml-2">SKUs listed</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-400">
            <span>{stats?.activeProducts ?? 0} active in sales/purchases</span>
          </div>
        </div>

        {/* Total Inventory Valuation */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Inventory Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : formatCurrency(stats?.totalInventoryValue ?? 0, currency)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Based on current cost value</span>
          </div>
        </div>

        {/* Low Stock Warnings */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Low Stock Warnings</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold tracking-tight ${(stats?.lowStockCount ?? 0) > 0 ? 'text-amber-400' : 'text-white'}`}>
              {statsLoading ? '...' : (stats?.lowStockCount ?? 0)}
            </span>
            <span className="text-xs text-slate-400 ml-2">items below min limit</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400">
            <span>Re-order recommended</span>
          </div>
        </div>

        {/* Out of Stock Alerts */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Out of Stock</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold tracking-tight ${(stats?.outOfStockCount ?? 0) > 0 ? 'text-rose-400' : 'text-white'}`}>
              {statsLoading ? '...' : (stats?.outOfStockCount ?? 0)}
            </span>
            <span className="text-xs text-slate-400 ml-2">depleted SKUs</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-rose-400">
            <span>Cannot fulfill direct sales</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, SKU, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters & Status Pills */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap justify-end">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Pills */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStockStatusFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockStatusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStockStatusFilter('IN_STOCK')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockStatusFilter === 'IN_STOCK'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              In Stock
            </button>
            <button
              onClick={() => setStockStatusFilter('LOW_STOCK')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockStatusFilter === 'LOW_STOCK'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockStatusFilter('OUT_OF_STOCK')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockStatusFilter === 'OUT_OF_STOCK'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>
      </div>

      {/* Products Data Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Product Details</th>
                <th className="py-3.5 px-6">Category & Supplier</th>
                <th className="py-3.5 px-6">Pricing & Margins</th>
                <th className="py-3.5 px-6">Stock Level</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <span>Loading product catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">No products found</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {search
                            ? 'No catalog items match your search parameters.'
                            : 'Get started by adding your first product to the catalog.'}
                        </p>
                      </div>
                      {canManage && !search && (
                        <button
                          onClick={() => {
                            setFormData({
                              name: '',
                              sku: `SKU-${Date.now().toString().slice(-6)}`,
                              barcode: '',
                              description: '',
                              costPrice: 0,
                              sellingPrice: 0,
                              currentStock: 0,
                              minStock: 5,
                              unit: 'units',
                              categoryId: undefined,
                              supplierId: undefined,
                            });
                            setIsAddModalOpen(true);
                          }}
                          className="mt-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add First Product</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.stockStatus === 'LOW_STOCK';
                  const isOut = p.stockStatus === 'OUT_OF_STOCK';

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-default"
                    >
                      {/* Product Details */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-violet-500/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0 shadow-inner">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-white block truncate text-sm">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-950/80 px-1.5 py-0.2 rounded border border-slate-800 flex items-center gap-1">
                                {p.sku}
                                <button
                                  onClick={() => handleCopySku(p.sku)}
                                  title="Copy SKU"
                                  className="text-slate-500 hover:text-slate-300"
                                >
                                  {copiedSku === p.sku ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </span>

                              {p.barcode && (
                                <span className="font-mono text-[10px] text-slate-500 flex items-center gap-0.5">
                                  <Barcode className="w-3 h-3" />
                                  {p.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Supplier */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {p.category ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                              <Layers className="w-3 h-3" />
                              <span>{p.category.name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px] block italic">— Uncategorized</span>
                          )}

                          {p.supplier && (
                            <span className="text-[11px] text-slate-400 block truncate max-w-[160px]" title={p.supplier.companyName}>
                              Supplier: {p.supplier.companyName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pricing & Margins */}
                      <td className="py-4 px-6">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {formatCurrency(p.sellingPrice, currency)}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                p.marginPercent >= 20
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : p.marginPercent >= 10
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              +{p.marginPercent}%
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            Cost: {formatCurrency(p.costPrice, currency)}
                          </span>
                        </div>
                      </td>

                      {/* Stock Level & Threshold */}
                      <td className="py-4 px-6">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-slate-100'}`}>
                              {p.currentStock} {p.unit}
                            </span>

                            {isOut ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Low Stock
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Healthy
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            Min Threshold: {p.minStock} {p.unit}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {p.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            <Archive className="w-3 h-3" />
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => handleOpenDetail(p)}
                            title="View Stock Movements & Analytics"
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Product */}
                          {canManage && (
                            <button
                              onClick={() => handleOpenEdit(p)}
                              title="Edit Product Details"
                              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Archive/Restore */}
                          {canManage && (
                            <button
                              onClick={() => handleToggleStatus(p)}
                              title={p.isActive ? 'Archive Product' : 'Restore Product'}
                              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteClick(p)}
                              title="Delete Product"
                              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD PRODUCT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Catalog Product</h3>
                  <p className="text-xs text-slate-400">Define SKU, pricing, initial inventory, and category</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Title, SKU, Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Product Title / Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mobil 1 Fully Synthetic Motor Oil 5W-30 (4L)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    SKU Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="OIL-MOB-5W30"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Barcode (UPC / EAN)
                  </label>
                  <input
                    type="text"
                    placeholder="8901234567890"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    placeholder="bottles, units, liters..."
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Category & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Category Classification
                  </label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value || undefined })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">— Select Category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parent ? `${c.parent.name} → ` : ''}{c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Primary Supplier Partner
                  </label>
                  <select
                    value={formData.supplierId || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierId: e.target.value || undefined })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">— Select Supplier —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Margins Preview */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Pricing & Profit Margins
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Margin:</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        formMargin.pct >= 20
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : formMargin.pct >= 0
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {formatCurrency(formMargin.diff, currency)} ({formMargin.pct}%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Cost Price ({currency}) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Retail / Selling Price ({currency}) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formData.sellingPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Initial Stock On Hand
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) =>
                      setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Automatic Stock IN movement will be recorded.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Low Stock Threshold (Alert Limit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    System triggers a warning when stock falls to or below this.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Specifications / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Technical specs, compatible vehicle models, warranty terms..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PRODUCT */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Product</h3>
                  <p className="text-xs text-slate-400">Update catalog pricing, thresholds, and suppliers</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Product Title / Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    SKU Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Category & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Category Classification
                  </label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value || undefined })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">— Select Category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parent ? `${c.parent.name} → ` : ''}{c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Primary Supplier Partner
                  </label>
                  <select
                    value={formData.supplierId || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierId: e.target.value || undefined })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">— Select Supplier —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Margins Preview */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Pricing & Profit Margins
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Margin:</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        formMargin.pct >= 20
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : formMargin.pct >= 0
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {formatCurrency(formMargin.diff, currency)} ({formMargin.pct}%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Cost Price ({currency}) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Retail / Selling Price ({currency}) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formData.sellingPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Current Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) =>
                      setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Specifications / Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BARCODE SCANNER & LOOKUP */}
      {isBarcodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Scan className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Barcode Scanner Lookup</h3>
                  <p className="text-xs text-slate-400">Fast product lookup for POS & stock check</p>
                </div>
              </div>
              <button
                onClick={() => setIsBarcodeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBarcodeSearch} className="mt-4 space-y-4">
              <div className="relative">
                <Barcode className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Scan or type barcode number..."
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={barcodeSearching || !scannedBarcode.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {barcodeSearching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Find Product</span>
                </button>
              </div>

              {barcodeError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{barcodeError}</span>
                </div>
              )}

              {scannedResult && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm block">
                      {scannedResult.name}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      {formatCurrency(scannedResult.sellingPrice, currency)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">SKU</span>
                      <span className="font-mono text-white text-xs font-semibold">{scannedResult.sku}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Current Stock</span>
                      <span className={`text-xs font-bold ${scannedResult.currentStock === 0 ? 'text-rose-400' : 'text-slate-100'}`}>
                        {scannedResult.currentStock} {scannedResult.unit}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsBarcodeModalOpen(false);
                      handleOpenDetail(scannedResult);
                    }}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Full Details & Timeline</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PRODUCT PROFILE & STOCK MOVEMENT LEDGER DRAWER */}
      {isDetailModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 border border-indigo-400/30 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-indigo-600/30">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedProduct.name}</h3>
                    {selectedProduct.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-semibold">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    SKU: <span className="font-mono text-slate-300">{selectedProduct.sku}</span>
                    {selectedProduct.barcode ? ` • Barcode: ${selectedProduct.barcode}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setProductDetail(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-6 pr-1">
              {/* Profile summary badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Stock On Hand</span>
                  <span className={`text-lg font-bold mt-1 block ${selectedProduct.currentStock === 0 ? 'text-rose-400' : 'text-white'}`}>
                    {selectedProduct.currentStock} {selectedProduct.unit}
                  </span>
                  <span className="text-[10px] text-slate-500">Min limit: {selectedProduct.minStock}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Retail Price</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">
                    {formatCurrency(selectedProduct.sellingPrice, currency)}
                  </span>
                  <span className="text-[10px] text-slate-500">Cost: {formatCurrency(selectedProduct.costPrice, currency)}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Margin / Unit</span>
                  <span className="text-lg font-bold text-indigo-400 mt-1 block">
                    +{selectedProduct.marginPercent}%
                  </span>
                  <span className="text-[10px] text-slate-500">Profit: {formatCurrency(selectedProduct.margin, currency)}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Stock Valuation</span>
                  <span className="text-lg font-bold text-sky-400 mt-1 block">
                    {formatCurrency(selectedProduct.inventoryValue, currency)}
                  </span>
                  <span className="text-[10px] text-slate-500">Cost basis</span>
                </div>
              </div>

              {/* Taxonomy and Supplier */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block font-semibold">Category Classification:</span>
                    <span className="text-white mt-0.5 block">
                      {selectedProduct.category ? selectedProduct.category.name : 'Uncategorized'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Primary Supplier:</span>
                    <span className="text-white mt-0.5 block">
                      {selectedProduct.supplier ? selectedProduct.supplier.companyName : 'None specified'}
                    </span>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400 block font-semibold mb-1">Specifications:</span>
                    <p className="text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      "{selectedProduct.description}"
                    </p>
                  </div>
                )}
              </div>

              {/* Stock Movement History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span>Recent Stock Movements Ledger</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {productDetail?.stockMovements?.length ?? 0} movement record(s)
                  </span>
                </div>

                {detailLoading ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
                    <span className="text-xs">Loading stock movements...</span>
                  </div>
                ) : !productDetail?.stockMovements || productDetail.stockMovements.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-400">
                    <Boxes className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-300">No stock movements recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {productDetail.stockMovements.map((move) => {
                      const isStockIn = move.type === 'IN';
                      const isStockOut = move.type === 'OUT';

                      return (
                        <div
                          key={move.id}
                          className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isStockIn
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : isStockOut
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}
                            >
                              {isStockIn ? (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              ) : isStockOut ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <span className="font-semibold text-white block">
                                {move.reason || `${move.type} Movement`}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatDate(move.createdAt)}
                                {move.createdBy ? ` by ${move.createdBy.firstName} ${move.createdBy.lastName}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`font-bold font-mono text-xs ${
                                isStockIn ? 'text-emerald-400' : isStockOut ? 'text-rose-400' : 'text-blue-400'
                              }`}
                            >
                              {isStockIn ? '+' : isStockOut ? '-' : ''}
                              {move.quantity} {selectedProduct.unit}
                            </span>
                            <span className="text-[10px] text-slate-500 block uppercase">
                              {move.type}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setProductDetail(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE CONFIRMATION */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Product from Catalog?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">{productToDelete.name}</strong> (SKU: {productToDelete.sku})?
            </p>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-md shadow-rose-600/30 flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
