import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, MapPin, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
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
  const currentVendors = vendors.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(vendors.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="pb-24 animate-in fade-in duration-700 bg-transparent min-h-screen">
      {/* Premium Search Bar HUD (Vibrant Glassmorphism) */}
      <div className="px-4 pt-4 pb-1 mb-2">
        <div className="relative group animate-in slide-in-from-top-3 duration-700 w-full">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
              <Search size={16} strokeWidth={3} />
            </div>
            <input
              type="text"
              placeholder="Search salon, beauty parlour, makeup artist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-11 pr-4 bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl text-[11px] font-black text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-slate-400 uppercase tracking-tight"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-1.5 no-scrollbar items-center">
        {categories.map((cat) => {
          const isActive = selectedCats.includes(cat._id);
          return (
            <button
              key={cat._id}
              onClick={() => toggleCategory(cat._id)}
              className={cn(
                "px-3 py-1.5 rounded-lg whitespace-nowrap text-[8px] font-black uppercase tracking-widest border transition-all active:scale-95",
                isActive
                  ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105'
                  : 'bg-white dark:bg-gray-900 text-slate-400 border-slate-100 dark:border-gray-800'
              )}
            >
              {cat.name}
            </button>
          );
        })}
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
          actionLabel={`${vendors.length} Total`}
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
                className="space-y-6"
              >
                {currentVendors.length > 0 ? (
                  currentVendors.map((vendor) => (
                    <VendorCard key={vendor._id} vendor={vendor} variant="full" />
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Professionals Found</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Elite Pagination HUD */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 pb-10">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2.5 rounded-lg border border-slate-100 dark:border-gray-800 disabled:opacity-20 text-slate-900 bg-white shadow-sm active:scale-90 transition-all font-black"
            >
              <ChevronRight className="rotate-180" size={16} strokeWidth={3} />
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800 shadow-inner">
              <span className="text-[10px] font-black text-slate-900 dark:text-white leading-none">{currentPage}</span>
              <span className="text-[8px] font-black text-slate-300 leading-none">/</span>
              <span className="text-[9px] font-black text-slate-400 leading-none">{totalPages}</span>
            </div>

            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-lg border border-slate-100 dark:border-gray-800 disabled:opacity-20 text-slate-900 bg-white shadow-sm active:scale-90 transition-all font-black"
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
