import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, MapPin, Clock, Plus, Minus,
  Heart, Play, Verified, ShieldCheck,
  Calendar, CheckCircle2, ChevronRight, Info, AlertCircle, Share2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import Button from '../components/Button';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import { VendorSkeleton } from '../components/Skeleton';
import api from '../services/api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

/**
 * ServiceDetail Component
 * Optimized for elite user experience and intelligent booking flow.
 */
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
  const [servicePricing, setServicePricing] = useState({});
  const [cartPricing, setCartPricing] = useState(null);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [existingBooking, setExistingBooking] = useState(null);
  const { role, isAuthenticated } = useAuthStore();

  // 1. Fetch Main Data (Vendor + Services)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [vendorRes, servicesRes] = await Promise.all([
          api.get(`/vendors/${id}`),
          api.get(`/services`, { params: { vendorId: id } })
        ]);

        if (vendorRes.data) {
          setVendor(vendorRes.data);
          setServices(servicesRes.data || []);
          setActiveImage(vendorRes.data.shopImage || vendorRes.data.gallery?.[0]);

          if (servicesRes.data?.length > 0) {
            const isSameVendor = cartVendor?._id === id;
            if (!isSameVendor || cartItems.length === 0) {
              const lowestPriceService = [...servicesRes.data].sort((a, b) => a.price - b.price)[0];
              const alreadyInCart = cartItems.find(item => item._id === lowestPriceService._id);
              if (!alreadyInCart) {
                addItem(vendorRes.data, lowestPriceService);
              }
              if (lowestPriceService.category) {
                setSelectedCat(lowestPriceService.category);
              }
            }
            
            const uniqueCats = ['All', ...new Set(servicesRes.data.map(s => s.category).filter(Boolean))];
            setCategories(uniqueCats);
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

  // 2. Favorite Sync
  useEffect(() => {
    const checkFavorite = async () => {
      if (!isAuthenticated || !id) return;
      try {
        const res = await api.get('/users/favorites');
        const favorites = res.data || [];
        setIsFavorited(favorites.some(v => v._id === id));
      } catch (err) {
        console.error('Favorite status sync lost');
      }
    };
    checkFavorite();
  }, [id, isAuthenticated]);

  // 3. Service Pricing Previews
  useEffect(() => {
    if (!vendor?._id || services.length === 0) {
      setServicePricing({});
      return;
    }

    const fetchServicePricing = async () => {
      try {
        const res = await api.get('/pricing/preview', {
          params: {
            vendorId: vendor._id,
            serviceIds: services.map((service) => service._id).join(',')
          }
        });

        const pricingMap = (res.data?.services || []).reduce((acc, service) => {
          acc[service.serviceId] = service;
          return acc;
        }, {});

        setServicePricing(pricingMap);
      } catch (err) {
        setServicePricing({});
      }
    };

    fetchServicePricing();
  }, [vendor?._id, services]);

  // 4. Cart Pricing Preview (Discounts/Offers)
  useEffect(() => {
    if (!vendor?._id || cartVendor?._id !== vendor._id || cartItems.length === 0) {
      setCartPricing(null);
      return;
    }

    const fetchCartPricing = async () => {
      try {
        const res = await api.get('/pricing/preview', {
          params: {
            vendorId: vendor._id,
            serviceIds: cartItems.map((item) => item._id).join(',')
          }
        });
        setCartPricing(res.data);
      } catch (err) {
        setCartPricing(null);
      }
    };

    fetchCartPricing();
  }, [vendor?._id, cartVendor?._id, cartItems]);

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

  const handleWhatsAppShare = () => {
    const sharedTotal = cartPricing?.finalTotal ?? getTotalPrice();
    const serviceDetails = cartItems.length > 0
      ? `Services: ${cartItems.map(i => i.name).join(', ')}\nTotal: ₹${sharedTotal}`
      : `Check out ${vendor?.shopName} on ZeroOne!`;

    const text = `*ZeroOne App - Elite Services*\n\n${serviceDetails}\n\n📍 Location: ${vendor?.address}\n🔗 View on App: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleOpenLocation = () => {
    const [lng, lat] = vendor?.location?.coordinates || [];
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
    const mapsUrl = hasCoordinates
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vendor?.address || vendor?.shopName || 'Salon')}`;

    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleService = (service) => {
    const isSelected = cartItems.find(item => item._id === service._id);
    if (isSelected) {
      removeItem(service._id);
    } else {
      addItem(vendor, service);
    }
  };

  /**
   * Smart Interceptor: Checks for existing bookings before allowing a new one.
   * Prompts user with choice modal if an active appt is found.
   */
  const handleProceedToBooking = async () => {
    if (!isAuthenticated) return navigate('/login');
    
    setLoading(true);
    try {
      const res = await api.get('/bookings/my');
      const bookingsArray = Array.isArray(res.data) ? res.data : [];
      
      const active = bookingsArray.find(b => 
        (b.vendorId?._id === id || b.vendorId === id) && 
        b.status === 'confirmed' &&
        dayjs(b.startTime).isAfter(dayjs())
      );
      
      if (active) {
        setExistingBooking(active);
        setShowChoiceModal(true);
      } else {
        useCartStore.getState().setRescheduleBookingId(null);
        navigate('/cart');
      }
    } catch (err) {
      useCartStore.getState().setRescheduleBookingId(null);
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const gallery = vendor ? (services.some(s => s.images?.length > 0)
    ? services.flatMap(s => s.images).filter(Boolean).slice(0, 10)
    : [vendor.shopImage, ...(vendor.gallery || [])].filter(Boolean).slice(0, 5)) : [];
  const galleryPreview = gallery.slice(0, 4);

  useEffect(() => {
    if (gallery.length === 0) return;
    setActiveImage((prev) => (gallery.includes(prev) ? prev : gallery[0]));
  }, [gallery]);

  if (loading && !vendor) return (
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
  const displayTotal = cartPricing?.finalTotal ?? totalPrice;
  const originalTotal = cartPricing?.originalTotal ?? totalPrice;
  const totalSavings = cartPricing?.totalDiscount ?? 0;
  const hasItemsFromThisVendor = cartVendor?._id === vendor._id;
  const filteredServices = selectedCat === 'All' ? services : services.filter(s => s.category === selectedCat);

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen pb-40">
      {/* Redesigned Secondary Navbar */}
      <div className="bg-white text-[#1C2C4E] px-4 py-2 sticky top-0 z-[60] flex items-center justify-between border-b border-slate-100 dark:bg-gray-950 dark:border-gray-800 shrink-0 h-[50px]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="active:scale-90 transition-all p-1">
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <h2 className="text-[15px] font-black tracking-tight truncate max-w-[200px]">
            {vendor.shopName}
          </h2>
        </div>
        <button onClick={handleWhatsAppShare} className="w-[42px] h-[42px] flex items-center justify-center active:scale-90 transition-all">
          <Share2 size={24} strokeWidth={2} />
        </button>
      </div>

      {/* Header & Elite Gallery HUD */}
      <div className="relative bg-white dark:bg-gray-950">
        <div className="relative group">
          <div className="h-48 relative overflow-hidden bg-gray-100 dark:bg-gray-900 border-b border-gray-100/50">
            <img
              src={activeImage || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200'}
              className="w-full h-full object-cover"
              alt={vendor.shopName}
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent " />

            {/* Favorite Overlay */}
            <button
              onClick={handleToggleFavorite}
              className={cn(
                "absolute top-4 right-3 w-[32px] h-[32px] rounded-full shadow-2xl backdrop-blur-md transition-all active:scale-90 z-30 flex items-center justify-center",
                isFavorited ? "bg-white text-[#1C2C4E]" : "bg-white text-[#1C2C4E]/40"
              )}
            >
              <Heart
                size={18}
                fill={isFavorited ? "#1C2C4E" : "none"}
                strokeWidth={isFavorited ? 0 : 2}
              />
            </button>
          </div>

          {galleryPreview.length > 1 && (
            <div className="px-3 pt-3 space-y-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {galleryPreview.map((image, index) => {
                  const isActive = activeImage === image;

                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(image)}
                      className={cn(
                        "relative shrink-0 w-[72px] h-[56px] rounded-2xl overflow-hidden border transition-all",
                        isActive
                          ? "border-[#1C2C4E] shadow-lg"
                          : "border-[#1C2C4E]/10 opacity-70"
                      )}
                    >
                      <img
                        src={image}
                        alt={`${vendor.shopName} preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {index === galleryPreview.length - 1 && gallery.length > galleryPreview.length && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-black tracking-widest">
                          +{gallery.length - galleryPreview.length}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-1.5">
                {galleryPreview.map((image, index) => (
                  <button
                    key={`dot-${index}`}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      activeImage === image
                        ? "w-5 bg-[#1C2C4E]"
                        : "w-1.5 bg-[#1C2C4E]/20"
                    )}
                    aria-label={`Show image ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="px-5 mt-4 grid grid-cols-2 gap-y-3 gap-x-2">
        <button
          type="button"
          onClick={handleOpenLocation}
          className="flex items-center gap-2.5 text-left active:scale-[0.98] transition-all"
        >
          <div className="p-2 bg-[#1C2C4E]/5 dark:bg-white/5 rounded-xl">
            <MapPin size={14} className="text-[#1C2C4E] dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-black text-[#0B1222] dark:text-white leading-tight capitalize tracking-tighter truncate">{vendor.address?.split(',')[0] || 'Local Address'}</p>
            <p className="text-[10px] font-black text-[#0B1222]/30 dark:text-gray-400 capitalize tracking-tight">Location</p>
          </div>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#1C2C4E]/5 dark:bg-white/5 rounded-xl">
            <Clock size={14} className="text-[#1C2C4E] dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-black text-[#0B1222] dark:text-white leading-tight tracking-tighter whitespace-nowrap">
              {vendor.workingHours?.start || '09:00 AM'} - {vendor.workingHours?.end || '09:00 PM'}
            </p>
            <p className="text-[10px] font-black text-[#0B1222]/30 dark:text-gray-400 capitalize tracking-tight">Open today</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#1C2C4E]/5 dark:bg-white/5 rounded-xl">
            <Star size={14} fill="#FACC15" className="text-yellow-400 border-none" />
          </div>
          <div>
            <p className="text-[14px] font-black text-[#0B1222] dark:text-white leading-tight">{vendor.totalReviews || '320'} Reviews</p>
            <p className="text-[10px] font-black text-[#0B1222]/30 dark:text-gray-400 capitalize tracking-tight">Elite rating</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#1C2C4E]/5 dark:bg-white/5 rounded-xl">
            <ShieldCheck size={14} className="text-[#1C2C4E] dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[14px] font-black text-[#0B1222] dark:text-white leading-tight capitalize tracking-tighter">
              Premium Shop
            </p>
            <p className="text-[10px] font-black text-[#0B1222]/30 dark:text-gray-400 capitalize tracking-tight">Trust secured</p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 px-3 mt-6 overflow-x-auto no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-[12px] whitespace-nowrap text-[10px] font-black tracking-widest transition-all ${selectedCat === cat
                  ? 'bg-gradient-to-br from-[#1C2C4E] to-[#2D3F6E] text-white shadow-xl shadow-[#1C2C4E]/20 scale-105'
                  : 'bg-white dark:bg-gray-900 text-[#0B1222] border border-[#1C2C4E]/10 shadow-sm'
                  }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()}
              </button>
            ))}
      </div>

      {/* Selected Services Section */}
      <div className="px-3 mt-4 space-y-2">
            <SectionTitle title="Selected Services" className="mb-1" />
            {cartItems.length > 0 && hasItemsFromThisVendor ? (
              cartItems.map((item) => {
                const priceMeta = servicePricing[item._id] || {
                  originalPrice: item.price,
                  finalPrice: item.price,
                  discount: 0
                };

                return (
                  <div
                    key={item._id}
                    className="bg-white dark:bg-gray-900 border border-[#1C2C4E]/10 rounded-2xl p-2.5 relative shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.01)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                        <img src={item.image || vendor.shopImage} className="w-full h-full object-cover" alt={item.name} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[12px] font-black text-[#0B1222] dark:text-white leading-none mb-1">{item.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-bold text-[#0B1222]/40 dark:text-gray-400 flex items-center gap-1 uppercase">
                            <Clock size={8} /> {item.duration}m
                          </span>
                          <span className="text-xs font-black text-[#0B1222] dark:text-white leading-none">₹{item.price}</span>
                        </div>
                        {priceMeta.discount > 0 && (
                          <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1 leading-none">
                            Now ₹{priceMeta.finalPrice} • Save ₹{priceMeta.discount}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-[#1C2C4E]/5 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg text-[8px] font-black text-[#0B1222] dark:text-gray-400 border border-[#1C2C4E]/10 dark:border-gray-700 uppercase tracking-tighter shadow-sm whitespace-nowrap">
                          Pay At Shop
                        </div>
                        <button
                          onClick={() => removeItem(item._id)}
                          className="w-8 h-8 bg-black dark:bg-[#1C2C4E] text-white rounded-xl flex items-center justify-center shadow-lg transition-transform active:scale-90"
                        >
                          <Minus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-3 text-center bg-gray-50/50 dark:bg-gray-900/10 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                <p className="text-[8px] font-black text-[#0B1222]/30 uppercase tracking-widest italic">Tap items below to add them</p>
              </div>
            )}
      </div>

      {/* Available Services Section */}
      <div className="px-3 mt-4 space-y-2">
            <SectionTitle title="Available Services" subtitle="Add more to your package" className="mb-1" />
            <div className="space-y-2">
              {filteredServices.map((service) => {
                const isSelected = cartItems.find(item => item._id === service._id);
                if (isSelected) return null;
                const priceMeta = servicePricing[service._id] || {
                  originalPrice: service.price,
                  finalPrice: service.price,
                  discount: 0
                };

                return (
                  <div
                    key={service._id}
                    className="p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0">
                      <img src={service.image || vendor.shopImage} className="w-full h-full object-cover" alt={service.name} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[12px] font-black text-[#0B1222] dark:text-white leading-none mb-1">{service.name}</h4>
                      <p className="text-[10px] font-black text-[#0B1222] dark:text-white leading-none">₹{service.price}</p>
                      {priceMeta.discount > 0 && (
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1 leading-none">
                          Now ₹{priceMeta.finalPrice} • Save ₹{priceMeta.discount}
                        </p>
                      )}
                    </div>
                    <div className="bg-[#1C2C4E]/5 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg text-[8px] font-black text-[#0B1222] dark:text-gray-400 border border-[#1C2C4E]/10 dark:border-gray-700 uppercase tracking-tighter shadow-sm whitespace-nowrap">
                      Pay At Shop
                    </div>
                    <button
                      onClick={() => toggleService(service)}
                      className="w-8 h-8 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-[#1C2C4E] dark:text-white border border-gray-200 dark:border-gray-800 active:scale-90 transition-all font-black"
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
            </div>
      </div>

      {/* Trust Badges */}
      <div className="px-3 mt-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-2.5 flex items-center justify-between border border-[#1C2C4E]/10 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.01)]">
              <div className="flex items-center gap-2.5">
                <div className="text-green-500 bg-white dark:bg-gray-800 p-1 rounded-full shadow-sm">
                  <CheckCircle2 size={14} />
                </div>
                <p className="text-[10px] font-black text-[#0B1222] dark:text-white tracking-tight">Instant Booking Available</p>
              </div>
              <div className="flex -space-x-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 overflow-hidden shadow-sm">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="avatar" />
                  </div>
                ))}
              </div>
            </div>
      </div>

      {/* Fixed Sticky Action Bar */}
      <div
        className="fixed bottom-[52px] left-0 right-0 bg-[#0B1222] dark:bg-gray-950 backdrop-blur-3xl py-1.5 px-4 z-50 border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] mx-2 rounded-[24px]"
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col">
            <p className="text-[8px] font-black text-white/40 capitalize tracking-widest mb-0.5 leading-none">Net total</p>
            {totalSavings > 0 && (
              <p className="text-[8px] font-black text-white/40 line-through leading-none mb-1">₹{originalTotal}</p>
            )}
            <p className="text-lg font-black text-white leading-none">₹{displayTotal}</p>
            {totalSavings > 0 && (
              <p className="text-[8px] font-black text-emerald-400 tracking-widest mt-1 leading-none">SAVE ₹{totalSavings}</p>
            )}
          </div>
          <button
            onClick={handleProceedToBooking}
            disabled={cartItems.length === 0 || loading}
            className="px-8 py-2 bg-white text-[#0B1222] rounded-2xl font-black text-[14px] uppercase tracking-widest shadow-xl shadow-black/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95 border-b-[2px] border-gray-100 flex items-center justify-center min-w-[120px]"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Book Now'}
          </button>
        </div>
      </div>

      {/* Intelligent Choice Modal */}
      <AnimatePresence>
        {showChoiceModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChoiceModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-gray-950 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6"
            >
              <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-5 mx-auto">
                <Calendar size={28} />
              </div>
              
              <h3 className="text-xl font-black text-[#0B1222] dark:text-white text-center leading-tight">
                Active Booking Found
              </h3>
              <p className="text-[11px] font-bold text-[#0B1222]/40 dark:text-gray-400 text-center mt-3 px-2">
                You already have a confirmed appointment at <span className="text-[#0B1222] dark:text-white font-black">{vendor.shopName}</span> on {existingBooking ? dayjs(existingBooking.startTime).format('LLL') : ''}.
              </p>

              <div className="space-y-3 mt-8">
                <button
                  onClick={() => navigate('/cart', { state: { rescheduleBookingId: existingBooking._id } })}
                  className="w-full py-4 bg-[#0B1222] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Clock size={16} />
                  Reschedule Existing
                </button>
                <button
                  onClick={() => { 
                    setShowChoiceModal(false); 
                    useCartStore.getState().setRescheduleBookingId(null);
                    navigate('/cart'); 
                  }}
                  className="w-full py-4 bg-white dark:bg-gray-900 text-[#0B1222] dark:text-white border border-[#0B1222]/10 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all"
                >
                  Create New Booking
                </button>
                <button
                  onClick={() => setShowChoiceModal(false)}
                  className="w-full py-2 text-[10px] font-black text-[#0B1222]/30 dark:text-gray-500 uppercase tracking-widest"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServiceDetail;
