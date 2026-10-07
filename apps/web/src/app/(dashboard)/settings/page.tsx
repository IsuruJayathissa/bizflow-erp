'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  DollarSign,
  FileText,
  Mail,
  Phone,
  MapPin,
  Percent,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Hash,
  Users,
  Package,
  ShoppingCart,
  Boxes,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { businessService, BusinessProfile } from '@/services/business.service';

export default function BusinessSettingsPage() {
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    registrationNo: '',
    email: '',
    phone: '',
    address: '',
    logo: '',
    currency: 'LKR',
    taxRate: 15.0,
    invoicePrefix: 'INV-',
  });

  const fetchBusiness = async () => {
    try {
      setLoading(true);
      const data = await businessService.getBusiness();
      setProfile(data);
      setFormData({
        name: data.name || '',
        registrationNo: data.registrationNo || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        logo: data.logo || '',
        currency: data.currency || 'LKR',
        taxRate: data.taxRate !== undefined ? data.taxRate : 15.0,
        invoicePrefix: data.invoicePrefix || 'INV-',
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load business configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setSaving(true);

    try {
      const updated = await businessService.updateBusiness({
        name: formData.name,
        registrationNo: formData.registrationNo || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        logo: formData.logo || undefined,
        currency: formData.currency,
        taxRate: Number(formData.taxRate),
        invoicePrefix: formData.invoicePrefix,
      });

      setProfile(updated);
      setSuccessMsg('Business profile and billing settings updated successfully!');
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update business configuration');
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-medium">Loading business profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">Business Profile & Settings</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
            Step 05
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Configure enterprise identity, tax policies, billing currencies, and invoice numbering.
        </p>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 text-xs flex items-center gap-2.5 shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Operational Telemetry Summary */}
      {profile?._count && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <span className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Staff Accounts
            </span>
            <p className="text-lg font-bold text-white">{profile._count.users}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <span className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
              <Package className="w-3.5 h-3.5 text-purple-400" />
              Catalog Items
            </span>
            <p className="text-lg font-bold text-white">{profile._count.products}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <span className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
              CRM Customers
            </span>
            <p className="text-lg font-bold text-white">{profile._count.customers}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <span className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
              <Boxes className="w-3.5 h-3.5 text-amber-400" />
              Sales Orders
            </span>
            <p className="text-lg font-bold text-white">{profile._count.sales}</p>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Enterprise Identity */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Enterprise Identity & Contact Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Business / Legal Trade Name *</label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Apex Autocare & Parts Ltd"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Business Registration / Tax ID</label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.registrationNo}
                  onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                  placeholder="PV00123456 / TIN-98765432"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Official Business Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="orders@apexautocare.lk"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Primary Telephone Number</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  disabled={!isAdmin}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+94 11 234 5678"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1.5">Headquarters Physical Address</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <textarea
                  rows={2}
                  disabled={!isAdmin}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="124 Galle Road, Colombo 03, Sri Lanka"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1.5">Business Logo URL</label>
              <div className="relative">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  disabled={!isAdmin}
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Billing & Operational Configurations */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Billing, Currency & Invoicing Configurations</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Default Currency</label>
              <select
                disabled={!isAdmin}
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              >
                <option value="LKR">LKR — Sri Lankan Rupee (Rs.)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="AUD">AUD — Australian Dollar (A$)</option>
                <option value="AED">AED — UAE Dirham (AED)</option>
                <option value="SGD">SGD — Singapore Dollar (S$)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Default Tax / VAT Rate (%)</label>
              <div className="relative">
                <Percent className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  disabled={!isAdmin}
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Invoice Number Prefix</label>
              <div className="relative">
                <FileText className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.invoicePrefix}
                  onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                  placeholder="INV-"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Preview: <strong className="text-indigo-400 font-mono">{formData.invoicePrefix}00104</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        {isAdmin && (
          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Business Configuration
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
