'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  ShoppingCart,
  Boxes,
  Users,
  Building2,
  Package,
  Wallet,
  FileText,
  RefreshCw,
  Calendar,
  Percent,
  Receipt,
  Truck,
  ChevronRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuth } from '@/providers/AuthProvider';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  dashboardService,
  DashboardOverview,
} from '@/services/dashboard.service';

const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6'];

export default function DashboardPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'year'>('30d');
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('daily');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadDashboard = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const overview = await dashboardService.getOverview({ period });
        setData(overview);
        setLastRefreshed(new Date());
      } catch (err: any) {
        console.error('Failed to load executive dashboard overview:', err);
        setError(
          err.response?.data?.message ||
            'Unable to connect to live business intelligence telemetry.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-xl text-xs space-y-1.5 min-w-[160px]">
          <p className="font-semibold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>{label}</span>
            <Clock className="w-3 h-3 text-slate-500" />
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-400 capitalize">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-mono font-semibold text-slate-100">
                {formatCurrency(entry.value, currency)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 max-w-7xl pb-12">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE HEADER & CONTROLS */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-slate-800/80 backdrop-blur-xl shadow-2xl shadow-indigo-950/20 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              {user?.business?.name || 'Apex Autocare & Parts Ltd'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Telemetry
            </span>
            <span className="text-[11px] text-slate-500">
              Last synced: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            Executive Command Center
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time business performance, inventory velocity, revenue vs. expense telemetry, and instant order operations.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end">
          {/* Period Selector Tabs */}
          <div className="bg-slate-900/80 p-1 rounded-2xl border border-slate-800 flex items-center text-xs font-medium">
            {(['7d', '30d', '90d', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-xl transition-all capitalize cursor-pointer ${
                  period === p
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : 'Full Year'}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing || loading}
            title="Refresh Data"
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Quick POS Sale Button */}
          <Link
            href="/dashboard/sales"
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>POS Checkout</span>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadDashboard()}
            className="px-3 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PRIMARY FINANCIAL KPI CARDS (ROW 1) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Today's Sales */}
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700/80 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today's Sales
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          {loading ? (
            <div className="h-10 flex items-center">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(data?.kpi.todaySalesRevenue || 0, currency)}
              </h3>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">
                  {data?.kpi.todaySalesCount || 0} orders today
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                    (data?.kpi.todaySalesGrowth || 0) >= 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {(data?.kpi.todaySalesGrowth || 0) >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(data?.kpi.todaySalesGrowth || 0)}%
                </span>
              </div>
            </>
          )}
        </div>

        {/* Monthly Revenue */}
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700/80 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Monthly Revenue
            </span>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {loading ? (
            <div className="h-10 flex items-center">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(data?.kpi.thisMonthRevenue || 0, currency)}
              </h3>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-[140px]">
                  Prev: {formatCurrency(data?.kpi.lastMonthRevenue || 0, currency)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                    (data?.kpi.monthlyRevenueGrowth || 0) >= 0
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {(data?.kpi.monthlyRevenueGrowth || 0) >= 0 ? '+' : ''}
                  {data?.kpi.monthlyRevenueGrowth || 0}% MoM
                </span>
              </div>
            </>
          )}
        </div>

        {/* Monthly Operational Expenses */}
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700/80 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Monthly Expenses
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>

          {loading ? (
            <div className="h-10 flex items-center">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(data?.kpi.thisMonthExpenses || 0, currency)}
              </h3>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Today: {formatCurrency(data?.kpi.todayExpenses || 0, currency)}
                </span>
                <Link
                  href="/dashboard/expenses"
                  className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-0.5 transition-colors"
                >
                  Manage
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Estimated Net Profit */}
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700/80 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Estimated Net Profit
            </span>
            <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          {loading ? (
            <div className="h-10 flex items-center">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          ) : (
            <>
              <h3
                className={`text-2xl font-black tracking-tight ${
                  (data?.kpi.thisMonthNetProfit || 0) >= 0 ? 'text-white' : 'text-rose-400'
                }`}
              >
                {formatCurrency(data?.kpi.thisMonthNetProfit || 0, currency)}
              </h3>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Gross: {formatCurrency(data?.kpi.thisMonthGrossProfit || 0, currency)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                    (data?.kpi.netProfitMargin || 0) >= 0
                      ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  <Percent className="w-3 h-3" />
                  {data?.kpi.netProfitMargin || 0}% Margin
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SECONDARY OPERATIONAL KPI ROW */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Inventory Valuation */}
        <Link
          href="/dashboard/inventory"
          className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/70 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Warehouse Asset Value</p>
              <p className="text-sm font-bold text-white">
                {formatCurrency(data?.kpi.totalInventoryValue || 0, currency)}
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
        </Link>

        {/* Low Stock Alerts */}
        <Link
          href="/dashboard/inventory"
          className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-rose-500/40 hover:bg-slate-900/70 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Low Stock Warnings</p>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                {data?.kpi.lowStockCount || 0} Products
                {(data?.kpi.lowStockCount || 0) > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                    Reorder
                  </span>
                )}
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
        </Link>

        {/* Unpaid Invoices Receivable */}
        <Link
          href="/dashboard/invoices"
          className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900/70 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Pending Receivables</p>
              <p className="text-sm font-bold text-white">
                {formatCurrency(data?.kpi.unpaidInvoicesBalance || 0, currency)}
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
        </Link>

        {/* Customer Base */}
        <Link
          href="/dashboard/customers"
          className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-sky-500/40 hover:bg-slate-900/70 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Customer Ecosystem</p>
              <p className="text-sm font-bold text-white">
                {data?.kpi.totalCustomers || 0} Registered Buyers
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN RECHARTS VISUAL ANALYTICS SECTION */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Financial Velocity: Revenue vs. Operational Outflow
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative visualization of incoming sales receipts against operating expenses and net margins.
            </p>
          </div>

          {/* View toggle */}
          <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center text-xs font-medium self-start sm:self-auto">
            <button
              onClick={() => setChartView('daily')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                chartView === 'daily'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Timeline Trend ({period})
            </button>
            <button
              onClick={() => setChartView('monthly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                chartView === 'monthly'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              6-Month Macro
            </button>
          </div>
        </div>

        {/* Charts Container */}
        {mounted && !loading && (
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'daily' ? (
                <AreaChart
                  data={data?.charts.revenueExpenseTrends || []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val) =>
                      val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                          ? `${(val / 1000).toFixed(0)}k`
                          : `${val}`
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Sales Revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Operating Expenses"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                  <Area
                    type="monotone"
                    dataKey="netProfit"
                    name="Estimated Profit"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={data?.charts.monthlyComparison || []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val) =>
                      val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                          ? `${(val / 1000).toFixed(0)}k`
                          : `${val}`
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="revenue"
                    name="Sales Revenue"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Operating Expenses"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="netProfit"
                    name="Net Margin"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {loading && (
          <div className="h-80 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs">Assembling live chart matrices...</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. SECONDARY CHARTS & BREAKDOWNS (2 COLUMNS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category breakdown */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Sales by Category Distribution</h3>
                <p className="text-xs text-slate-400">Revenue concentration across product lines</p>
              </div>
              <Link
                href="/dashboard/categories"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                Taxonomy
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {mounted && !loading && (data?.charts.salesByCategory?.length || 0) > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.charts.salesByCategory || []}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {(data?.charts.salesByCategory || []).map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5">
                  {(data?.charts.salesByCategory || []).map((cat, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-300 truncate max-w-[120px]">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                            }}
                          />
                          {cat.name}
                        </span>
                        <span className="font-semibold text-white">
                          {formatCurrency(cat.revenue, currency)} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-slate-500 text-xs">
                <Package className="w-8 h-8 text-slate-600 mb-2" />
                No categorized sale records found for this period.
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Payment Method Channels</h3>
                <p className="text-xs text-slate-400">Cash vs Card vs Bank Transfer inflow</p>
              </div>
              <Link
                href="/dashboard/payments"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                Ledger
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {(data?.charts.paymentMethodsDistribution || []).map((method, idx) => {
                const colors = [
                  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', bar: 'bg-emerald-500' },
                  { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', bar: 'bg-indigo-500' },
                  { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', bar: 'bg-sky-500' },
                  { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', bar: 'bg-amber-500' },
                ];
                const c = colors[idx % colors.length];

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">{method.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${c.bg} ${c.text} ${c.border}`}
                      >
                        {method.percentage}%
                      </span>
                    </div>
                    <p className="text-base font-bold text-white">
                      {formatCurrency(method.amount, currency)}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{method.count} transactions</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                        style={{ width: `${method.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. OPERATIONAL ACTION FEEDS & LISTS (3-COLUMN GRID) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent POS Sales Feed */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              Latest POS Sales
            </h3>
            <Link
              href="/dashboard/sales"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {(data?.lists.recentSales?.length || 0) > 0 ? (
              data?.lists.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                >
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-white truncate">
                      {sale.customerName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {sale.saleNumber} • {sale.itemsCount} items
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-emerald-400">
                      {formatCurrency(sale.total, currency)}
                    </p>
                    <span
                      className={`inline-block text-[9px] font-mono px-1.5 py-0.2 rounded ${
                        sale.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No sales recorded yet.</p>
            )}
          </div>
        </div>

        {/* Urgent Low Stock Alerts */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Critical Low Stock
            </h3>
            <Link
              href="/dashboard/purchases"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Reorder PO
            </Link>
          </div>

          <div className="space-y-3">
            {(data?.lists.lowStockProducts?.length || 0) > 0 ? (
              data?.lists.lowStockProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 rounded-2xl bg-slate-950/40 border border-rose-500/20 hover:border-rose-500/40 transition-all flex items-center justify-between gap-3"
                >
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-white truncate">{prod.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      SKU: {prod.sku} • {prod.category}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {prod.currentStock} / {prod.minStock} {prod.unit}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400">All inventory levels are optimal.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Operational Expenses */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              Recent Expenses
            </h3>
            <Link
              href="/dashboard/expenses"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Expense Book
            </Link>
          </div>

          <div className="space-y-3">
            {(data?.lists.recentExpenses?.length || 0) > 0 ? (
              data?.lists.recentExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                >
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-white truncate">{exp.title}</p>
                    <p className="text-[10px] text-slate-400">
                      <span className="text-amber-400">{exp.categoryName}</span> •{' '}
                      {formatDate(exp.expenseDate)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-rose-400">
                      -{formatCurrency(exp.amount, currency)}
                    </p>
                    <span className="text-[9px] font-mono text-slate-400 uppercase">
                      {exp.paymentMethod}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No expenses recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
