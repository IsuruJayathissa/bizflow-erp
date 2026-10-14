'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  AlertCircle,
  Eye,
  RefreshCw,
  X,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Printer,
  Building2,
  User,
  CreditCard,
  Banknote,
  AlertTriangle,
  Receipt,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  invoiceService,
  InvoiceRecord,
  InvoiceDetail,
  InvoiceStats,
  InvoiceStatus,
} from '@/services/invoice.service';
import { customerService, CustomerItem } from '@/services/customer.service';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function InvoicesPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  // Data states
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'OVERDUE' | 'ALL'>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isDueDateModalOpen, setIsDueDateModalOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Toast feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadInvoicesList();
    }
  }, [page, statusFilter, selectedCustomerId, startDate, endDate]);

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [statsRes, custRes, invRes] = await Promise.all([
        invoiceService.getStats(),
        customerService.getCustomers(),
        invoiceService.getInvoices({ page: 1, limit: 15 }),
      ]);
      setStats(statsRes);
      setCustomers(custRes);
      setInvoices(invRes.items);
      setTotalPages(invRes.totalPages);
      setTotalCount(invRes.total);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoicesList = async () => {
    try {
      const isOverdueQuery = statusFilter === 'OVERDUE' ? 'true' : undefined;
      const statusQuery = statusFilter === 'OVERDUE' || statusFilter === 'ALL' ? undefined : statusFilter;

      const res = await invoiceService.getInvoices({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusQuery,
        isOverdue: isOverdueQuery,
        customerId: selectedCustomerId === 'ALL' ? undefined : selectedCustomerId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setInvoices(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err: any) {
      setErrorMsg('Failed to update invoices list');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      const isOverdueQuery = statusFilter === 'OVERDUE' ? 'true' : undefined;
      const statusQuery = statusFilter === 'OVERDUE' || statusFilter === 'ALL' ? undefined : statusFilter;

      const [statsRes, invRes] = await Promise.all([
        invoiceService.getStats(),
        invoiceService.getInvoices({
          page,
          limit: 15,
          search: search.trim() || undefined,
          status: statusQuery,
          isOverdue: isOverdueQuery,
          customerId: selectedCustomerId === 'ALL' ? undefined : selectedCustomerId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      ]);
      setStats(statsRes);
      setInvoices(invRes.items);
      setTotalPages(invRes.totalPages);
      setTotalCount(invRes.total);
      setSuccessMsg('Invoices refreshed');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg('Failed to refresh invoices');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadInvoicesList();
  };

  const handleViewInvoice = async (invoiceId: string) => {
    setDetailLoading(true);
    try {
      const detail = await invoiceService.getInvoice(invoiceId);
      setSelectedInvoice(detail);
      setNewDueDate(detail.dueDate ? detail.dueDate.slice(0, 10) : '');
      setIsInvoiceModalOpen(true);
    } catch (err: any) {
      setErrorMsg('Failed to load invoice document');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateDueDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !newDueDate) return;
    try {
      await invoiceService.updateInvoice(selectedInvoice.id, {
        dueDate: newDueDate,
      });
      setSuccessMsg('Invoice due date updated');
      setTimeout(() => setSuccessMsg(null), 3000);
      setIsDueDateModalOpen(false);
      handleViewInvoice(selectedInvoice.id);
      handleRefresh();
    } catch (err: any) {
      setErrorMsg('Failed to update due date');
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
            <FileText className="w-3.5 h-3.5" />
            <span>Billing, Accounts Receivable & Tax Documents</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Invoices & Document Engine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate formal A4 corporate tax invoices, monitor due dates, track partial settlements, and print dispatch slips.
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
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Billed */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Total Invoiced</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {stats ? formatCurrency(stats.totalBilled, currency) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Across {stats?.totalInvoices || 0} tax invoices</span>
          </div>
        </div>

        {/* Paid / Collected */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Paid & Settled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {stats ? formatCurrency(stats.totalCollected, currency) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>{stats?.paidInvoicesCount || 0} fully paid invoices</span>
          </div>
        </div>

        {/* Unpaid / Receivables */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Outstanding Dues</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 tracking-tight">
            {stats ? formatCurrency(stats.outstandingReceivables, currency) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>{stats?.unpaidInvoicesCount || 0} pending payments</span>
          </div>
        </div>

        {/* Overdue Alerts */}
        <div
          onClick={() => {
            setStatusFilter('OVERDUE');
            setPage(1);
          }}
          className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-rose-500/40 rounded-2xl relative overflow-hidden group cursor-pointer transition-all"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/15 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Overdue Invoices</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 tracking-tight flex items-center gap-2">
            <span>{stats ? stats.overdueCount : '—'}</span>
            {stats && stats.overdueCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">
                Action Req.
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Unpaid past due date</span>
          </div>
        </div>

        {/* Total Invoices Count */}
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl relative overflow-hidden group col-span-2 md:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">Invoices Issued</span>
            <Receipt className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {stats ? stats.totalInvoices : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            <span>Total records generated</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice number, sale #, or customer..."
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
            {(['ALL', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'OVERDUE', 'CANCELLED'] as const).map((st) => (
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

          {/* Customer Dropdown */}
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

      {/* Invoices Table */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-medium">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No invoices found</p>
            <p className="text-xs text-slate-500">Invoices are automatically generated when sales orders are placed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Invoice # / Sale Ref</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-right">Invoice Total</th>
                  <th className="py-3.5 px-4 text-right">Balance Due</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                {invoices.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  const isPartial = inv.status === 'PARTIALLY_PAID';
                  const isCancelled = inv.status === 'CANCELLED';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Invoice Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                          <span>{inv.invoiceNumber}</span>
                          <button
                            onClick={() => copyToClipboard(inv.invoiceNumber, inv.id)}
                            className="p-1 hover:text-indigo-400 text-slate-500 transition-colors"
                            title="Copy Invoice Number"
                          >
                            {copiedId === inv.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Ref: {inv.saleId ? 'Linked to Sale' : 'Direct'}
                        </div>
                      </td>

                      {/* Issue Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                        <div>{formatDate(inv.issueDate)}</div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {inv.dueDate ? (
                          <div
                            className={`${
                              inv.isOverdue ? 'text-rose-400 font-bold flex items-center gap-1' : 'text-slate-400'
                            }`}
                          >
                            {inv.isOverdue && <AlertTriangle className="w-3 h-3 shrink-0" />}
                            <span>{formatDate(inv.dueDate)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-normal">Immediate</span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-white">
                          {inv.customer ? inv.customer.name : 'Walk-in Retail'}
                        </div>
                        {inv.customer?.phone && (
                          <div className="text-[10px] text-slate-500">{inv.customer.phone}</div>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-sm text-white">
                        {formatCurrency(inv.total, currency)}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-xs">
                        {inv.balanceDue > 0 ? (
                          <span className="text-amber-400">{formatCurrency(inv.balanceDue, currency)}</span>
                        ) : (
                          <span className="text-slate-500 font-normal">Settled</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isPaid
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : inv.isOverdue
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : isPartial
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : isCancelled
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          }`}
                        >
                          {isPaid && <CheckCircle2 className="w-3 h-3" />}
                          {inv.isOverdue && <AlertTriangle className="w-3 h-3" />}
                          {!isPaid && !inv.isOverdue && isPartial && <Clock className="w-3 h-3" />}
                          <span>{inv.isOverdue ? 'OVERDUE' : inv.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewInvoice(inv.id)}
                            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm"
                            title="View Formal A4 Tax Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>View / Print A4</span>
                          </button>
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
              <span className="font-semibold text-white">{totalPages}</span> ({totalCount} invoices)
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
      {/* MODAL: FORMAL A4 CORPORATE TAX INVOICE DOCUMENT ENGINE                     */}
      {/* ========================================================================= */}
      {isInvoiceModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Modal Header Toolbar */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Corporate Tax Invoice • {selectedInvoice.invoiceNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDueDateModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Set Due Date</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/25"
                  title="Print Invoice"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Tax Invoice Body (Ready for Screen & Clean Print) */}
            <div className="p-8 space-y-6 bg-slate-950 text-xs">
              {/* Top Business & Invoice Title Header */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                      B
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {selectedInvoice.business?.name || user?.business?.name || 'BizFlow Enterprise'}
                    </h2>
                  </div>
                  {selectedInvoice.business?.registrationNo && (
                    <p className="text-[11px] text-slate-400">
                      Reg / VAT No: <span className="font-mono text-slate-300">{selectedInvoice.business.registrationNo}</span>
                    </p>
                  )}
                  {selectedInvoice.business?.address && (
                    <p className="text-[11px] text-slate-400">{selectedInvoice.business.address}</p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Tel: {selectedInvoice.business?.phone || '—'} | Email: {selectedInvoice.business?.email || '—'}
                  </p>
                </div>

                {/* Big Right Meta */}
                <div className="text-left md:text-right space-y-1">
                  <h1 className="text-xl font-black text-white tracking-wider">TAX INVOICE</h1>
                  <div className="text-sm font-mono font-bold text-indigo-400">{selectedInvoice.invoiceNumber}</div>
                  <div className="text-[11px] text-slate-400">Issue Date: {formatDate(selectedInvoice.issueDate)}</div>
                  {selectedInvoice.dueDate && (
                    <div className={`text-[11px] ${selectedInvoice.isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      Due Date: {formatDate(selectedInvoice.dueDate)}
                    </div>
                  )}

                  {/* Status Stamp */}
                  <div className="pt-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider border-2 ${
                        selectedInvoice.status === 'PAID'
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                          : selectedInvoice.isOverdue
                          ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                          : 'border-amber-500 text-amber-400 bg-amber-500/10'
                      }`}
                    >
                      {selectedInvoice.isOverdue ? 'PAYMENT OVERDUE' : selectedInvoice.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Billed To / Client Section */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Billed To (Client / Customer)
                </div>
                <div className="text-sm font-bold text-white">
                  {selectedInvoice.customer ? selectedInvoice.customer.name : 'Walk-in Retail Customer'}
                </div>
                {selectedInvoice.customer?.phone && (
                  <div className="text-slate-400 mt-0.5">Phone: {selectedInvoice.customer.phone}</div>
                )}
                {selectedInvoice.customer?.email && (
                  <div className="text-slate-400">Email: {selectedInvoice.customer.email}</div>
                )}
                {selectedInvoice.customer?.address && (
                  <div className="text-slate-400">Address: {selectedInvoice.customer.address}</div>
                )}
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Description / Product</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Total ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {selectedInvoice.items?.map((item, index) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4 text-slate-500">{index + 1}</td>
                        <td className="py-3 px-4 font-semibold text-white">{item.product?.name || 'Item'}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{item.product?.sku}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {item.quantity} {item.product?.unit || 'units'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.unitPrice, currency)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {formatCurrency(item.total, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown & Remittance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Left: Payment Notes & Bank Details */}
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs space-y-1">
                    <span className="font-bold text-white block">Payment Remittance Details:</span>
                    <p className="text-slate-400 text-[11px]">
                      Please reference <span className="font-mono text-white font-bold">{selectedInvoice.invoiceNumber}</span> on bank transfer slips.
                    </p>
                    <p className="text-slate-400 text-[11px]">Account Name: {selectedInvoice.business?.name || 'BizFlow Enterprise'}</p>
                  </div>

                  {selectedInvoice.sale?.notes && (
                    <div className="text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">Remarks: </span>
                      <span>{selectedInvoice.sale.notes}</span>
                    </div>
                  )}
                </div>

                {/* Right: Calculations */}
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="text-white">{formatCurrency(selectedInvoice.subtotal, currency)}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount:</span>
                      <span>-{formatCurrency(selectedInvoice.discount, currency)}</span>
                    </div>
                  )}
                  {selectedInvoice.tax > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>VAT / Tax:</span>
                      <span className="text-white">+{formatCurrency(selectedInvoice.tax, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                    <span>INVOICE TOTAL:</span>
                    <span className="text-emerald-400">{formatCurrency(selectedInvoice.total, currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-1">
                    <span>Amount Paid:</span>
                    <span className="text-white font-semibold">{formatCurrency(selectedInvoice.paidAmount, currency)}</span>
                  </div>
                  {selectedInvoice.balanceDue > 0 && (
                    <div className="flex justify-between text-amber-400 font-bold pt-1 border-t border-slate-800/60">
                      <span>Balance Outstanding:</span>
                      <span>{formatCurrency(selectedInvoice.balanceDue, currency)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Signature */}
              <div className="pt-8 mt-6 border-t border-slate-800 flex justify-between items-end text-[11px] text-slate-500">
                <div>
                  <p>Computer-generated legal tax invoice.</p>
                  <p>Issued under BizFlow ERP System.</p>
                </div>
                <div className="text-right">
                  <div className="w-44 border-b border-slate-700 pb-1 mb-1" />
                  <span>Authorized Signature & Company Seal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SET INVOICE DUE DATE                                               */}
      {/* ========================================================================= */}
      {isDueDateModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Update Invoice Due Date</h3>
            <p className="text-xs text-slate-400">Set the payment deadline for invoice {selectedInvoice.invoiceNumber}.</p>
            <form onSubmit={handleUpdateDueDate} className="space-y-4">
              <input
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDueDateModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Save Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
