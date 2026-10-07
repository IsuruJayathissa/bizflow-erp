'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Building2,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Download,
  Loader2,
  Eye,
  Archive,
  RefreshCw,
  Calendar,
  Clock,
  ChevronRight,
  Receipt,
  X,
  Copy,
  Check,
  Package,
  Plus,
  Boxes,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  supplierService,
  SupplierItem,
  SupplierStats,
  SupplierDetail,
  CreateSupplierPayload,
  UpdateSupplierPayload,
} from '@/services/supplier.service';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SuppliersPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  // Data states
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected supplier
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);
  const [supplierDetail, setSupplierDetail] = useState<SupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierItem | null>(null);

  // Feedback states
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateSupplierPayload>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Permission flags based on role
  const canManage = ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'].includes(user?.role || '');
  const canDeleteOrArchive = ['ADMIN', 'MANAGER'].includes(user?.role || '');

  // Fetch supplier list
  const fetchSuppliers = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const params: { search?: string; isActive?: boolean } = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter === 'ACTIVE') params.isActive = true;
      if (statusFilter === 'ARCHIVED') params.isActive = false;

      const data = await supplierService.getSuppliers(params);
      setSuppliers(data);
    } catch (err: any) {
      console.error('Failed to load suppliers:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch SCM aggregate stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await supplierService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load supplier stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [statusFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Open detail drawer
  const handleOpenDetail = async (supplier: SupplierItem) => {
    setSelectedSupplier(supplier);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const detail = await supplierService.getSupplier(supplier.id);
      setSupplierDetail(detail);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load supplier details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (supplier: SupplierItem) => {
    setSelectedSupplier(supplier);
    setFormData({
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
    setErrorMsg(null);
    setIsEditModalOpen(true);
  };

  // Submit Add Supplier
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      setErrorMsg('Company name is required');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await supplierService.createSupplier({
        companyName: formData.companyName.trim(),
        contactPerson: formData.contactPerson?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      });

      setSuccessMsg('Supplier registered successfully');
      setIsAddModalOpen(false);
      setFormData({ companyName: '', contactPerson: '', email: '', phone: '', address: '', notes: '' });
      fetchSuppliers();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create supplier');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit Supplier
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    if (!formData.companyName.trim()) {
      setErrorMsg('Company name is required');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await supplierService.updateSupplier(selectedSupplier.id, {
        companyName: formData.companyName.trim(),
        contactPerson: formData.contactPerson?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      });

      setSuccessMsg('Supplier details updated successfully');
      setIsEditModalOpen(false);
      fetchSuppliers();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update supplier');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle active/archive status
  const handleToggleStatus = async (supplier: SupplierItem) => {
    try {
      setActionLoading(true);
      await supplierService.toggleStatus(supplier.id);
      setSuccessMsg(`Supplier ${supplier.isActive ? 'archived' : 'reactivated'} successfully`);
      fetchSuppliers();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update status');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (supplier: SupplierItem) => {
    setSupplierToDelete(supplier);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await supplierService.deleteSupplier(supplierToDelete.id);
      setSuccessMsg('Supplier deleted successfully');
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
      fetchSuppliers();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete supplier');
      setIsDeleteModalOpen(false);
      setTimeout(() => setErrorMsg(null), 6000);
    } finally {
      setActionLoading(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (suppliers.length === 0) return;
    const headers = ['Company Name', 'Contact Person', 'Email', 'Phone', 'Address', 'Products Supplied', 'Total Orders', 'Total Purchases', 'Outstanding Dues', 'Status', 'Registered Date'];
    const rows = suppliers.map((s) => [
      `"${s.companyName.replace(/"/g, '""')}"`,
      `"${s.contactPerson || ''}"`,
      `"${s.email || ''}"`,
      `"${s.phone || ''}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      s.productsCount,
      s.totalOrders,
      s.totalPurchases,
      s.outstandingDues,
      s.isActive ? 'Active' : 'Archived',
      `"${formatDate(s.createdAt)}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bizflow_suppliers_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-600/30">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Supplier Management (SCM)</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Vendor partner directory, purchase order history, catalog assignments, and accounts payable.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fetchSuppliers(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-2 text-xs font-semibold"
            title="Refresh supplier data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={suppliers.length === 0}
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
                setFormData({ companyName: '', contactPerson: '', email: '', phone: '', address: '', notes: '' });
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-sky-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 High-Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Suppliers */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Suppliers</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : (stats?.totalSuppliers ?? 0)}
            </span>
            <span className="text-xs text-slate-400 ml-2">vendor partners</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-sky-400">
            <span>Procurement network</span>
          </div>
        </div>

        {/* Active Partners */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Partners</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : (stats?.activeSuppliers ?? 0)}
            </span>
            {stats && stats.totalSuppliers > 0 && (
              <span className="text-xs text-emerald-400 ml-2">
                ({Math.round(((stats.activeSuppliers || 0) / stats.totalSuppliers) * 100)}% active)
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Available for Purchase Orders</span>
          </div>
        </div>

        {/* Lifetime Procurement Volume */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Lifetime Procurement</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : formatCurrency(stats?.totalPurchasesAmount ?? 0, currency)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Cumulative purchase spend</span>
          </div>
        </div>

        {/* Accounts Payable (Supplier Dues) */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Accounts Payable (Dues)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold tracking-tight ${(stats?.accountsPayable ?? 0) > 0 ? 'text-amber-400' : 'text-white'}`}>
              {statsLoading ? '...' : formatCurrency(stats?.accountsPayable ?? 0, currency)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Owed on pending/received POs</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company, contact person, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
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

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-center sm:justify-start">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Partners
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'ACTIVE'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setStatusFilter('ARCHIVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'ARCHIVED'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Suppliers Data Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Supplier / Company</th>
                <th className="py-3.5 px-6">Contact Person</th>
                <th className="py-3.5 px-6">Contact Channels</th>
                <th className="py-3.5 px-6">Products & Orders</th>
                <th className="py-3.5 px-6">Outstanding Dues</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                      <span>Loading supplier network...</span>
                    </div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">No suppliers found</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {search
                            ? 'No vendor partners match your search query.'
                            : 'Get started by registering your first supplier partner.'}
                        </p>
                      </div>
                      {canManage && !search && (
                        <button
                          onClick={() => {
                            setFormData({ companyName: '', contactPerson: '', email: '', phone: '', address: '', notes: '' });
                            setIsAddModalOpen(true);
                          }}
                          className="mt-2 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add First Supplier</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => {
                  const initial = s.companyName.charAt(0).toUpperCase();
                  const hasDue = s.outstandingDues > 0;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-default"
                    >
                      {/* Supplier Company Profile */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600/30 to-indigo-500/30 border border-sky-500/30 flex items-center justify-center text-sky-300 font-bold text-xs shrink-0 shadow-inner">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-white block truncate text-sm">
                              {s.companyName}
                            </span>
                            {s.notes ? (
                              <span className="text-[11px] text-slate-400 block truncate max-w-xs" title={s.notes}>
                                {s.notes}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">No notes</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="py-4 px-6">
                        {s.contactPerson ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <UserCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="font-medium">{s.contactPerson}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Not specified</span>
                        )}
                      </td>

                      {/* Contact Channels */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {s.phone ? (
                            <a
                              href={`tel:${s.phone}`}
                              className="flex items-center gap-1.5 text-slate-300 hover:text-sky-400 transition-colors truncate max-w-[180px]"
                            >
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{s.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-500 text-[11px] block">— No phone</span>
                          )}

                          {s.email ? (
                            <div className="flex items-center gap-1 text-slate-400">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[160px]">{s.email}</span>
                              <button
                                onClick={() => handleCopy(s.email!, `email-${s.id}`)}
                                title="Copy Email"
                                className="text-slate-500 hover:text-slate-300 p-0.5"
                              >
                                {copiedId === `email-${s.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : null}

                          {s.address && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate max-w-[200px]" title={s.address}>
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{s.address}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Products & Orders */}
                      <td className="py-4 px-6">
                        <div>
                          <span className="font-semibold text-slate-200 block">
                            {formatCurrency(s.totalPurchases, currency)}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span>{s.totalOrders} {s.totalOrders === 1 ? 'order' : 'orders'}</span>
                            <span>•</span>
                            <span className="text-sky-400">{s.productsCount} {s.productsCount === 1 ? 'product' : 'products'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Outstanding Dues */}
                      <td className="py-4 px-6">
                        {hasDue ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{formatCurrency(s.outstandingDues, currency)}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Settled (0.00)</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {s.isActive ? (
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
                          {/* View details & ledger */}
                          <button
                            onClick={() => handleOpenDetail(s)}
                            title="View Procurement Ledger & Catalog"
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Supplier */}
                          {canManage && (
                            <button
                              onClick={() => handleOpenEdit(s)}
                              title="Edit Supplier"
                              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-sky-400 hover:border-sky-500/30 hover:bg-sky-500/10 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Archive/Restore */}
                          {canDeleteOrArchive && (
                            <button
                              onClick={() => handleToggleStatus(s)}
                              title={s.isActive ? 'Archive Supplier' : 'Restore Supplier'}
                              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {canDeleteOrArchive && (
                            <button
                              onClick={() => handleDeleteClick(s)}
                              title="Delete Supplier"
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

      {/* MODAL 1: ADD SUPPLIER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Register Supplier Partner</h3>
                  <p className="text-xs text-slate-400">Add a new vendor to your SCM procurement directory</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Company / Enterprise Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Auto Spares & Lubricants"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Rohan Fernando"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Phone / Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="+94 11 250 8899"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="sales@apexspares.lk"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Office / Warehouse Address
                  </label>
                  <input
                    type="text"
                    placeholder="No 78, Baseline Road, Colombo 09"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Procurement Terms & Lead Times
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Net 30 days credit terms, 2-day delivery lead time, warranty contact..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
                  />
                </div>
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
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all shadow-md shadow-sky-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Supplier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SUPPLIER */}
      {isEditModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Supplier Details</h3>
                  <p className="text-xs text-slate-400">Update company contact details and procurement terms</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Company / Enterprise Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Phone / Mobile Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Office / Warehouse Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Procurement Terms & Lead Times
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
                  />
                </div>
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
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all shadow-md shadow-sky-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Supplier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUPPLIER PROFILE & PROCUREMENT LEDGER DRAWER */}
      {isDetailModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 border border-sky-400/30 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-sky-600/30">
                  {selectedSupplier.companyName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedSupplier.companyName}</h3>
                    {selectedSupplier.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                        Active Partner
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-semibold">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedSupplier.contactPerson ? `Contact: ${selectedSupplier.contactPerson} • ` : ''}Registered {formatDate(selectedSupplier.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSupplierDetail(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-6 pr-1">
              {/* Profile summary badges */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Purchase Orders</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {selectedSupplier.totalOrders}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Total Procurement</span>
                  <span className="text-lg font-bold text-sky-400 mt-1 block">
                    {formatCurrency(selectedSupplier.totalPurchases, currency)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Accounts Payable</span>
                  <span className={`text-lg font-bold mt-1 block ${selectedSupplier.outstandingDues > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatCurrency(selectedSupplier.outstandingDues, currency)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Linked Products</span>
                  <span className="text-lg font-bold text-indigo-400 mt-1 block">
                    {selectedSupplier.productsCount}
                  </span>
                </div>
              </div>

              {/* Contact & Terms Card */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Contact Information & SCM Terms
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{selectedSupplier.email || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{selectedSupplier.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>{selectedSupplier.address || 'No physical address provided'}</span>
                  </div>
                </div>

                {selectedSupplier.notes && (
                  <div className="pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400 font-semibold block mb-1">Procurement Notes & Terms:</span>
                    <p className="text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      "{selectedSupplier.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Purchase Orders Ledger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-sky-400" />
                    <span>Purchase Orders Ledger</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {supplierDetail?.purchases?.length ?? 0} order(s)
                  </span>
                </div>

                {detailLoading ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-500 mx-auto mb-2" />
                    <span className="text-xs">Loading purchase ledger...</span>
                  </div>
                ) : !supplierDetail?.purchases || supplierDetail.purchases.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-400">
                    <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-300">No purchase orders recorded yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Purchase orders placed with this supplier will automatically appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supplierDetail.purchases.map((purchase) => {
                      const totalPaid = purchase.payments.reduce((acc, p) => acc + p.amount, 0);
                      const balance = Math.max(0, purchase.total - totalPaid);

                      return (
                        <div
                          key={purchase.id}
                          className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-mono text-xs font-semibold">
                                #{purchase.orderNumber.slice(-4)}
                              </div>
                              <div>
                                <span className="font-semibold text-white text-xs block">
                                  {purchase.orderNumber}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatDate(purchase.purchaseDate)} • {purchase.items.length} item(s)
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-bold text-white text-xs block">
                                {formatCurrency(purchase.total, currency)}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                                  purchase.status === 'PAID'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : purchase.status === 'PARTIALLY_PAID'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : purchase.status === 'RECEIVED'
                                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {purchase.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Items and Payments Summary */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                            <div>
                              <span>Paid to Vendor: <strong className="text-emerald-400">{formatCurrency(totalPaid, currency)}</strong></span>
                            </div>
                            {balance > 0 && (
                              <div>
                                <span>Outstanding Due: <strong className="text-amber-400">{formatCurrency(balance, currency)}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Linked Catalog Products */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-indigo-400" />
                    <span>Catalog Products from this Supplier</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {supplierDetail?.products?.length ?? 0} product(s)
                  </span>
                </div>

                {!supplierDetail?.products || supplierDetail.products.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-400">
                    <Package className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-400">No catalog products assigned to this supplier yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {supplierDetail.products.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-white text-xs block truncate max-w-[180px]">
                            {prod.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            SKU: {prod.sku}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-slate-300 block">
                            Cost: {formatCurrency(prod.costPrice, currency)}
                          </span>
                          <span className="text-[10px] text-emerald-400">
                            {prod.currentStock} {prod.unit} in stock
                          </span>
                        </div>
                      </div>
                    ))}
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
                  setSupplierDetail(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {isDeleteModalOpen && supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Supplier Record?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete supplier{' '}
              <strong className="text-white">{supplierToDelete.companyName}</strong> from your records?
            </p>

            {(supplierToDelete.totalOrders > 0 || supplierToDelete.productsCount > 0) && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Notice: This supplier has <strong>{supplierToDelete.totalOrders} order(s)</strong> and <strong>{supplierToDelete.productsCount} linked product(s)</strong>.
                  Database integrity prevents deletion to protect accounting & stock trails.
                  Please use <strong>Archive</strong> instead.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSupplierToDelete(null);
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
