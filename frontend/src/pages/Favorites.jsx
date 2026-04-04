import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
   Heart, ArrowLeft, Star, MapPin,
   ChevronRight, ShoppingBag, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import Navbar from '../layouts/Navbar';

const Favorites = () => {
   const navigate = useNavigate();
   const { isAuthenticated } = useAuthStore();
   const [favorites, setFavorites] = useState([]);
   const [loading, setLoading] = useState(true);

   const fetchFavorites = async () => {
      if (!isAuthenticated) return;
      try {
         setLoading(true);
         const res = await api.get('/users/favorites');
         setFavorites(res.data || []);
      } catch (err) {
         console.error('Failed to sync favorites');
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      if (!isAuthenticated) {
         navigate('/login');
      } else {
         fetchFavorites();
      }
   }, [isAuthenticated]);

   return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-32">
         {/* Header (Elite Minimal) */}
         <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-3xl border-b border-slate-200/60 dark:border-gray-800 p-4 pt-8">
            <div className="flex items-center gap-3">
               <button
                  onClick={() => navigate(-1)}
                  className="p-2.5 bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white rounded-xl active:scale-95 transition-all shadow-sm border border-slate-200/50 dark:border-gray-700"
               >
                  <ArrowLeft size={18} strokeWidth={3} />
               </button>
               <div className="leading-none">
                  <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">My wishlist</h1>
                  <p className="text-[8px] font-black text-slate-400 tracking-[0.2em] mt-1">{favorites.length} Saved salons</p>
               </div>
            </div>
         </div>

         <main className="p-4">
            <AnimatePresence mode="wait">
               {loading ? (
                  <div className="space-y-4">
                     {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl animate-pulse" />)}
                  </div>
               ) : favorites.length > 0 ? (
                  <div className="space-y-4">
                     {favorites.map((vendor, idx) => (
                        <motion.div
                           layout
                           initial={{ opacity: 0, y: 15 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: idx * 0.05 }}
                           key={vendor._id}
                           className="bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.01)] overflow-hidden group active:scale-[0.98] transition-all"
                        >
                           <div className="relative h-32 overflow-hidden bg-slate-50 dark:bg-gray-800 border-b border-slate-50 dark:border-gray-800">
                              <img
                                 src={vendor.shopImage || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=800'}
                                 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                 alt={vendor.shopName}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60" />

                              {/* Rating Pill */}
                              <div className="absolute bottom-2.5 left-3.5">
                                 <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-1.5 py-1 rounded-lg border border-white/20 shadow-xl">
                                    <Star size={10} fill="#F59E0B" className="text-amber-500 border-none" />
                                    <span className="text-[10px] font-black text-slate-900 dark:text-white leading-none">{vendor.rating || '4.8'}</span>
                                 </div>
                              </div>

                              {/* Heart Button - Optimized for removal */}
                              <button
                                 onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                       await api.post('/users/favorites/toggle', { vendorId: vendor._id });
                                       setFavorites(prev => prev.filter(v => v._id !== vendor._id));
                                    } catch (err) { console.error('Failed to update elite list'); }
                                 }}
                                 className="absolute top-3 right-3.5 p-2 bg-slate-900 text-white rounded-xl shadow-2xl border border-white/10 active:scale-90 transition-all"
                              >
                                 <Heart size={16} fill="currentColor" strokeWidth={3} />
                              </button>
                           </div>

                           <div className="p-3.5 px-4 flex items-center justify-between">
                              <div className="space-y-1.5 leading-none">
                                 <h3 className="text-[13px] font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[120px]">{vendor.shopName}</h3>
                                 <div className="flex items-center gap-1 opacity-60">
                                    <MapPin size={10} strokeWidth={3} className="text-slate-400" />
                                    <span className="text-[9px] font-black text-slate-400 tracking-widest truncate">{vendor.address?.split(',')[0]}</span>
                                 </div>
                              </div>

                              <button
                                 onClick={() => navigate(`/service/${vendor._id}`)}
                                 className="h-10 px-6 bg-slate-900 dark:bg-primary text-white rounded-xl font-black text-[9px] tracking-widest active:scale-95 transition-all border-b-2 border-white/10 shadow-lg"
                              >
                                 Book now
                              </button>
                           </div>
                        </motion.div>
                     ))}
                  </div>
               ) : (
                  <div className="py-20 text-center space-y-6 bg-white dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-gray-800 shadow-sm">
                     <div className="w-20 h-20 bg-slate-50 dark:bg-gray-800 rounded-2xl shadow-inner flex items-center justify-center mx-auto border border-slate-100 dark:border-gray-700">
                        <ShoppingBag size={40} className="text-slate-200 dark:text-gray-700" />
                     </div>
                     <div className="space-y-1.5">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Wishlist empty</h2>
                        <p className="text-[8px] font-black text-slate-400 tracking-[0.2em] max-w-[180px] mx-auto leading-relaxed opacity-60">
                           You haven't saved any <br /> elite salons yet.
                        </p>
                     </div>
                     <button
                        onClick={() => navigate('/')}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2 mx-auto border-b-2 border-white/10"
                     >
                        <Search size={14} strokeWidth={3} />
                        Find services
                     </button>
                  </div>
               )}
            </AnimatePresence>
         </main>

         <Navbar />
      </div>
   );
};

export default Favorites;
