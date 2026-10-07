'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Lock,
  Mail,
  User,
  AlertCircle,
  Loader2,
  Building2,
  Check,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { userService, UserItem } from '@/services/user.service';
import { formatDate } from '@/lib/utils';

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'SALES_STAFF',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (selectedRole !== 'ALL') params.role = selectedRole;
      if (selectedStatus === 'ACTIVE') params.isActive = true;
      if (selectedStatus === 'INACTIVE') params.isActive = false;

      const data = await userService.getUsers(params);
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRole, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await userService.createUser(formData);
      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'SALES_STAFF',
      });
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create staff account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    try {
      await userService.toggleStatus(user.id);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      await userService.updateUser(editingUser.id, {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        role: editingUser.role,
      });
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await userService.deleteUser(id);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Shield className="w-3.5 h-3.5" />
            Manager
          </span>
        );
      case 'SALES_STAFF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Sales Staff
          </span>
        );
      case 'INVENTORY_STAFF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Inventory Staff
          </span>
        );
      case 'ACCOUNTANT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Accountant
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">
            {role}
          </span>
        );
    }
  };

  const roleDescriptions: Record<string, string> = {
    ADMIN: 'Full system control, user accounts, business configurations, audit logs, financial reports.',
    MANAGER: 'Daily operations, customers, suppliers, inventory oversight, sales & purchase management.',
    SALES_STAFF: 'Sales checkout, invoice generation, customer accounts, payment receipting.',
    INVENTORY_STAFF: 'Product catalog, receiving goods from suppliers, stock adjustments and warnings.',
    ACCOUNTANT: 'Operational expenses, invoices, payments tracking, accounts receivable/payable ledger.',
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Staff & RBAC Administration</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
              Step 04
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Manage staff accounts, assign granular role-based permissions, and control tenant access.
          </p>
        </div>

        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff Member
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <p className="text-xs text-slate-400">Total Registered Staff</p>
          <h3 className="text-xl font-bold text-white mt-1">{users.length}</h3>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <p className="text-xs text-slate-400">Active Accounts</p>
          <h3 className="text-xl font-bold text-emerald-400 mt-1">
            {users.filter((u) => u.isActive).length}
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <p className="text-xs text-slate-400">Deactivated Accounts</p>
          <h3 className="text-xl font-bold text-rose-400 mt-1">
            {users.filter((u) => !u.isActive).length}
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <p className="text-xs text-slate-400">Admin & Managers</p>
          <h3 className="text-xl font-bold text-indigo-400 mt-1">
            {users.filter((u) => u.role === 'ADMIN' || u.role === 'MANAGER').length}
          </h3>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="SALES_STAFF">Sales Staff</option>
              <option value="INVENTORY_STAFF">Inventory Staff</option>
              <option value="ACCOUNTANT">Accountant</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-xs">Loading staff accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-semibold">No staff members found</p>
            <p className="text-xs text-slate-600 mt-1">Try changing filters or add a new staff user.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/40 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Staff Member</th>
                  <th className="px-6 py-3.5">Assigned Role</th>
                  <th className="px-6 py-3.5">Account Status</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  {currentUser?.role === 'ADMIN' && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                          {item.firstName?.[0]}
                          {item.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {item.firstName} {item.lastName}
                          </p>
                          <p className="text-slate-400 font-mono text-[11px]">{item.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">{getRoleBadge(item.role)}</td>

                    <td className="px-6 py-4">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          Deactivated
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-400">{formatDate(item.createdAt)}</td>

                    {currentUser?.role === 'ADMIN' && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(item);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Edit Role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {item.id !== currentUser?.id && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer border ${
                                  item.isActive
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                                }`}
                              >
                                {item.isActive ? 'Deactivate' : 'Activate'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteUser(item.id)}
                                className="p-1.5 rounded-lg border border-slate-800 hover:border-rose-500/40 bg-slate-900/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <h2 className="text-lg font-bold text-white mb-1">Add Staff Account</h2>
            <p className="text-xs text-slate-400 mb-6">
              Create credentials and assign an operational role for your business member.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Kasun"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Perera"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="staff@apexautocare.lk"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Assigned System Role</label>
                <div className="grid grid-cols-1 gap-2">
                  {['SALES_STAFF', 'INVENTORY_STAFF', 'ACCOUNTANT', 'MANAGER', 'ADMIN'].map((role) => (
                    <label
                      key={role}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                        formData.role === role
                          ? 'border-indigo-500 bg-indigo-950/40 text-white'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={formData.role === role}
                        onChange={() => setFormData({ ...formData, role })}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <p className="font-semibold text-slate-200">{role.replace('_', ' ')}</p>
                        <p className="text-[10px] text-slate-400">{roleDescriptions[role]}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h2 className="text-lg font-bold text-white mb-1">Edit Staff Member</h2>
            <p className="text-xs text-slate-400 mb-6 font-mono">{editingUser.email}</p>

            <form onSubmit={handleUpdateRole} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assigned Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SALES_STAFF">Sales Staff</option>
                  <option value="INVENTORY_STAFF">Inventory Staff</option>
                  <option value="ACCOUNTANT">Accountant</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-2">{roleDescriptions[editingUser.role]}</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
