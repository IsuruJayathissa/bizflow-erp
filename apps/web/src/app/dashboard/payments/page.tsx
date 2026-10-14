'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Building,
  Calendar,
  Eye,
  RefreshCw,
  Plus,
  X,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  Building2,
  User,
  Truck,
  FileText,
  ShoppingBag,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  paymentService,
  PaymentRecord,
  PaymentDetail,
  PaymentStats,
  PaymentMethod,
  PaymentDirection,
} from '@/services/payment.service';
import { invoiceService, InvoiceRecord } from '@/services/invoice.service';
import { purchaseService, PurchaseRecord } from '@/services/purchase.service';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PaymentsPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  // Data states
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Record Form state
  const [recordDirection, setRecordDirection] = useState<'INCOMING' | 'OUTGOING'>('INCOMING');
  const [unpaidInvoices, setUnpaidInvoices] = useState<InvoiceRecord[]>([]);
  const [unpaidPurchases, setUnpaidPurchases] = useState<PurchaseRecord[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Toast feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadPaymentsList();
    }
  }, [page, directionFilter, methodFilter, startDate, endDate]);

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [statsRes, paymentsRes] = await Promise.all([
        paymentService.getStats(),
        paymentService.getPayments({ page: 1, limit: 15 }),
      ]);
      setStats(statsRes);
      setPayments(paymentsRes.items);
      setTotalPages(paymentsRes.totalPages);
      setTotalCount(paymentsRes.total);
    } catch (err: any) {
      console.error('Failed to load initial payments data', err);
      setErrorMsg('Failed to load payments ledger. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentsList = async () => {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      const res = await paymentService.getPayments({
        search: search.trim() || undefined,
        type: directionFilter !== 'ALL' ? directionFilter : undefined,
        paymentMethod: methodFilter !== 'ALL' ? methodFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 15,
      });
      setPayments(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err: any) {
      console.error('Failed to filter payments', err);
      setErrorMsg('Failed to refresh payments list.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPaymentsList();
  };

  const handleOpenRecordModal = async () => {
    setIsRecordModalOpen(true);
    setErrorMsg(null);
    // Preload unpaid invoices and purchases
    try {
      const [invRes, purRes] = await Promise.all([
        invoiceService.getInvoices({ limit: 50 }),
        purchaseService.getPurchases({ limit: 50 }),
      ]);
      const pendingInvoices = invRes.items.filter(
        (i) => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID',
      );
      const pendingPurchases = purRes.items.filter(
        (p) => p.status === 'PENDING' || p.status === 'RECEIVED' || p.status === 'PARTIALLY_PAID',
      );
      setUnpaidInvoices(pendingInvoices);
      setUnpaidPurchases(pendingPurchases);

      if (pendingInvoices.length > 0 && recordDirection === 'INCOMING') {
        setSelectedInvoiceId(pendingInvoices[0].id);
        setAmount(pendingInvoices[0].balanceDue || pendingInvoices[0].total);
      }
    } catch (err) {
      console.error('Failed to fetch pending documents', err);
    }
  };

  const handleInvoiceSelect = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = unpaidInvoices.find((i) => i.id === invId);
    if (inv) {
      setAmount(inv.balanceDue || inv.total);
    }
  };

  const handlePurchaseSelect = (purId: string) => {
    setSelectedPurchaseId(purId);
    const pur = unpaidPurchases.find((p) => p.id === purId);
    if (pur) {
      setAmount(pur.balanceDue || pur.total);
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Please specify a valid payment amount greater than zero.');
      return;
    }

    if (recordDirection === 'INCOMING' && !selectedInvoiceId) {
      setErrorMsg('Please select an invoice to settle.');
      return;
    }

    if (recordDirection === 'OUTGOING' && !selectedPurchaseId) {
      setErrorMsg('Please select a purchase order to settle.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await paymentService.recordPayment({
        amount: Number(amount),
        paymentMethod,
        invoiceId: recordDirection === 'INCOMING' ? selectedInvoiceId : undefined,
        purchaseId: recordDirection === 'OUTGOING' ? selectedPurchaseId : undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : undefined,
      });

      setSuccessMsg('Payment successfully recorded and account balances updated!');
      setIsRecordModalOpen(false);
      resetRecordForm();

      // Refresh data
      const statsRes = await paymentService.getStats();
      setStats(statsRes);
      loadPaymentsList();

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to record payment', err);
      setErrorMsg(err.response?.data?.message || 'Failed to record payment settlement.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetRecordForm = () => {
    setSelectedInvoiceId('');
    setSelectedPurchaseId('');
    setAmount('');
    setReference('');
    setNotes('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
  };

  const handleViewVoucher = async (paymentId: string) => {
    setDetailLoading(true);
    try {
      const detail = await paymentService.getPayment(paymentId);
      setSelectedPayment(detail);
      setIsVoucherModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch voucher', err);
      setErrorMsg('Could not fetch payment voucher.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Banknote className="w-3.5 h-3.5" /> Cash
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CreditCard className="w-3.5 h-3.5" /> Card / POS
          </span>
        );
      case 'BANK_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Building className="w-3.5 h-3.5" /> Bank Transfer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wallet className="w-3.5 h-3.5" /> Other / Cheque
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600/90 text-white px-4 py-3 rounded-xl shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <Check className="w-5 h-5 text-emerald-200" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600/90 text-white px-4 py-3 rounded-xl shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-5 h-5 text-rose-200" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Payment Ledger & Tracking</h1>
              <p className="text-xs text-slate-400">
                Unified audit trail for incoming customer receipts & outgoing supplier disbursements
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setPage(1);
              loadPaymentsList();
            }}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenRecordModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium text-xs hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Record Payment / Settlement
          </button>
        </div>
      </div>

      {/* Glassmorphic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflows */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Inflows
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {formatCurrency(stats?.totalInflows || 0, currency)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Today:</span>
            <span className="font-semibold text-emerald-400">
              +{formatCurrency(stats?.today.inflows || 0, currency)}
            </span>
          </div>
        </div>

        {/* Total Outflows */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Outflows
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">
            {formatCurrency(stats?.totalOutflows || 0, currency)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Today:</span>
            <span className="font-semibold text-rose-400">
              -{formatCurrency(stats?.today.outflows || 0, currency)}
            </span>
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Net Cash Flow
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-bold ${
              (stats?.netCashFlow || 0) >= 0 ? 'text-indigo-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(stats?.netCashFlow || 0, currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {stats?.totalPaymentsCount || 0} total settlements reconciled
          </div>
        </div>

        {/* Breakdown by Method */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Method Breakdown
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="flex items-center justify-between bg-slate-950/40 px-2 py-1 rounded-md border border-slate-800/50">
              <span className="text-slate-400">Cash:</span>
              <span className="font-semibold text-emerald-400">
                {formatCurrency(stats?.byMethod.cash || 0, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/40 px-2 py-1 rounded-md border border-slate-800/50">
              <span className="text-slate-400">Card:</span>
              <span className="font-semibold text-purple-400">
                {formatCurrency(stats?.byMethod.card || 0, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/40 px-2 py-1 rounded-md border border-slate-800/50">
              <span className="text-slate-400">Bank:</span>
              <span className="font-semibold text-blue-400">
                {formatCurrency(stats?.byMethod.bankTransfer || 0, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/40 px-2 py-1 rounded-md border border-slate-800/50">
              <span className="text-slate-400">Other:</span>
              <span className="font-semibold text-amber-400">
                {formatCurrency(stats?.byMethod.other || 0, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference, notes, customer, supplier, sale #, invoice #, PO #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition"
            />
          </form>

          {/* Direction Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 shrink-0">
            <button
              onClick={() => {
                setDirectionFilter('ALL');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                directionFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => {
                setDirectionFilter('INCOMING');
                setPage(1);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                directionFilter === 'INCOMING'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Inflows
            </button>
            <button
              onClick={() => {
                setDirectionFilter('OUTGOING');
                setPage(1);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                directionFilter === 'OUTGOING'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Outflows
            </button>
          </div>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="ALL">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card / POS</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OTHER">Other / Cheque</option>
          </select>
        </div>

        {/* Date Filters & Reset */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/40 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {(search || directionFilter !== 'ALL' || methodFilter !== 'ALL' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setDirectionFilter('ALL');
                setMethodFilter('ALL');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="ml-auto text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Payment Ledger Table */}
      <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800/80">
              <tr>
                <th className="px-4 py-3.5">Date & Time</th>
                <th className="px-4 py-3.5">Direction</th>
                <th className="px-4 py-3.5">Linked Order / Invoice</th>
                <th className="px-4 py-3.5">Party (Customer / Supplier)</th>
                <th className="px-4 py-3.5">Method</th>
                <th className="px-4 py-3.5">Reference / Notes</th>
                <th className="px-4 py-3.5 text-right">Amount</th>
                <th className="px-4 py-3.5 text-center">Recorded By</th>
                <th className="px-4 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
                    <span>Loading payment transactions...</span>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                    <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="font-medium text-slate-300">No payment records found</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Try adjusting filters or record a new settlement.
                    </p>
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isIncoming = p.direction === 'INCOMING';
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                        <div className="font-medium">
                          {formatDate(p.paymentDate)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(p.paymentDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Direction */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isIncoming ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ArrowDownLeft className="w-3 h-3" /> Inflow
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <ArrowUpRight className="w-3 h-3" /> Outflow
                          </span>
                        )}
                      </td>

                      {/* Linked Doc */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.invoice ? (
                          <div className="flex items-center gap-1.5 font-mono text-indigo-400">
                            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{p.invoice.invoiceNumber}</span>
                          </div>
                        ) : p.sale ? (
                          <div className="flex items-center gap-1.5 font-mono text-emerald-400">
                            <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{p.sale.saleNumber}</span>
                          </div>
                        ) : p.purchase ? (
                          <div className="flex items-center gap-1.5 font-mono text-amber-400">
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{p.purchase.orderNumber}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Party */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-200">
                          {p.partyName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {p.sale?.customer?.phone || p.purchase?.supplier?.phone || ''}
                        </div>
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getMethodBadge(p.paymentMethod)}
                      </td>

                      {/* Reference & Notes */}
                      <td className="px-4 py-3 max-w-[200px] truncate">
                        {p.reference && (
                          <div className="font-mono text-slate-300 text-[11px]">
                            Ref: {p.reference}
                          </div>
                        )}
                        {p.notes && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {p.notes}
                          </div>
                        )}
                        {!p.reference && !p.notes && <span className="text-slate-500">—</span>}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-sm">
                        <span className={isIncoming ? 'text-emerald-400' : 'text-rose-400'}>
                          {isIncoming ? '+' : '-'}
                          {formatCurrency(p.amount, currency)}
                        </span>
                      </td>

                      {/* Recorded By */}
                      <td className="px-4 py-3 text-center whitespace-nowrap text-slate-400">
                        {p.recordedBy ? (
                          <span>
                            {p.recordedBy.firstName} {p.recordedBy.lastName}
                          </span>
                        ) : (
                          <span>System</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleViewVoucher(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition inline-flex items-center gap-1 border border-slate-700/60"
                        >
                          <Eye className="w-3 h-3" />
                          Voucher
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing {payments.length} of {totalCount} records (Page {page} of {totalPages})
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-200">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RECORD PAYMENT / SETTLEMENT MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsRecordModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Record Settlement / Payment</h3>
                <p className="text-xs text-slate-400">
                  Update customer collection or supplier disbursement accounts
                </p>
              </div>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-4">
              {/* Direction selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Settlement Flow
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRecordDirection('INCOMING');
                      if (unpaidInvoices.length > 0) {
                        setSelectedInvoiceId(unpaidInvoices[0].id);
                        setAmount(unpaidInvoices[0].balanceDue || unpaidInvoices[0].total);
                      } else {
                        setSelectedInvoiceId('');
                        setAmount('');
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                      recordDirection === 'INCOMING'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Incoming Receipt (Customer)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordDirection('OUTGOING');
                      if (unpaidPurchases.length > 0) {
                        setSelectedPurchaseId(unpaidPurchases[0].id);
                        setAmount(unpaidPurchases[0].balanceDue || unpaidPurchases[0].total);
                      } else {
                        setSelectedPurchaseId('');
                        setAmount('');
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                      recordDirection === 'OUTGOING'
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Outgoing Payment (Supplier)
                  </button>
                </div>
              </div>

              {/* Linked Document Selector */}
              {recordDirection === 'INCOMING' ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Select Customer Invoice to Settle
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {unpaidInvoices.length} unpaid / partial invoices
                    </span>
                  </div>
                  {unpaidInvoices.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-amber-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>No outstanding unpaid invoices found. All customer accounts are settled!</span>
                    </div>
                  ) : (
                    <select
                      value={selectedInvoiceId}
                      onChange={(e) => handleInvoiceSelect(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {unpaidInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} — {inv.customer?.name || 'Walk-in'} (Balance:{' '}
                          {formatCurrency(inv.balanceDue || inv.total, currency)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Select Supplier Purchase Order to Settle
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {unpaidPurchases.length} open purchase orders
                    </span>
                  </div>
                  {unpaidPurchases.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-amber-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>No outstanding supplier purchase orders found. All orders are settled!</span>
                    </div>
                  ) : (
                    <select
                      value={selectedPurchaseId}
                      onChange={(e) => handlePurchaseSelect(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {unpaidPurchases.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.orderNumber} — {po.supplier?.companyName || 'Supplier'} (Balance:{' '}
                          {formatCurrency(po.balanceDue || po.total, currency)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Amount & Quick Fill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Payment Amount ({currency}) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                        paymentMethod === m
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {m === 'CASH' && <Banknote className="w-4 h-4 text-emerald-400" />}
                      {m === 'CARD' && <CreditCard className="w-4 h-4 text-purple-400" />}
                      {m === 'BANK_TRANSFER' && <Building className="w-4 h-4 text-blue-400" />}
                      {m === 'OTHER' && <Wallet className="w-4 h-4 text-amber-400" />}
                      <span className="text-[10px] capitalize">
                        {m === 'BANK_TRANSFER' ? 'Bank' : m.toLowerCase()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Reference / Cheque # / Slip #
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. CHQ-9921, TXN-0012"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Notes / Memo
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Settled via commercial bank transfer"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT VOUCHER / RECEIPT MODAL */}
      {isVoucherModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 shadow-md transition"
                >
                  <Printer className="w-4 h-4" /> Print Voucher
                </button>
                <button
                  onClick={() => handleCopyText(selectedPayment.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition border border-slate-700/60"
                >
                  {copiedId === selectedPayment.id ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedId === selectedPayment.id ? 'Copied' : 'Copy ID'}
                </button>
              </div>

              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Voucher Content */}
            <div className="mt-6 space-y-6 text-slate-200 print:text-black print:m-0">
              {/* Header */}
              <div className="flex items-start justify-between pb-6 border-b border-slate-800/80 print:border-slate-300">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white print:border print:border-slate-800">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <h2 className="text-xl font-bold text-white print:text-black">
                      {selectedPayment.business.name}
                    </h2>
                  </div>
                  <div className="text-xs text-slate-400 print:text-slate-600 mt-2 space-y-0.5">
                    {selectedPayment.business.address && (
                      <p>{selectedPayment.business.address}</p>
                    )}
                    {selectedPayment.business.phone && (
                      <p>Phone: {selectedPayment.business.phone}</p>
                    )}
                    {selectedPayment.business.email && (
                      <p>Email: {selectedPayment.business.email}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 print:bg-slate-100 print:text-slate-900 print:border-slate-400">
                    {selectedPayment.direction === 'INCOMING'
                      ? 'Official Receipt'
                      : 'Payment Voucher'}
                  </span>
                  <div className="mt-2 font-mono text-xs text-slate-400 print:text-slate-700">
                    ID: {selectedPayment.id.slice(0, 13)}
                  </div>
                  <div className="text-xs text-slate-400 print:text-slate-700">
                    Date: {formatDate(selectedPayment.paymentDate)}
                  </div>
                </div>
              </div>

              {/* Settlement Parties Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 print:bg-slate-50 print:border-slate-300">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 print:text-slate-600 block mb-1">
                    {selectedPayment.direction === 'INCOMING'
                      ? 'Received From (Customer)'
                      : 'Paid To (Supplier)'}
                  </span>
                  <p className="font-bold text-sm text-white print:text-black">
                    {selectedPayment.partyName}
                  </p>
                  <p className="text-xs text-slate-400 print:text-slate-600">
                    {selectedPayment.sale?.customer?.phone ||
                      selectedPayment.purchase?.supplier?.phone ||
                      '—'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 print:text-slate-600 block mb-1">
                    Linked Transaction
                  </span>
                  {selectedPayment.invoice && (
                    <p className="font-mono text-xs font-semibold text-indigo-400 print:text-indigo-800">
                      Invoice: {selectedPayment.invoice.invoiceNumber}
                    </p>
                  )}
                  {selectedPayment.sale && (
                    <p className="font-mono text-xs font-semibold text-emerald-400 print:text-emerald-800">
                      Sale Order: {selectedPayment.sale.saleNumber}
                    </p>
                  )}
                  {selectedPayment.purchase && (
                    <p className="font-mono text-xs font-semibold text-amber-400 print:text-amber-800">
                      Purchase Order: {selectedPayment.purchase.orderNumber}
                    </p>
                  )}
                  {selectedPayment.reference && (
                    <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                      Ref / Cheque #: {selectedPayment.reference}
                    </p>
                  )}
                </div>
              </div>

              {/* Amount Box */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 to-indigo-950/40 border border-indigo-500/20 text-center print:bg-slate-100 print:border-slate-300">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 print:text-slate-600 block mb-1">
                  Settled Amount
                </span>
                <div className="text-3xl font-extrabold text-white print:text-black">
                  {formatCurrency(selectedPayment.amount, selectedPayment.business.currency)}
                </div>
                <div className="mt-2 text-xs text-indigo-300 print:text-slate-800 font-medium">
                  Payment Method: {selectedPayment.paymentMethod.replace('_', ' ')}
                </div>
                {selectedPayment.notes && (
                  <p className="mt-2 text-xs italic text-slate-400 print:text-slate-600">
                    "{selectedPayment.notes}"
                  </p>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-400 print:text-slate-700">
                <div>
                  <div className="border-t border-slate-700 print:border-slate-400 pt-2 font-medium">
                    Cashier / Recorded By
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedPayment.recordedBy
                      ? `${selectedPayment.recordedBy.firstName} ${selectedPayment.recordedBy.lastName}`
                      : 'Authorized Officer'}
                  </div>
                </div>

                <div>
                  <div className="border-t border-slate-700 print:border-slate-400 pt-2 font-medium">
                    Authorized Signatory / Seal
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedPayment.business.name}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
