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
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* 🏷️ HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
         <div>
            <h1 className="text-2xl font-black dark:text-white tracking-tight text-primary">Catalog Mastery 🏷️</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage global service classifications</p>
         </div>
         <button 
           onClick={() => handleOpenModal()}
           className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
         >
            <Plus size={16} /> Add Class
         </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           {[1,2,3,4].map(i => <CategorySkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <AnimatePresence>
              {categories.map((cat) => (
                <motion.div 
                  key={cat._id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 hover:border-primary/20 transition-all shadow-sm hover:shadow-xl hover:shadow-primary/5 relative overflow-hidden"
                >
                   {/* STATUS DOT */}
                   <div className={cn(
                     "absolute top-6 right-6 w-2 h-2 rounded-full",
                     cat.isActive ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-gray-300"
                   )} />

                   <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-6 text-gray-400 group-hover:text-primary group-hover:bg-primary/5 transition-colors border border-gray-50 dark:border-gray-800">
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <Tag size={28} />
                      )}
                   </div>

                   <h3 className="text-sm font-black dark:text-white uppercase tracking-tight mb-2 truncate">{cat.name}</h3>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest line-clamp-2 leading-relaxed h-8">
                      {cat.description || "No description provided"}
                   </p>

                   <div className="mt-6 flex items-center gap-2 pt-6 border-t border-gray-50 dark:border-gray-800">
                      <button 
                        onClick={() => handleOpenModal(cat)}
                        className="flex-1 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-primary transition-colors flex items-center justify-center"
                      >
                         <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => openDeleteConfirm(cat._id)}
                        className="flex-1 py-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                      >
                         <Trash2 size={14} />
                      </button>
                   </div>
                </motion.div>
              ))}
           </AnimatePresence>
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="p-20 text-center space-y-4 bg-white dark:bg-gray-900 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
           <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300 font-black text-4xl">
              ?
           </div>
           <p className="font-black text-gray-400 uppercase tracking-widest text-sm">
              No categories yet — create one to start
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
                className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-8 shadow-2xl"
              >
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">
                       {editingCategory ? "Update Class" : "Define New Class"}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-red-500 transition-colors">
                       <X size={20} />
                    </button>
                 </div>

                 <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Class Name</label>
                       <input 
                         type="text"
                         required
                         className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm font-black focus:ring-2 ring-primary/20 outline-none dark:text-white transition-all"
                         value={formData.name}
                         onChange={(e) => setFormData({...formData, name: e.target.value})}
                         placeholder="e.g. Luxury Spa"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Description</label>
                       <textarea 
                         className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-primary/20 outline-none dark:text-white transition-all h-24 resize-none"
                         value={formData.description}
                         onChange={(e) => setFormData({...formData, description: e.target.value})}
                         placeholder="classification details..."
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Icon URL (Optional)</label>
                       <input 
                         type="text"
                         className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-primary/20 outline-none dark:text-white transition-all"
                         value={formData.image}
                         onChange={(e) => setFormData({...formData, image: e.target.value})}
                         placeholder="https://..."
                       />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl mt-4">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Status</span>
                       <button 
                         type="button"
                         onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                         className={cn(
                           "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm",
                           formData.isActive ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-gray-200 text-gray-500"
                         )}
                       >
                          {formData.isActive ? <Check size={14} /> : <X size={14} />}
                          {formData.isActive ? "Active" : "Disabled"}
                       </button>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-5 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                    >
                       {editingCategory ? "Execute Update" : "Establish Class"}
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
                className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-10 shadow-2xl text-center space-y-6"
              >
                  <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto text-red-500 border border-red-100 dark:border-red-500/20">
                     <AlertCircle size={40} />
                  </div>
                  <div>
                     <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Destructive Action</h3>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 px-4 leading-relaxed">
                        Are you sure? This classification removal may disrupt active vendor services.
                     </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                     <button 
                       onClick={() => setConfirmData({ open: false, id: null })}
                       className="flex-1 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
                     >
                        Cancel
                     </button>
                     <button 
                       onClick={executeDelete}
                       className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
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
  <div className="p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 animate-pulse space-y-4">
     <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
     <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-800 rounded-lg" />
     <div className="h-2 w-full bg-gray-50 dark:bg-gray-800/50 rounded-lg" />
     <div className="h-2 w-5/6 bg-gray-50 dark:bg-gray-800/50 rounded-lg" />
     <div className="h-10 w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl mt-6" />
  </div>
);

export default CategoryManagement;
