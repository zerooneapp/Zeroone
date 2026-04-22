import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ArrowLeft, Filter, AlertCircle } from 'lucide-react';
import Input from '../components/Input';
import VendorCard from '../components/VendorCard';
import { VendorSkeleton } from '../components/Skeleton';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { useAuthStore } from '../store/authStore';

const Nearby = () => {
  const navigate = useNavigate();
  const observer = useRef();
  const { user } = useAuthStore();
  
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState([]);
  // Default to User's saved location or Bhopal [lng, lat]
  const [location, setLocation] = useState({ 
    lng: user?.location?.coordinates?.[0] || 77.4126, 
    lat: user?.location?.coordinates?.[1] || 23.2599 
  });

  // 📍 SMART LOCATION FALLBACK: Browser GPS -> Saved Address -> Default
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
        (err) => {
          console.log('Location access denied, falling back to profile address.');
          if (user?.location?.coordinates?.[0] && user?.location?.coordinates?.[0] !== 0) {
            setLocation({ 
              lng: user.location.coordinates[0], 
              lat: user.location.coordinates[1] 
            });
          }
        }
      );
    }
  }, [user]);

  const debouncedSearch = useDebounce(search, 300);

  // 1. Intersection Observer for Infinite Scroll
  const lastVendorElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // 2. Fetch Categories (once)
  useEffect(() => {
    api.get('/categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error('Categories fetch failed'));
  }, []);

  // 3. Reset and Fetch on Search/Category Change
  useEffect(() => {
    setVendors([]);
    setPage(1);
    setHasMore(true);
    fetchVendors(1, true);
  }, [debouncedSearch, selectedCats, location]);

  // 4. Fetch More on Page Change
  useEffect(() => {
    if (page > 1) {
      fetchVendors(page, false);
    }
  }, [page]);

  const fetchVendors = (pageNum, isNewBatch) => {
    if (isNewBatch) setLoading(true);
    else setLoadingMore(true);

    const params = {
      lng: location.lng,
      lat: location.lat,
      search: debouncedSearch,
      category: selectedCats.join(','),
      page: pageNum,
      limit: 10
    };

    api.get('/vendors/nearby', { params })
      .then(res => {
        setVendors(prev => isNewBatch ? res.data : [...prev, ...res.data]);
        setHasMore(res.data.length === 10);
        setError(null);
      })
      .catch(err => setError('Could not connect to service'))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  const toggleCategory = (id) => {
    setSelectedCats(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20 animate-in fade-in duration-500">
      {/* Sticky Header with Search */}
      <div className="sticky top-16 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md pt-2">
        <div className="px-4 flex items-center gap-3 mb-2">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
             <Input 
              placeholder="Search professionals..." 
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-[42px] text-sm border-none shadow-sm"
            />
          </div>
        </div>

        {/* Dynamic Categories */}
        <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar border-b border-gray-100 dark:border-gray-800/50">
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => toggleCategory(cat._id)}
              className={`px-4 py-1.5 rounded-xl whitespace-nowrap text-[11px] font-bold uppercase tracking-wider transition-all ${
                selectedCats.includes(cat._id) 
                  ? 'border-primary text-primary bg-white dark:bg-gray-900 shadow-sm' 
                  : 'bg-white dark:bg-gray-800 text-gray-500 border-primary/10'
              } border`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="px-4 py-4">
        {error && (
          <div className="py-20 text-center">
            <AlertCircle className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="mb-4"><VendorSkeleton /></div>)}
          </div>
        ) : vendors.length === 0 ? (
          <div className="py-20 text-center">
             <p className="text-gray-400">No professionals found in this area.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {vendors.map((vendor, index) => (
              <div 
                key={vendor._id} 
                ref={index === vendors.length - 1 ? lastVendorElementRef : null}
              >
                <VendorCard vendor={vendor} variant="small" />
              </div>
            ))}
          </div>
        )}

        {loadingMore && (
          <div className="grid grid-cols-2 gap-4 mt-4">
             {[1, 2].map(i => <div key={i}><VendorSkeleton /></div>)}
          </div>
        )}

        {!hasMore && vendors.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-10 font-medium">✨ You've reached the end of the list</p>
        )}
      </div>
    </div>
  );
};

export default Nearby;
