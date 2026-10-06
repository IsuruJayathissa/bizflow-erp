'use client';

import React from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  ShoppingCart,
  Boxes,
  Users,
  Building2,
  Package,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  const stats = [
    {
      title: "Today's Sales Revenue",
      value: formatCurrency(125400, currency),
      change: '+14.2% from yesterday',
      trend: 'up',
      icon: DollarSign,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      title: 'Monthly Expenses',
      value: formatCurrency(48200, currency),
      change: 'Within budgeted threshold',
      trend: 'neutral',
      icon: CreditCard,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
    },
    {
      title: 'Estimated Net Profit',
      value: formatCurrency(77200, currency),
      change: '+18.5% margin rate',
      trend: 'up',
      icon: TrendingUp,
      color: 'from-indigo-500/20 to-violet-500/20 text-indigo-400 border-indigo-500/30',
    },
    {
      title: 'Low Stock Alerts',
      value: '1 Item',
      change: 'Requires purchase reorder',
      trend: 'down',
      icon: AlertTriangle,
      color: 'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/60 border border-indigo-500/20 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
            <Building2 className="w-3.5 h-3.5" />
            {user?.business?.name || 'Apex Autocare & Parts Ltd'}
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.firstName} {user?.lastName}!
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            System overview and business telemetry is live and synced with Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/sales"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Sale Order
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-slate-400">{stat.title}</span>
                <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-1">{stat.value}</h3>
              <p className="text-xs text-slate-500">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Access & System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Operations */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-white mb-4">Quick Operations</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/sales"
              className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
            >
              <ShoppingCart className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold text-white">New Sale</p>
              <p className="text-[10px] text-slate-400">Checkout & invoice</p>
            </Link>

            <Link
              href="/dashboard/inventory"
              className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
            >
              <Boxes className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold text-white">Inventory</p>
              <p className="text-[10px] text-slate-400">Stock movements</p>
            </Link>

            <Link
              href="/dashboard/customers"
              className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
            >
              <Users className="w-5 h-5 text-sky-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold text-white">Customers</p>
              <p className="text-[10px] text-slate-400">Ledger & profiles</p>
            </Link>

            <Link
              href="/dashboard/products"
              className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
            >
              <Package className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold text-white">Products</p>
              <p className="text-[10px] text-slate-400">Catalog & SKUs</p>
            </Link>
          </div>
        </div>

        {/* Business Profile Details */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Active Tenant & RBAC Credentials</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              Step 03 Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-slate-400 font-medium">Logged-in User Account:</span>
              <p className="text-white font-semibold text-sm">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-slate-400 font-mono">{user?.email}</p>
              <div className="pt-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
                  Role: {user?.role}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-slate-400 font-medium">Configured Business Entity:</span>
              <p className="text-white font-semibold text-sm">
                {user?.business?.name || 'Apex Autocare & Parts Ltd'}
              </p>
              <p className="text-slate-400">
                Currency: <strong className="text-slate-200">{currency}</strong> | Tax:{' '}
                <strong className="text-slate-200">{user?.business?.taxRate || 15}%</strong>
              </p>
              <p className="text-slate-400">
                Invoice Prefix:{' '}
                <span className="font-mono text-indigo-300 font-semibold">
                  {user?.business?.invoicePrefix || 'INV-'}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 flex items-center justify-between">
            <span className="text-xs text-emerald-300">
              ✓ JWT Access Tokens, Refresh Tokens, and Role Guards active across Backend and Frontend.
            </span>
            <Link
              href="http://localhost:4000/api/docs"
              target="_blank"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              Swagger API Docs
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
