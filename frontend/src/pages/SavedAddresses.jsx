import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, MapPin, Search, Navigation, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const getInitialLocation = (user) => {
  const coordinates = user?.location?.coordinates;
  if (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.every((value) => Number.isFinite(value)) &&
    !(coordinates[0] === 0 && coordinates[1] === 0)
  ) {
    return {
      type: 'Point',
      coordinates
    };
  }

  return null;
};

const SavedAddresses = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState(user?.address || '');
  const [selectedLocation, setSelectedLocation] = useState(() => getInitialLocation(user));

  const resolveAddressToLocation = async (address) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`
    );

    if (!response.ok) {
      throw new Error('Failed to geocode address');
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('Address could not be mapped');
    }

    return {
      type: 'Point',
      coordinates: [parseFloat(results[0].lon), parseFloat(results[0].lat)]
    };
  };

  const persistAddress = async (address, locationPayload, successMessage = 'Address saved successfully!') => {
    const res = await api.patch('/users/profile', {
      address,
      ...(locationPayload ? { location: locationPayload } : {})
    });

    updateUser(res.data);
    toast.success(successMessage);
  };

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation not supported');
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const readableAddress = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          setManualAddress(readableAddress);
          const locationPayload = {
            type: 'Point',
            coordinates: [longitude, latitude]
          };
          setSelectedLocation(locationPayload);
          await persistAddress(readableAddress, locationPayload, 'Current location updated!');
          return;
          toast.success('Location fetched!', { icon: '📍' });
        } catch (err) {
          toast.error('Failed to resolve address');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        toast.error('Location access denied');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSaveAddress = async () => {
    const normalizedAddress = manualAddress.trim();
    if (!normalizedAddress) return toast.error('Please enter an address');

    setLoading(true);
    try {
      let locationPayload = selectedLocation;
      const currentCoordinates = user?.location?.coordinates;
      const isAddressChanged = normalizedAddress !== (user?.address || '').trim();

      if (!locationPayload && isAddressChanged) {
          locationPayload = await resolveAddressToLocation(normalizedAddress);
      }

      if (!locationPayload && Array.isArray(currentCoordinates) && currentCoordinates.length === 2) {
        locationPayload = {
          type: 'Point',
          coordinates: currentCoordinates
        };
      }

      await persistAddress(normalizedAddress, locationPayload);
      navigate(-1);
    } catch (err) {
      toast.error(err.message === 'Address could not be mapped' ? err.message : 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-gray-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
      <header className="p-2.5 py-3 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all"
          >
            <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
          </button>
          <div className="leading-none">
            <h1 className="font-extrabold text-[15px] text-[#1C2C4E] dark:text-white tracking-tight">
              Saved addresses
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        <section className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1 uppercase">Active address</label>
          <button
            type="button"
            onClick={handleFetchCurrentLocation}
            disabled={loading}
            className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03)] relative overflow-hidden group text-left active:scale-[0.99] transition-all disabled:opacity-70"
          >
            <div className="absolute top-0 right-0 p-3 opacity-5">
              <MapPin size={40} className="text-[#1C2C4E]" />
            </div>
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center border border-slate-100 dark:border-gray-700 shrink-0">
                <Navigation size={18} className="text-[#1C2C4E] dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-[#1C2C4E] dark:text-white tracking-tight">Main location</h3>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed dark:text-gray-400">
                  {user?.address || 'No address set yet'}
                </p>
                <p className="text-[9px] font-black text-[#1C2C4E]/40 dark:text-gray-500 tracking-widest uppercase pt-1">
                  Tap to fetch current location
                </p>
              </div>
            </div>
          </button>
        </section>

        <section className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1 uppercase">Modify address</label>
          <div className="relative group">
            <textarea
              value={manualAddress}
              onChange={(e) => {
                setManualAddress(e.target.value);
                setSelectedLocation(null);
              }}
              placeholder="Enter complete address manually..."
              className="w-full h-32 p-4 pt-10 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 text-xs font-bold text-slate-900 dark:text-white tracking-tight focus:border-primary transition-all outline-none resize-none shadow-sm caret-[#1C2C4E]"
            />
            <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none opacity-40">
              <Search size={14} className="text-[#1C2C4E]" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">Manual Input</span>
            </div>
          </div>
        </section>

        <div className="pt-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveAddress}
            disabled={loading}
            className={`w-full h-12 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-xs tracking-[0.2em] uppercase shadow-2xl shadow-slate-900/20 dark:shadow-primary/20 flex items-center justify-center gap-2 overflow-hidden relative group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="relative z-10">Set address</span>
                <Save size={16} className="relative z-10 group-hover:translate-y-[-1px] transition-transform" />
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </motion.button>
        </div>
      </main>
    </div>
  );
};

export default SavedAddresses;
