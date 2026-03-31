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
    <div className="pb-24 animate-in fade-in duration-700 bg-white dark:bg-gray-950 min-h-screen">
      {/* Search Bar HUD (Sleek Wide) */}
      <div className="px-3 py-1">
        <div className="relative group animate-in slide-in-from-top-1 duration-500 w-full">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1C2C4E] transition-colors">
            <Search size={20} strokeWidth={3} />
          </div>
          <input 
            type="text"
            placeholder="Search salon, beauty parlour, makeup artist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-16 pr-6 bg-white dark:bg-gray-950 border-2 border-gray-200/60 dark:border-gray-800 rounded-2xl text-[12px] font-bold dark:text-white shadow-xl shadow-black/[0.05] focus:border-[#1C2C4E]/20 focus:ring-4 focus:ring-[#1C2C4E]/5 transition-all outline-none placeholder:text-gray-300 placeholder:font-medium"
          />
        </div>
      </div>

      {/* Boutique Category Filter (Sleek Fit) */}
      <div className="flex gap-2.5 overflow-x-auto px-3 py-1.5 no-scrollbar justify-start sm:justify-center">
        {categories.map((cat) => {
          const isActive = selectedCats.includes(cat._id);
          return (
            <button
              key={cat._id}
              onClick={() => toggleCategory(cat._id)}
              className={`px-5 py-2 rounded-2xl whitespace-nowrap text-[12px] font-black tracking-tight transition-all border-2 ${
                isActive 
                  ? 'bg-[#1C2C4E] text-white border-[#1C2C4E] shadow-xl shadow-[#1C2C4E]/30 scale-105' 
                  : 'bg-white dark:bg-gray-900 text-[#1C2C4E] dark:text-gray-400 border-gray-200/50 dark:border-gray-800 hover:border-gray-400 shadow-md shadow-black/[0.02]'
              }`}
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
        
        <div className="space-y-3">
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
                className="space-y-3"
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
          <div className="flex items-center justify-center gap-3 mt-8 pb-4">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-3 rounded-xl border border-gray-100 disabled:opacity-20 text-[#1C2C4E] font-black active:scale-90 transition-all bg-white shadow-sm"
            >
              <ChevronRight className="rotate-180" size={18} strokeWidth={3} />
            </button>
            
            <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[11px] font-black text-[#1C2C4E]">{currentPage}</span>
              <span className="text-[10px] font-bold text-gray-300">/</span>
              <span className="text-[10px] font-bold text-gray-400">{totalPages}</span>
            </div>

            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-3 rounded-xl border border-gray-100 disabled:opacity-20 text-[#1C2C4E] font-black active:scale-90 transition-all bg-white shadow-sm"
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
