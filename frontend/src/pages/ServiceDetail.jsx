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
         {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-50 dark:bg-gray-900 rounded-3xl animate-pulse" />)}
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

  // Gallery Prep: Use shopImage as primary, followed by gallery images
  const gallery = [vendor.shopImage, ...(vendor.gallery || [])].filter(Boolean).slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen pb-40">
      {/* Header & Elite Gallery HUD */}
      <div className="relative bg-white dark:bg-gray-950">
        <div className="relative group">
          <div className="h-48 relative overflow-hidden bg-gray-100 dark:bg-gray-900">
              <img 
                src={activeImage || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200'} 
                className="w-full h-full object-cover"
                alt={vendor.shopName}
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent " />
              
              {/* Action Buttons HUD */}
              <div className="absolute top-5 left-4 right-4 flex items-center justify-between z-30">
                <button 
                  onClick={() => navigate(-1)} 
                  className="p-2.5 bg-black/20 backdrop-blur-3xl border border-white/20 rounded-full text-white active:scale-90 transition-all shadow-xl"
                >
                  <ArrowLeft size={20} strokeWidth={3} />
                </button>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleToggleFavorite}
                    className={`p-2.5 rounded-full shadow-2xl backdrop-blur-3xl border border-white/20 transition-all active:scale-90 ${isFavorited ? 'bg-[#1C2C4E] text-white' : 'bg-black/20 text-white'}`}
                  >
                    <Heart size={20} fill={isFavorited ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
          </div>

          {/* Compact Gallery Strip (Screenshot Sync) */}
          <div className="p-2.5 pt-3 bg-white dark:bg-gray-950 border-b border-gray-50 dark:border-gray-900/50">
             <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {gallery.map((img, i) => {
                  const isActive = activeImage === img;
                  return (
                    <button 
                      key={i} 
                      onClick={() => setActiveImage(img)}
                      className={cn(
                        "h-16 flex-1 min-w-[80px] rounded-2xl overflow-hidden border-2 transition-all active:scale-95 shadow-md flex-shrink-0",
                        isActive ? "border-[#1C2C4E] dark:border-white scale-105 z-10" : "border-transparent"
                      )}
                    >
                        <img src={img} className="w-full h-full object-cover" alt="Gallery" />
                        {i === 4 && (vendor.gallery?.length > 4) && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest">
                            + {vendor.gallery.length - 4}
                          </div>
                        )}
                    </button>
                  );
                })}
             </div>
          </div>
        </div>
      </div>

      {/* Info Grid (Visible Layout) */}
      <div className="px-3 mt-4 grid grid-cols-2 gap-y-3 gap-x-4">
        <div className="flex items-center gap-2.5">
           <div className="p-2 bg-[#1C2C4E]/5 dark:bg-white/5 rounded-xl">
             <MapPin size={14} className="text-[#1C2C4E] dark:text-blue-400" />
           </div>
           <div className="min-w-0">
             <p className="text-[11px] font-black text-[#1C2C4E] dark:text-white leading-tight uppercase tracking-tighter truncate">{vendor.address?.split(',')[0] || 'Local Address'}</p>
             <p className="text-[8px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{vendor.city || 'Location'}</p>
           </div>
        </div>

        <div className="flex items-center gap-2.5">
           <div className="p-2 bg-[#1C2C4E]/5 dark:bg-white/5 rounded-xl">
             <Clock size={14} className="text-[#1C2C4E] dark:text-blue-400" />
           </div>
           <div className="min-w-0">
             <p className="text-[11px] font-black text-[#1C2C4E] dark:text-white leading-tight uppercase tracking-tighter">
               {vendor.workingHours?.start || '09:00 AM'} - {vendor.workingHours?.end || '09:00 PM'}
             </p>
             <p className="text-[8px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Open Today</p>
           </div>
        </div>

        <div className="flex items-center gap-2.5">
           <div className="p-2 bg-[#1C2C4E]/5 dark:bg-white/5 rounded-xl">
             <Star size={14} fill="#FACC15" className="text-yellow-400 border-none" />
           </div>
           <div>
             <p className="text-[11px] font-black text-[#1C2C4E] dark:text-white leading-tight">{vendor.totalReviews || '320'} Reviews</p>
             <p className="text-[8px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest font-black">Elite Rating</p>
           </div>
        </div>

        <div className="flex items-center gap-2.5">
           <div className="p-2 bg-[#1C2C4E]/5 dark:bg-white/5 rounded-xl">
             <ShieldCheck size={14} className="text-[#1C2C4E] dark:text-blue-400" />
           </div>
           <div>
             <p className="text-[11px] font-black text-[#1C2C4E] dark:text-white leading-tight uppercase tracking-tighter">
               Premium Shop
             </p>
             <p className="text-[8px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Trust Secured</p>
           </div>
        </div>
      </div>

      {/* Dynamic Category HUD (Home-Page Mirror Design) */}
      <div className="flex gap-2 px-3 mt-5 overflow-x-auto no-scrollbar">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all ${
              selectedCat === cat 
              ? 'bg-[#1C2C4E] text-white shadow-xl shadow-[#1C2C4E]/20 scale-105' 
              : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Selected Services (Boxes) */}
      <div className="px-3 mt-4 space-y-2">
        <SectionTitle title="Selected Services" className="mb-1" />
            {cartItems.length > 0 && hasItemsFromThisVendor ? (
              cartItems.map((item) => (
                <div 
                  key={item._id}
                  className="bg-gray-50 dark:bg-gray-900 border border-[#1C2C4E]/10 rounded-2xl p-2.5 relative"
                >
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                        <img src={item.image || vendor.shopImage} className="w-full h-full object-cover" alt={item.name} />
                     </div>
                     <div className="flex-1">
                        <h4 className="text-[12px] font-black text-[#1C2C4E] dark:text-white leading-none mb-1">{item.name}</h4>
                        <div className="flex items-center gap-2">
                           <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 uppercase">
                              <Clock size={8} /> {item.duration}m
                           </span>
                           <span className="text-xs font-black text-[#1C2C4E] dark:text-white leading-none">₹{item.price}</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="bg-[#1C2C4E]/5 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg text-[8px] font-black text-[#1C2C4E] dark:text-gray-400 border border-[#1C2C4E]/10 dark:border-gray-700 uppercase tracking-tighter shadow-sm">
                          PayAtShop
                        </div>
                        <button 
                            onClick={() => removeItem(item._id)}
                            className="w-8 h-8 bg-black dark:bg-[#1C2C4E] text-white rounded-xl flex items-center justify-center shadow-lg"
                        >
                            <Minus size={14} strokeWidth={3} />
                        </button>
                     </div>
                  </div>
                </div>
              ))
           ) : (
            <div className="py-3 text-center bg-gray-50/50 dark:bg-gray-900/10 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
               <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">Tap items below to add them</p>
            </div>
           )}
      </div>

      {/* Available Offerings */}
      <div className="px-3 mt-4 space-y-2">
        <SectionTitle title="Available Services" subtitle="Add more to your package" className="mb-1" />
        <div className="space-y-2">
          {filteredServices.map((service, index) => {
            const isSelected = cartItems.find(item => item._id === service._id);
            if (isSelected) return null; 

            return (
              <div 
                key={service._id}
                className="p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0">
                  <img src={service.image || vendor.shopImage} className="w-full h-full object-cover" alt={service.name} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[12px] font-black text-[#1C2C4E] dark:text-white leading-none mb-1">{service.name}</h4>
                  <p className="text-[10px] font-black text-[#1C2C4E] dark:text-white leading-none">₹{service.price}</p>
                </div>
                <div className="bg-[#1C2C4E]/5 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg text-[8px] font-black text-[#1C2C4E] dark:text-gray-400 border border-[#1C2C4E]/10 dark:border-gray-700 uppercase tracking-tighter shadow-sm">
                   PayAtShop
                </div>
                <button 
                  onClick={() => toggleService(service)}
                  className="w-8 h-8 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-[#1C2C4E] dark:text-white border border-gray-200 dark:border-gray-800 active:scale-90 transition-all"
                >
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instant Tag HUD (Synced with Service Box Size) */}
      <div className="px-3 mt-4">
         <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-2.5 flex items-center justify-between border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
               <div className="text-green-500 bg-white dark:bg-gray-800 p-1 rounded-full shadow-sm">
                  <CheckCircle2 size={14} />
               </div>
               <p className="text-[10px] font-black text-[#1C2C4E] dark:text-white uppercase tracking-tight">Instant Booking Available</p>
            </div>
            <div className="flex -space-x-1.5">
               {[1,2,3,4].map(i => (
                 <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 overflow-hidden shadow-sm">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="avatar" />
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* Sticky Bottom Appointment Bar (Full Width Flush with Nav) */}
      <div 
        className="fixed bottom-[64px] left-0 right-0 bg-[#1C2C4E] dark:bg-gray-950 backdrop-blur-3xl py-2.5 px-4 z-50 border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
      >
         <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex flex-col">
               <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5 leading-none">Net Total</p>
               <p className="text-lg font-black text-white leading-none">₹{totalPrice}</p>
            </div>
            <button 
              onClick={() => navigate('/cart')}
              disabled={cartItems.length === 0}
              className="px-8 py-2.5 bg-white text-[#1C2C4E] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95 border-b-[2px] border-gray-100"
            >
               Book Now
            </button>
         </div>
      </div>
    </div>
  );
};

export default ServiceDetail;
