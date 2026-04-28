import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Store, Camera, Video, MapPin, Loader2,
    Save, Plus, X, CheckCircle2, ChevronRight, LayoutGrid, Sun, Moon, LogOut,
    History, Calendar, Clock, UserRound, IndianRupee, Wallet, Trash2, AlertTriangle, ShieldCheck, MessageCircle, Heart
 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import api from '../services/api';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { cn } from '../utils/cn';

const VendorProfile = () => {
   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const activeSection = searchParams.get('section'); // null | 'basic' | 'media' etc
   const { isDarkMode, toggleTheme } = useThemeStore();
   const { logout } = useAuthStore();
   const [loading, setLoading] = useState(false);
   const [pickerOpen, setPickerOpen] = useState(null); // null | 'start' | 'end'
   const pickerRef = useRef(null);
   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [deleting, setDeleting] = useState(false);
   const [historyLoading, setHistoryLoading] = useState(false);
   const [historyBookings, setHistoryBookings] = useState([]);
   const [supportNumber, setSupportNumber] = useState('');
   const [historyFilters, setHistoryFilters] = useState({
      from: dayjs().subtract(8, 'day').format('YYYY-MM-DD'),
      to: dayjs().format('YYYY-MM-DD'),
      status: ''
   });
   const [transactionLoading, setTransactionLoading] = useState(false);
   const [transactions, setTransactions] = useState([]);
   const [staffOptions, setStaffOptions] = useState([]);
   const [transactionFilters, setTransactionFilters] = useState({
      from: dayjs().subtract(8, 'day').format('YYYY-MM-DD'),
      to: dayjs().format('YYYY-MM-DD'),
      source: 'total',
      staffId: ''
   });
   // Close picker on outside click
   useEffect(() => {
      const handleClickOutside = (event) => {
         if (pickerRef.current && !pickerRef.current.contains(event.target)) {
            setPickerOpen(null);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   const [data, setData] = useState({
      shopName: '',
      address: '',
      serviceMode: 'shop',
      workingHours: { start: '09:00 AM', end: '09:00 PM' },
      location: null,
      featuredImage: ''
   });
   const [services, setServices] = useState([]);
   const [servicesLoading, setServicesLoading] = useState(false);
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
      const fetchSharedSettings = async () => {
         try {
            const res = await api.get('/settings/shared');
            setSupportNumber(res.data.supportWhatsApp || '');
         } catch (err) {
            console.error('Failed to fetch support number');
         }
      };
      fetchProfile();
      fetchSharedSettings();
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
      if (activeSection !== 'media') return;
      
      const fetchServices = async () => {
         try {
            setServicesLoading(true);
            const res = await api.get('/services/manage/all');
            setServices(res.data || []);
         } catch (err) {
            console.error('Failed to load services');
         } finally {
            setServicesLoading(false);
         }
      };
      fetchServices();
   }, [activeSection]);

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

   const handleSetFeaturedImage = async (url) => {
      try {
         setLoading(true);
         await api.patch('/vendor/update-profile', { featuredImage: url });
         setData(prev => ({ ...prev, featuredImage: url }));
         toast.success('Home page image updated!');
      } catch (err) {
         toast.error('Failed to set featured image');
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
         key: 'customers',
         label: 'Loyal Customers',
         subtitle: 'Track repeat clients & growth',
         icon: Heart,
         iconBg: 'bg-rose-500/10',
         iconColor: 'text-rose-500',
         path: '/vendor/customers',
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
         key: 'security',
         label: 'Security',
         subtitle: 'Account protection & privacy',
         icon: ShieldCheck,
         iconBg: 'bg-indigo-500/10',
         iconColor: 'text-indigo-500',
      },
      {
         key: 'support',
         label: 'Quick Support',
         subtitle: 'Direct help via WhatsApp',
         icon: MessageCircle,
         iconBg: 'bg-emerald-500/10',
         iconColor: 'text-emerald-500',
         isSupport: true,
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

   const handleDeleteAccount = async () => {
      try {
         setDeleting(true);
         await api.delete('/users/profile');
         toast.success('Shop deleted successfully');
         logout();
         navigate('/vendor-login', { replace: true });
      } catch (err) {
         toast.error('Deletion failed');
      } finally {
         setDeleting(false);
      }
   };

   return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-20 overflow-x-hidden no-scrollbar">
         {/* Header */}
         <header className="px-4 pt-5 pb-3 sticky top-0 bg-slate-50/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 flex items-center gap-3 border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
            <button
               onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (activeSection) {
                     setSearchParams({});
                  } else {
                     navigate('/vendor/dashboard');
                  }
               }}
               className="p-2 rounded-xl active:scale-90 transition-all"
            >
               <ArrowLeft size={20} className="text-slate-700 dark:text-white" />
            </button>
            <h1 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
               {activeSection === 'basic' ? 'Basic Info' : activeSection === 'media' ? 'Shop Media' : activeSection === 'history' ? 'Booking History' : activeSection === 'transactions' ? 'Transactions' : activeSection === 'security' ? 'Security' : 'Account Settings'}
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
                              if (item.isDelete) { setShowDeleteConfirm(true); return; }
                              if (item.isSupport) {
                                 if (!supportNumber) return toast.error('Support is temporarily unavailable');
                                 window.open(`https://wa.me/${supportNumber.replace(/\D/g, '')}`, '_blank');
                                 return;
                              }
                              setSearchParams({ section: item.key });
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
                               <div className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-[#1C2C4E]' : 'bg-slate-200'}`}>
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isDarkMode ? 'left-6' : 'left-1'}`} />
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
                        <h2 className="text-[10px] font-black capitalize tracking-widest text-gray-400">Basic Info</h2>
                     </div>

                     <form onSubmit={handleUpdateInfo} className="space-y-4">
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black capitalize text-gray-400 ml-1 tracking-widest">Shop Name</label>
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
                              <label className="text-[9px] font-black capitalize text-gray-400 tracking-widest">Business Address</label>
                              <button 
                                 type="button"
                                 onClick={handleFetchLocation}
                                 disabled={locationLoading}
                                 className="flex items-center gap-1 text-primary text-[8px] font-black capitalize tracking-widest hover:opacity-70 transition-all disabled:opacity-50"
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
                           <div className="space-y-1.5 relative">
                              <label className="text-[9px] font-black capitalize text-gray-400 ml-1 tracking-widest">Open Time</label>
                              <div 
                                 onClick={() => setPickerOpen('start')}
                                 className="relative group cursor-pointer"
                              >
                                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary transition-colors z-10">
                                    <Clock size={12} />
                                 </div>
                                 <div className="w-full py-2 pl-9 pr-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-sm font-bold text-gray-900 dark:text-white shadow-sm transition-all group-hover:border-primary/30">
                                    {data.workingHours.start || '09:00 AM'}
                                 </div>
                              </div>

                              <AnimatePresence>
                                 {pickerOpen === 'start' && (
                                    <TimePickerOverlay 
                                       value={data.workingHours.start} 
                                       onChange={(val) => setData({ ...data, workingHours: { ...data.workingHours, start: val } })}
                                       onClose={() => setPickerOpen(null)}
                                       pickerRef={pickerRef}
                                    />
                                 )}
                              </AnimatePresence>
                           </div>

                           <div className="space-y-1.5 relative">
                              <label className="text-[9px] font-black capitalize text-gray-400 ml-1 tracking-widest">Close Time</label>
                              <div 
                                 onClick={() => setPickerOpen('end')}
                                 className="relative group cursor-pointer"
                              >
                                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary transition-colors z-10">
                                    <Clock size={12} />
                                 </div>
                                 <div className="w-full py-2 pl-9 pr-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-sm font-bold text-gray-900 dark:text-white shadow-sm transition-all group-hover:border-primary/30">
                                    {data.workingHours.end || '09:00 PM'}
                                 </div>
                              </div>

                              <AnimatePresence>
                                 {pickerOpen === 'end' && (
                                    <TimePickerOverlay 
                                       value={data.workingHours.end} 
                                       onChange={(val) => setData({ ...data, workingHours: { ...data.workingHours, end: val } })}
                                       onClose={() => setPickerOpen(null)}
                                       pickerRef={pickerRef}
                                    />
                                 )}
                              </AnimatePresence>
                           </div>
                        </div>

                        <Button type="submit" loading={loading} className="w-full rounded-lg py-3 font-black capitalize tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95">
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
                        <h2 className="text-[10px] font-black capitalize tracking-widest text-gray-400">Shop Media</h2>
                     </div>

                      {/* 🏠 Home Page Featured Image (NEW) */}
                     <div className="space-y-3 p-4 bg-blue-50/40 dark:bg-blue-900/5 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="text-[11px] font-black text-slate-900 dark:text-white capitalize tracking-tight">Home Page Featured Image</p>
                              <p className="text-[8px] text-slate-400 font-bold tracking-tighter capitalize mt-0.5">This image will appear on the discovery list</p>
                           </div>
                           <div className="w-10 h-10 rounded-lg overflow-hidden border border-white dark:border-gray-800 shadow-sm bg-white">
                              {data.featuredImage ? (
                                 <img src={data.featuredImage} className="w-full h-full object-cover" alt="Featured" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-slate-300"><LayoutGrid size={16} /></div>
                              )}
                           </div>
                        </div>

                        <div className="space-y-2">
                           <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 opacity-70">Pick from your photos:</p>
                           <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                              {/* Shop Image Option */}
                              {currentMedia?.shopImage && (
                                 <button 
                                    onClick={() => handleSetFeaturedImage(currentMedia.shopImage)}
                                    className={cn(
                                       "relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all",
                                       data.featuredImage === currentMedia.shopImage ? "border-[#1C2C4E] scale-95" : "border-transparent opacity-60 hover:opacity-100"
                                    )}
                                 >
                                    <img src={currentMedia.shopImage} className="w-full h-full object-cover" alt="Shop" />
                                    {data.featuredImage === currentMedia.shopImage && <div className="absolute inset-0 bg-[#1C2C4E]/20 flex items-center justify-center"><CheckCircle2 size={12} className="text-white" /></div>}
                                 </button>
                              )}
                              {/* Gallery Options */}
                              {currentMedia?.galleryImages?.map((img, i) => (
                                 <button 
                                    key={`gal-${i}`}
                                    onClick={() => handleSetFeaturedImage(img)}
                                    className={cn(
                                       "relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all",
                                       data.featuredImage === img ? "border-[#1C2C4E] scale-95" : "border-transparent opacity-60 hover:opacity-100"
                                    )}
                                 >
                                    <img src={img} className="w-full h-full object-cover" alt={`Gal ${i}`} />
                                    {data.featuredImage === img && <div className="absolute inset-0 bg-[#1C2C4E]/20 flex items-center justify-center"><CheckCircle2 size={12} className="text-white" /></div>}
                                 </button>
                              ))}
                              {/* Service Options */}
                              {services.map((s, i) => (
                                 (s.image || s.images?.[0]) && (
                                    <button 
                                       key={`serv-${i}`}
                                       onClick={() => handleSetFeaturedImage(s.image || s.images?.[0])}
                                       className={cn(
                                          "relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all",
                                          data.featuredImage === (s.image || s.images?.[0]) ? "border-[#1C2C4E] scale-95" : "border-transparent opacity-60 hover:opacity-100"
                                       )}
                                    >
                                       <img src={s.image || s.images?.[0]} className="w-full h-full object-cover" alt={s.name} />
                                       <div className="absolute bottom-0 inset-x-0 bg-black/40 py-0.5 text-[5px] text-white font-black uppercase truncate px-1">{s.name}</div>
                                       {data.featuredImage === (s.image || s.images?.[0]) && <div className="absolute inset-0 bg-[#1C2C4E]/20 flex items-center justify-center"><CheckCircle2 size={12} className="text-white" /></div>}
                                    </button>
                                 )
                              ))}
                           </div>
                        </div>
                     </div>

                     {/* Current Gallery */}
                     <div className="space-y-2">
                        <p className="text-[9px] font-black capitalize text-gray-400 ml-1 tracking-widest">Manage Gallery</p>
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
                        <p className="text-[9px] font-black capitalize text-gray-400 ml-1 tracking-widest">Promotional Video</p>
                        {currentMedia?.shopVideo ? (
                           <div className="relative w-full h-24 bg-slate-50 dark:bg-gray-800/50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-gray-800">
                              <Video className="text-gray-300" size={24} />
                              <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-sm"><CheckCircle2 size={10} /></div>
                              <p className="absolute bottom-2 left-3 text-[8px] font-black capitalize text-gray-400 opacity-60">Status: Active</p>
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
                                 <p className="text-[11px] font-black text-gray-900 dark:text-white capitalize tracking-tight">Add Images</p>
                                 <p className="text-[8px] text-gray-400 font-bold tracking-tighter capitalize mt-0.5">1:1 or 4:3 ratio</p>
                              </div>
                              <input type="file" id="gallery-input" multiple className="hidden" onChange={(e) => setGalleryFiles([...galleryFiles, ...Array.from(e.target.files)])} />
                              <label htmlFor="gallery-input" className="p-2 bg-white dark:bg-gray-800 rounded-xl cursor-pointer shadow-md border border-slate-200/60 dark:border-gray-800">
                                 <Plus size={16} className="text-gray-400" />
                              </label>
                           </div>

                           {galleryFiles.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                 {galleryFiles.map((f, i) => (
                                    <div key={i} className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[8px] font-black capitalize flex items-center gap-1.5 border border-blue-500/20">
                                       {f.name.slice(0, 12)}
                                       <X size={10} className="cursor-pointer" onClick={() => setGalleryFiles(galleryFiles.filter((_, idx) => idx !== i))} />
                                    </div>
                                 ))}
                              </div>
                           )}

                           <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-gray-800">
                              <div>
                                 <p className="text-[11px] font-black text-gray-900 dark:text-white capitalize tracking-tight">Promo Video</p>
                                 <p className="text-[8px] text-gray-400 font-bold tracking-tighter capitalize mt-0.5">MP4 (Max 30s / 50MB)</p>
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

                     <Button onClick={handleMediaUpload} loading={loading} className="w-full rounded-xl py-3 font-black capitalize tracking-widest text-[10px] bg-slate-900 dark:bg-primary shadow-xl shadow-black/10 active:scale-95 transition-all">
                        Upload & Sync Gallery
                     </Button>
                     <p className="text-[8px] text-center text-gray-400 font-black capitalize tracking-widest opacity-60">
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
                        <h2 className="text-[10px] font-black capitalize tracking-widest text-gray-400">Booking History</h2>
                     </div>

                     <div className="flex items-center gap-2 w-full bg-slate-50/50 dark:bg-gray-900 p-1.5 rounded-2xl border border-slate-200/40 dark:border-gray-800 shadow-sm">
                        <div className="flex-1 relative flex items-center gap-2 px-2.5 bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-800">
                           <Calendar size={12} className="text-slate-400" />
                           <input
                              type="date"
                              value={historyFilters.from}
                              onChange={(e) => setHistoryFilters((prev) => ({ ...prev, from: e.target.value }))}
                              className="w-full bg-transparent py-2 text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-white outline-none"
                           />
                        </div>
                        <div className="text-slate-300 dark:text-gray-700 font-black text-xs shrink-0">
                           &gt;
                        </div>
                        <div className="flex-1 relative flex items-center gap-2 px-2.5 bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-800">
                           <Calendar size={12} className="text-slate-400" />
                           <input
                              type="date"
                              value={historyFilters.to}
                              onChange={(e) => setHistoryFilters((prev) => ({ ...prev, to: e.target.value }))}
                              className="w-full bg-transparent py-2 text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-white outline-none"
                           />
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-[8px] font-black capitalize tracking-widest text-gray-400 px-1">
                           Same date in both boxes shows one specific day.
                         </p>
                           <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                           <select
                              value={historyFilters.status}
                              onChange={(e) => setHistoryFilters((prev) => ({ ...prev, status: e.target.value }))}
                              className="flex-1 sm:flex-none h-9 px-3 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-[10px] font-black capitalize tracking-widest text-gray-500 dark:text-gray-300 outline-none"
                           >
                              <option value="">All</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="confirmed">Confirmed</option>
                           </select>
                           <div className="flex-1 sm:flex-none px-3 h-9 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 text-[10px] font-black capitalize tracking-widest text-slate-500 dark:text-gray-300">
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
                              <p className="text-[9px] font-black capitalize tracking-widest text-gray-400">No bookings found</p>
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
                                       <p className="text-[9px] font-bold text-slate-400 dark:text-gray-500 capitalize tracking-widest mt-1">
                                          {booking.services?.map((service) => service.name).join(', ') || 'Service'}
                                       </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[8px] font-black capitalize tracking-widest border ${
                                       booking.status === 'completed'
                                          ? 'bg-emerald-50 text-emerald-500 border-emerald-100'
                                          : booking.status === 'cancelled'
                                             ? 'bg-red-50 text-red-500 border-red-100'
                                             : 'bg-blue-50 text-blue-500 border-blue-100'
                                    }`}>
                                       {booking.status}
                                    </span>
                                 </div>

                                 <div className="grid grid-cols-2 gap-2 text-[9px] font-black text-slate-500 dark:text-gray-400 capitalize tracking-wider">
                                    <div className="flex items-center gap-1.5">
                                       <Calendar size={11} />
                                       {new Date(booking.startTime).toLocaleDateString('en-GB')}
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
                        <h2 className="text-[10px] font-black capitalize tracking-widest text-gray-400">Transactions</h2>
                     </div>

                     <div className="flex items-center gap-2 w-full bg-slate-50/50 dark:bg-gray-900 p-1.5 rounded-2xl border border-slate-200/40 dark:border-gray-800 shadow-sm">
                        <div className="flex-1 relative flex items-center gap-2 px-2.5 bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-800">
                           <Calendar size={12} className="text-slate-400" />
                           <input
                              type="date"
                              value={transactionFilters.from}
                              onChange={(e) => setTransactionFilters((prev) => ({ ...prev, from: e.target.value }))}
                              className="w-full bg-transparent py-2 text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-white outline-none"
                           />
                        </div>
                        <div className="text-slate-300 dark:text-gray-700 font-black text-xs shrink-0">
                           &gt;
                        </div>
                        <div className="flex-1 relative flex items-center gap-2 px-2.5 bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-800">
                           <Calendar size={12} className="text-slate-400" />
                           <input
                              type="date"
                              value={transactionFilters.to}
                              onChange={(e) => setTransactionFilters((prev) => ({ ...prev, to: e.target.value }))}
                              className="w-full bg-transparent py-2 text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-white outline-none"
                           />
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-[8px] font-black capitalize tracking-widest text-gray-400 px-1">
                           Same date in both boxes shows one specific day.
                         </p>
                           <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                           <select
                              value={transactionFilters.source}
                              onChange={(e) => setTransactionFilters((prev) => ({
                                 ...prev,
                                 source: e.target.value,
                                 staffId: e.target.value === 'staff' ? prev.staffId : ''
                              }))}
                              className="flex-1 sm:flex-none h-9 px-3 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-[10px] font-black capitalize tracking-widest text-gray-500 dark:text-gray-300 outline-none"
                           >
                              <option value="total">Total</option>
                              <option value="partner">Partner</option>
                              {data.serviceMode !== 'home' && <option value="staff">Staff</option>}
                           </select>
                           {data.serviceMode !== 'home' && transactionFilters.source === 'staff' && (
                              <select
                                 value={transactionFilters.staffId}
                                 onChange={(e) => setTransactionFilters((prev) => ({ ...prev, staffId: e.target.value }))}
                                 className="flex-1 sm:flex-none h-9 px-3 max-w-[150px] bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-lg text-[10px] font-black capitalize tracking-widest text-gray-500 dark:text-gray-300 outline-none"
                              >
                                 <option value="">All Staff</option>
                                 {staffOptions.map((staff) => (
                                    <option key={staff._id} value={staff._id}>
                                       {staff.name}
                                    </option>
                                 ))}
                              </select>
                           )}
                           <div className="flex-1 sm:flex-none px-2 h-9 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 text-[10px] font-black capitalize text-slate-500 dark:text-gray-300 shadow-sm">
                              <div className="flex flex-col items-center leading-none px-0.5">
                                  <span className="text-[6.5px] opacity-40">Qty</span>
                                  <span>{transactions.length}</span>
                               </div>
                              <span className="w-px h-3 bg-slate-200 dark:bg-gray-700" />
                              <span className="text-emerald-500 text-[10px] tracking-tight whitespace-nowrap">₹ {transactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString('en-IN')}</span>
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
                              <p className="text-[9px] font-black capitalize tracking-widest text-gray-400">No earnings found</p>
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
                                       <p className="text-[9px] font-bold text-slate-400 dark:text-gray-500 capitalize tracking-widest mt-1">
                                          {transaction.description || transaction.reason || 'Booking Revenue'}
                                       </p>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-[8px] font-black capitalize tracking-widest border bg-emerald-50 text-emerald-500 border-emerald-100">
                                       {transaction.sourceType}
                                    </span>
                                 </div>

                                 <div className="grid grid-cols-2 gap-2 text-[9px] font-black text-slate-500 dark:text-gray-400 capitalize tracking-wider">
                                    <div className="flex items-center gap-1.5">
                                       <Calendar size={11} />
                                       {new Date(transaction.timestamp).toLocaleDateString('en-GB')}
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
               {activeSection === 'security' && (
                  <motion.section
                     key="security"
                     initial={{ opacity: 0, x: 24 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 24 }}
                     transition={{ duration: 0.18 }}
                     className="space-y-4"
                  >
                     <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-800 space-y-4">
                        <div className="flex items-center gap-2.5">
                           <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                              <ShieldCheck size={16} />
                           </div>
                           <h2 className="text-[10px] font-black capitalize tracking-widest text-gray-400">Security Settings</h2>
                        </div>

                        <div className="space-y-3">
                           <p className="text-[11px] font-bold text-slate-500 dark:text-gray-400 px-1">
                              Manage your account security and data privacy.
                           </p>
                           
                           <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="w-full flex items-center gap-3.5 bg-rose-50 dark:bg-rose-900/10 rounded-xl px-4 py-3.5 border border-rose-100 dark:border-rose-900/20 active:scale-[0.98] transition-all group"
                           >
                              <div className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center shrink-0">
                                 <Trash2 size={18} />
                              </div>
                              <div className="flex-1 text-left">
                                 <p className="text-sm font-black text-rose-600 dark:text-rose-400 leading-tight">Delete Account</p>
                                 <p className="text-[10px] font-medium text-rose-400/70 mt-0.5">Permanently remove shop data</p>
                              </div>
                              <ChevronRight size={16} className="text-rose-300 group-active:translate-x-0.5 transition-transform" />
                           </button>
                        </div>
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
                              navigate('/vendor-login', { replace: true });
                           }}
                           className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-black text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                        >
                           OK
                        </button>
                     </div>
                  </motion.div>
               </div>
            )}

            {showDeleteConfirm && (
               <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => !deleting && setShowDeleteConfirm(false)}
                     className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                  />
                  <motion.div
                     initial={{ scale: 0.9, opacity: 0, y: 20 }}
                     animate={{ scale: 1, opacity: 1, y: 0 }}
                     exit={{ scale: 0.9, opacity: 0, y: 20 }}
                     className="w-full max-w-[280px] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative z-10 p-5 text-center"
                  >
                     <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                     </div>
                     <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">Delete Shop?</h3>
                     <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500 mt-2 capitalize tracking-widest">
                        This will permanently remove your shop, staff, and earnings history. This cannot be undone.
                     </p>
                     <div className="flex gap-2 mt-6">
                        <button
                           disabled={deleting}
                           onClick={() => setShowDeleteConfirm(false)}
                           className="flex-1 py-2.5 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 rounded-xl font-bold text-xs disabled:opacity-50"
                        >
                           Cancel
                        </button>
                        <button
                           disabled={deleting}
                           onClick={handleDeleteAccount}
                           className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-black text-xs shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center"
                        >
                           {deleting ? 'Wait...' : 'Confirm'}
                        </button>
                     </div>
                  </motion.div>
               </div>
            )}
            {showDeleteConfirm && (
               <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => !deleting && setShowDeleteConfirm(false)}
                     className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                  />
                  <motion.div
                     initial={{ scale: 0.9, opacity: 0, y: 20 }}
                     animate={{ scale: 1, opacity: 1, y: 0 }}
                     exit={{ scale: 0.9, opacity: 0, y: 20 }}
                     className="w-full max-w-[280px] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative z-10 p-5 text-center"
                  >
                     <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                     </div>
                     <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">Delete Shop?</h3>
                     <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500 mt-2 capitalize tracking-widest leading-relaxed px-2">
                        This will permanently remove your shop, staff, and earnings history. This action cannot be undone.
                     </p>
                     <div className="flex gap-2 mt-6">
                        <button
                           disabled={deleting}
                           onClick={() => setShowDeleteConfirm(false)}
                           className="flex-1 py-3 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 rounded-xl font-bold text-xs disabled:opacity-50"
                        >
                           Cancel
                        </button>
                        <button
                           disabled={deleting}
                           onClick={handleDeleteAccount}
                           className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-xs shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center"
                        >
                           {deleting ? 'Wait...' : 'Confirm'}
                        </button>
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   );
};


