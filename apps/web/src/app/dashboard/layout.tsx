'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  LayoutDashboard,
  Boxes,
  Package,
  ShoppingCart,
  ShoppingBag,
  FileText,
  CreditCard,
  Users,
  Truck,
  FolderTree,
  BarChart3,
  Settings,
  LogOut,
  User as UserIcon,
  Bell,
  Shield,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Loading BizFlow ERP...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'SALES_STAFF', 'INVENTORY_STAFF', 'ACCOUNTANT'] },
    { label: 'Staff & RBAC', href: '/dashboard/users', icon: ShieldCheck, roles: ['ADMIN'] },
    { label: 'Categories', href: '/dashboard/categories', icon: FolderTree, roles: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] },
    { label: 'Products', href: '/dashboard/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] },
    { label: 'Inventory', href: '/dashboard/inventory', icon: Boxes, roles: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] },
    { label: 'Sales & Orders', href: '/dashboard/sales', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'SALES_STAFF'] },
    { label: 'Invoices', href: '/dashboard/invoices', icon: FileText, roles: ['ADMIN', 'MANAGER', 'SALES_STAFF', 'ACCOUNTANT'] },
    { label: 'Purchases', href: '/dashboard/purchases', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] },
    { label: 'Customers', href: '/dashboard/customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'SALES_STAFF', 'ACCOUNTANT'] },
    { label: 'Suppliers', href: '/dashboard/suppliers', icon: Truck, roles: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF', 'ACCOUNTANT'] },
    { label: 'Expenses', href: '/dashboard/expenses', icon: CreditCard, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
    { label: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.includes(user.role || 'SALES_STAFF'));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl flex flex-col justify-between shrink-0">
        <div>
          {/* Brand */}
          <div className="h-16 px-6 border-b border-slate-800/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight block text-white">BizFlow ERP</span>
              <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                {user.business?.name || 'My Enterprise'}
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card in Sidebar */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                {user.firstName?.[0] || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <span className="inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-slate-300">
              {user.business?.name || 'Apex Autocare & Parts Ltd'}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Database
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Currency: <strong className="text-slate-200">{user.business?.currency || 'LKR'}</strong>
            </span>
            <button
              type="button"
              className="p-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-400 hover:text-white transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-1.5 right-1.5 ring-2 ring-slate-900" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">{user.role}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
