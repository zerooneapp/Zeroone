import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Tag, Search, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import OfferCard from '../components/OfferCard';
import toast from 'react-hot-toast';

const VendorOffers = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoadingId, setToggleLoadingId] = useState(null);
  const [vendorData, setVendorData] = useState(null);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const [offersRes, dashRes] = await Promise.all([
        api.get('/offers'),
        api.get('/vendor/dashboard')
      ]);
      setOffers(offersRes.data);
      setVendorData(dashRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleToggle = async (id, isActive) => {
    if (!vendorData?.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to update offers.');
    }
    if (toggleLoadingId === id) return;

    // 🚀 OPTIMISTIC UI
    const original = [...offers];
    setOffers(prev => prev.map(o => o._id === id ? { ...o, isActive } : o));

    try {
      setToggleLoadingId(id);
      await api.patch(`/offers/${id}`, { isActive });
      toast.success(isActive ? 'Offer activated 🎁' : 'Offer paused');
    } catch (err) {
      setOffers(original);
      toast.error('Failed to update status');
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleEdit = (offer) => {
    if (!vendorData?.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to edit offers.');
    }
    navigate(`/vendor/offers/edit/${offer._id}`);
  };

  if (loading) return (
    <div className="p-6 space-y-6 animate-pulse">
       <div className="h-10 w-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
       <div className="grid gap-4 mt-8">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem]" />)}
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
       <header className="px-6 pt-8 pb-6 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => navigate('/vendor/dashboard')}
               className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 active:scale-90 transition-all"
             >
                <ArrowLeft size={18} />
             </button>
             <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Promotions</h1>
          </div>
        <button 
          onClick={() => {
            if (!vendorData?.subscription?.isActive) return toast.error('Account inactive. Recharge to launch offers.');
            navigate('/vendor/offers/add');
          }}
          className={`p-3 rounded-2xl shadow-lg transition-all ${
            !vendorData?.subscription?.isActive 
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-50 cursor-not-allowed' 
            : 'bg-primary text-white shadow-primary/20 active:scale-95'
          }`}
        >
           <Plus size={20} />
        </button>
       </header>

       <main className="px-6 mt-6">
          <AnimatePresence mode="wait">
             {offers.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-20 text-center space-y-6"
                >
                   <div className="w-24 h-24 bg-primary/5 rounded-[3.5rem] flex items-center justify-center mx-auto text-primary/30">
                      <Gift size={40} />
                   </div>
                   <div className="space-y-2">
                      <h2 className="text-xl font-black text-gray-900 dark:text-white">No offers created yet 🎁</h2>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Run campaigns to attract more customers and boost your sales.</p>
                   </div>
                   <button 
                     onClick={() => navigate('/vendor/offers/add')}
                     className="px-8 py-4 bg-primary text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                   >
                      Launch Reward
                   </button>
                </motion.div>
             ) : (
                <div className="grid gap-4">
                   {offers.map((offer) => (
                      <OfferCard 
                        key={offer._id} 
                        offer={offer} 
                        onToggle={handleToggle}
                        onEdit={handleEdit}
                      />
                   ))}
                </div>
             )}
          </AnimatePresence>
       </main>
    </div>
  );
};

export default VendorOffers;
