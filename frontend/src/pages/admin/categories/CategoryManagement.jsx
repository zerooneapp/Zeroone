import React, { useState, useEffect } from 'react';
import {
  Tag, Plus, Edit2, Trash2, X, Check,
  Image as ImageIcon, LayoutGrid, List,
  RefreshCw, Package, Search, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({ open: false, id: null });
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    isActive: true
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/categories');
      setCategories(res.data);
    } catch (err) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        name: cat.name,
        description: cat.description || '',
        image: cat.image || '',
        isActive: cat.isActive
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', image: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const previousCategories = [...categories];

    try {
      if (editingCategory) {
        // Optimistic
        setCategories(prev => prev.map(c => c._id === editingCategory._id ? { ...c, ...formData } : c));
        setIsModalOpen(false);
        await api.patch(`/admin/categories/${editingCategory._id}`, formData);
        toast.success('Category updated 🏷️');
      } else {
        const res = await api.post('/admin/categories', formData);
        setCategories(prev => [...prev, res.data]);
        setIsModalOpen(false);
        toast.success('Category created 🚀');
      }
    } catch (err) {
      setCategories(previousCategories);
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const executeDelete = async () => {
    const id = confirmData.id;
    const previousCategories = [...categories];
    setCategories(prev => prev.filter(c => c._id !== id));
    setConfirmData({ open: false, id: null });

    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success('Category deleted 🗑️');
    } catch (err) {
      setCategories(previousCategories);
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const openDeleteConfirm = (id) => {
    setConfirmData({ open: true, id });
  };

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-500">

      {/* 🏷️ HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-[24px] font-black text-slate-900 dark:text-white tracking-tight capitalize">Catalog Mastery</h1>
          <p className="text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] mt-1 opacity-60">Manage global service classifications</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-6 h-11 bg-slate-900 dark:bg-primary text-white rounded-xl font-black text-[11px] capitalize tracking-widest hover:scale-105 active:scale-95 transition-all shadow-sm border border-slate-800"
        >
          <Plus size={18} strokeWidth={3} /> Add Class
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => <CategorySkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <AnimatePresence>
            {categories.map((cat) => (
              <motion.div
                key={cat._id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="group p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 hover:border-primary/20 transition-all shadow-sm hover:shadow-xl hover:shadow-primary/5 relative overflow-hidden"
              >
                {/* STATUS DOT */}
                <div className={cn(
                  "absolute top-5 right-5 w-2.5 h-2.5 rounded-full",
                  cat.isActive ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-slate-200"
                )} />

                <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-4 text-slate-400 group-hover:text-primary group-hover:bg-slate-900 transition-all border border-slate-100 dark:border-gray-800 shadow-inner">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Tag size={28} strokeWidth={3} />
                  )}
                </div>

                <h3 className="text-[16px] font-black text-slate-900 dark:text-white capitalize tracking-tight mb-1 truncate group-hover:text-primary transition-colors">{cat.name}</h3>
                <p className="text-[11px] font-bold text-slate-400 capitalize tracking-widest line-clamp-2 leading-[1.4] h-8 opacity-60">
                  {cat.description || "No description provided"}
                </p>

                <div className="mt-4 flex items-center gap-2 pt-4 border-t border-slate-50 dark:border-gray-800">
                  <button
                    onClick={() => handleOpenModal(cat)}
                    className="flex-1 h-9 bg-slate-50 dark:bg-gray-800 rounded-lg text-slate-400 hover:text-primary transition-all flex items-center justify-center border border-slate-100 dark:border-gray-700 active:scale-90"
                  >
                    <Edit2 size={16} strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(cat._id)}
                    className="flex-1 h-9 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-300 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100/50 active:scale-90"
                  >
                    <Trash2 size={16} strokeWidth={3} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="p-20 text-center space-y-4 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800 animate-in zoom-in duration-500 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto text-slate-200 dark:text-gray-700 border border-slate-100 dark:border-gray-800">
            <Tag size={40} strokeWidth={3} />
          </div>
          <p className="font-black text-slate-400 dark:text-gray-600 capitalize tracking-widest text-[12px] opacity-60">
            No classifications defined — create one to start mapping
          </p>
        </div>
      )}

      {/* 🚀 ADD/EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-white/60 dark:bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[20px] font-black text-slate-900 dark:text-white capitalize tracking-tighter">
                  {editingCategory ? "Update Master Class" : "Define New Class"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 flex items-center justify-center bg-slate-50 dark:bg-gray-800 rounded-lg text-slate-400 hover:text-red-500 transition-all border border-slate-100 shadow-sm">
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 leading-none">
                  <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest px-1 opacity-60">Classification Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 h-11 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[14px] font-black capitalize focus:ring-2 ring-primary/20 outline-none dark:text-white transition-all placeholder:text-slate-300"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. LUXURY SPA"
                  />
                </div>
                <div className="space-y-1.5 leading-none">
                  <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest px-1 opacity-60">Metadata Details</label>
                  <textarea
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[14px] font-black capitalize focus:ring-2 ring-primary/20 outline-none dark:text-white transition-all h-24 resize-none no-scrollbar placeholder:text-slate-300"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Classification details..."
                  />
                </div>
                <div className="space-y-1.5 leading-none">
                  <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest px-1 opacity-60">Visual Icon Link</label>
                  <input
                    type="text"
                    className="w-full px-4 h-11 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[13px] font-black capitalize focus:ring-2 ring-primary/20 outline-none dark:text-white transition-all placeholder:text-slate-300"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-800/40 rounded-xl mt-2 border border-slate-100 dark:border-gray-700 shadow-inner">
                  <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest opacity-60">Global Linkage</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black capitalize transition-all shadow-sm border",
                      formData.isActive ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20" : "bg-slate-200 text-slate-500 border-slate-300"
                    )}
                  >
                    {formData.isActive ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                    {formData.isActive ? "Active State" : "Suspended"}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full h-12 bg-slate-900 dark:bg-primary text-white rounded-xl font-black text-[12px] capitalize tracking-widest shadow-lg shadow-slate-900/10 hover:scale-[1.01] active:scale-95 transition-all mt-4 border border-slate-800"
                >
                  {editingCategory ? "Update Classification" : "Establish New Class"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🛡️ PREMIUM CONFIRM MODAL */}
      <AnimatePresence>
        {confirmData.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmData({ open: false, id: null })}
              className="absolute inset-0 bg-white/60 dark:bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative w-full max-w-xs bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 p-8 shadow-2xl text-center space-y-5"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto text-red-500 border border-red-100 dark:border-red-500/20 shadow-sm">
                <AlertCircle size={40} strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-[20px] font-black text-slate-900 dark:text-white capitalize tracking-tighter leading-none">Security Override</h3>
                <p className="text-[11px] font-black text-slate-400 capitalize tracking-widest mt-2 px-2 leading-relaxed opacity-60">
                  Deleting this classification may disrupt active platform services. Execute with caution.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmData({ open: false, id: null })}
                  className="flex-1 h-11 bg-slate-50 dark:bg-gray-800 rounded-xl text-[11px] font-black capitalize tracking-widest text-slate-400 hover:text-slate-600 transition-all border border-slate-100 shadow-sm"
                >
                  Abort
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 h-11 bg-red-500 text-white rounded-xl text-[11px] font-black capitalize tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all border border-red-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

const CategorySkeleton = () => (
  <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 animate-pulse space-y-4 shadow-sm">
    <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-xl" />
    <div className="h-4 w-2/3 bg-slate-50 dark:bg-gray-800 rounded-md" />
    <div className="h-3 w-full bg-slate-50/50 dark:bg-gray-800/50 rounded-md" />
    <div className="h-3 w-5/6 bg-slate-50/50 dark:bg-gray-800/50 rounded-md" />
    <div className="h-9 w-full bg-slate-50/50 dark:bg-gray-800/50 rounded-lg mt-4" />
  </div>
);

export default CategoryManagement;
