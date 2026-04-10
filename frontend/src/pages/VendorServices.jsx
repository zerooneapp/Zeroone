import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Scissors, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import ServiceCard from '../components/ServiceCard';
import toast from 'react-hot-toast';

const VendorServices = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoadingId, setToggleLoadingId] = useState(null);
  const [homeLoadingId, setHomeLoadingId] = useState(null);
  const [vendorData, setVendorData] = useState(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const [servicesRes, dashRes] = await Promise.all([
        api.get('/services/manage/all', { params: { includeInactive: true } }),
        api.get('/vendor/dashboard')
      ]);
      setServices(servicesRes.data);
      setVendorData(dashRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleToggle = async (id, isActive) => {
    // 🛡️ HARD BLOCK CHECK
    if (!vendorData?.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to update services.');
    }

    // 🛡️ LOADING GUARD
    if (toggleLoadingId === id) return;

    // 🚀 OPTIMISTIC UI
    const original = [...services];
    setServices(prev => prev.map(s => s._id === id ? { ...s, isActive } : s));

    try {
      setToggleLoadingId(id);
      await api.patch(`/services/${id}`, { isActive });
      toast.success(isActive ? 'Service activated' : 'Service deactivated');
    } catch (err) {
      // 🔄 ROLLBACK
      setServices(original);
      toast.error('Failed to update status');
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleEdit = (service) => {
    if (!vendorData?.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to edit services.');
    }
    navigate(`/vendor/services/edit/${service._id}`);
  };

  const handleSetHomeService = async (service) => {
    if (!vendorData?.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to update home service.');
    }
    if (!service.isActive) {
      return toast.error('Activate the service before showing it on home.');
    }
    if (homeLoadingId === service._id || service.showOnHome) return;

    const original = [...services];
    setServices((prev) =>
      prev.map((item) => ({
        ...item,
        showOnHome: item._id === service._id
      }))
    );

    try {
      setHomeLoadingId(service._id);
      await api.patch(`/services/${service._id}`, { showOnHome: true });
      toast.success(`${service.name} will now appear on home`);
    } catch (err) {
      setServices(original);
      toast.error('Failed to update home service');
    } finally {
      setHomeLoadingId(null);
    }
  };

  if (loading) return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-10 w-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="grid gap-4 mt-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-[2rem]" />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <header className="px-5 pt-5 pb-3 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 flex items-center justify-between border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
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
                <span className="text-primary/30 dark:text-gray-600">One</span>
              </h1>

            </div>
            <p className="text-[9px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em] opacity-80 leading-none">Service List</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (!vendorData?.subscription?.isActive) return toast.error('Account inactive. Recharge to add services.');
            navigate('/vendor/services/add');
          }}
          className={`p-2.5 rounded-xl shadow-xl transition-all ${!vendorData?.subscription?.isActive
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-50 cursor-not-allowed'
              : 'bg-primary text-white shadow-primary/20 active:scale-95'
            }`}
        >
          <Plus size={20} />
        </button>
      </header>

      <main className="px-5 mt-3.5">
        <div className="mb-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search your services..."
            className="w-full bg-white dark:bg-gray-900 py-3 pl-11 pr-4 rounded-2xl border border-slate-200/60 dark:border-gray-800 font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all shadow-md dark:shadow-none dark:text-white"
          />
        </div>

        <AnimatePresence mode="wait">
          {services.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center"
            >
              <div className="w-20 h-20 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto text-primary/30 border border-primary/10">
                <Scissors size={40} />
              </div>
              <div className="mt-5 space-y-1">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Start by adding your first service ✂️</h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[250px] mx-auto">Customize your shop by listing the services you offer to customers.</p>
              </div>
              <button
                onClick={() => navigate('/vendor/services/add')}
                className="mt-6 px-7 py-3.5 bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                Add New Service
              </button>
            </motion.div>
          ) : (
            <div className="grid gap-2">
              {services.map((service) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onSetHome={handleSetHomeService}
                  homeLoadingId={homeLoadingId}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default VendorServices;
