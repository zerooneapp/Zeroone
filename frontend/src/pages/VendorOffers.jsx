import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Tag, Search, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import OfferCard from '../components/OfferCard';
import toast from 'react-hot-toast';
import { useVendorStore } from '../store/vendorStore';

const VendorOffers = () => {
  const navigate = useNavigate();
  const {
    promotionsData: offers,
    promotionsLoading: loading,
    dashboardData: vendorData,
    fetchPromotions,
    fetchDashboard,
    setPromotionsData: setOffers
  } = useVendorStore();

  const [toggleLoadingId, setToggleLoadingId] = useState(null);

  const handleFetch = async (force = false) => {
    try {
      await fetchPromotions(force);
      if (!vendorData) {
        await fetchDashboard();
      }
    } catch (err) {
      toast.error('Failed to load promotions');
    }
  };

  useEffect(() => {
    handleFetch();
  }, []);

  const handleToggle = async (id, isActive) => {
    if (!vendorData?.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to update offers.', { id: 'account-inactive', duration: 2000 });
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
      return toast.error('Account inactive. Recharge to edit offers.', { id: 'account-inactive', duration: 2000 });
    }
    navigate(`/vendor/offers/edit/${offer._id}`);
  };

  const memoizedOffers = useMemo(() => offers, [offers]);

  if (loading) return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-6 space-y-6 pt-[64px] animate-pulse">
      <div className="h-10 w-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="grid gap-4 mt-8">
        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem]" />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <header className="px-4 pt-[48px] pb-3 fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 flex items-center justify-between border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendor/dashboard')}
            className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all font-bold"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <h1 className="text-xl font-black tracking-tighter leading-none flex items-center">
                <span className="text-primary dark:text-white">Zero</span>
                <span className="text-primary/30 dark:text-white">One</span>
              </h1>

            </div>
            <p className="text-[9px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em] opacity-80 leading-none">Promotions</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (!vendorData?.subscription?.isActive) return toast.error('Account inactive. Recharge to launch offers.', { id: 'account-inactive', duration: 2000 });
            navigate('/vendor/offers/add');
          }}
          className={`p-2.5 rounded-xl shadow-xl transition-all ${!vendorData?.subscription?.isActive
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-50 cursor-not-allowed'
              : 'bg-primary text-white shadow-primary/20 active:scale-95'
            }`}
        >
          <Plus size={20} />
        </button>
      </header>

      <main className="px-4 pt-[102px]">
        <AnimatePresence mode="wait">
          {offers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center"
            >
              <div className="w-20 h-20 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto text-primary/30 border border-primary/10">
                <Gift size={36} />
              </div>
              <div className="mt-5 space-y-1">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">No offers created yet 🎁</h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[250px] mx-auto">Run campaigns to attract more customers and boost your sales.</p>
              </div>
              <button
                onClick={() => navigate('/vendor/offers/add')}
                className="mt-6 px-7 py-3.5 bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                Launch Reward
              </button>
            </motion.div>
          ) : (
            <div className="grid gap-1.5">
              {memoizedOffers.map((offer) => (
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
