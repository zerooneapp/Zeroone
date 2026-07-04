import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2,
  Package,
  PlusCircle,
  MinusCircle,
  Layers,
  Coins,
  ShieldAlert,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

const VendorInventory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    itemName: '',
    sku: '',
    category: '',
    purchasePrice: 0,
    price: 0,
    stock: 0,
    minStockLevel: 0,
    supplierName: '',
    supplierContact: '',
    notes: ''
  });

  // Adjustment Modal State
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState(0);
  const [adjustFormData, setAdjustFormData] = useState({
    customerName: '',
    customerContact: ''
  });

  // Stock History Logs State
  const [historyItem, setHistoryItem] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logDateFilters, setLogDateFilters] = useState({ from: '', to: '' });
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);

  const fetchHistoryLogs = async (itemId, page = 1, filters = logDateFilters) => {
    try {
      setLogsLoading(true);
      const params = { page, limit: 10 };
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const res = await api.get(`/inventory/${itemId}/logs`, { params });
      setHistoryLogs(res.data.logs || []);
      setLogsTotalPages(res.data.totalPages || 1);
      setLogsPage(res.data.currentPage || 1);
    } catch (err) {
      toast.error('Failed to load item stock history');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleOpenHistory = (item) => {
    setHistoryItem(item);
    setHistoryLogs([]);
    setLogDateFilters({ from: '', to: '' });
    setLogsPage(1);
    fetchHistoryLogs(item._id, 1, { from: '', to: '' });
  };

  const handleLogFilterChange = (field, value) => {
    const nextFilters = { ...logDateFilters, [field]: value };
    setLogDateFilters(nextFilters);
    if (historyItem) {
      setLogsPage(1);
      fetchHistoryLogs(historyItem._id, 1, nextFilters);
    }
  };

  const handleLogsPageChange = (newPage) => {
    if (historyItem && newPage >= 1 && newPage <= logsTotalPages) {
      fetchHistoryLogs(historyItem._id, newPage, logDateFilters);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory');
      setItems(res.data || []);
    } catch (err) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const triggerAdjustStock = (item, delta) => {
    setAdjustingItem(item);
    setAdjustmentDelta(delta);
    setAdjustFormData({ customerName: '', customerContact: '' });
  };

  const handleAdjustStockSubmit = async (e) => {
    e.preventDefault();
    if (!adjustingItem) return;

    const contact = adjustFormData.customerContact.trim();
    if (contact && !/^[6-9]\d{9}$/.test(contact)) {
      return toast.error('Please enter a valid 10-digit contact number');
    }

    try {
      setLoading(true);
      const res = await api.post(`/inventory/${adjustingItem._id}/adjust`, {
        change: adjustmentDelta,
        customerName: adjustFormData.customerName,
        customerContact: contact
      });
      setItems(items.map((item) => (item._id === adjustingItem._id ? res.data : item)));
      toast.success('Stock adjusted successfully');
      setAdjustingItem(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Inventory List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;

      const matchesLowStock = !showLowStockOnly || item.stock <= item.minStockLevel;

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [items, searchQuery, selectedCategory, showLowStockOnly]);

  // Unique Categories
  const categories = useMemo(() => {
    const cats = new Set(items.map((item) => item.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [items]);

  // Metrics
  const metrics = useMemo(() => {
    let totalStock = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;

    items.forEach((item) => {
      totalStock += item.stock;
      totalStockValue += item.purchasePrice * item.stock;
      if (item.stock <= item.minStockLevel) {
        lowStockCount++;
      }
    });

    return {
      totalItems: items.length,
      totalStock,
      totalStockValue,
      lowStockCount
    };
  }, [items]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      itemName: '',
      sku: '',
      category: '',
      purchasePrice: 0,
      price: 0,
      stock: 0,
      minStockLevel: 0,
      supplierName: '',
      supplierContact: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      itemName: item.itemName,
      sku: item.sku || '',
      category: item.category || '',
      purchasePrice: item.purchasePrice || 0,
      price: item.price || 0,
      stock: item.stock || 0,
      minStockLevel: item.minStockLevel || 0,
      supplierName: item.supplierName || '',
      supplierContact: item.supplierContact || '',
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName) {
      return toast.error('Item Name is required');
    }

    try {
      setLoading(true);
      if (editingItem) {
        // Update
        const res = await api.put(`/inventory/${editingItem._id}`, formData);
        setItems(items.map((item) => (item._id === editingItem._id ? res.data : item)));
        toast.success('Inventory item updated');
      } else {
        // Create
        const res = await api.post('/inventory', formData);
        setItems([...items, res.data]);
        toast.success('Inventory item added');
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      setLoading(true);
      await api.delete(`/inventory/${id}`);
      setItems(items.filter((item) => item._id !== id));
      toast.success('Item deleted successfully');
    } catch (err) {
      toast.error('Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  if (historyItem) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans pb-24 text-slate-800 dark:text-white">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-[100] px-4 pt-[48px] pb-3 flex items-center justify-between bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHistoryItem(null)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-md font-black tracking-wider uppercase leading-none">Stock History</h1>
              <p className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                {historyItem.itemName} {historyItem.sku && `(${historyItem.sku})`}
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 pt-[120px] space-y-6">
          {/* Date Filters */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 p-4 space-y-3 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-3 py-1.5">
                <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">From Date</label>
                <input
                  type="date"
                  value={logDateFilters.from}
                  onChange={(e) => handleLogFilterChange('from', e.target.value)}
                  className="w-full bg-transparent font-bold text-[10px] outline-none text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex flex-col gap-1 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-3 py-1.5">
                <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">To Date</label>
                <input
                  type="date"
                  value={logDateFilters.to}
                  onChange={(e) => handleLogFilterChange('to', e.target.value)}
                  className="w-full bg-transparent font-bold text-[10px] outline-none text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Logs Content */}
          <div className="space-y-3">
            {logsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-[#00246b] dark:text-white" size={24} />
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Loading history logs...</p>
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="py-16 text-center bg-white/50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800">
                <ClipboardList className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={32} />
                <p className="text-[10px] font-black capitalize tracking-widest text-slate-400">No records found</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {historyLogs.map((log) => {
                    const isPositive = log.change > 0;
                    return (
                      <div
                        key={log._id}
                        className={cn(
                          "p-3 bg-white dark:bg-gray-900 border rounded-2xl flex items-center justify-between gap-3 shadow-sm",
                          isPositive ? "border-emerald-500/10" : "border-rose-500/10"
                        )}
                      >
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-black text-slate-800 dark:text-white">
                            {new Date(log.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })} • {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>

                          {/* Who adjusted */}
                          {log.adjustedBy === 'staff' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-500 rounded text-[7.5px] font-black uppercase tracking-wider">
                              👤 Staff: {log.staffName || 'Unknown'}
                            </span>
                          ) : null}

                          {log.customerName ? (
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                              Client: {log.customerName} {log.customerContact && `(${log.customerContact})`}
                            </p>
                          ) : (
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                              {log.adjustedBy === 'staff' ? 'No client info' : 'Manual Adjustment'}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider uppercase",
                            isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                          )}>
                            {isPositive ? `+${log.change}` : log.change}
                          </span>
                          <span className="text-[7.5px] font-black text-slate-400 dark:text-gray-505 uppercase tracking-wider">
                            Stock: {log.newStock}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {logsTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <button
                      disabled={logsPage === 1}
                      onClick={() => handleLogsPageChange(logsPage - 1)}
                      className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-300 disabled:opacity-50 active:scale-95 transition-all shadow-sm"
                    >
                      Prev
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Page {logsPage} of {logsTotalPages}
                    </span>
                    <button
                      disabled={logsPage === logsTotalPages}
                      onClick={() => handleLogsPageChange(logsPage + 1)}
                      className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-300 disabled:opacity-50 active:scale-95 transition-all shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans pb-24 text-slate-800 dark:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-[100] px-4 pt-[48px] pb-3 flex items-center justify-between bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-md font-semibold leading-none">Inventory Management</h1>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00246b] dark:bg-white text-white dark:text-slate-900 rounded-lg text-[8px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md"
        >
          <Plus size={10} strokeWidth={3} />
          Add Item
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-[120px] space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
              <Package size={16} />
            </div>
            <div>
              <p className="text-[9px] font-semibold text-slate-400 leading-none">Total Items</p>
              <h3 className="text-sm font-black mt-1">{metrics.totalItems}</h3>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Layers size={16} />
            </div>
            <div>
              <p className="text-[9px] font-semibold text-slate-400 leading-none">Total Stock</p>
              <h3 className="text-sm font-black mt-1">{metrics.totalStock}</h3>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <Coins size={16} />
            </div>
            <div>
              <p className="text-[9px] font-semibold text-slate-400 leading-none">Valuation (Cost)</p>
              <h3 className="text-sm font-black mt-1">₹{metrics.totalStockValue.toLocaleString('en-IN')}</h3>
            </div>
          </div>

          <div className={cn(
            "p-3 border rounded-2xl shadow-sm flex items-center gap-3 transition-colors",
            metrics.lowStockCount > 0
              ? "bg-rose-500/5 border-rose-500/20 text-rose-500"
              : "bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800"
          )}>
            <div className={cn(
              "p-2.5 rounded-xl",
              metrics.lowStockCount > 0 ? "bg-rose-500/20 text-rose-500" : "bg-slate-500/10 text-slate-400"
            )}>
              <ShieldAlert size={16} />
            </div>
            <div>
              <p className="text-[9px] font-semibold text-slate-400 leading-none">Low Stock Alerts</p>
              <h3 className="text-sm font-black mt-1">{metrics.lowStockCount}</h3>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 p-4 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-3 py-2 flex items-center gap-2">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search Item name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[11px] font-bold outline-none placeholder-slate-400 text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-white outline-none h-10 min-w-[120px]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={cn(
                  "px-3 py-2 rounded-xl text-[11px] font-semibold border transition-all h-10 flex items-center gap-1.5",
                  showLowStockOnly
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                    : "bg-slate-50 dark:bg-gray-800 border-slate-100 dark:border-gray-700 text-slate-400"
                )}
              >
                <AlertTriangle size={12} />
                Low Stock
              </button>
            </div>
          </div>
        </div>

        {/* Inventory List */}
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-[#00246b] dark:text-white" size={24} />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Loading catalog items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-white/50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800">
            <ClipboardList className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={32} />
            <p className="text-[10px] font-black capitalize tracking-widest text-slate-400">No items found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isLowStock = item.stock <= item.minStockLevel;
              return (
                <div
                  key={item._id}
                  onClick={() => handleOpenHistory(item)}
                  className={cn(
                    "p-3 bg-white dark:bg-gray-900 border rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98]",
                    isLowStock ? 'border-rose-500/20 bg-rose-500/[0.01]' : 'border-slate-100 dark:border-gray-800'
                  )}
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-[12px] sm:text-[13px] font-black text-slate-800 dark:text-white capitalize leading-tight">
                        {item.itemName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {item.sku && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-[6.5px] font-black text-slate-400 uppercase tracking-widest">
                            {item.sku}
                          </span>
                        )}
                        {item.category && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[6.5px] font-black text-blue-500 uppercase tracking-widest">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wide">
                      <div>
                        Cost: <span className="text-slate-800 dark:text-white font-black">₹{item.purchasePrice || 0}</span>
                      </div>
                      <div>
                        Retail: <span className="text-slate-800 dark:text-white font-black">₹{item.price || 0}</span>
                      </div>
                      {item.supplierName && (
                        <div className="hidden sm:block truncate max-w-[150px]">
                          Supplier: <span className="text-slate-800 dark:text-white font-black">{item.supplierName}</span>
                        </div>
                      )}
                    </div>

                    {isLowStock && (
                      <p className="text-[7px] font-black text-rose-500 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={8} />
                        Low stock warning! Threshold: {item.minStockLevel}
                      </p>
                    )}
                  </div>

                  {/* Stock Controls & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-gray-800 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-800 p-1 rounded-xl border border-slate-100 dark:border-gray-700">
                      <button
                        onClick={(e) => { e.stopPropagation(); triggerAdjustStock(item, -1); }}
                        className="text-slate-400 hover:text-rose-500 active:scale-90 transition-all p-1"
                        title="Reduce stock by 1"
                      >
                        <MinusCircle size={15} />
                      </button>
                      <span className={cn(
                        "text-[11px] font-black w-8 text-center",
                        isLowStock ? "text-rose-500" : "text-slate-800 dark:text-white"
                      )}>
                        {item.stock}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); triggerAdjustStock(item, 1); }}
                        className="text-slate-400 hover:text-emerald-500 active:scale-90 transition-all p-1"
                        title="Increase stock by 1"
                      >
                        <PlusCircle size={15} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 dark:text-gray-500 hover:text-[#00246b] dark:hover:text-white rounded-xl transition-all"
                        title="Edit Item"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }}
                        className="p-2 hover:bg-rose-500/10 text-slate-400 dark:text-gray-500 hover:text-rose-500 rounded-xl transition-all"
                        title="Delete Item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative z-10 max-h-[85vh] flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-4 overflow-y-auto no-scrollbar space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                    placeholder="E.g. Face Cream, Massage Oil"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">SKU / Code</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                      placeholder="E.g. SKU-1001"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                      placeholder="E.g. Consumables"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Purchase Price (Cost)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Selling Price (Retail)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Initial Stock</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Min Stock Threshold</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minStockLevel}
                      onChange={(e) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Supplier Name</label>
                    <input
                      type="text"
                      value={formData.supplierName}
                      onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Supplier Contact</label>
                    <input
                      type="text"
                      value={formData.supplierContact}
                      onChange={(e) => setFormData({ ...formData, supplierContact: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Internal Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none min-h-[50px]"
                    placeholder="Supplier delivery notes, location etc."
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-50 dark:bg-gray-800 text-slate-400 rounded-xl font-black uppercase tracking-widest text-[9px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-[#00246b] dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stock Adjustment Modal */}
      <AnimatePresence>
        {adjustingItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAdjustingItem(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Stock Adjustment
                </h3>
              </div>

              <form onSubmit={handleAdjustStockSubmit} className="p-4 space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Adjusting stock for <span className="text-slate-800 dark:text-white font-black">{adjustingItem.itemName}</span> by {adjustmentDelta > 0 ? `+${adjustmentDelta}` : adjustmentDelta}.
                </p>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Customer Name (Optional)</label>
                  <input
                    type="text"
                    value={adjustFormData.customerName}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, customerName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Contact Number (Optional)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={adjustFormData.customerContact}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // only allow digits
                      setAdjustFormData({ ...adjustFormData, customerContact: value });
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                    placeholder="Enter 10-digit number"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustingItem(null)}
                    className="flex-1 py-3 bg-slate-50 dark:bg-gray-800 text-slate-400 rounded-xl font-black uppercase tracking-widest text-[9px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-[#00246b] dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default VendorInventory;
