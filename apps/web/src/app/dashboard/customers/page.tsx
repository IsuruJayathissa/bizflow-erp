'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
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
  RotateCcw,
  Download,
  Loader2,
  Eye,
  Archive,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  ChevronRight,
  Receipt,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  customerService,
  CustomerItem,
  CustomerStats,
  CustomerDetail,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from '@/services/customer.service';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CustomersPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  // Data states
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
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

  // Selected customer for operations
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerItem | null>(null);

  // Feedback states
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateCustomerPayload>({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Permission flags based on role
  const canManage = ['ADMIN', 'MANAGER', 'SALES_STAFF'].includes(user?.role || '');
  const canDeleteOrArchive = ['ADMIN', 'MANAGER'].includes(user?.role || '');

  // Fetch customer list
  const fetchCustomers = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const params: { search?: string; isActive?: boolean } = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter === 'ACTIVE') params.isActive = true;
      if (statusFilter === 'ARCHIVED') params.isActive = false;

      const data = await customerService.getCustomers(params);
      setCustomers(data);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch CRM aggregate stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await customerService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load customer stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Open customer details ledger drawer
  const handleOpenDetail = async (customer: CustomerItem) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const detail = await customerService.getCustomer(customer.id);
      setCustomerDetail(detail);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load customer details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (customer: CustomerItem) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setErrorMsg(null);
    setIsEditModalOpen(true);
  };

  // Submit Add Customer
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Customer name is required');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await customerService.createCustomer({
        name: formData.name.trim(),
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      });

      setSuccessMsg('Customer profile successfully created');
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
      fetchCustomers();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit Customer
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!formData.name.trim()) {
      setErrorMsg('Customer name is required');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await customerService.updateCustomer(selectedCustomer.id, {
        name: formData.name.trim(),
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      });

      setSuccessMsg('Customer profile updated successfully');
      setIsEditModalOpen(false);
      fetchCustomers();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update customer');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle active/archive status
  const handleToggleStatus = async (customer: CustomerItem) => {
    try {
      setActionLoading(true);
      await customerService.toggleStatus(customer.id);
      setSuccessMsg(`Customer ${customer.isActive ? 'archived' : 'reactivated'} successfully`);
      fetchCustomers();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update customer status');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete click
  const handleDeleteClick = (customer: CustomerItem) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  // Confirm customer delete
  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await customerService.deleteCustomer(customerToDelete.id);
      setSuccessMsg('Customer deleted successfully');
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
      fetchCustomers();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete customer');
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

  // Export customers to CSV
  const handleExportCSV = () => {
    if (customers.length === 0) return;
    const headers = ['Name', 'Email', 'Phone', 'Address', 'Total Orders', 'Total Spent', 'Outstanding Balance', 'Status', 'Created Date'];
    const rows = customers.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.totalOrders,
      c.totalSpent,
      c.outstandingBalance,
      c.isActive ? 'Active' : 'Archived',
      `"${formatDate(c.createdAt)}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bizflow_customers_${new Date().toISOString().slice(0, 10)}.csv`);
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
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Customer Management (CRM)</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Directory of client accounts, purchase ledger histories, contact information, and outstanding balances.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fetchCustomers(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-2 text-xs font-semibold"
            title="Refresh customer data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={customers.length === 0}
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
                setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 High-Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Customers</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : (stats?.totalCustomers ?? 0)}
            </span>
            <span className="text-xs text-slate-400 ml-2">registered profiles</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-400">
            <span>Client database size</span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : (stats?.activeCustomers ?? 0)}
            </span>
            {stats && stats.totalCustomers > 0 && (
              <span className="text-xs text-emerald-400 ml-2">
                ({Math.round(((stats.activeCustomers || 0) / stats.totalCustomers) * 100)}% active)
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>In good standing</span>
          </div>
        </div>

        {/* Total CRM Sales Revenue */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Customer Lifetime Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : formatCurrency(stats?.totalRevenue ?? 0, currency)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-violet-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Cumulative sales volume</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Outstanding Receivables</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold tracking-tight ${(stats?.outstandingReceivables ?? 0) > 0 ? 'text-amber-400' : 'text-white'}`}>
              {statsLoading ? '...' : formatCurrency(stats?.outstandingReceivables ?? 0, currency)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Unpaid invoice balance</span>
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
            placeholder="Search by client name, email, or phone..."
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

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-center sm:justify-start">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Accounts
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'ACTIVE'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setStatusFilter('ARCHIVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'ARCHIVED'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Customer Profile</th>
                <th className="py-3.5 px-6">Contact Channels</th>
                <th className="py-3.5 px-6">Orders & Value</th>
                <th className="py-3.5 px-6">Outstanding Dues</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Joined Date</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <span>Loading customer directory...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">No customers found</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {search
                            ? 'No clients match your search query.'
                            : 'Get started by creating your first client account profile.'}
                        </p>
                      </div>
                      {canManage && !search && (
                        <button
                          onClick={() => {
                            setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
                            setIsAddModalOpen(true);
                          }}
                          className="mt-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add First Customer</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const initial = c.name.charAt(0).toUpperCase();
                  const hasDue = c.outstandingBalance > 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-default"
                    >
                      {/* Customer Profile */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-violet-500/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0 shadow-inner">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-white block truncate text-sm">
                              {c.name}
                            </span>
                            {c.notes ? (
                              <span className="text-[11px] text-slate-400 block truncate max-w-xs" title={c.notes}>
                                {c.notes}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">No notes</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Channels */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {c.phone ? (
                            <a
                              href={`tel:${c.phone}`}
                              className="flex items-center gap-1.5 text-slate-300 hover:text-indigo-400 transition-colors truncate max-w-[180px]"
                            >
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{c.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-500 text-[11px] block">— No phone</span>
                          )}

                          {c.email ? (
                            <div className="flex items-center gap-1 text-slate-400">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[160px]">{c.email}</span>
                              <button
                                onClick={() => handleCopy(c.email!, `email-${c.id}`)}
                                title="Copy Email"
                                className="text-slate-500 hover:text-slate-300 p-0.5"
                              >
                                {copiedId === `email-${c.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : null}

                          {c.address && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate max-w-[200px]" title={c.address}>
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{c.address}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Orders & Lifetime Value */}
                      <td className="py-4 px-6">
                        <div>
                          <span className="font-semibold text-slate-200 block">
                            {formatCurrency(c.totalSpent, currency)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {c.totalOrders} {c.totalOrders === 1 ? 'sale' : 'sales'} recorded
                          </span>
                        </div>
                      </td>

                      {/* Outstanding Dues */}
                      <td className="py-4 px-6">
                        {hasDue ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{formatCurrency(c.outstandingBalance, currency)}</span>
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
                        {c.isActive ? (
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

                      {/* Joined Date */}
                      <td className="py-4 px-6 text-slate-400 text-[11px]">
                        {formatDate(c.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => handleOpenDetail(c)}
                            title="View Ledger & Profile"
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Customer */}
                          {canManage && (
                            <button
                              onClick={() => handleOpenEdit(c)}
                              title="Edit Customer"
                              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Archive/Restore */}
                          {canDeleteOrArchive && (
                            <button
                              onClick={() => handleToggleStatus(c)}
                              title={c.isActive ? 'Archive Customer' : 'Restore Customer'}
                              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {canDeleteOrArchive && (
                            <button
                              onClick={() => handleDeleteClick(c)}
                              title="Delete Customer"
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

      {/* MODAL 1: ADD CUSTOMER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Customer Profile</h3>
                  <p className="text-xs text-slate-400">Add a new client to your CRM database</p>
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Customer / Business Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunil Perera or Horizon Motors"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="sunil@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+94 77 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Billing / Delivery Address
                </label>
                <input
                  type="text"
                  placeholder="No 45, Galle Road, Colombo 03"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  CRM Notes & Preferences
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes, credit terms, VIP preference..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  <span>Save Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CUSTOMER */}
      {isEditModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Customer Profile</h3>
                  <p className="text-xs text-slate-400">Update contact and address details</p>
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Customer / Business Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Billing / Delivery Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  CRM Notes & Preferences
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
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
                  <span>Update Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CUSTOMER PROFILE & TRANSACTION LEDGER DRAWER */}
      {isDetailModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 border border-indigo-400/30 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-indigo-600/30">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedCustomer.name}</h3>
                    {selectedCustomer.isActive ? (
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
                    Member since {formatDate(selectedCustomer.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setCustomerDetail(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-6 pr-1">
              {/* Profile summary badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Total Orders</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {selectedCustomer.totalOrders}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Lifetime Spend</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">
                    {formatCurrency(selectedCustomer.totalSpent, currency)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Outstanding Dues</span>
                  <span className={`text-lg font-bold mt-1 block ${selectedCustomer.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {formatCurrency(selectedCustomer.outstandingBalance, currency)}
                  </span>
                </div>
              </div>

              {/* Contact & Notes Cards */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{selectedCustomer.email || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{selectedCustomer.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{selectedCustomer.address || 'No billing address provided'}</span>
                  </div>
                </div>

                {selectedCustomer.notes && (
                  <div className="pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400 font-semibold block mb-1">CRM Notes:</span>
                    <p className="text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      "{selectedCustomer.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Transaction Ledger & Sales History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-400" />
                    <span>Sales & Invoices Ledger</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {customerDetail?.sales?.length ?? 0} transaction(s)
                  </span>
                </div>

                {detailLoading ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
                    <span className="text-xs">Loading transaction ledger...</span>
                  </div>
                ) : !customerDetail?.sales || customerDetail.sales.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-400">
                    <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-300">No purchases or invoices recorded yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Transactions will automatically appear here once sales orders or invoices are generated.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerDetail.sales.map((sale) => {
                      const totalPaid = sale.payments.reduce((acc, p) => acc + p.amount, 0);
                      const balance = Math.max(0, sale.total - totalPaid);

                      return (
                        <div
                          key={sale.id}
                          className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-xs font-semibold">
                                #{sale.saleNumber.slice(-4)}
                              </div>
                              <div>
                                <span className="font-semibold text-white text-xs block">
                                  {sale.saleNumber}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatDate(sale.saleDate)}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-bold text-white text-xs block">
                                {formatCurrency(sale.total, currency)}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                                  sale.status === 'PAID'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : sale.status === 'PARTIALLY_PAID'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {sale.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Invoice & Payments Breakdown */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                            <div>
                              {sale.invoice ? (
                                <span>Invoice: <strong className="text-slate-300">{sale.invoice.invoiceNumber}</strong></span>
                              ) : (
                                <span className="text-slate-500">Direct POS Order</span>
                              )}
                            </div>
                            <div>
                              <span>Paid: <strong className="text-emerald-400">{formatCurrency(totalPaid, currency)}</strong></span>
                              {balance > 0 && (
                                <span className="ml-2">Due: <strong className="text-rose-400">{formatCurrency(balance, currency)}</strong></span>
                              )}
                            </div>
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
                  setCustomerDetail(null);
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
      {isDeleteModalOpen && customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Customer Profile?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove{' '}
              <strong className="text-white">{customerToDelete.name}</strong> from your CRM records?
            </p>

            {customerToDelete.totalOrders > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Notice: This customer has <strong>{customerToDelete.totalOrders} order(s)</strong> recorded.
                  To preserve financial audit records, database integrity will prevent deletion.
                  Please use <strong>Archive</strong> instead.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCustomerToDelete(null);
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
