import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, MapPin, AlertCircle, ChevronRight } from 'lucide-react';
import SectionTitle from '../components/SectionTitle';
import VendorCard from '../components/VendorCard';
import Button from '../components/Button';
import { VendorSkeleton } from '../components/Skeleton';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useDebounce } from '../hooks/useDebounce';

const Home = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [location, setLocation] = useState({ lng: 77.4126, lat: 23.2599 }); // Default: Bhopal
  const debouncedSearch = useDebounce(search, 300);
  const serviceCards = vendors.flatMap((vendor) => {
    const vendorServices = vendor.services?.length
      ? vendor.services
      : [{
          _id: `fallback-${vendor._id}`,
          name: vendor.service || 'Beauty Service',
          price: vendor.price || 0,
          image: vendor.serviceImage || ''
        }];

    return vendorServices.map((service) => ({
      ...vendor,
      cardKey: `${vendor._id}-${service._id}`,
      service: service.name,
      price: service.price,
      serviceImage: service.image || vendor.serviceImage || vendor.shopImage || '',
      serviceCount: 1
    }));
  });

  // 1. Get Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
        () => console.log('Using default location')
      );
    }
  }, []);

  // 2. Fetch Categories
  useEffect(() => {
    api.get('/categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error('Failed to fetch categories'));
  }, []);

  // 3. Fetch Vendors (Nearby + Search + Filter)
  useEffect(() => {
    setLoading(true);
    const params = {
      lng: location.lng,
      lat: location.lat,
      search: debouncedSearch,
      category: selectedCats.join(',')
    };

    api.get('/vendors/nearby', { params })
      .then(res => {
        setVendors(res.data);
        setCurrentPage(1); // Reset to page 1 on new search/filter
        setError(null);
      })
      .catch(err => setError('Failed to load professionals nearby'))
      .finally(() => setLoading(false));
  }, [location, debouncedSearch, selectedCats]);

  const toggleCategory = (id) => {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVendors = serviceCards.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(serviceCards.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="pb-24 animate-in fade-in duration-700 bg-transparent min-h-screen">
      {/* Premium Search Bar HUD (Vibrant Glassmorphism) */}
      <div className="px-4 pt-2 pb-0.5 mb-2">
        <div className="relative group animate-in slide-in-from-top-3 duration-700 w-full mx-auto">
          {/* Multi-layered Soft Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#1C2C4E]/10 via-blue-500/5 to-[#1C2C4E]/10 rounded-[16px] blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />

          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400/80 group-focus-within:text-[#1C2C4E] dark:group-focus-within:text-blue-400 z-10 pointer-events-none transition-all duration-300">
              <Search size={20} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Search salon, beauty parlour, makeup artist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[37px] pl-14 pr-6 bg-white dark:bg-gray-950/80 backdrop-blur-xl border border-[#1C2C4E]/10 dark:border-gray-700 rounded-[14px] text-[14px] font-bold text-[#1C2C4E] dark:text-white shadow-[0_12px_24px_-8px_rgba(0,0,0,0.06),0_4px_10px_rgba(0,0,0,0.02)] focus:border-[#1C2C4E]/30 transition-all duration-500 outline-none placeholder:text-[#0B1222]/40 dark:placeholder:text-gray-500 placeholder:font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Modern Category Pill Filters */}
      <div className="px-4 mb-4">
        <div className="overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex gap-2.5 items-center min-w-max pb-1">
            {categories.map((cat) => {
              const isActive = selectedCats.includes(cat._id);
              return (
                <button
                  key={cat._id}
                  onClick={() => toggleCategory(cat._id)}
                  className={`relative px-4 py-2 rounded-xl whitespace-nowrap text-[13px] font-black tracking-tight transition-all duration-300 active:scale-95 flex-shrink-0 ${isActive
                    ? 'bg-gradient-to-br from-[#1C2C4E] to-[#2D3F6E] text-white shadow-[0_10px_25px_-4px_rgba(28,44,78,0.35)] scale-105'
                    : 'bg-white dark:bg-gray-900/50 text-[#1C2C4E]/60 dark:text-gray-400 border border-[#1C2C4E]/10 dark:border-gray-700 shadow-sm'
                    }`}
                >
                  <span className="relative z-10">{cat.name}</span>
                  {isActive && (
                    <div className="absolute inset-x-0 bottom-0 top-0 rounded-xl bg-white/10" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="px-5 py-4 text-center text-gray-500">
          <AlertCircle className="mx-auto mb-1 opacity-20" size={32} />
          <p className="text-[10px] font-medium">{error}</p>
        </div>
      )}

      {/* Nearby Professionals (Ultra-Wide Stack) */}
      <section className="mt-1 px-3">
        <SectionTitle
          title="Nearby Professionals"
          actionLabel="More"
          className="mb-2 px-2"
        />

        <div className="space-y-4">
          {loading ? (
            <VendorSkeleton />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-2.5"
              >
                {currentVendors.length > 0 ? (
                  currentVendors.map((vendor) => (
                    <VendorCard key={vendor.cardKey || vendor._id} vendor={vendor} variant="full" />
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <p className="text-[10px] font-black text-[#0B1222] uppercase tracking-widest opacity-25">No Professionals Found</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Elite Pagination HUD */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8 pb-4">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-3 rounded-xl border border-gray-100 disabled:opacity-20 text-[#1C2C4E] font-black active:scale-90 transition-all bg-white shadow-sm"
            >
              <ChevronRight className="rotate-180" size={18} strokeWidth={3} />
            </button>

            <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[11px] font-black text-[#0B1222]">{currentPage}</span>
              <span className="text-[10px] font-bold text-[#0B1222] opacity-10">/</span>
              <span className="text-[10px] font-bold text-[#0B1222] opacity-40">{totalPages}</span>
            </div>

            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-3 rounded-xl border border-[#1C2C4E]/10 disabled:opacity-20 text-[#1C2C4E] font-black active:scale-90 transition-all bg-white shadow-sm"
            >
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
