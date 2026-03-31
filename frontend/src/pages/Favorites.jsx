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
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      {/* Header (Elite Minimal) */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-5">
         <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl active:scale-90 transition-transform"
            >
               <ArrowLeft size={20} />
            </button>
            <div>
               <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">My Wishlist</h1>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{favorites.length} Saved Salons</p>
            </div>
         </div>
      </div>

      <main className="p-5">
         <AnimatePresence mode="wait">
            {loading ? (
               <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-44 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] animate-pulse" />)}
               </div>
            ) : favorites.length > 0 ? (
               <div className="space-y-4">
                  {favorites.map((vendor, idx) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={vendor._id}
                      className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-black/5 overflow-hidden group"
                    >
                       <div className="relative h-28">
                          <img 
                            src={vendor.shopImage || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=800'} 
                            className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" 
                            alt={vendor.shopName}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-3 left-5">
                             <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg">
                                <Star size={10} fill="#FACC15" className="text-yellow-400 border-none" />
                                <span className="text-[10px] font-black text-white">{vendor.rating || '4.8'}</span>
                             </div>
                          </div>
                          <button className="absolute top-3 right-5 p-2 bg-[#1C2C4E] text-white rounded-full shadow-lg">
                             <Heart size={16} fill="currentColor" />
                          </button>
                       </div>

                       <div className="p-5 flex items-center justify-between">
                          <div className="space-y-1">
                             <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">{vendor.shopName}</h3>
                             <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                <MapPin size={10} className="text-primary" />
                                <span className="truncate max-w-[150px] uppercase">{vendor.address?.split(',')[0]}</span>
                             </div>
                          </div>
                          
                          <button 
                            onClick={() => navigate(`/services/${vendor._id}`)}
                            className="h-12 px-6 bg-[#1C2C4E] dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
                          >
                             Book Now
                          </button>
                       </div>
                    </motion.div>
                  ))}
               </div>
            ) : (
               <div className="py-24 text-center space-y-8 bg-gray-50/50 dark:bg-gray-950/20 rounded-[3.5rem] border border-dashed border-gray-200 dark:border-gray-800">
                  <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl flex items-center justify-center mx-auto text-gray-200">
                     <ShoppingBag size={48} />
                  </div>
                  <div className="space-y-2">
                     <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Wishlist Empty</h2>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-[220px] mx-auto leading-relaxed">
                        You haven't saved any <br /> elite salons yet.
                     </p>
                  </div>
                  <button 
                    onClick={() => navigate('/')}
                    className="h-14 px-8 bg-primary text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-transform flex items-center gap-3 mx-auto"
                  >
                     <Search size={16} strokeWidth={3} />
                     Explore Services
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
