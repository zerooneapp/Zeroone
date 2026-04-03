import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, MapPin, Clock, Plus, Minus,
  Heart, Play, Verified, ShieldCheck,
  Calendar, CheckCircle2, ChevronRight, Info, AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import { VendorSkeleton } from '../components/Skeleton';
import api from '../services/api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vendor: cartVendor, items: cartItems, addItem, removeItem, getTotalPrice } = useCartStore();

  const [vendor, setVendor] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [selectedCat, setSelectedCat] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [isFavorited, setIsFavorited] = useState(false);
  const { role, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [vendorRes, servicesRes] = await Promise.all([
          api.get(`/vendors/${id}`),
          api.get(`/services`, { params: { vendorId: id } })
        ]);

        const fetchedVendor = vendorRes.data;
        const fetchedServices = servicesRes.data;

        setVendor(fetchedVendor);
        setServices(fetchedServices);
        // Set initial active image from vendor shop image or gallery
        setActiveImage(fetchedVendor.shopImage || fetchedVendor.gallery?.[0]);

        // 🚀 AUTO-SELECT LOGIC
        if (fetchedServices.length > 0) {
          const isSameVendor = cartVendor?._id === id;
          if (!isSameVendor || cartItems.length === 0) {
            const lowestPriceService = [...fetchedServices].sort((a, b) => a.price - b.price)[0];
            const alreadyInCart = cartItems.find(item => item._id === lowestPriceService._id);
            if (!alreadyInCart) {
              addItem(fetchedVendor, lowestPriceService);
            }
            if (lowestPriceService.category) {
              setSelectedCat(lowestPriceService.category);
            }
          }
        }
      } catch (err) {
        setError('Failed to load service details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, addItem, cartVendor?._id, cartItems.length]);

  useEffect(() => {
    const checkFavorite = async () => {
      if (!isAuthenticated || !id) return;
      try {
        const res = await api.get('/users/favorites');
        const favorites = res.data || [];
        setIsFavorited(favorites.some(v => v._id === id));
      } catch (err) {
        console.error('Favorite check sync lost');
      }
    };
    checkFavorite();
  }, [id, isAuthenticated]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) return navigate('/login');
    try {
      const res = await api.post('/users/favorites/toggle', { vendorId: id });
      setIsFavorited(res.data.isFavorited);
      toast.success(res.data.isFavorited ? 'Saved to your elite list!' : 'Removed from favorites');
    } catch (err) {
      toast.error('Logistical error: could not sync favorite');
    }
  };

  const toggleService = (service) => {
    const isSelected = cartItems.find(item => item._id === service._id);
    if (isSelected) {
      removeItem(service._id);
    } else {
      addItem(vendor, service);
    }
  };

  if (loading) return (
    <div className="p-5 space-y-6 bg-white dark:bg-gray-950 min-h-screen">
      <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-3xl animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 bg-gray-50 dark:bg-gray-900 rounded-xl animate-pulse" />
        <div className="h-10 bg-gray-50 dark:bg-gray-900 rounded-xl animate-pulse" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-50 dark:bg-gray-900 rounded-3xl animate-pulse" />)}
      </div>
    </div>
  );

  if (error || !vendor) return (
    <div className="p-20 text-center bg-white dark:bg-gray-950 min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <AlertCircle size={48} className="text-gray-200" />
        <p className="text-gray-500 font-bold">{error || 'Vendor not found'}</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    </div>
  );

  const totalPrice = getTotalPrice();
  const hasItemsFromThisVendor = cartVendor?._id === vendor._id;
  const filteredServices = selectedCat === 'All' ? services : services.filter(s => s.category === selectedCat);
  const gallery = [vendor.shopImage, ...(vendor.gallery || [])].filter(Boolean).slice(0, 5);

  return (
     <div className="bg-white dark:bg-gray-950 min-h-screen pb-40 animate-in fade-in duration-500">
      <div className="relative bg-white dark:bg-gray-950">
        <div className="relative group">
          <div className="h-44 relative overflow-hidden bg-slate-50 dark:bg-gray-900 border-b border-slate-100 dark:border-gray-800">
            <img
              src={activeImage || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200'}
              className="w-full h-full object-cover"
              alt={vendor.shopName}
            />
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent z-10" />

            <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-30">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-slate-900/40 backdrop-blur-xl border border-white/20 rounded-lg text-white active:scale-90 transition-all shadow-2xl"
              >
                <ArrowLeft size={16} strokeWidth={3} />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleFavorite}
                  className={cn(
                    "p-2 rounded-lg shadow-2xl backdrop-blur-xl border border-white/20 transition-all active:scale-90",
                    isFavorited ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-slate-900/40 text-white'
                  )}
                >
                  <Heart size={16} fill={isFavorited ? "currentColor" : "none"} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="absolute bottom-3 left-3 z-30 leading-none">
               <h2 className="text-[18px] font-black text-white italic tracking-tighter drop-shadow-lg uppercase">{vendor.shopName}</h2>
               <p className="text-[7.5px] font-black text-white/80 uppercase tracking-[0.2em] mt-1 italic drop-shadow-md">Premium Elite Merchant</p>
            </div>
          </div>

          <div className="py-2 px-3.5 bg-white dark:bg-gray-950 border-b border-slate-100/60 dark:border-gray-800/50 shadow-sm">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {gallery.map((img, i) => {
                const isActive = activeImage === img;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={cn(
                      "h-11 flex-1 min-w-[60px] rounded-lg overflow-hidden border-2 transition-all active:scale-95 shadow-sm flex-shrink-0 relative",
                      isActive ? "border-primary ring-2 ring-primary/20" : "border-slate-50 dark:border-gray-800 opacity-60"
                    )}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="Gallery" />
                    {i === 4 && (vendor.gallery?.length > 4) && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center text-white text-[8px] font-black uppercase tracking-widest leading-none">
                        +{vendor.gallery.length - 4}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="px-3.5 mt-2.5 grid grid-cols-2 gap-y-1.5 gap-x-3.5">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-gray-800 shadow-sm">
          <div className="p-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-slate-100 dark:border-gray-700">
            <MapPin size={11} strokeWidth={3} className="text-primary" />
          </div>
          <div className="min-w-0 leading-none lg:pt-0.5">
            <p className="text-[8.5px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{vendor.address?.split(',')[0] || 'Local Center'}</p>
            <p className="text-[6.5px] font-black text-slate-400 uppercase tracking-widest mt-0.5 opacity-60">LOCATION</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-gray-800 shadow-sm">
          <div className="p-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-slate-100 dark:border-gray-700">
            <Clock size={11} strokeWidth={3} className="text-primary" />
          </div>
          <div className="min-w-0 leading-none lg:pt-0.5">
            <p className="text-[8.5px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {vendor.workingHours?.start || '09:00'} - {vendor.workingHours?.end || '21:00'}
            </p>
            <p className="text-[6.5px] font-black text-emerald-500 uppercase tracking-widest mt-0.5 opacity-80 italic">OPEN NOW</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-gray-800 shadow-sm">
          <div className="p-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-slate-100 dark:border-gray-700">
            <Star size={11} fill="#F59E0B" className="text-amber-500 border-none" />
          </div>
          <div className="leading-none lg:pt-0.5">
            <p className="text-[8.5px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{vendor.totalReviews || '320'} REVIEWS</p>
            <p className="text-[6.5px] font-black text-slate-400 uppercase tracking-widest mt-0.5 opacity-60">ELITE RATING</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-gray-800 shadow-sm">
          <div className="p-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-slate-100 dark:border-gray-700">
            <Verified size={11} strokeWidth={3} className="text-emerald-500" />
          </div>
          <div className="leading-none lg:pt-0.5">
            <p className="text-[8.5px] font-black text-slate-900 dark:text-white uppercase tracking-tight">VERIFIED</p>
            <p className="text-[6.5px] font-black text-slate-400 uppercase tracking-widest mt-0.5 opacity-60">TRUST SECURED</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-3.5 mt-3 overflow-x-auto no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={cn(
              "px-2.5 py-1 rounded-lg whitespace-nowrap text-[7.5px] font-black uppercase tracking-widest transition-all border active:scale-95",
              selectedCat === cat
                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                : 'bg-white dark:bg-gray-900 text-slate-400 border-slate-100 dark:border-gray-800'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="px-3.5 mt-3 space-y-1.5">
        <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 opacity-60">SELECTED SERVICES</p>
        <div className="space-y-1.5">
            {cartItems.length > 0 && hasItemsFromThisVendor ? (
            cartItems.map((item) => (
                <div
                key={item._id}
                className="bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl p-1.5 relative shadow-sm animate-in zoom-in-95 duration-200"
                >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 overflow-hidden shadow-inner border border-slate-100 dark:border-gray-700 shrink-0">
                    <img src={item.image || vendor.shopImage} className="w-full h-full object-cover" alt={item.name} />
                    </div>
                    <div className="flex-1 leading-none lg:pt-0.5">
                    <h4 className="text-[9.5px] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{item.name}</h4>
                    <div className="flex items-center gap-2">
                        <span className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic flex items-center gap-0.5">
                        <Clock size={8} strokeWidth={3} /> {item.duration} MIN
                        </span>
                        <span className="text-[9.5px] font-black text-primary italic tracking-tight">₹{item.price}</span>
                    </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                    <div className="bg-slate-900 text-white dark:bg-primary px-1.5 py-1 rounded-md text-[6.5px] font-black uppercase tracking-widest leading-none border border-white/10 shadow-sm opacity-80">
                        PAY AT SHOP
                    </div>
                    <button
                        onClick={() => removeItem(item._id)}
                        className="w-6.5 h-6.5 bg-white dark:bg-gray-800 text-red-500 rounded-lg flex items-center justify-center shadow-lg border border-slate-100 dark:border-gray-700 active:scale-90 transition-all"
                    >
                        <Minus size={12} strokeWidth={3} />
                    </button>
                    </div>
                </div>
                </div>
            ))
            ) : (
            <div className="py-2 text-center bg-slate-50/50 dark:bg-gray-900/10 rounded-xl border-2 border-dashed border-slate-100 dark:border-gray-800/50">
                <p className="text-[7.5px] font-black text-slate-300 uppercase tracking-widest italic opacity-60">TAP ITEMS BELOW TO ADD</p>
            </div>
            )}
        </div>
      </div>

      <div className="px-3.5 mt-3 space-y-1.5 mb-32">
        <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 opacity-60 leading-none">AVAILABLE SERVICES</p>
        <div className="space-y-1.5">
          {filteredServices.map((service) => {
            const isSelected = cartItems.find(item => item._id === service._id);
            if (isSelected) return null;

            return (
              <div
                key={service._id}
                className="p-1.5 bg-white dark:bg-gray-950 border border-slate-100 dark:border-gray-800 rounded-xl shadow-sm flex items-center gap-2.5 active:scale-[0.98] transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-gray-900 overflow-hidden shrink-0 border border-slate-50 dark:border-gray-700">
                  <img src={service.image || vendor.shopImage} className="w-full h-full object-cover" alt={service.name} />
                </div>
                <div className="flex-1 leading-none lg:pt-0.5">
                  <h4 className="text-[9.5px] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{service.name}</h4>
                  <p className="text-[9.5px] font-black text-primary italic tracking-tight leading-none">₹{service.price}</p>
                </div>
                <div className="bg-slate-50 dark:bg-gray-800 px-1.5 py-1 rounded-md text-[6.5px] font-black text-slate-400 uppercase tracking-widest leading-none border border-slate-100 dark:border-gray-700 opacity-60">
                  PLATFORM SECURE
                </div>
                <button
                  onClick={() => toggleService(service)}
                  className="w-6.5 h-6.5 bg-slate-900 dark:bg-primary text-white rounded-lg flex items-center justify-center active:scale-90 transition-all shadow-xl"
                >
                  <Plus size={12} strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-3 left-3 right-3 bg-slate-900 dark:bg-gray-950 p-2 px-6 rounded-xl shadow-2xl z-50 border border-white/10 backdrop-blur-3xl"
      >
        <div className="flex items-center justify-between">
          <div className="leading-none pt-0.5">
            <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-1.5">NET VALUATION</p>
            <p className="text-[17px] font-black text-white italic tracking-tighter leading-none">₹{totalPrice}</p>
          </div>
          <button
            onClick={() => navigate('/cart')}
            disabled={cartItems.length === 0}
            className="px-5 py-2.5 bg-white text-slate-900 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-30 transition-all flex items-center gap-2"
          >
            ORDER NOW
            <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ServiceDetail;
