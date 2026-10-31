import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, AlertTriangle, Terminal, X, ShieldCheck, Store, Save, Lock, IndianRupee } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const DeveloperSettings = () => {
  const [sections, setSections] = useState([]);
  const [total, setTotal] = useState(0);
  const [protectedData, setProtectedData] = useState([]);
  const [confirmPhrase, setConfirmPhrase] = useState('DELETE');
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [typed, setTyped] = useState('');
  const [clearing, setClearing] = useState(false);
  const [revenueResetAt, setRevenueResetAt] = useState(null);
  const [resettingRevenue, setResettingRevenue] = useState(false);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/developer/sections');
      setSections(res.data.sections);
      setTotal(res.data.total);
      setProtectedData(res.data.protectedData || []);
      setConfirmPhrase(res.data.confirmPhrase);
      setRevenueResetAt(res.data.revenueResetAt);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load database sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const openConfirm = (section) => {
    setTarget(section);
    setTyped('');
  };

  const handleClear = async () => {
    try {
      setClearing(true);
      const res = await api.delete(`/admin/developer/sections/${target.key}`, {
        data: { confirm: typed }
      });
      toast.success(`${res.data.message} (${res.data.deleted} records removed)`);
      setTarget(null);
      fetchSections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clean-up failed');
    } finally {
      setClearing(false);
    }
  };

  const handleResetRevenue = async () => {
    const confirmed = window.confirm('Dashboard revenue will start again from ₹0. Wallet history is not deleted. Continue?');
    if (!confirmed) return;
    try {
      setResettingRevenue(true);
      const res = await api.post('/admin/developer/reset-revenue');
      setRevenueResetAt(res.data.revenueResetAt);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset revenue');
    } finally {
      setResettingRevenue(false);
    }
  };

  if (loading && sections.length === 0) return (
    <div className="p-12 space-y-8 animate-pulse">
      <div className="h-40 bg-gray-50 rounded-[3rem]" />
      <div className="grid grid-cols-2 gap-8">
        <div className="h-48 bg-gray-50 rounded-[3rem]" />
        <div className="h-48 bg-gray-50 rounded-[3rem]" />
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-500">

      {/* 🛠️ HEADER */}
      <div className="p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b-2 border-b-red-500/20">
        <div className="space-y-1">
          <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tighter capitalize">Developer Settings</h1>
          <p className="text-[12px] font-black text-slate-500 capitalize tracking-[0.2em] opacity-90">Clean database records section by section</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto justify-end">
          <button
            onClick={fetchSections}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-white font-black text-[11px] uppercase tracking-widest rounded-xl active:scale-95 transition-all disabled:opacity-80 shrink-0"
          >
            <RefreshCw className={cn(loading && 'animate-spin')} size={15} />
            Refresh
          </button>
          <button
            onClick={() => openConfirm({ key: 'all', label: 'All Data', description: 'Every section below. Protected vendors, protected master data and admin accounts are kept', count: total })}
            disabled={total === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 bg-red-500 text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/25 active:scale-95 transition-all disabled:opacity-50 shrink-0"
          >
            <Trash2 size={15} />
            Wipe All Data ({total})
          </button>
        </div>
      </div>

      {/* ⚠️ WARNING */}
      <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center gap-4 border border-red-200 dark:border-red-500/20">
        <AlertTriangle size={24} strokeWidth={3} className="text-red-500 shrink-0" />
        <p className="text-[12px] font-black text-red-600 dark:text-red-400 tracking-wide leading-relaxed">
          Deleted data cannot be recovered. Take a database backup before cleaning.
        </p>
      </div>

      {/* 🛡️ PROTECTED DATA */}
      {protectedData.length > 0 && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 border border-emerald-200 dark:border-emerald-500/20">
          <div className="flex items-center gap-3 shrink-0">
            <ShieldCheck size={24} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400" />
            <p className="text-[12px] font-black text-emerald-700 dark:text-emerald-400 tracking-wide">Never deleted from here:</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {protectedData.map((name) => (
              <span key={name} className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-lg">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <ProtectedVendors onSaved={fetchSections} />

      {/* 💰 DASHBOARD REVENUE */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <IndianRupee size={20} strokeWidth={3} className="text-primary dark:text-white opacity-80 shrink-0" />
          <div>
            <h3 className="text-[14px] font-black text-slate-900 dark:text-white capitalize tracking-[0.1em]">Dashboard Revenue</h3>
            <p className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
              Resets the dashboard revenue to ₹0. Vendor wallet history is not deleted.
              {revenueResetAt && ` Last reset: ${new Date(revenueResetAt).toLocaleString('en-IN')}`}
            </p>
          </div>
        </div>
        <button
          onClick={handleResetRevenue}
          disabled={resettingRevenue}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white active:scale-95 transition-all disabled:opacity-40 shrink-0"
        >
          <RefreshCw className={cn(resettingRevenue && 'animate-spin')} size={14} />
          Reset Revenue To ₹0
        </button>
      </div>

      {/* 🗂️ SECTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {sections.map((section) => (
          <div
            key={section.key}
            className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col gap-4 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-50 dark:border-gray-800 pb-3.5">
              <div className="flex items-center gap-3">
                <Database size={20} strokeWidth={3} className="text-primary dark:text-white opacity-80 shrink-0" />
                <h3 className="text-[14px] font-black text-slate-900 dark:text-white capitalize tracking-[0.1em]">{section.label}</h3>
              </div>
              <span className="text-[11px] font-black text-primary dark:text-white bg-primary/10 dark:bg-white/10 px-2.5 py-1 rounded-lg whitespace-nowrap">
                {section.count} records
              </span>
            </div>
            <p className="text-[12px] font-bold text-slate-500 dark:text-gray-400 leading-relaxed flex-1">{section.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {section.collections.map((name) => (
                <span key={name} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-800 px-2 py-1 rounded-md">
                  <Terminal size={10} /> {name}
                </span>
              ))}
            </div>
            <button
              onClick={() => openConfirm(section)}
              disabled={section.count === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Trash2 size={14} />
              {section.count === 0 ? 'Already Empty' : `Clear ${section.label}`}
            </button>
          </div>
        ))}
      </div>

      {/* 🔐 CONFIRM MODAL */}
      {target && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !clearing && setTarget(null)}>
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} strokeWidth={3} />
                </div>
                <h3 className="text-[16px] font-black text-slate-900 dark:text-white">Clear {target.label}?</h3>
              </div>
              <button onClick={() => setTarget(null)} disabled={clearing} className="p-1 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <p className="text-[13px] font-bold text-slate-600 dark:text-gray-400 leading-relaxed">
              {target.description}. <span className="text-red-500">{target.count} records</span> will be permanently deleted.
            </p>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                Type <span className="text-red-500">{confirmPhrase}</span> to confirm
              </label>
              <input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={clearing}
                className="w-full px-4 h-12 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[16px] font-black text-slate-900 dark:text-white focus:ring-2 ring-red-500/20 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTarget(null)}
                disabled={clearing}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-white font-black text-[11px] uppercase tracking-widest rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={typed !== confirmPhrase || clearing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/25 active:scale-95 transition-all disabled:opacity-40"
              >
                {clearing ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
                {clearing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Vendors ticked here keep all of their data (staff, services, inventory, bookings...) during clean-up
const ProtectedVendors = ({ onSaved }) => {
  const [vendors, setVendors] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saved, setSaved] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchVendors = async () => {
    try {
      const res = await api.get('/admin/developer/protected-vendors');
      const ids = res.data.filter((v) => v.isProtected).map((v) => v._id);
      setVendors(res.data);
      setSelected(ids);
      setSaved(ids);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load vendors');
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const isDirty = selected.length !== saved.length || selected.some((id) => !saved.includes(id));

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/admin/developer/protected-vendors', { vendorIds: selected });
      setSaved(selected);
      toast.success('Protected vendors saved');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save protected vendors');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 dark:border-gray-800 pb-3.5">
        <div className="flex items-center gap-3">
          <Lock size={20} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <h3 className="text-[14px] font-black text-slate-900 dark:text-white capitalize tracking-[0.1em]">Protected Vendors ({saved.length})</h3>
            <p className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
              Tick = data safe rahega. Untick = clean-up mein data delete hoga. Ticked vendors keep all their staff, services, inventory, memberships, promotions, bookings and customers.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/25 active:scale-95 transition-all disabled:opacity-40 shrink-0"
        >
          {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {vendors.map((vendor) => {
          const isOn = selected.includes(vendor._id);
          return (
            <label
              key={vendor._id}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                isOn
                  ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/40"
              )}
            >
              <input
                type="checkbox"
                checked={isOn}
                onChange={() => toggle(vendor._id)}
                className="w-4 h-4 accent-emerald-600 shrink-0"
              />
              <Store size={16} className={isOn ? "text-emerald-600 dark:text-emerald-400 shrink-0" : "text-slate-400 shrink-0"} />
              <div className="min-w-0">
                <p className="text-[13px] font-black text-slate-900 dark:text-white truncate">{vendor.shopName}</p>
                <p className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
                  {vendor.ownerPhone || 'No owner account'} · {vendor.status}
                </p>
              </div>
              <span className={cn(
                "ml-auto flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md whitespace-nowrap shrink-0",
                isOn
                  ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20"
                  : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10"
              )}>
                {isOn ? <ShieldCheck size={12} /> : <Trash2 size={12} />}
                {isOn ? 'Safe' : 'Will be deleted'}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default DeveloperSettings;