// ── CUSTOM TIME PICKER OVERLAY ──
const TimePickerOverlay = ({ value, onChange, onClose, pickerRef }) => {
   const time = dayjs(`2000-01-01 ${value || '09:00 AM'}`, 'YYYY-MM-DD hh:mm A');
   const [h, setH] = useState(time.format('hh'));
   const [m, setM] = useState(time.format('mm'));
   const [p, setP] = useState(time.format('A'));

   const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
   const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

   const handleConfirm = () => {
      onChange(`${h}:${m} ${p}`);
      onClose();
   };

   return (
      <motion.div 
         ref={pickerRef}
         initial={{ opacity: 0, y: 10, scale: 0.95 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, y: 10, scale: 0.95 }}
         className="absolute bottom-full mb-3 left-0 right-0 sm:left-auto sm:w-64 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl shadow-2xl z-[100] overflow-hidden"
      >
         <div className="p-3 border-b border-slate-50 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-gray-950/50">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select Time</span>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
         </div>

         <div className="p-4 grid grid-cols-3 gap-2">
            {/* Hours */}
            <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar py-2">
               {hours.map(hour => (
                  <button 
                     key={hour}
                     onClick={() => setH(hour)}
                     className={cn(
                        "w-full py-2 rounded-lg text-xs font-black transition-all",
                        h === hour ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800"
                     )}
                  >
                     {hour}
                  </button>
               ))}
            </div>

            {/* Minutes */}
            <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar py-2 border-x border-slate-50 dark:border-gray-800">
               {minutes.map(min => (
                  <button 
                     key={min}
                     onClick={() => setM(min)}
                     className={cn(
                        "w-full py-2 rounded-lg text-xs font-black transition-all",
                        m === min ? "bg-[#1C2C4E] text-white shadow-lg shadow-[#1C2C4E]/20 scale-105" : "text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800"
                     )}
                  >
                     {min}
                  </button>
               ))}
            </div>

            {/* AM/PM */}
            <div className="flex flex-col gap-2 justify-center">
               {['AM', 'PM'].map(period => (
                  <button 
                     key={period}
                     onClick={() => setP(period)}
                     className={cn(
                        "w-full py-4 rounded-xl text-[10px] font-black transition-all",
                        p === period ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105" : "text-gray-400 bg-slate-50 dark:bg-gray-800"
                     )}
                  >
                     {period}
                  </button>
               ))}
            </div>
         </div>

         <div className="p-3 bg-slate-50 dark:bg-gray-950 flex gap-2">
            <button 
               onClick={handleConfirm}
               className="flex-1 py-2.5 bg-slate-900 dark:bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
            >
               Set Time
            </button>
         </div>
      </motion.div>
   );
};

export default VendorProfile;
