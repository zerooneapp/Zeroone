import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  AlertTriangle,
  Loader2,
  Package,
  PlusCircle,
  MinusCircle,
  ClipboardList,
  Layers,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import Navbar from '../layouts/Navbar';

const StaffInventory = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // History view state
  const [historyItem, setHistoryItem] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logDateFilters, setLogDateFilters] = useState({ from: '', to: '' });

  // Adjustment Modal State
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState(0);
  const [adjustFormData, setAdjustFormData] = useState({
    customerName: '',
    customerContact: '',
    quantity: 1
  });
  const [adjustLoading, setAdjustLoading] = useState(false);

  const [isGlobalReturnOpen, setIsGlobalReturnOpen] = useState(false);
  const [globalReturnItemId, setGlobalReturnItemId] = useState('');
  const [globalReturnFormData, setGlobalReturnFormData] = useState({
    customerName: '',
    customerContact: '',
    quantity: 1
  });

  const triggerGlobalReturn = () => {
    setIsGlobalReturnOpen(true);
    setGlobalReturnItemId('');
    setGlobalReturnFormData({ customerName: '', customerContact: '', quantity: 1 });
  };

  const handleGlobalReturnSubmit = async (e) => {
    e.preventDefault();
    if (!globalReturnItemId) {
      return toast.error('Please select a product');
    }

    const qty = parseInt(globalReturnFormData.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return toast.error('Please enter a valid quantity');
    }

    const contact = globalReturnFormData.customerContact.trim();
    if (contact && !/^[6-9]\d{9}$/.test(contact)) {
      return toast.error('Please enter a valid 10-digit contact number');
    }

    try {
      setAdjustLoading(true);
      const res = await api.post(`/inventory/staff/${globalReturnItemId}/adjust`, {
        change: qty,
        customerName: globalReturnFormData.customerName,
        customerContact: contact,
        isReturn: true
      });

      setItems(items.map((item) =>
        item._id === globalReturnItemId ? { ...item, stock: res.data.stock } : item
      ));

      toast.success('Return processed and stock increased successfully');
      setIsGlobalReturnOpen(false);
      setGlobalReturnItemId('');
      setGlobalReturnFormData({ customerName: '', customerContact: '', quantity: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process return');
    } finally {
      setAdjustLoading(false);
    }
  };

  const [totalEarnings, setTotalEarnings] = useState(0);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/staff');
      const inventoryItems = res.data || [];
      setItems(inventoryItems);

      // Dynamically calculate actual product sales earnings from historical logs
      let calculatedEarnings = 0;
      await Promise.all(
        inventoryItems.map(async (item) => {
          try {
            const logsRes = await api.get(`/inventory/staff/${item._id}/logs?limit=100`);
            const logs = logsRes.data.logs || [];
            // Sum up sales where change is negative (meaning product was sold/used)
            logs.forEach(log => {
              if (log.change < 0 && !log.isReturn) {
                calculatedEarnings += Math.abs(log.change) * (item.price || 0);
              }
            });
          } catch (e) {
            console.error('Failed to calculate earnings for item', item._id);
          }
        })
      );
      setTotalEarnings(calculatedEarnings);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // ── History ──
  const fetchLogs = async (item, page = 1, filters = logDateFilters) => {
    if (!item) return;
    try {
      setLogsLoading(true);
      const params = new URLSearchParams({ page, limit: 10 });
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      const res = await api.get(`/inventory/staff/${item._id}/logs?${params}`);
      setHistoryLogs(res.data.logs || []);
      setLogsTotalPages(res.data.totalPages || 1);
      setLogsPage(res.data.currentPage || 1);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setLogsLoading(false);
    }
  };

  // Sync searchParams with historyItem on mount/change
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId) {
      const foundItem = items.find(i => i._id === itemId);
      if (foundItem) {
        setHistoryItem(foundItem);
        fetchLogs(foundItem, 1, logDateFilters);
      }
    } else {
      setHistoryItem(null);
    }
  }, [searchParams, items]);

  const handleOpenHistory = (item) => {
    setSearchParams({ item: item._id });
    setHistoryLogs([]);
    setLogsPage(1);
    setLogDateFilters({ from: '', to: '' });
    fetchLogs(item, 1, { from: '', to: '' });
  };

  const handleLogFilterChange = (key, value) => {
    const updated = { ...logDateFilters, [key]: value };
    setLogDateFilters(updated);
    fetchLogs(historyItem, 1, updated);
  };

  const handleLogsPageChange = (page) => {
    fetchLogs(historyItem, page);
  };

  // ── Adjust Stock ──
  const triggerAdjust = (e, item, delta) => {
    e.stopPropagation();
    setAdjustingItem(item);
    setAdjustmentDelta(delta);
    setAdjustFormData({ customerName: '', customerContact: '', quantity: 1 });
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustingItem) return;

    const qty = parseInt(adjustFormData.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return toast.error('Please enter a valid quantity');
    }
    const finalDelta = adjustmentDelta > 0 ? qty : -qty;

    const contact = adjustFormData.customerContact.trim();
    if (contact && !/^[6-9]\d{9}$/.test(contact)) {
      return toast.error('Please enter a valid 10-digit contact number');
    }

    try {
      setAdjustLoading(true);
      const res = await api.post(`/inventory/staff/${adjustingItem._id}/adjust`, {
        change: finalDelta,
        customerName: adjustFormData.customerName,
        customerContact: contact,
        isReturn: adjustmentDelta > 0
      });
      setItems(items.map((item) =>
        item._id === adjustingItem._id ? { ...item, stock: res.data.stock } : item
      ));
      // Also update historyItem stock if it's the same item
      if (historyItem && historyItem._id === adjustingItem._id) {
        setHistoryItem((prev) => ({ ...prev, stock: res.data.stock }));
      }
      toast.success('Stock updated successfully');
      setAdjustingItem(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    } finally {
      setAdjustLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const cats = new Set(items.map((item) => item.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [items]);

  const metrics = useMemo(() => {
    const totalStock = items.reduce((sum, i) => sum + i.stock, 0);
    const lowStockCount = items.filter((i) => i.stock <= i.minStockLevel).length;
    const totalValue = items.reduce((sum, i) => sum + (i.price || 0) * i.stock, 0);
    return { totalItems: items.length, totalStock, lowStockCount, totalValue };
  }, [items]);

  // ── History Page View ──
  if (historyItem) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans pb-24 text-slate-800 dark:text-white">
        <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-[100] px-4 pt-[48px] pb-3 flex items-center justify-between bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-slate-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchParams({})}
              className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-md font-normal leading-none capitalize">{historyItem.itemName}</h1>
              <p className="text-[9px] font-semibold text-slate-400 mt-0.5">Stock History</p>
            </div>
          </div>
          {/* Inline - on history header */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-800 p-1.5 rounded-xl border border-slate-100 dark:border-gray-700">
            <button
              onClick={(e) => triggerAdjust(e, historyItem, -1)}
              className="text-slate-400 hover:text-rose-500 active:scale-90 transition-all p-1"
              title="Reduce stock"
            >
              <MinusCircle size={16} />
            </button>
            <span className={cn(
              "text-[13px] font-black w-8 text-center",
              historyItem.stock <= historyItem.minStockLevel ? "text-rose-500" : "text-slate-800 dark:text-white"
            )}>
              {historyItem.stock}
            </span>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 pt-[126px] space-y-3">
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

          {/* Logs */}
          <div className="space-y-3">
            {logsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-[#00246b] dark:text-white" size={24} />
                <p className="text-[9px] font-semibold text-slate-400">Loading history...</p>
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="py-16 text-center bg-white/50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800">
                <ClipboardList className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={32} />
                <p className="text-[10px] font-semibold text-slate-400">No records found</p>
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
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-800 dark:text-white">
                            {new Date(log.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })} • {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>

                          {log.adjustedBy === 'staff' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-500 rounded text-[7.5px] font-black uppercase tracking-wider">
                              👤 Staff: {log.staffName || 'You'}
                            </span>
                          )}

                          {log.customerName ? (
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                              Client: {log.customerName} {log.customerContact && `• ${log.customerContact}`}
                            </p>
                          ) : (
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                              {log.adjustedBy === 'staff' ? 'No client info' : 'Manual Adjustment'}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider uppercase flex items-center gap-0.5",
                            log.isReturn ? "bg-cyan-500/10 text-cyan-500" : (isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")
                          )}>
                            {log.isReturn ? 'Return' : (isPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />)}
                            {isPositive ? `+${log.change}` : log.change}
                          </span>
                          <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">
                            Stock: {log.newStock}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {logsTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <button
                      disabled={logsPage === 1}
                      onClick={() => handleLogsPageChange(logsPage - 1)}
                      className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-500 disabled:opacity-50 active:scale-95 transition-all shadow-sm"
                    >
                      Prev
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Page {logsPage} of {logsTotalPages}
                    </span>
                    <button
                      disabled={logsPage === logsTotalPages}
                      onClick={() => handleLogsPageChange(logsPage + 1)}
                      className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-500 disabled:opacity-50 active:scale-95 transition-all shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Adjustment Modal (available on history page too) */}
        <AnimatePresence>
          {adjustingItem && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setAdjustingItem(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative z-10"
              >
                <div className="p-4 border-b border-slate-100 dark:border-gray-800">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                    Stock Adjustment
                  </h3>
                </div>
                <form onSubmit={handleAdjustSubmit} className="p-4 space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Adjusting <span className="text-slate-800 dark:text-white font-black">{adjustingItem.itemName}</span> by{' '}
                    <span className={adjustmentDelta > 0 ? 'text-emerald-500' : 'text-rose-500'}>
                      {adjustmentDelta > 0 ? `+${adjustmentDelta}` : adjustmentDelta}
                    </span>
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
                      onChange={(e) => setAdjustFormData({ ...adjustFormData, customerContact: e.target.value.replace(/\D/g, '') })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                      placeholder="Enter 10-digit number"
                    />
                  </div>
                  <div className="flex gap-2.5 pt-1">
                    <button type="button" onClick={() => setAdjustingItem(null)}
                      className="flex-1 py-3 bg-slate-50 dark:bg-gray-800 text-slate-400 rounded-xl font-black uppercase tracking-widest text-[9px]">
                      Cancel
                    </button>
                    <button type="submit" disabled={adjustLoading}
                      className="flex-1 py-3 bg-[#00246b] dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg disabled:opacity-50">
                      {adjustLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <Navbar />
      </div>
    );
  }

  // ── Main Item List View ──
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans pb-24 text-slate-800 dark:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-[100] px-4 pt-[48px] pb-3 flex items-center justify-between bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-slate-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-md font-normal leading-none">Stock Management</h1>
            <p className="text-[9px] font-semibold text-slate-400 mt-0.5">Tap a card to view history · - to adjust</p>
          </div>
        </div>
        <button
          onClick={() => triggerGlobalReturn()}
          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-lg text-[8px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-1"
        >
          Return Product
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-[126px] space-y-3">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl shadow-sm flex items-center gap-1.5">
            <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg shrink-0"><Package size={12} /></div>
            <div>
              <p className="text-[8px] font-semibold text-slate-400 leading-none">Items</p>
              <h3 className="text-xs font-black mt-0.5">{metrics.totalItems}</h3>
            </div>
          </div>
          <div className="p-2 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl shadow-sm flex items-center gap-1.5">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0"><Layers size={12} /></div>
            <div>
              <p className="text-[8px] font-semibold text-slate-400 leading-none">Total Stock</p>
              <h3 className="text-xs font-black mt-0.5">{metrics.totalStock}</h3>
            </div>
          </div>
          <div className="p-2 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl shadow-sm flex items-center gap-1.5">
            <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg shrink-0"><Coins size={12} /></div>
            <div>
              <p className="text-[8px] font-semibold text-slate-400 leading-none">Stock Value</p>
              <h3 className="text-xs font-black mt-0.5">₹{metrics.totalValue}</h3>
            </div>
          </div>
          <div className="p-2 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl shadow-sm flex items-center gap-1.5">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0"><TrendingUp size={12} /></div>
            <div>
              <p className="text-[8px] font-semibold text-slate-400 leading-none">Product Earning</p>
              <h3 className="text-xs font-black mt-0.5 text-emerald-500">₹{totalEarnings}</h3>
            </div>
          </div>
          <div className={cn(
            "p-2 border rounded-xl shadow-sm flex items-center gap-1.5 transition-colors grid-col-span-2",
            metrics.lowStockCount > 0 ? "bg-rose-500/5 border-rose-500/20" : "bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800"
          )}>
            <div className={cn("p-1.5 rounded-lg shrink-0", metrics.lowStockCount > 0 ? "bg-rose-500/20 text-rose-500" : "bg-slate-500/10 text-slate-400")}>
              <ShieldAlert size={12} />
            </div>
            <div>
              <p className="text-[8px] font-semibold text-slate-400 leading-none">Low Stock</p>
              <h3 className="text-xs font-black mt-0.5">{metrics.lowStockCount}</h3>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 p-4 space-y-3 shadow-sm">
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-3 py-2 flex items-center gap-2">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search item name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[11px] font-bold outline-none placeholder-slate-400 text-slate-800 dark:text-white"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-white outline-none h-10"
            >
              {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
        </div>

        {/* Item List */}
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-[#00246b] dark:text-white" size={24} />
            <p className="text-[9px] font-semibold text-slate-400">Loading items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-white/50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800">
            <ClipboardList className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={32} />
            <p className="text-[10px] font-semibold text-slate-400">No items found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const isLowStock = item.stock <= item.minStockLevel;
              return (
                <div
                  key={item._id}
                  onClick={() => handleOpenHistory(item)}
                  className={cn(
                    "p-2.5 bg-white dark:bg-gray-900 border rounded-xl shadow-sm transition-all cursor-pointer active:scale-[0.98]",
                    isLowStock ? 'border-rose-500/20 bg-rose-500/[0.01]' : 'border-slate-100 dark:border-gray-800'
                  )}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h3 className="text-xs font-black text-slate-800 dark:text-white capitalize leading-tight">
                        {item.itemName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1">
                        {item.sku && (
                          <span className="px-1 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-[6.5px] font-black text-slate-400 uppercase tracking-widest">
                            {item.sku}
                          </span>
                        )}
                        {item.category && (
                          <span className="px-1 py-0.5 rounded bg-blue-500/10 text-[6.5px] font-black text-blue-500 uppercase tracking-widest">
                            {item.category}
                          </span>
                        )}
                        <span className="px-1 py-0.5 rounded bg-emerald-500/10 text-[6.5px] font-black text-emerald-500 uppercase tracking-widest">
                          Price: ₹{item.price || 0}
                        </span>
                        {isLowStock && (
                          <span className="px-1 py-0.5 rounded bg-rose-500/10 text-[6.5px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-0.5">
                            <AlertTriangle size={6.5} /> Low Stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock controls — stopPropagation so card click doesn't fire */}
                    <div
                      className="flex items-center gap-1 bg-slate-50 dark:bg-gray-800 p-1 rounded-lg border border-slate-100 dark:border-gray-700 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => triggerAdjust(e, item, -1)}
                        className="text-slate-400 hover:text-rose-500 active:scale-90 transition-all p-0.5"
                        title="Reduce stock"
                      >
                        <MinusCircle size={15} />
                      </button>
                      <span className={cn(
                        "text-xs font-black w-7 text-center",
                        isLowStock ? "text-rose-500" : "text-slate-800 dark:text-white"
                      )}>
                        {item.stock}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Stock Adjustment Modal */}
      <AnimatePresence>
        {adjustingItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAdjustingItem(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-4 border-b border-slate-100 dark:border-gray-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Stock Adjustment</h3>
              </div>
              <form onSubmit={handleAdjustSubmit} className="p-4 space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Adjusting <span className="text-slate-800 dark:text-white font-black">{adjustingItem.itemName}</span> by{' '}
                  <span className={adjustmentDelta > 0 ? 'text-emerald-500 font-black' : 'text-rose-500 font-black'}>
                    {adjustmentDelta > 0 ? 'increasing' : 'decreasing'} stock
                  </span>.
                </p>

                {adjustmentDelta > 0 && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Adjustment Type</label>
                    <div className="flex p-1 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                      <div className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-center bg-white dark:bg-gray-700 text-[#00246b] dark:text-white shadow-sm">
                        Customer Return
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustFormData.quantity}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1);
                      setAdjustFormData({ ...adjustFormData, quantity: val });
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Customer Name (Optional)</label>
                  <input type="text" value={adjustFormData.customerName}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, customerName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                    placeholder="Enter customer name" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Contact Number (Optional)</label>
                  <input type="tel" maxLength={10} value={adjustFormData.customerContact}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, customerContact: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                    placeholder="Enter 10-digit number" />
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button type="button" onClick={() => setAdjustingItem(null)}
                    className="flex-1 py-3 bg-slate-50 dark:bg-gray-800 text-slate-400 rounded-xl font-black uppercase tracking-widest text-[9px]">
                    Cancel
                  </button>
                  <button type="submit" disabled={adjustLoading}
                    className="flex-1 py-3 bg-[#00246b] dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg disabled:opacity-50">
                    {adjustLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Return Modal */}
      <AnimatePresence>
        {isGlobalReturnOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsGlobalReturnOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-4 border-b border-slate-100 dark:border-gray-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Product Return Form</h3>
              </div>
              <form onSubmit={handleGlobalReturnSubmit} className="p-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Select Product</label>
                  <select
                    required
                    value={globalReturnItemId}
                    onChange={(e) => setGlobalReturnItemId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20 text-slate-800 dark:text-white"
                  >
                    <option value="">-- Choose Product --</option>
                    {items.map((item) => (
                      <option key={item._id} value={item._id} className="text-slate-850 dark:text-white">
                        {item.itemName} (Price: ₹{item.price})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Return Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={globalReturnFormData.quantity}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1);
                      setGlobalReturnFormData({ ...globalReturnFormData, quantity: val });
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Customer Name (Optional)</label>
                  <input type="text" value={globalReturnFormData.customerName}
                    onChange={(e) => setGlobalReturnFormData({ ...globalReturnFormData, customerName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                    placeholder="Enter customer name" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Contact Number (Optional)</label>
                  <input type="tel" maxLength={10} value={globalReturnFormData.customerContact}
                    onChange={(e) => setGlobalReturnFormData({ ...globalReturnFormData, customerContact: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00246b]/20"
                    placeholder="Enter 10-digit number" />
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button type="button" onClick={() => setIsGlobalReturnOpen(false)}
                    className="flex-1 py-3 bg-slate-50 dark:bg-gray-800 text-slate-400 rounded-xl font-black uppercase tracking-widest text-[9px]">
                    Cancel
                  </button>
                  <button type="submit" disabled={adjustLoading}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg disabled:opacity-50">
                    {adjustLoading ? 'Processing...' : 'Confirm Return'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Navbar />
    </div>
  );
};

export default StaffInventory;
