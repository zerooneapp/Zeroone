import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, MapPin, Clock, Tag, Plus, Minus,
  Heart, Play, Verified, ShieldCheck,
  Calendar, CheckCircle2, ChevronRight, ChevronLeft, Info, AlertCircle, Share2, Loader2, Crown
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
import useSocket from '../hooks/useSocket';
import { getVendorMembershipPlans, createMembershipOrder, verifyMembershipPurchase, getMyMemberships } from '../services/membershipService';


const normalizeCategoryValue = (value = '') =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const getServiceModeLabel = (type = 'shop') => {
  if (type === 'both') return 'Shop + Home';
  if (type === 'home') return 'Home Service';
  return 'Shop Service';
};

/**
 * ServiceDetail Component
 * Optimized for elite user experience and intelligent booking flow.
 */
const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vendor: cartVendor, items: cartItems, addItem, removeItem, getTotalPrice } = useCartStore();

  const [vendor, setVendor] = useState(() => {
    return window.__PREFETCHED_DATA__?.vendorDetails?.[id]?.vendor || null;
  });
  const [services, setServices] = useState(() => {
    return window.__PREFETCHED_DATA__?.vendorDetails?.[id]?.services || [];
  });
  const [loading, setLoading] = useState(() => {
    return !window.__PREFETCHED_DATA__?.vendorDetails?.[id];
  });
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = React.useRef(null);
  const [selectedCat, setSelectedCat] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [isFavorited, setIsFavorited] = useState(false);
  const [servicePricing, setServicePricing] = useState({});
  const [cartPricing, setCartPricing] = useState(null);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [existingBooking, setExistingBooking] = useState(null);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [userMemberships, setUserMemberships] = useState([]);
  const [buyingPlanId, setBuyingPlanId] = useState(null);
  const [membershipActive, setMembershipActive] = useState(true);
  const { role, isAuthenticated, user } = useAuthStore();
  const socket = useSocket(user?._id);

  // 1. Fetch Main Data (Vendor + Services)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const shouldShowLoading = !vendor;
        if (shouldShowLoading) setLoading(true);
        const [vendorRes, servicesRes] = await Promise.all([
          api.get(`/vendors/${id}`),
          api.get(`/services`, { params: { vendorId: id } })
        ]);

        if (vendorRes.data) {
          setVendor(vendorRes.data);
          setServices(servicesRes.data || []);

          if (window.__PREFETCHED_DATA__) {
            window.__PREFETCHED_DATA__.vendorDetails[id] = {
              vendor: vendorRes.data,
              services: servicesRes.data || []
            };
          }
          
          // Fetch Shared Settings for feature flags
          const settingsRes = await api.get('/settings/shared');
          const isMembActive = settingsRes.data?.features?.membershipActive !== false;
          setMembershipActive(isMembActive);

          let plans = [];
          if (isMembActive) {
            // Fetch Membership Plans
            const plansRes = await getVendorMembershipPlans(id);
            plans = plansRes.data || [];
            setMembershipPlans(plans);
          }

          if (servicesRes.data?.length > 0) {
            const dedupedCategories = [];
            const seenCategoryKeys = new Set();

            servicesRes.data
              .map((service) => service.category)
              .filter(Boolean)
              .forEach((category) => {
                const key = normalizeCategoryValue(category);
                if (!key || seenCategoryKeys.has(key)) return;
                seenCategoryKeys.add(key);
                dedupedCategories.push(category);
              });
            
            const cats = ['All', ...dedupedCategories];
            if (isMembActive && plans.length > 0) {
              cats.push('Plans');
            }
            setCategories(cats);
          }
        }
      } catch (err) {
        setError('Failed to load service details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // 1.1 Fetch User Memberships
  useEffect(() => {
    const fetchUserMemberships = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await getMyMemberships();
        setUserMemberships(res.data || []);
      } catch (err) {
        console.error('Failed to fetch memberships');
      }
    };
    fetchUserMemberships();
  }, [isAuthenticated]);

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

  // 4. Real-time Status Sync
  useEffect(() => {
    if (!id || !socket) return;
    
    // Join the vendor's public room for status updates
    socket.emit('join_vendor', id);
    
    const handleStatusUpdate = (data) => {
      if (data.isShopOpen !== undefined) {
        setVendor(prev => prev ? { ...prev, isShopOpen: data.isShopOpen } : null);
      }
    };

    socket.on('SHOP_STATUS_UPDATED', handleStatusUpdate);
    return () => socket.off('SHOP_STATUS_UPDATED', handleStatusUpdate);
  }, [id, socket]);

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
            serviceIds: services.map((service) => service._id).join(','),
            _t: Date.now()
          }
        });

        console.log('[PRICING DEBUG] API Response:', JSON.stringify(res.data, null, 2));

        const pricingMap = (res.data?.services || []).reduce((acc, service) => {
          acc[service.serviceId] = service;
          return acc;
        }, {});

        console.log('[PRICING DEBUG] pricingMap keys:', Object.keys(pricingMap));
        console.log('[PRICING DEBUG] services._id list:', services.map(s => String(s._id)));

        setServicePricing(pricingMap);
      } catch (err) {
        console.error('[PRICING DEBUG] API Error:', err?.response?.data || err.message);
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
            serviceIds: cartItems.map((item) => item._id).join(','),
            _t: Date.now()
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

    // Optimistic UI Update: Toggle heart immediately
    const previousFavoriteState = isFavorited;
    const newState = !previousFavoriteState;
    setIsFavorited(newState);

    try {
      const res = await api.post('/users/favorites/toggle', { vendorId: id });
      // Sync with server response just in case of mismatch
      if (res.data.isFavorited !== newState) {
        setIsFavorited(res.data.isFavorited);
      }
      toast.success(res.data.isFavorited ? 'Saved to your elite list!' : 'Removed from favorites');
    } catch (err) {
      // Rollback if the API call fails
      setIsFavorited(previousFavoriteState);
      toast.error('Failed to update favorites');
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

  const prefetchCartData = async () => {
    try {
      const todayStr = dayjs().format('YYYY-MM-DD');
      const serviceIdsStr = cartItems.map(i => i._id).join(',');
      
      const [slotsRes, staffRes] = await Promise.all([
        api.get('/slots', {
          params: {
            vendorId: id,
            date: todayStr,
            serviceIds: serviceIdsStr
          }
        }),
        api.get('/staff', { params: { vendorId: id, date: todayStr } })
      ]);

      if (window.__PREFETCHED_DATA__) {
        window.__PREFETCHED_DATA__.cartData = {
          vendorId: id,
          serviceIds: serviceIdsStr,
          date: todayStr,
          slots: slotsRes.data?.availableSlots || [],
          staff: staffRes.data || []
        };
      }
    } catch (e) {
      console.warn('[Prefetch] Cart slots/staff prefetch failed', e.message);
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
      // Trigger prefetch of today's slots/staff in parallel
      prefetchCartData();

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

  const handleBuyPlan = async (plan) => {
    if (!isAuthenticated) return navigate('/login');
    if (buyingPlanId) return;

    try {
      setBuyingPlanId(plan._id);
      console.log(`[MEMBERSHIP] Sending purchase request for plan: ${plan._id}`);
      
      const res = await api.post('/memberships/request', { planId: plan._id });
      toast.success(res.data.message || "Request sent to vendor! ⏳");
      
      // Refresh memberships
      const mRes = await api.get('/memberships/my-memberships');
      setUserMemberships(mRes.data || []);
    } catch (err) {
      console.error('[MEMBERSHIP ERROR]', err);
      toast.error(err.response?.data?.message || "Failed to send request");
    } finally {
      setBuyingPlanId(null);
    }
  };

  const gallery = vendor ? [
    vendor.shopImage,
    ...(vendor.gallery || []),
    ...(services.flatMap(s => s.images || []))
  ].filter(Boolean).slice(0, 10) : [];

  const handleScrollTo = (index) => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: index * width,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.offsetWidth;
    if (width > 0) {
      const index = Math.round(scrollLeft / width);
      setActiveIndex(index);
    }
  };
  const filteredServices = useMemo(() => {
    return selectedCat === 'All'
      ? services
      : services.filter((service) => normalizeCategoryValue(service.category) === normalizeCategoryValue(selectedCat));
  }, [services, selectedCat]);

  if (loading && !vendor) return (
    <div className="p-5 space-y-6 bg-white dark:bg-gray-950 min-h-screen">
      <div className="h-48 bg-gray-100 dark:bg-gray-900 rounded-3xl animate-pulse" />
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
        <p className="text-gray-500 font-bold">{error || 'Partner not found'}</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    </div>
  );

  const totalPrice = getTotalPrice();
  const displayTotal = cartPricing?.finalTotal ?? totalPrice;
  const originalTotal = cartPricing?.originalTotal ?? totalPrice;
  const totalSavings = cartPricing?.totalDiscount ?? 0;
  const hasItemsFromThisVendor = cartVendor?._id === vendor._id;
  const hasHomeService = services.some((service) => service.type === 'home' || service.type === 'both');

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen pb-32 no-scrollbar overflow-y-auto">
      {/* Redesigned Secondary Navbar (Fixed) */}
      <div className="bg-white text-[#1C2C4E] dark:text-white fixed top-0 left-0 right-0 z-[60] border-b border-slate-100 dark:bg-gray-950 dark:border-gray-800 h-[50px]">
        <div className="max-w-4xl mx-auto h-full px-4 flex items-center justify-between">
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
      </div>

      <div className="pt-[50px] relative bg-white dark:bg-gray-950 overflow-hidden">
        <div className="relative group">
          {/* Elite Swipeable Carousel */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-48 flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-gray-100 dark:bg-gray-900 border-b border-gray-100/50 relative"
          >
            {gallery.length > 0 ? (
              gallery.map((img, idx) => (
                <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
                  <img
                    loading="lazy"
                    src={img}
                    className="w-full h-full object-cover"
                    alt={`${vendor.shopName} gallery ${idx + 1}`}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200'; }}
                  />
                </div>
              ))
            ) : (
              <div className="w-full h-full snap-center">
                <img
                  src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200"
                  className="w-full h-full object-cover"
                  alt="placeholder"
                />
              </div>
            )}

            {/* Elite Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Navigation Arrows */}
          {gallery.length > 1 && (
            <>
              {activeIndex > 0 && (
                <button
                  onClick={() => handleScrollTo(activeIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-[#1C2C4E] flex items-center justify-center z-30 transition-all active:scale-90 shadow-md"
                >
                  <ChevronLeft size={20} strokeWidth={4} />
                </button>
              )}
              {activeIndex < gallery.length - 1 && (
                <button
                  onClick={() => handleScrollTo(activeIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-[#1C2C4E] flex items-center justify-center z-30 transition-all active:scale-90 shadow-md"
                >
                  <ChevronRight size={20} strokeWidth={4} />
                </button>
              )}
            </>
          )}

          {/* Favorite Overlay */}
          <button
            onClick={handleToggleFavorite}
            className={cn(
              "absolute top-4 right-3 w-[36px] h-[36px] rounded-full shadow-2xl backdrop-blur-md transition-all active:scale-90 z-30 flex items-center justify-center",
              isFavorited ? "bg-white text-[#1C2C4E]" : "bg-white/20 text-white border border-white/30"
            )}
          >
            <Heart
              size={20}
              fill={isFavorited ? "#1C2C4E" : "none"}
              strokeWidth={isFavorited ? 0 : 2}
            />
          </button>

          {/* Pagination HUD */}
          {gallery.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-1.5 z-20">
              {gallery.map((_, index) => (
                <div
                  key={`dot-${index}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300 shadow-sm",
                    activeIndex === index
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/40"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Redesigned Info Cards Grid */}
      <div className="px-3 mt-3 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={handleOpenLocation}
          className="flex items-center gap-2 py-1.5 px-2 bg-slate-50 dark:bg-gray-950 border border-slate-100 dark:border-gray-800 rounded-2xl shadow-sm active:scale-[0.98] transition-all text-left group"
        >
          <div className="w-8 h-8 bg-white dark:bg-gray-300/5 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/50 group-hover:bg-[#1C2C4E]/10 transition-colors">
            <MapPin size={14} className="text-[#1C2C4E] dark:text-gray-400" />
          </div>
          <div className="min-w-0 pr-0.5">
            <p className="text-[11px] font-black text-[#1C2C4E] dark:text-white leading-tight uppercase tracking-tight truncate">
              {vendor.address?.split(',')[0]}
            </p>
            <p className="text-[7px] font-black text-[#1C2C4E]/30 dark:text-gray-500 uppercase tracking-widest mt-0.5">Location</p>
          </div>
        </button>

        <div className="flex items-center gap-2 py-1.5 px-2 bg-slate-50 dark:bg-gray-950 border border-slate-100 dark:border-gray-800 rounded-2xl shadow-sm">
          <div className="w-8 h-8 bg-white dark:bg-gray-300/5 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/50">
            <Clock size={14} className="text-[#1C2C4E] dark:text-gray-400" />
          </div>
          <div className="min-w-0 pr-0.5">
            <p className="text-[10px] font-black text-[#1C2C4E] dark:text-white leading-tight uppercase tracking-tighter whitespace-nowrap">
              {vendor.workingHours?.start} - {vendor.workingHours?.end}
            </p>
            <p className={cn(
              "text-[7px] font-black uppercase tracking-widest mt-0.5 whitespace-nowrap",
              vendor.isShopOpen ? "text-emerald-500" : "text-rose-500"
            )}>
              {vendor.isShopOpen ? 'Open Now' : 'Closed Temporarily'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/service/${vendor._id}/reviews`)}
          className="flex items-center gap-2 py-1.5 px-2 bg-slate-50 dark:bg-gray-950 border border-slate-100 dark:border-gray-800 rounded-2xl shadow-sm active:scale-[0.98] transition-all text-left group"
        >
          <div className="w-8 h-8 bg-white dark:bg-amber-900/10 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/50 group-hover:bg-amber-100 transition-colors">
            <Star size={14} fill="#FACC15" className="text-amber-500" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 pr-0.5">
            <p className="text-[11px] font-black text-[#1C2C4E] dark:text-white leading-tight uppercase tracking-tight">
              {vendor.totalReviews ?? 0} Reviews
            </p>
            <p className="text-[7px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mt-0.5">
              {vendor.rating ? `${vendor.rating.toFixed(1)} / 5 Rating` : 'Elite Rating'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 py-1.5 px-2 bg-slate-50 dark:bg-gray-950 border border-slate-100 dark:border-gray-800 rounded-2xl shadow-sm">
          <div className="w-8 h-8 bg-white dark:bg-emerald-900/10 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/50">
            <ShieldCheck size={14} className="text-emerald-500" />
          </div>
          <div className="min-w-0 pr-0.5">
            <p className="text-[11px] font-black text-[#1C2C4E] dark:text-white leading-tight uppercase tracking-tight">
              Premium Shop
            </p>
            <p className="text-[7px] font-black text-[#1C2C4E]/30 dark:text-gray-500 uppercase tracking-widest mt-0.5">Trust Secured</p>
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
              ? 'bg-[#1C2C4E] text-white shadow-xl shadow-[#1C2C4E]/20 scale-105'
              : 'bg-white dark:bg-gray-900 text-[#0B1222] dark:text-white/60 border border-[#1C2C4E]/10 dark:border-gray-800 shadow-sm'
              }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Selected Services Section */}
      <div className="px-3 mt-4 space-y-2">
        <SectionTitle title="Selected Services" className="mb-1" />
        {cartItems.length > 0 && hasItemsFromThisVendor ? 
          cartItems.map((item) => {
            const cartServiceEntry = (cartPricing?.services || []).find(
              (s) => String(s.serviceId) === String(item._id)
            );
            const priceMeta = cartServiceEntry
              ? {
                  originalPrice: cartServiceEntry.originalPrice,
                  finalPrice: cartServiceEntry.finalPrice,
                  discount: cartServiceEntry.discount
                }
              : {
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
                    <img 
                      loading="lazy"
                      src={item.image || (item.images && item.images[0]) || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800'} 
                      className="w-full h-full object-cover" 
                      alt={item.name} 
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[12px] font-black text-[#0B1222] dark:text-white leading-none mb-1">{item.name}</h4>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-[#0B1222]/40 dark:text-gray-400 flex items-center gap-1 uppercase">
                          <Clock size={8} /> {item.duration}m
                        </span>
                        <div className="flex items-center gap-1.5 leading-none">
                          <span className="text-xs font-black text-[#0B1222] dark:text-white">₹{priceMeta.finalPrice}</span>
                          {priceMeta.discount > 0 && (
                            <span className="text-[10px] font-bold text-gray-400 line-through">₹{priceMeta.originalPrice}</span>
                          )}
                        </div>
                      </div>
                      {priceMeta.discount > 0 && (
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">
                          Now ₹{priceMeta.finalPrice} • Save ₹{priceMeta.discount}
                        </p>
                      )}
                    </div>
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
          }) : (
          <div className="py-3 text-center bg-gray-50/50 dark:bg-gray-900 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
            <p className="text-[8px] font-black text-[#0B1222]/30 dark:text-gray-400 uppercase tracking-widest">Tap items below to add them</p>
          </div>
        )}
      </div>

      {/* Membership Plans Section */}
      {selectedCat === 'Plans' && (
        <div className="px-3 mt-4 space-y-3">
          <SectionTitle title="Available Plans" subtitle="Exclusive benefits for members" className="mb-1" />
          <div className="grid gap-4">
            {membershipPlans.map((plan) => {
              // Check if user has ANY membership for this VENDOR
              const vendorMembership = userMemberships.find(m => String(m.vendorId?._id || m.vendorId) === String(id));
              
              // Find if THIS specific plan is the one user has (for UI labeling)
              const isThisPlan = vendorMembership?.planId?._id === plan._id || vendorMembership?.planId === plan._id;
              
              const isActive = vendorMembership?.status === 'active';
              const isPending = vendorMembership?.status === 'pending';
              const isRejected = vendorMembership?.status === 'rejected'; // Rejections are usually per request, so they can try again
              const isExpired = vendorMembership?.status === 'expired';

              // User can buy if they have NO membership, or if the current one is expired/rejected
              const canBuy = !vendorMembership || isExpired || isRejected;

              // If they have a membership but it's NOT this plan, we should disable the button 
              // unless it's expired or rejected.
              const isOtherPlanActive = vendorMembership && !isThisPlan && (isActive || isPending);

              return (
                <div 
                  key={plan._id}
                  className="bg-white dark:bg-gray-900 border border-amber-500/10 rounded-2xl p-4 shadow-sm relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
                  
                  <div className="flex justify-between items-center relative z-10">
                    <div className="space-y-0.5">
                      <h4 className="text-base font-black text-[#0B1222] dark:text-white capitalize">{plan.name}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{plan.durationDays} Days Duration</p>
                    </div>
                    <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 border border-amber-500/20">
                      <Crown size={18} />
                    </div>
                  </div>

                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed line-clamp-2">
                    {plan.description || "Get exclusive access to free services and priority bookings."}
                  </p>

                  <div className="mt-3.5 space-y-1.5">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Free Services Included</p>
                    <div className="flex flex-wrap gap-1">
                      {plan.services?.map(s => (
                        <span key={s.serviceId?._id} className="px-2 py-0.5 bg-amber-500/5 text-amber-600 rounded-lg text-[8px] font-black border border-amber-500/10">
                          {s.serviceId?.name} ({s.usageLimit}x)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3.5 border-t border-slate-50 dark:border-gray-800">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">One-time price</p>
                      <p className="text-xl font-black text-[#0B1222] dark:text-white leading-none">₹{plan.price}</p>
                    </div>
                    <button
                      onClick={() => handleBuyPlan(plan)}
                      disabled={!canBuy || buyingPlanId === plan._id}
                      className={cn(
                        "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95",
                        isActive && isThisPlan 
                        ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                        : isPending && isThisPlan
                        ? "bg-amber-500 text-white shadow-amber-500/20"
                        : isOtherPlanActive
                        ? "bg-gray-400 text-white cursor-not-allowed opacity-50"
                        : (isRejected || isExpired) && isThisPlan
                        ? "bg-rose-500 text-white shadow-rose-500/20"
                        : "bg-[#1C2C4E] text-white shadow-[#1C2C4E]/20"
                      )}
                    >
                      {buyingPlanId === plan._id ? <Loader2 size={12} className="animate-spin" /> : (
                        (isActive && isThisPlan) ? "Active" : 
                        (isPending && isThisPlan) ? "Pending Approval" : 
                        isOtherPlanActive ? "Member (Other Plan)" :
                        (isExpired && isThisPlan) ? "Expired (Buy Again)" :
                        (isRejected && isThisPlan) ? "Rejected (Try Again)" :
                        "Buy Plan"
                      )}
                    </button>
                  </div>

                  {isActive && isThisPlan && (
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-800 space-y-2.5">
                      <p className="text-[8px] font-black text-[#1C2C4E] dark:text-primary uppercase tracking-[0.2em]">Your Current Usage</p>
                      <div className="space-y-2">
                        {vendorMembership?.usage?.map((u) => {
                          const percentage = Math.min((u.usedCount / u.usageLimit) * 100, 100);
                          return (
                            <div key={u.serviceId?._id} className="space-y-1">
                              <div className="flex justify-between items-center text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase">
                                <span>{u.serviceId?.name}</span>
                                <span className="text-[#1C2C4E] dark:text-white">{u.usedCount} / {u.usageLimit} Used</span>
                              </div>
                              <div className="h-1.5 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Services Section */}
      <div className="px-3 mt-4 space-y-2">
        <SectionTitle title="Available Services" subtitle="Add more to your package" className="mb-1" />
        <div className="space-y-2">
          {filteredServices.map((service) => {
            const isSelected = cartItems.find(item => item._id === service._id);
            if (isSelected) return null;
            const priceMeta = servicePricing[String(service._id)] || {
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
                  <img 
                    loading="lazy"
                    src={service.image || (service.images && service.images[0]) || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800'} 
                    className="w-full h-full object-cover" 
                    alt={service.name} 
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-[12px] font-black text-[#0B1222] dark:text-white leading-none mb-1">{service.name}</h4>
                    <div className="flex items-center gap-1.5 leading-none">
                      <p className="text-[10px] font-black text-[#0B1222] dark:text-white">
                        {priceMeta.isFreeViaMembership ? 'FREE' : `₹${priceMeta.finalPrice}`}
                      </p>
                      {priceMeta.discount > 0 && !priceMeta.isFreeViaMembership && (
                        <span className="text-[9px] font-bold text-gray-400 line-through">₹{priceMeta.originalPrice}</span>
                      )}
                    </div>
                  {priceMeta.discount > 0 && (
                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1 leading-none">
                      {priceMeta.isFreeViaMembership 
                        ? 'FREE with membership ✨' 
                        : `Now ₹${priceMeta.finalPrice} • Save ₹${priceMeta.discount}`}
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
        </div>
      </div>

      {/* Fixed Sticky Action Bar */}
      <AnimatePresence>
        {hasItemsFromThisVendor && cartItems.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed left-2 right-2 bg-[#0B1222] dark:bg-gray-950 backdrop-blur-3xl py-2 px-4 z-50 border border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] rounded-[24px]"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 54px)' }}
          >
            <div className="flex items-center justify-between max-w-lg mx-auto">
              <div className="flex flex-col">
                <p className="text-[8px] font-black text-white/40 capitalize tracking-widest mb-0.5 leading-none">Net total</p>
                {totalSavings > 0 && (
                  <p className="text-[8px] font-black text-white/40 line-through leading-none mb-1">₹{originalTotal}</p>
                )}
                <p className="text-lg font-black text-white leading-none">₹{displayTotal}</p>
                {totalSavings > 0 && (
                  <div className="mt-1.5 flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-1 rounded-md self-start shadow-sm shadow-emerald-500/10">
                    <Tag size={8} className="text-emerald-400 fill-emerald-400" />
                    <p className="text-[8px] font-black text-emerald-400 tracking-widest leading-none uppercase">SAVE ₹{totalSavings}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleProceedToBooking}
                disabled={cartItems.length === 0 || loading || !vendor.isShopOpen}
                className={cn(
                  "px-5 py-2 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl transition-all active:scale-95 border-b-[2px] flex items-center justify-center min-w-[100px]",
                  !vendor.isShopOpen 
                    ? "bg-rose-500 text-white border-rose-600 shadow-rose-500/20 cursor-not-allowed"
                    : "bg-white text-[#0B1222] border-gray-100 shadow-black/20 disabled:opacity-30 disabled:grayscale"
                )}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : (!vendor.isShopOpen ? 'Closed Temporarily' : 'Book Now')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  onClick={() => navigate('/cart', {
                    state: {
                      rescheduleBookingId: existingBooking._id,
                      vendor: {
                        ...vendor,
                        ...(existingBooking.vendorId || {})
                      },
                      rescheduleItems: (existingBooking.services || []).map((service) => ({
                        _id: service.serviceId,
                        name: service.name,
                        price: service.price,
                        duration: service.duration,
                        bufferTime: service.bufferTime || 0
                      })),
                      rescheduleTotalDuration: existingBooking.totalDuration,
                      rescheduleSelection: {
                        date: dayjs(existingBooking.startTime).format('YYYY-MM-DD'),
                        time: dayjs(existingBooking.startTime).format('HH:mm'),
                        staffId: existingBooking.staffId?._id || existingBooking.staffId || '',
                        staffName: existingBooking.staffId?.name || '',
                        staffImage: existingBooking.staffId?.image || ''
                      }
                    }
                  })}
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
