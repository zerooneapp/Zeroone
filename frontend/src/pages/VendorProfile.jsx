import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
   ArrowLeft, Store, Camera, Video, MapPin, Loader2,
   Save, Plus, X, CheckCircle2, ChevronRight, LayoutGrid, Sun, Moon, LogOut,
   History, Calendar, Clock, UserRound, IndianRupee, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';

const VendorProfile = () => {
   const navigate = useNavigate();
   const { isDarkMode, toggleTheme } = useThemeStore();
   const { logout } = useAuthStore();
   const [loading, setLoading] = useState(false);
   const [activeSection, setActiveSection] = useState(null); // null | 'basic' | 'media'
   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
   const [historyLoading, setHistoryLoading] = useState(false);
   const [historyBookings, setHistoryBookings] = useState([]);
   const [historyFilters, setHistoryFilters] = useState({
      from: '',
      to: '',
      status: ''
   });
   const [transactionLoading, setTransactionLoading] = useState(false);
   const [transactions, setTransactions] = useState([]);
   const [staffOptions, setStaffOptions] = useState([]);
   const [transactionFilters, setTransactionFilters] = useState({
      from: '',
      to: '',
      source: 'total',
      staffId: ''
   });
   const [data, setData] = useState({
      shopName: '',
      address: '',
      serviceMode: 'shop',
      workingHours: { start: '09:00 AM', end: '09:00 PM' },
      location: null
   });
   const [locationLoading, setLocationLoading] = useState(false);
   const [currentMedia, setCurrentMedia] = useState(null);
   const [galleryFiles, setGalleryFiles] = useState([]);
   const [videoFile, setVideoFile] = useState(null);

   const handleFetchLocation = () => {
      if (!navigator.geolocation) return toast.error('GPS not supported');
      
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(async (pos) => {
         const { latitude, longitude } = pos.coords;
         try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
            const result = await response.json();
            const addr = result.display_name || `${latitude}, ${longitude}`;
            
            setData(prev => ({
               ...prev,
               address: addr,
               location: { type: 'Point', coordinates: [longitude, latitude] }
            }));
            toast.success('Location fetched!');
         } catch (err) {
            toast.error('Failed to resolve address');
         } finally {
            setLocationLoading(false);
         }
      }, () => {
         setLocationLoading(false);
         toast.error('Location permission denied');
      });
   };

   useEffect(() => {
      const fetchProfile = async () => {
         try {
            const res = await api.get('/vendor/profile');
            setData({
               shopName: res.data.shopName,
               address: res.data.address,
               serviceMode: res.data.serviceMode || 'shop',
               workingHours: res.data.workingHours || { start: '09:00 AM', end: '09:00 PM' },
               location: res.data.location
            });
            setCurrentMedia(res.data);
         } catch (err) {
            toast.error('Failed to load profile');
         }
      };
      fetchProfile();
   }, []);

   useEffect(() => {
      if (data.serviceMode === 'home' && transactionFilters.source === 'staff') {
         setTransactionFilters((prev) => ({ ...prev, source: 'total', staffId: '' }));
      }
   }, [data.serviceMode, transactionFilters.source]);

   useEffect(() => {
      if (activeSection !== 'history') return;

      const fetchHistory = async () => {
         try {
            setHistoryLoading(true);
            const params = {};
            if (historyFilters.from) params.from = historyFilters.from;
            if (historyFilters.to) params.to = historyFilters.to;
            if (historyFilters.status) params.status = historyFilters.status;

            const res = await api.get('/vendor/bookings', { params });
            setHistoryBookings(res.data || []);
         } catch (err) {
            toast.error('Failed to load booking history');
         } finally {
            setHistoryLoading(false);
         }
      };

      fetchHistory();
   }, [activeSection, historyFilters]);

   useEffect(() => {
      if (activeSection !== 'transactions') return;

      const fetchTransactions = async () => {
         try {
            setTransactionLoading(true);
            const params = {
               category: 'booking_revenue',
               source: transactionFilters.source
            };
            if (transactionFilters.from) params.from = transactionFilters.from;
            if (transactionFilters.to) params.to = transactionFilters.to;
            if (transactionFilters.source === 'staff' && transactionFilters.staffId) {
               params.staffId = transactionFilters.staffId;
            }

            const res = await api.get('/vendor/transactions', { params });
            setTransactions(res.data || []);
         } catch (err) {
            toast.error('Failed to load earning history');
         } finally {
            setTransactionLoading(false);
         }
      };

      fetchTransactions();
   }, [activeSection, transactionFilters]);

   useEffect(() => {
      if (activeSection !== 'transactions') return;
      if (data.serviceMode === 'home') {
         setStaffOptions([]);
         return;
      }

      const fetchStaffOptions = async () => {
         try {
            const res = await api.get('/staff/manage/all');
            setStaffOptions(Array.isArray(res.data) ? res.data : []);
         } catch (err) {
            setStaffOptions([]);
         }
      };

      fetchStaffOptions();
   }, [activeSection, data.serviceMode]);

   const handleUpdateInfo = async (e) => {
      e.preventDefault();
      try {
         setLoading(true);
         await api.patch('/vendor/update-profile', data);
         toast.success('Basic info updated');
      } catch (err) {
         toast.error('Update failed');
      } finally {
         setLoading(false);
      }
   };

   const handleMediaUpload = async () => {
      try {
         setLoading(true);
         const formData = new FormData();
         galleryFiles.forEach(file => formData.append('gallery', file));
         if (videoFile) formData.append('video', videoFile);

         const res = await api.post('/vendor/upload-docs', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
         });

         setCurrentMedia(res.data);
         setGalleryFiles([]);
         setVideoFile(null);
         toast.success('Media gallery updated!');
      } catch (err) {
         toast.error('Upload failed. Check file sizes.');
      } finally {
         setLoading(false);
      }
   };

   const menuItems = [
      {
         key: 'basic',
         label: 'Basic Info',
         subtitle: 'Shop name, address & hours',
         icon: Store,
         iconBg: 'bg-blue-500/10',
         iconColor: 'text-blue-500',
      },
      {
         key: 'media',
         label: 'Shop Media',
         subtitle: 'Gallery images & promo video',
         icon: Camera,
         iconBg: 'bg-purple-500/10',
         iconColor: 'text-purple-500',
      },
      {
         key: 'services',
         label: 'Services',
         subtitle: 'Manage your service listings',
         icon: LayoutGrid,
         iconBg: 'bg-emerald-500/10',
         iconColor: 'text-emerald-500',
         path: '/vendor/services',
      },
      {
         key: 'history',
         label: 'History',
         subtitle: 'Shop booking history & date filter',
         icon: History,
         iconBg: 'bg-amber-500/10',
         iconColor: 'text-amber-500',
      },
      {
         key: 'transactions',
         label: 'Transactions',
         subtitle: 'Shop earning history & filters',
         icon: Wallet,
         iconBg: 'bg-emerald-500/10',
         iconColor: 'text-emerald-500',
      },
      {
         key: 'theme',
         label: isDarkMode ? 'Light Mode' : 'Dark Mode',
         subtitle: isDarkMode ? 'Switch to light theme' : 'Switch to dark theme',
         icon: isDarkMode ? Sun : Moon,
         iconBg: isDarkMode ? 'bg-amber-500/10' : 'bg-slate-500/10',
         iconColor: isDarkMode ? 'text-amber-500' : 'text-slate-500',
         isToggle: true,
      },
      {
         key: 'logout',
         label: 'Logout',
         subtitle: 'Sign out of your account',
         icon: LogOut,
         iconBg: 'bg-rose-500/10',
         iconColor: 'text-rose-500',
         isLogout: true,
      },
   ];

   return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-20 overflow-x-hidden no-scrollbar">
         {/* Header */}
         <header className="px-4 pt-5 pb-3 sticky top-0 bg-slate-50/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 flex items-center gap-3 border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
            <button
               onClick={() => {
                  if (activeSection) setActiveSection(null);
                  else navigate(-1);
               }}
               className="p-2 rounded-xl active:scale-90 transition-all"
            >
               <ArrowLeft size={20} className="text-slate-700 dark:text-white" />
            </button>
            <h1 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
               {activeSection === 'basic' ? 'Basic Info' : activeSection === 'media' ? 'Shop Media' : activeSection === 'history' ? 'Booking History' : activeSection === 'transactions' ? 'Transactions' : 'Account Settings'}
            </h1>
         </header>

         <main className="px-4 mt-3 max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
               {/* ── MENU LIST ── */}
               {!activeSection && (
                  <motion.div
                     key="menu"
                     initial={{ opacity: 0, x: -16 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -16 }}
                     transition={{ duration: 0.18 }}
                     className="space-y-2"
                  >
                     {menuItems.map((item) => (
                        <button
                           key={item.key}
                           onClick={() => {
                              if (item.isToggle) { toggleTheme(); return; }
                              if (item.isLogout) { setShowLogoutConfirm(true); return; }
                              if (item.path) { navigate(item.path); return; }
                              setActiveSection(item.key);
                           }}
                           className="w-full flex items-center gap-3.5 bg-white dark:bg-gray-900 rounded-xl px-4 py-3.5 border border-slate-100 dark:border-gray-800 shadow-sm active:scale-[0.98] transition-all group"
                        >
                           <div className={`w-10 h-10 ${item.iconBg} ${item.iconColor} rounded-xl flex items-center justify-center shrink-0`}>
                              <item.icon size={18} />
                           </div>
                           <div className="flex-1 text-left">
                              <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{item.label}</p>
                              <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500 mt-0.5">{item.subtitle}</p>
                           </div>
                           {item.isToggle ? (
                               <div className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                  <div className={`absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-300 ${isDarkMode ? 'bg-amber-400 left-6' : 'bg-white left-1'}`} />
                               </div>
                            ) : (
                               <ChevronRight size={16} className="text-slate-300 dark:text-gray-600 group-active:translate-x-0.5 transition-transform" />
                            )}
                        </button>
                     ))}
                  </motion.div>
               )}

               {/* ── BASIC INFO SECTION ── */}
               {activeSection === 'basic' && (
                  <motion.section
                     key="basic"
                     initial={{ opacity: 0, x: 24 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 24 }}
                     transition={{ duration: 0.18 }}
                     className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-800 space-y-3"
                  >
                     <div className="flex items-center gap-2.5 mb-1">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                           <Store size={16} />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Basic Info</h2>
                     </div>

                     <form onSubmit={handleUpdateInfo} className="space-y-4">
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Shop Name</label>
                           <input
                              type="text"
                              value={data.shopName}
                              onChange={(e) => setData({ ...data, shopName: e.target.value })}
                              className="w-full py-2 px-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-sm font-bold text-gray-900 dark:text-white shadow-sm transition-all focus:ring-2 focus:ring-primary/10"
                              placeholder="Enter shop name"
                           />
                        </div>

                        <div className="space-y-1.5">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Business Address</label>
                              <button 
                                 type="button"
                                 onClick={handleFetchLocation}
                                 disabled={locationLoading}
                                 className="flex items-center gap-1 text-primary text-[8px] font-black uppercase tracking-widest hover:opacity-70 transition-all disabled:opacity-50"
                              >
                                 {locationLoading ? <Loader2 size={10} className="animate-spin" /> : <MapPin size={10} />}
                                 Auto Fetch
                              </button>
                           </div>
                           <textarea
                              value={data.address}
                              onChange={(e) => setData({ ...data, address: e.target.value })}
                              className="w-full py-2 px-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-sm font-bold text-gray-900 dark:text-white shadow-sm transition-all focus:ring-2 focus:ring-primary/10 min-h-[60px]"
                              placeholder="Street, City, ZIP"
                           />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Open Time</label>
                              <input
                                 type="text"
                                 value={data.workingHours.start}
                                 onChange={(e) => setData({ ...data, workingHours: { ...data.workingHours, start: e.target.value } })}
                                 className="w-full py-2 px-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-sm font-bold text-gray-900 dark:text-white shadow-sm transition-all focus:ring-2 focus:ring-primary/10"
                                 placeholder="09:00 AM"
                              />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Close Time</label>
                              <input
                                 type="text"
                                 value={data.workingHours.end}
                                 onChange={(e) => setData({ ...data, workingHours: { ...data.workingHours, end: e.target.value } })}
                                 className="w-full py-2 px-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-sm font-bold text-gray-900 dark:text-white shadow-sm transition-all focus:ring-2 focus:ring-primary/10"
                                 placeholder="09:00 PM"
                              />
                           </div>
                        </div>

                        <Button type="submit" loading={loading} className="w-full rounded-lg py-3 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95">
                           Save Changes
                        </Button>
                     </form>
                  </motion.section>
               )}

               {/* ── MEDIA SECTION ── */}
               {activeSection === 'media' && (
                  <motion.section
                     key="media"
                     initial={{ opacity: 0, x: 24 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 24 }}
                     transition={{ duration: 0.18 }}
                     className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-800 space-y-5"
                  >
                     <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                           <Camera size={16} />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Shop Media</h2>
                     </div>

                     {/* Current Gallery */}
                     <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Current Gallery</p>
                        <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                           {currentMedia?.galleryImages?.map((img, i) => (
                              <div key={i} className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-gray-800 shadow-sm">
                                 <img src={img} className="w-full h-full object-cover" alt="" />
                              </div>
                           ))}
                           {!currentMedia?.galleryImages?.length && (
                              <p className="text-[9px] italic text-gray-300 px-1 font-bold">No gallery images yet</p>
                           )}
                        </div>
                     </div>

                     {/* Video */}
                     <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Promotional Video</p>
                        {currentMedia?.shopVideo ? (
                           <div className="relative w-full h-24 bg-slate-50 dark:bg-gray-800/50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-gray-800">
                              <Video className="text-gray-300" size={24} />
                              <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-sm"><CheckCircle2 size={10} /></div>
                              <p className="absolute bottom-2 left-3 text-[8px] font-black uppercase text-gray-400 opacity-60">Status: Active</p>
                           </div>
                        ) : (
                           <p className="text-[9px] italic text-gray-300 px-1 font-bold">No promotional video uploaded</p>
                        )}
                     </div>

                     {/* Upload Zone */}
                     <div className="p-4 border-2 border-dashed border-slate-100 dark:border-gray-800 rounded-xl space-y-4 bg-slate-50/30 dark:bg-transparent">
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <div>
                                 <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">Add Images</p>
                                 <p className="text-[8px] text-gray-400 font-bold tracking-tighter uppercase mt-0.5">1:1 or 4:3 ratio</p>
                              </div>
                              <input type="file" id="gallery-input" multiple className="hidden" onChange={(e) => setGalleryFiles([...galleryFiles, ...Array.from(e.target.files)])} />
                              <label htmlFor="gallery-input" className="p-2 bg-white dark:bg-gray-800 rounded-xl cursor-pointer shadow-md border border-slate-200/60 dark:border-gray-800">
                                 <Plus size={16} className="text-gray-400" />
                              </label>
                           </div>

                           {galleryFiles.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                 {galleryFiles.map((f, i) => (
                                    <div key={i} className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[8px] font-black uppercase flex items-center gap-1.5 border border-blue-500/20">
                                       {f.name.slice(0, 12)}
                                       <X size={10} className="cursor-pointer" onClick={() => setGalleryFiles(galleryFiles.filter((_, idx) => idx !== i))} />
                                    </div>
                                 ))}
                              </div>
                           )}

                           <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-gray-800">
                              <div>
                                 <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">Promo Video</p>
                                 <p className="text-[8px] text-gray-400 font-bold tracking-tighter uppercase mt-0.5">MP4 (Max 30s / 50MB)</p>
                              </div>
                              <button 
                                 type="button"
                                 onClick={() => toast('Video feature coming soon!', { icon: '🚧' })}
                                 className="p-2 bg-white dark:bg-gray-800 rounded-xl cursor-not-allowed shadow-md border border-slate-200/60 dark:border-gray-800"
                              >
                                 <Video size={16} className="text-gray-400 opacity-50" />
                              </button>
                           </div>
                        </div>
                     </div>

                     <Button onClick={handleMediaUpload} loading={loading} className="w-full rounded-xl py-3 font-black uppercase tracking-widest text-[10px] bg-slate-900 dark:bg-primary shadow-xl shadow-black/10 active:scale-95 transition-all">
                        Upload & Sync Gallery
                     </Button>
                     <p className="text-[8px] text-center text-gray-400 font-black uppercase tracking-widest opacity-60">
                        Changes reflect instantly on customer side
                     </p>
                  </motion.section>
               )}

               {activeSection === 'history' && (
                  <motion.section
                     key="history"
                     initial={{ opacity: 0, x: 24 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 24 }}
                     transition={{ duration: 0.18 }}
                     className="bg-white dark:bg-gray-900 rounded-xl p-3 sm:p-4 shadow-sm border border-slate-100 dark:border-gray-800 space-y-4"
                  >
                     <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                           <History size={16} />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Booking History</h2>
                     </div>

                     <div className="flex items-center gap-1.5 w-full">
                        <div className="flex-1 min-w-0">
                           <input
                              type="date"
                              value={historyFilters.from}
                              onChange={(e) => setHistoryFilters((prev) => ({ ...prev, from: e.target.value }))}
                              className="w-full py-2 px-1.5 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-[10px] font-bold text-gray-900 dark:text-white shadow-sm transition-all focus:ring-2 focus:ring-primary/10"
                           />
                        </div>
                        <div className="text-slate-300 dark:text-gray-600 font-black text-xs shrink-0">
                           &gt;
                        </div>
                        <div className="flex-1 min-w-0">
                           <input
                              type="date"
                              value={historyFilters.to}
                              onChange={(e) => setHistoryFilters((prev) => ({ ...prev, to: e.target.value }))}
                              className="w-full py-2 px-1.5 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-[10px] font-bold text-gray-900 dark:text-white shadow-sm transition-all focus:ring-2 focus:ring-primary/10"
                           />
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 px-1">
                           Same date in both boxes shows one specific day.
                        </p>
                        <div className="flex items-center gap-2">
                           <select
                              value={historyFilters.status}
                              onChange={(e) => setHistoryFilters((prev) => ({ ...prev, status: e.target.value }))}
                              className="h-9 px-3 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300 outline-none"
                           >
                              <option value="">All</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="confirmed">Confirmed</option>
                           </select>
                           <div className="px-3 h-9 inline-flex items-center rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-300">
                              Total {historyBookings.length}
                           </div>
                        </div>
                     </div>

                     <div className="space-y-2">
                        {historyLoading ? (
                           Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="h-20 rounded-xl bg-slate-50 dark:bg-gray-800 animate-pulse border border-slate-100 dark:border-gray-800" />
                           ))
                        ) : historyBookings.length === 0 ? (
                           <div className="py-10 text-center bg-slate-50/60 dark:bg-gray-800/40 rounded-xl border border-dashed border-slate-200 dark:border-gray-800">
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">No bookings found</p>
                           </div>
                        ) : (
                           historyBookings.map((booking) => (
                              <div
                                 key={booking._id}
                                 className="p-3 bg-slate-50/70 dark:bg-gray-800/40 rounded-xl border border-slate-100 dark:border-gray-800 space-y-2"
                              >
                                 <div className="flex items-center justify-between gap-3">
                                    <div>
                                       <p className="text-[12px] font-black text-slate-800 dark:text-white leading-tight">
                                          {booking.walkInCustomerName || booking.userId?.name || 'Customer'}
                                       </p>
                                       <p className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                                          {booking.services?.map((service) => service.name).join(', ') || 'Service'}
                                       </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                       booking.status === 'completed'
                                          ? 'bg-emerald-50 text-emerald-500 border-emerald-100'
                                          : booking.status === 'cancelled'
                                             ? 'bg-red-50 text-red-500 border-red-100'
                                             : 'bg-blue-50 text-blue-500 border-blue-100'
                                    }`}>
                                       {booking.status}
                                    </span>
                                 </div>

                                 <div className="grid grid-cols-2 gap-2 text-[9px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5">
                                       <Calendar size={11} />
                                       {new Date(booking.startTime).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                       <Clock size={11} />
                                       {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                       <UserRound size={11} />
                                       {booking.staffId?.name || 'Unassigned'}
                                    </div>
                                    <div className="text-right text-[11px] text-slate-800 dark:text-white">
                                       Rs {booking.totalPrice || 0}
                                    </div>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </motion.section>
               )}

               {activeSection === 'transactions' && (
                  <motion.section
                     key="transactions"
                     initial={{ opacity: 0, x: 24 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 24 }}
                     transition={{ duration: 0.18 }}
                     className="bg-white dark:bg-gray-900 rounded-xl p-3 sm:p-4 shadow-sm border border-slate-100 dark:border-gray-800 space-y-4"
                  >
                     <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                           <Wallet size={16} />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Transactions</h2>
                     </div>

                     <div className="flex items-center gap-1.5 w-full">
                        <div className="flex-1 min-w-0">
                           <input
                              type="date"
                              value={transactionFilters.from}
                              onChange={(e) => setTransactionFilters((prev) => ({ ...prev, from: e.target.value }))}
                              className="w-full py-2 px-1.5 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-[10px] font-bold text-gray-900 dark:text-white shadow-sm transition-all focus:ring-2 focus:ring-primary/10"
                           />
                        </div>
                        <div className="text-slate-300 dark:text-gray-600 font-black text-xs shrink-0">
                           &gt;
                        </div>
                        <div className="flex-1 min-w-0">
                           <input
                              type="date"
                              value={transactionFilters.to}
                              onChange={(e) => setTransactionFilters((prev) => ({ ...prev, to: e.target.value }))}
                              className="w-full py-2 px-1.5 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-[10px] font-bold text-gray-900 dark:text-white shadow-sm transition-all focus:ring-2 focus:ring-primary/10"
                           />
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 px-1">
                           Same date in both boxes shows one specific day.
                        </p>
                        <div className="flex items-center gap-2">
                           <select
                              value={transactionFilters.source}
                              onChange={(e) => setTransactionFilters((prev) => ({
                                 ...prev,
                                 source: e.target.value,
                                 staffId: e.target.value === 'staff' ? prev.staffId : ''
                              }))}
                              className="h-9 px-3 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300 outline-none"
                           >
                              <option value="total">Total</option>
                              <option value="partner">Partner</option>
                              {data.serviceMode !== 'home' && <option value="staff">Staff</option>}
                           </select>
                           {data.serviceMode !== 'home' && transactionFilters.source === 'staff' && (
                              <select
                                 value={transactionFilters.staffId}
                                 onChange={(e) => setTransactionFilters((prev) => ({ ...prev, staffId: e.target.value }))}
                                 className="h-9 px-3 max-w-[150px] bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300 outline-none"
                              >
                                 <option value="">All Staff</option>
                                 {staffOptions.map((staff) => (
                                    <option key={staff._id} value={staff._id}>
                                       {staff.name}
                                    </option>
                                 ))}
                              </select>
                           )}
                           <div className="px-3 h-9 inline-flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-300">
                              <span>Qty: {transactions.length}</span>
                              <span className="w-px h-3 bg-slate-200 dark:bg-gray-700" />
                              <span className="text-emerald-500">₹ {transactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString('en-IN')}</span>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-2">
                        {transactionLoading ? (
                           Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="h-20 rounded-xl bg-slate-50 dark:bg-gray-800 animate-pulse border border-slate-100 dark:border-gray-800" />
                           ))
                        ) : transactions.length === 0 ? (
                           <div className="py-10 text-center bg-slate-50/60 dark:bg-gray-800/40 rounded-xl border border-dashed border-slate-200 dark:border-gray-800">
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">No earnings found</p>
                           </div>
                        ) : (
                           transactions.map((transaction) => (
                              <div
                                 key={transaction._id}
                                 className="p-3 bg-slate-50/70 dark:bg-gray-800/40 rounded-xl border border-slate-100 dark:border-gray-800 space-y-2"
                              >
                                 <div className="flex items-center justify-between gap-3">
                                    <div>
                                       <p className="text-[12px] font-black text-slate-800 dark:text-white leading-tight">
                                          {transaction.sourceType === 'staff' ? transaction.sourceLabel : transaction.sourceType === 'partner' ? 'Partner Earning' : 'Shop Earning'}
                                       </p>
                                       <p className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                                          {transaction.description || transaction.reason || 'Booking Revenue'}
                                       </p>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-500 border-emerald-100">
                                       {transaction.sourceType}
                                    </span>
                                 </div>

                                 <div className="grid grid-cols-2 gap-2 text-[9px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5">
                                       <Calendar size={11} />
                                       {new Date(transaction.timestamp).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                       <Clock size={11} />
                                       {new Date(transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                       <UserRound size={11} />
                                       {transaction.sourceLabel || 'System'}
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                                       <IndianRupee size={11} />
                                       {Number(transaction.amount || 0).toLocaleString('en-IN')}
                                    </div>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </motion.section>
               )}
            </AnimatePresence>
         </main>

         <AnimatePresence>
            {showLogoutConfirm && (
               <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => setShowLogoutConfirm(false)}
                     className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                  />
                  <motion.div
                     initial={{ scale: 0.9, opacity: 0, y: 20 }}
                     animate={{ scale: 1, opacity: 1, y: 0 }}
                     exit={{ scale: 0.9, opacity: 0, y: 20 }}
                     className="w-full max-w-[280px] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative z-10 p-5 text-center"
                  >
                     <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <LogOut size={24} />
                     </div>
                     <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">Confirm Logout</h3>
                     <p className="text-[11px] font-medium text-slate-400 dark:text-gray-500 mt-2">
                        Are you sure you want to sign out? You will need to login again.
                     </p>
                     <div className="flex gap-2 mt-6">
                        <button
                           onClick={() => setShowLogoutConfirm(false)}
                           className="flex-1 py-2.5 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 rounded-xl font-bold text-xs"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={() => {
                              logout();
                              navigate('/vendor-login');
                           }}
                           className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-black text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                        >
                           OK
                        </button>
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   );
};

export default VendorProfile;
