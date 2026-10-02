'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Boxes, 
  ShoppingCart, 
  Users, 
  CreditCard, 
  BarChart3, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Server, 
  Layers
} from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function HomePage() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [apiData, setApiData] = useState<any>(null);

  useEffect(() => {
    apiClient
      .get('/health')
      .then((res) => {
        setBackendStatus('connected');
        setApiData(res.data);
      })
      .catch(() => {
        setBackendStatus('offline');
      });
  }, []);

  const features = [
    {
      icon: <Boxes className="w-6 h-6 text-indigo-500" />,
      title: 'Smart Inventory & Stock Alerts',
      desc: 'Automatic stock tracking on purchases & sales with minimum threshold low-stock warnings.',
    },
    {
      icon: <ShoppingCart className="w-6 h-6 text-emerald-500" />,
      title: 'Sales & Invoicing Flow',
      desc: 'Fast POS checkout, invoice PDF generation, automated inventory deductions, and payment logging.',
    },
    {
      icon: <CreditCard className="w-6 h-6 text-amber-500" />,
      title: 'Purchases & Expenses',
      desc: 'Track supplier purchase orders, track operational costs (rent, utilities), and net margins.',
    },
    {
      icon: <Users className="w-6 h-6 text-sky-500" />,
      title: 'CRM & SCM Directory',
      desc: 'Centralized customer and supplier profiles with transaction ledger histories and dues.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-rose-500" />,
      title: 'Role-Based Access Control',
      desc: 'Granular permissions across Admin, Manager, Sales Staff, Inventory Staff, and Accountant.',
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-purple-500" />,
      title: 'Real-Time KPI Analytics',
      desc: 'Interactive Recharts dashboards displaying daily/monthly revenue, top products, and profitability.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-slate-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                BizFlow ERP
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v1.0.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border bg-slate-800/60">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Backend API:</span>
              {backendStatus === 'checking' && (
                <span className="text-amber-400 flex items-center gap-1">Checking...</span>
              )}
              {backendStatus === 'connected' && (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Connected (Port 4000)
                </span>
              )}
              {backendStatus === 'offline' && (
                <span className="text-rose-400 flex items-center gap-1">
                  Offline (Run `npm run dev:api`)
                </span>
              )}
            </div>

            <a
              href="http://localhost:4000/api/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 transition-colors"
            >
              Swagger Docs
            </a>

            <Link
              href="/login"
              className="text-xs px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium text-white transition-all shadow-md shadow-indigo-600/30"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 mb-6">
            <Layers className="w-4 h-4" />
            Full-Stack Small Business ERP System
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Streamline Every Corner of Your{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Business Operations
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 mb-8 leading-relaxed">
            BizFlow ERP replaces fragmented spreadsheets, paper ledgers, and manual calculations with an 
            integrated platform for inventory control, automated sales invoicing, supplier purchases, 
            and real-time financial reporting.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5"
            >
              Get Started with BizFlow
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/40 hover:bg-slate-800/80 text-slate-200 font-semibold text-sm transition-all"
            >
              Explore Dashboard
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 backdrop-blur-sm hover:border-indigo-500/50 hover:bg-slate-900/70 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {feat.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feat.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Setup Verification Card */}
        <div className="mt-16 p-6 rounded-2xl border border-indigo-900/40 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Step 01 Project Initialization Active
              </div>
              <p className="text-xs text-slate-400">
                Next.js 15 Frontend + NestJS Backend API + Shared Monorepo Package + Prisma Schema Scaffolding.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Database Engine:</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-800 text-indigo-300 border border-slate-700">
                PostgreSQL (Prisma ORM)
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        <p>BizFlow ERP &copy; 2026. Designed & Developed by Isuru Jayathissa. Licensed under MIT.</p>
      </footer>
    </div>
  );
}
