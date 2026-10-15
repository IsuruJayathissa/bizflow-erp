'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  Calendar,
  Plus,
  RefreshCw,
  X,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Building2,
  Trash2,
  Edit2,
  AlertCircle,
  Tag,
  Banknote,
  Building,
  Wallet,
  PieChart,
  ArrowDownRight,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  expenseService,
  ExpenseCategory,
  ExpenseRecord,
  ExpenseStats,
  PaymentMethod,
} from '@/services/expense.service';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ExpensesPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  // Data states
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);

  // Record/Edit Form state
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');

  // Category Form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Toast feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadExpensesList();
    }
  }, [page, categoryFilter, methodFilter, startDate, endDate]);

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [catsRes, statsRes, expensesRes] = await Promise.all([
        expenseService.getCategories(),
        expenseService.getStats(),
        expenseService.getExpenses({ page: 1, limit: 15 }),
      ]);
      setCategories(catsRes);
      setStats(statsRes);
      setExpenses(expensesRes.items);
      setTotalPages(expensesRes.totalPages);
      setTotalCount(expensesRes.total);

      if (catsRes.length > 0 && !categoryId) {
        setCategoryId(catsRes[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load initial expenses data', err);
      setErrorMsg('Failed to load expense ledger. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadExpensesList = async () => {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      const res = await expenseService.getExpenses({
        search: search.trim() || undefined,
        categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        paymentMethod: methodFilter !== 'ALL' ? methodFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 15,
      });
      setExpenses(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err: any) {
      console.error('Failed to filter expenses', err);
      setErrorMsg('Failed to refresh expenses list.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadExpensesList();
  };

  const handleOpenRecordModal = () => {
    resetForm();
    if (categories.length > 0) {
      setCategoryId(categories[0].id);
    }
    setIsRecordModalOpen(true);
  };

  const handleOpenEditModal = (exp: ExpenseRecord) => {
    setSelectedExpense(exp);
    setTitle(exp.title);
    setCategoryId(exp.categoryId);
    setAmount(exp.amount);
    setExpenseDate(new Date(exp.expenseDate).toISOString().slice(0, 10));
    setPaymentMethod(exp.paymentMethod);
    setNotes(exp.notes || '');
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('CASH');
    setNotes('');
    setSelectedExpense(null);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please specify an expense title.');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Please select an expense category.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Please enter a valid expense amount greater than zero.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await expenseService.createExpense({
        title: title.trim(),
        categoryId,
        amount: Number(amount),
        expenseDate: expenseDate ? new Date(expenseDate).toISOString() : undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      setSuccessMsg('Operational expense recorded successfully!');
      setIsRecordModalOpen(false);
      resetForm();

      // Refresh stats & list
      const [newStats, newCats] = await Promise.all([
        expenseService.getStats(),
        expenseService.getCategories(),
      ]);
      setStats(newStats);
      setCategories(newCats);
      loadExpensesList();

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to create expense', err);
      setErrorMsg(err.response?.data?.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    if (!title.trim()) {
      setErrorMsg('Please enter a title.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Amount must be greater than zero.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await expenseService.updateExpense(selectedExpense.id, {
        title: title.trim(),
        categoryId,
        amount: Number(amount),
        expenseDate: expenseDate ? new Date(expenseDate).toISOString() : undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      setSuccessMsg('Expense entry updated successfully!');
      setIsEditModalOpen(false);
      resetForm();

      const [newStats, newCats] = await Promise.all([
        expenseService.getStats(),
        expenseService.getCategories(),
      ]);
      setStats(newStats);
      setCategories(newCats);
      loadExpensesList();

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to update expense', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string, expTitle: string) => {
    if (!confirm(`Are you sure you want to delete expense "${expTitle}"?`)) return;

    try {
      await expenseService.deleteExpense(id);
      setSuccessMsg('Expense record deleted successfully.');

      const [newStats, newCats] = await Promise.all([
        expenseService.getStats(),
        expenseService.getCategories(),
      ]);
      setStats(newStats);
      setCategories(newCats);
      loadExpensesList();

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to delete expense', err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCreatingCategory(true);
    try {
      await expenseService.createCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });
      setNewCatName('');
      setNewCatDesc('');
      setSuccessMsg('New expense category added!');

      const updatedCats = await expenseService.getCategories();
      setCategories(updatedCats);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to add category', err);
      setErrorMsg(err.response?.data?.message || 'Failed to create category.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;

    try {
      await expenseService.deleteCategory(catId);
      setSuccessMsg(`Category "${catName}" deleted.`);

      const updatedCats = await expenseService.getCategories();
      setCategories(updatedCats);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete category', err);
      setErrorMsg(err.response?.data?.message || 'Cannot delete category.');
    }
  };

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Banknote className="w-3 h-3" /> Cash
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CreditCard className="w-3 h-3" /> Card / POS
          </span>
        );
      case 'BANK_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Building className="w-3 h-3" /> Bank Transfer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wallet className="w-3 h-3" /> Other / Cheque
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
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Expense Management</h1>
              <p className="text-xs text-slate-400">
                Track overhead costs, utility bills, rent, logistics, and operational expenditures
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setPage(1);
              loadExpensesList();
            }}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsCategoriesModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 font-medium text-xs transition"
          >
            <FolderTree className="w-4 h-4 text-indigo-400" />
            <span>Categories</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-400">
              {categories.length}
            </span>
          </button>

          <button
            onClick={handleOpenRecordModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-medium text-xs hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-600/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Record Expense
          </button>
        </div>
      </div>

      {/* Glassmorphic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">
            {formatCurrency(stats?.totalAmount || 0, currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {stats?.totalExpensesCount || 0} total expense vouchers logged
          </div>
        </div>

        {/* This Month's Spending */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-violet-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              This Month
            </span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-violet-400">
            {formatCurrency(stats?.thisMonthAmount || 0, currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Current calendar month operational overhead
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today's Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">
            {formatCurrency(stats?.todayAmount || 0, currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Disbursed today across counter & bank
          </div>
        </div>

        {/* Top Expense Category */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Top Cost Driver
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold text-cyan-300 truncate">
            {stats?.topCategory?.categoryName || 'None yet'}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-semibold">
              {formatCurrency(stats?.topCategory?.totalAmount || 0, currency)}
            </span>
            {stats?.topCategory && (
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold">
                {stats.topCategory.percentage}% of total
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category Spend Distribution Cards */}
      {stats?.byCategory && stats.byCategory.filter((c) => c.totalAmount > 0).length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-rose-400" />
              Category Spend Distribution
            </h3>
            <span className="text-[11px] text-slate-500">
              Breakdown of business expenditures
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.byCategory
              .filter((c) => c.totalAmount > 0)
              .slice(0, 4)
              .map((c) => (
                <div
                  key={c.categoryId}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 truncate">{c.categoryName}</span>
                    <span className="text-slate-400 font-bold">{c.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, c.percentage))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{c.count} vouchers</span>
                    <span className="font-medium text-slate-300">
                      {formatCurrency(c.totalAmount, currency)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by expense title, memo notes, vendor or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition"
            />
          </form>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-rose-500/50 shrink-0"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-rose-500/50 shrink-0"
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
              className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 focus:outline-none focus:border-rose-500/50"
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
              className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 focus:outline-none focus:border-rose-500/50"
            />
          </div>

          {(search || categoryFilter !== 'ALL' || methodFilter !== 'ALL' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setCategoryFilter('ALL');
                setMethodFilter('ALL');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="ml-auto text-rose-400 hover:text-rose-300 font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Expenses Ledger Table */}
      <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800/80">
              <tr>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Title & Memo</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Method</th>
                <th className="px-4 py-3.5 text-right">Amount</th>
                <th className="px-4 py-3.5 text-center">Recorded By</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-2" />
                    <span>Loading operational expenses...</span>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                    <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="font-medium text-slate-300">No expenses recorded</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Click "Record Expense" to log overheads, utilities, or rent.
                    </p>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                      <div className="font-medium">{formatDate(exp.expenseDate)}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(exp.expenseDate).toLocaleDateString([], { weekday: 'short' })}
                      </div>
                    </td>

                    {/* Title & Notes */}
                    <td className="px-4 py-3 max-w-[260px]">
                      <div className="font-semibold text-slate-200 truncate">
                        {exp.title}
                      </div>
                      {exp.notes && (
                        <div className="text-[10px] text-slate-400 truncate">
                          {exp.notes}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Tag className="w-3 h-3" />
                        {exp.category?.name || 'General'}
                      </span>
                    </td>

                    {/* Method */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getMethodBadge(exp.paymentMethod)}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-sm text-rose-400">
                      -{formatCurrency(exp.amount, currency)}
                    </td>

                    {/* Recorded By */}
                    <td className="px-4 py-3 text-center whitespace-nowrap text-slate-400">
                      {exp.recordedBy ? (
                        <span>
                          {exp.recordedBy.firstName} {exp.recordedBy.lastName}
                        </span>
                      ) : (
                        <span>System</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(exp)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.title)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing {expenses.length} of {totalCount} records (Page {page} of {totalPages})
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

      {/* RECORD / ADD EXPENSE MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsRecordModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Record Operational Expense</h3>
                <p className="text-xs text-slate-400">
                  Log operational disbursements and update ledger accounts
                </p>
              </div>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-4">
              {/* Title with quick suggestions */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Expense Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monthly Electricity Bill (CEB), Showroom Rent"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Showroom Rent', 'CEB Electricity', 'Store Internet', 'Office Stationery', 'Staff Wages'].map(
                    (sugg) => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => setTitle(sugg)}
                        className="px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-300 transition"
                      >
                        +{sugg}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Category <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoriesModalOpen(true)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300"
                    >
                      + New
                    </button>
                  </div>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Amount ({currency}) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card / POS</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other / Cheque</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Notes / Receipt Ref / Vendor Memo
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paid to Colombo electricity board. Bill receipt #99120"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500 resize-none"
                />
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
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EXPENSE MODAL */}
      {isEditModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Edit Expense Entry</h3>
                <p className="text-xs text-slate-400">Update expense title, category, or amount</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Expense Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Amount ({currency}) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card / POS</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other / Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Notes / Vendor Memo
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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
                  Update Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE CATEGORIES MODAL */}
      {isCategoriesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsCategoriesModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Expense Categories</h3>
                <p className="text-xs text-slate-400">
                  Organize and group operational disbursements for accounting
                </p>
              </div>
            </div>

            {/* Add New Category Inline Form */}
            <form
              onSubmit={handleCreateCategory}
              className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 mb-6 space-y-3"
            >
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Add New Category
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Category Name (e.g. Legal & Audit)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Description (Optional)"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingCategory || !newCatName.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
                >
                  {creatingCategory ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Add Category
                </button>
              </div>
            </form>

            {/* List of Categories */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-slate-700 transition"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-200">{c.name}</div>
                    {c.description && (
                      <div className="text-[10px] text-slate-400 mt-0.5">{c.description}</div>
                    )}
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                      <span>{c.expensesCount} logged expenses</span>
                      <span>•</span>
                      <span className="font-medium text-slate-300">
                        Total: {formatCurrency(c.totalAmount, currency)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteCategory(c.id, c.name)}
                    disabled={c.expensesCount > 0}
                    className={`p-1.5 rounded-lg transition ${
                      c.expensesCount > 0
                        ? 'text-slate-600 cursor-not-allowed opacity-50'
                        : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                    }`}
                    title={
                      c.expensesCount > 0
                        ? 'Cannot delete category with existing expenses'
                        : 'Delete Category'
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoriesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
