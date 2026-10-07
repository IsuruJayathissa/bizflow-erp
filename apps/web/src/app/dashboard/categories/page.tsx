'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderTree,
  Folder,
  FolderPlus,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Package,
  Layers,
  ChevronRight,
  ChevronDown,
  Boxes,
  Eye,
  Archive,
  RefreshCw,
  AlertTriangle,
  Loader2,
  X,
  FileText,
  Tag,
  List,
  GitBranch,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  categoryService,
  CategoryItem,
  CategoryTreeItem,
  CategoryStats,
  CategoryDetail,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@/services/category.service';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CategoriesPage() {
  const { user } = useAuth();
  const currency = user?.business?.currency || 'LKR';

  // Data states
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tree, setTree] = useState<CategoryTreeItem[]>([]);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View mode: 'table' or 'tree'
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [parentFilter, setParentFilter] = useState<string>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected item states
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [categoryDetail, setCategoryDetail] = useState<CategoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);

  // Tree collapsed nodes state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Feedback states
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateCategoryPayload>({
    name: '',
    description: '',
    parentId: undefined,
  });

  const canManage = ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'].includes(user?.role || '');
  const canDelete = ['ADMIN', 'MANAGER'].includes(user?.role || '');

  // Fetch categories list
  const fetchCategories = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const params: { search?: string; isActive?: boolean; parentId?: string } = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter === 'ACTIVE') params.isActive = true;
      if (statusFilter === 'ARCHIVED') params.isActive = false;
      if (parentFilter === 'ROOT') params.parentId = 'root';
      else if (parentFilter !== 'ALL') params.parentId = parentFilter;

      const [data, treeData] = await Promise.all([
        categoryService.getCategories(params),
        categoryService.getTree(),
      ]);

      setCategories(data);
      setTree(treeData);

      // Auto-expand all root tree nodes by default
      const initialExpanded: Record<string, boolean> = {};
      treeData.forEach((node) => {
        initialExpanded[node.id] = true;
      });
      setExpandedNodes(initialExpanded);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await categoryService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load category stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [statusFilter, parentFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Toggle tree node collapse/expand
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // Open detail drawer
  const handleOpenDetail = async (cat: CategoryItem) => {
    setSelectedCategory(cat);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const detail = await categoryService.getCategory(cat.id);
      setCategoryDetail(detail);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load category details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Open add modal (optionally pre-selecting parent)
  const handleOpenAdd = (presetParentId?: string) => {
    setFormData({
      name: '',
      description: '',
      parentId: presetParentId || undefined,
    });
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (cat: CategoryItem) => {
    setSelectedCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      parentId: cat.parentId || undefined,
    });
    setErrorMsg(null);
    setIsEditModalOpen(true);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Category name is required');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await categoryService.createCategory({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        parentId: formData.parentId || undefined,
      });

      setSuccessMsg('Category created successfully');
      setIsAddModalOpen(false);
      setFormData({ name: '', description: '', parentId: undefined });
      fetchCategories();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create category');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    if (!formData.name.trim()) {
      setErrorMsg('Category name is required');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await categoryService.updateCategory(selectedCategory.id, {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        parentId: formData.parentId || null,
      });

      setSuccessMsg('Category updated successfully');
      setIsEditModalOpen(false);
      fetchCategories();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update category');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle active/archive status
  const handleToggleStatus = async (cat: CategoryItem) => {
    try {
      setActionLoading(true);
      await categoryService.toggleStatus(cat.id);
      setSuccessMsg(`Category ${cat.isActive ? 'archived' : 'reactivated'} successfully`);
      fetchCategories();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update category status');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // Open delete modal
  const handleDeleteClick = (cat: CategoryItem) => {
    setCategoryToDelete(cat);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await categoryService.deleteCategory(categoryToDelete.id);
      setSuccessMsg('Category deleted successfully');
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
      fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete category');
      setIsDeleteModalOpen(false);
      setTimeout(() => setErrorMsg(null), 6000);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter root categories for parent dropdown selector
  const rootCategories = useMemo(() => {
    return categories.filter((c) => !c.parentId);
  }, [categories]);

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: CategoryTreeItem, level = 0) => {
    const isExpanded = expandedNodes[node.id] ?? false;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center justify-between p-3 rounded-xl transition-all ${
            level === 0
              ? 'bg-slate-900/80 border border-slate-800 hover:border-slate-700'
              : 'bg-slate-950/60 border border-slate-800/60 ml-6 mt-1.5 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNode(node.id)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-6 flex justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              </div>
            )}

            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                level === 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-xs truncate">{node.name}</span>
                {node.isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Active" />
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    Archived
                  </span>
                )}
              </div>
              {node.description && (
                <p className="text-[11px] text-slate-400 truncate max-w-sm">{node.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              <Package className="w-3 h-3 text-slate-400" />
              <span>{node.productsCount} products</span>
            </span>

            {level === 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {node.children.length} sub-tiers
              </span>
            )}

            <div className="flex items-center gap-1">
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleOpenAdd(node.id)}
                  title="Add Sub-tier Category"
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenDetail(node)}
                title="View Category Profile"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleOpenEdit(node)}
                  title="Edit Category"
                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDeleteClick(node)}
                  title="Delete Category"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Children nodes */}
        {hasChildren && isExpanded && (
          <div className="space-y-1 pl-2 border-l border-slate-800/80 ml-4 my-1">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <FolderTree className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Category Taxonomy Management</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-tier product grouping, parent-child hierarchies, and catalog taxonomy structure.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'tree'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Hierarchy Tree</span>
            </button>
          </div>

          <button
            onClick={() => fetchCategories(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-2 text-xs font-semibold"
            title="Refresh category data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={() => handleOpenAdd()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 High-Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Categories */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Categories</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : (stats?.totalCategories ?? 0)}
            </span>
            <span className="text-xs text-slate-400 ml-2">taxonomy tiers</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span>Entire product hierarchy</span>
          </div>
        </div>

        {/* Root Families */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Root Category Families</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : (stats?.rootCategories ?? 0)}
            </span>
            <span className="text-xs text-teal-400 ml-2">top-level families</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-teal-400">
            <span>Primary grouping classifications</span>
          </div>
        </div>

        {/* Sub-Category Tiers */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Sub-Category Tiers</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : (stats?.subCategories ?? 0)}
            </span>
            <span className="text-xs text-cyan-400 ml-2">child branches</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-cyan-400">
            <span>Nested classification nodes</span>
          </div>
        </div>

        {/* Categorized Products */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Categorized Products</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : (stats?.categorizedProducts ?? 0)}
            </span>
            <span className="text-xs text-slate-400 ml-2">catalog items</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-400">
            <span>Linked to active categories</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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

        {/* Tier filter dropdown & status pills */}
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap justify-end">
          <select
            value={parentFilter}
            onChange={(e) => setParentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Hierarchy Levels</option>
            <option value="ROOT">Top-Level Root Families Only</option>
            {rootCategories.map((rc) => (
              <option key={rc.id} value={rc.id}>
                Subcategories of: {rc.name}
              </option>
            ))}
          </select>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'ARCHIVED'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Archived
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: HIERARCHY TREE VIEW */}
      {viewMode === 'tree' && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <FolderTree className="w-4 h-4 text-emerald-400" />
              <span>Hierarchical Taxonomy Tree</span>
            </div>
            <span className="text-xs text-slate-500">
              Click folders to expand / collapse branch tiers
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
              <span className="text-xs">Building taxonomy tree...</span>
            </div>
          ) : tree.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FolderTree className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-300">No category tree nodes found</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Add root categories to start structuring your catalog taxonomy.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {tree.map((node) => renderTreeNode(node))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DATA TABLE DIRECTORY */}
      {viewMode === 'table' && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Category Name</th>
                  <th className="py-3.5 px-6">Hierarchy Level</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6">Products & Sub-tiers</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        <span>Loading category directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
                          <FolderTree className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">No categories found</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {search
                              ? 'No categories match your search parameters.'
                              : 'Create your first product classification category.'}
                          </p>
                        </div>
                        {canManage && !search && (
                          <button
                            onClick={() => handleOpenAdd()}
                            className="mt-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>Add First Category</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => {
                    const isRoot = !c.parentId;

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-800/40 transition-colors group cursor-default"
                      >
                        {/* Category Name */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-inner ${
                                isRoot
                                  ? 'bg-gradient-to-tr from-emerald-600/30 to-teal-500/30 border border-emerald-500/30 text-emerald-300'
                                  : 'bg-gradient-to-tr from-cyan-600/30 to-indigo-500/30 border border-cyan-500/30 text-cyan-300'
                              }`}
                            >
                              <Folder className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-semibold text-white block text-sm">
                                {c.name}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Created {formatDate(c.createdAt)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Hierarchy Level */}
                        <td className="py-4 px-6">
                          {isRoot ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[11px]">
                              <Layers className="w-3 h-3" />
                              <span>Top-Level Root</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-semibold text-[11px]">
                              <GitBranch className="w-3 h-3 text-cyan-400" />
                              <span>Subcategory of {c.parent?.name}</span>
                            </span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-4 px-6 text-slate-400 text-xs max-w-xs">
                          {c.description ? (
                            <span className="truncate block" title={c.description}>
                              {c.description}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic">No description</span>
                          )}
                        </td>

                        {/* Products & Subcategories */}
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Package className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold">{c.productsCount}</span>
                              <span className="text-slate-400">products</span>
                            </div>
                            {isRoot && (
                              <div className="text-[11px] text-indigo-400">
                                <span>{c.subcategoriesCount} sub-tiers</span>
                              </div>
                            )}
                          </div>
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

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Add Subtier */}
                            {canManage && isRoot && (
                              <button
                                onClick={() => handleOpenAdd(c.id)}
                                title="Add Sub-tier Category"
                                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                              >
                                <FolderPlus className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* View details */}
                            <button
                              onClick={() => handleOpenDetail(c)}
                              title="View Category Profile & Products"
                              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            {canManage && (
                              <button
                                onClick={() => handleOpenEdit(c)}
                                title="Edit Category"
                                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Archive/Restore */}
                            {canManage && (
                              <button
                                onClick={() => handleToggleStatus(c)}
                                title={c.isActive ? 'Archive Category' : 'Restore Category'}
                                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete */}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteClick(c)}
                                title="Delete Category"
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
      )}

      {/* MODAL 1: ADD CATEGORY */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Category</h3>
                  <p className="text-xs text-slate-400">Add a product grouping or subcategory tier</p>
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
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engine Lubricants or Suspension Parts"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Parent Hierarchy Tier
                </label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, parentId: e.target.value || undefined })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">— None (Top-Level Root Family) —</option>
                  {rootCategories.map((rc) => (
                    <option key={rc.id} value={rc.id}>
                      {rc.name} (Root)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Select a parent to create a sub-category tier, or leave as root for a top-level classification.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional scope or notes about products in this category..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
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
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CATEGORY */}
      {isEditModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Category</h3>
                  <p className="text-xs text-slate-400">Modify classification and hierarchy tier</p>
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
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Parent Hierarchy Tier
                </label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, parentId: e.target.value || undefined })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">— None (Top-Level Root Family) —</option>
                  {rootCategories
                    .filter((rc) => rc.id !== selectedCategory.id)
                    .map((rc) => (
                      <option key={rc.id} value={rc.id}>
                        {rc.name} (Root)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
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
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CATEGORY PROFILE & PRODUCTS DRAWER */}
      {isDetailModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 border border-emerald-400/30 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-emerald-600/30">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedCategory.name}</h3>
                    {selectedCategory.isActive ? (
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
                    {selectedCategory.parentId ? `Subcategory of ${selectedCategory.parent?.name}` : 'Top-Level Root Category'} • Created {formatDate(selectedCategory.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setCategoryDetail(null);
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
                  <span className="text-[11px] text-slate-400 block font-medium">Assigned Products</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {selectedCategory.productsCount}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Sub-Category Tiers</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">
                    {selectedCategory.subcategoriesCount}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Classification Level</span>
                  <span className="text-lg font-bold text-indigo-400 mt-1 block">
                    {selectedCategory.parentId ? 'Level 2 (Child)' : 'Level 1 (Root)'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedCategory.description && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Category Scope & Description
                  </h4>
                  <p className="text-slate-300 text-xs italic">
                    "{selectedCategory.description}"
                  </p>
                </div>
              )}

              {/* Sub-categories in this family */}
              {categoryDetail?.children && categoryDetail.children.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-emerald-400" />
                    <span>Sub-Categories ({categoryDetail.children.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {categoryDetail.children.map((child) => (
                      <div
                        key={child.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="w-3.5 h-3.5 text-teal-400" />
                          <span className="font-semibold text-xs text-white">{child.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {child._count.products} products
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products in this category */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-400" />
                    <span>Catalog Products ({categoryDetail?.products?.length ?? 0})</span>
                  </h4>
                </div>

                {detailLoading ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
                    <span className="text-xs">Loading catalog products...</span>
                  </div>
                ) : !categoryDetail?.products || categoryDetail.products.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-300">No products mapped to this category yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Products assigned to this category in the catalog will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoryDetail.products.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-white text-xs block">{p.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            SKU: {p.sku} • Cost: {formatCurrency(p.costPrice, currency)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400 block">
                            {formatCurrency(p.sellingPrice, currency)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {p.currentStock} {p.unit} in stock
                          </span>
                        </div>
                      </div>
                    ))}
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
                  setCategoryDetail(null);
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
      {isDeleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Category?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete category{' '}
              <strong className="text-white">{categoryToDelete.name}</strong>?
            </p>

            {(categoryToDelete.productsCount > 0 || categoryToDelete.subcategoriesCount > 0) && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Notice: This category has <strong>{categoryToDelete.productsCount} product(s)</strong> and <strong>{categoryToDelete.subcategoriesCount} sub-category tier(s)</strong>.
                  Please reassign products or subcategories first, or use <strong>Archive</strong>.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCategoryToDelete(null);
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
