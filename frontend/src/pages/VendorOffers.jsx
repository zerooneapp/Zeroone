import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Tag, Search, Gift, Trash2, Share2, X, Users, Phone } from 'lucide-react';
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
    setPromotionsData: setOffers,
    clientsData,
    fetchClients
  } = useVendorStore();

  const [toggleLoadingId, setToggleLoadingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [sharingOffer, setSharingOffer] = useState(null);
  const [shareSearch, setShareSearch] = useState('');

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

  const handleDelete = (id) => {
    if (!vendorData?.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to delete offers.', { id: 'account-inactive', duration: 2000 });
    }
    setDeleteConfirmId(id);
  };

  const memoizedOffers = useMemo(() => offers, [offers]);

  const handleShareOffer = (offer) => {
    setSharingOffer(offer);
    setShareSearch('');
    fetchClients();
  };

  const shareOnWhatsApp = (client, offer) => {
    const discount = offer.discountType === 'percentage'
      ? `${offer.value}% OFF`
      : `₹${offer.value} OFF`;

    const services = offer.serviceIds?.length > 0
      ? `Applicable to ${offer.serviceIds.length} service(s)`
      : 'Applicable to ALL services';

    const expiry = new Date(offer.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const message =
      `🎁 *Exclusive Offer: ${offer.title}*\n\n` +
      `💸 *Discount:* ${discount}\n` +
      `📅 *Valid till:* ${expiry}\n` +
      `✂️ *${services}*\n\n` +
      `Don't miss out! Book now and save big. 🔥`;

    const raw = (client.phone || '').replace(/\D/g, '');
    const phone = raw.startsWith('91') ? raw : `91${raw}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    setSharingOffer(null);
  };

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
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all font-bold"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <h1 className="text-xl font-black tracking-tighter leading-none flex items-center">
                <span className="text-[#00246b] dark:text-white">Zero</span>
                <span className="text-[#00246b]/30 dark:text-white">One</span>
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
              : 'bg-[#00246b] text-white shadow-[#00246b]/20 active:scale-95'
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
              <div className="w-20 h-20 bg-[#00246b]/5 rounded-[2.5rem] flex items-center justify-center mx-auto text-[#00246b]/30 border border-[#00246b]/10">
                <Gift size={36} />
              </div>
              <div className="mt-5 space-y-1">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">No offers created yet 🎁</h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[250px] mx-auto">Run campaigns to attract more customers and boost your sales.</p>
              </div>
              <button
                onClick={() => navigate('/vendor/offers/add')}
                className="mt-6 px-7 py-3.5 bg-[#00246b] text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-xl shadow-[#00246b]/20 active:scale-95 transition-all"
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
                  onDelete={handleDelete}
                  onShare={handleShareOffer}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-[280px] bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl relative z-10 p-5 text-center border border-white/10"
            >
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-100/50">
                <Trash2 size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Delete Offer</h3>
              <p className="text-[12px] text-slate-400 dark:text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete this offer permanently? This action cannot be undone.
              </p>
              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 rounded-xl font-black text-[11px] capitalize tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const id = deleteConfirmId;
                    setDeleteConfirmId(null);
                    const original = [...offers];
                    setOffers(prev => prev.filter(o => o._id !== id));
                    try {
                      await api.delete(`/offers/${id}`);
                      toast.success('Offer deleted successfully');
                    } catch (err) {
                      setOffers(original);
                      toast.error('Failed to delete offer');
                    }
                  }}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black text-[11px] capitalize tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📤 SHARE OFFER — CLIENT PICKER BOTTOM SHEET */}
      <AnimatePresence>
        {sharingOffer && (
          <div className="fixed inset-0 z-[300] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSharingOffer(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-10 bg-white dark:bg-gray-900 rounded-t-[2rem] max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 dark:border-gray-800">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">Share via WhatsApp</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{sharingOffer.title}</p>
                </div>
                <button
                  onClick={() => setSharingOffer(null)}
                  className="w-8 h-8 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-slate-500 active:scale-90 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-3 py-2">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search client by name or phone..."
                    value={shareSearch}
                    onChange={e => setShareSearch(e.target.value)}
                    className="flex-1 bg-transparent text-[11px] font-medium text-slate-700 dark:text-white placeholder-slate-400 outline-none"
                  />
                  {shareSearch && (
                    <button onClick={() => setShareSearch('')} className="text-slate-400">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Client List */}
              <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
                {(() => {
                  const q = shareSearch.trim().toLowerCase();
                  const filtered = clientsData.filter(c =>
                    !q ||
                    c.name?.toLowerCase().includes(q) ||
                    c.phone?.includes(q)
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center">
                        <Users size={32} className="mx-auto text-slate-300 dark:text-gray-600 mb-3" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {shareSearch ? 'No client found' : 'No clients yet'}
                        </p>
                      </div>
                    );
                  }

                  return filtered.map(client => (
                    <button
                      key={client._id || client.phone}
                      onClick={() => shareOnWhatsApp(client, sharingOffer)}
                      className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 active:scale-95 transition-all text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#00246b]/10 dark:bg-white/10 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-gray-700">
                        {client.image
                          ? <img src={client.image} alt="" className="w-full h-full object-cover" />
                          : <span className="text-[11px] font-black text-[#00246b] dark:text-white">{(client.name || 'C')[0].toUpperCase()}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-white truncate capitalize">{client.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone size={9} className="text-slate-400" />
                          <span className="text-[9px] font-bold text-slate-400">{client.phone}</span>
                        </div>
                      </div>
                      <div className="flex items-center px-2.5 py-1 bg-green-500/10 rounded-lg shrink-0">
                        <span className="text-[8px] font-black text-green-600 dark:text-green-400 uppercase tracking-wider">SHARE</span>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorOffers;
