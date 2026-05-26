import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Store, Camera, Video, MapPin, Loader2,
    Save, Plus, X, CheckCircle2, XCircle, ChevronRight, LayoutGrid, Sun, Moon, LogOut,
    History, Calendar, Clock, UserRound, IndianRupee, Wallet, Trash2, AlertTriangle, ShieldCheck, MessageCircle, Heart, Zap, Crown, TrendingUp, FileDown, Info, Star, Smartphone
 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
   const { isDarkMode, themeMode, setThemeMode } = useThemeStore();
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
   const [promotionPlans, setPromotionPlans] = useState([]);
   const [myPromotions, setMyPromotions] = useState([]);
   const [promotionLoading, setPromotionLoading] = useState(false);
   const [promoDays, setPromoDays] = useState(30);
   const [promoPricePerDay, setPromoPricePerDay] = useState(10);
   const [globalFeatures, setGlobalFeatures] = useState({ membershipActive: true, subscriptionActive: true });

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
             setPromoPricePerDay(res.data.promotionPricePerDay || 10);
             if (res.data.features) setGlobalFeatures(res.data.features);
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

   const fetchPlans = async () => {
      try {
         setPromotionLoading(true);
         const [plansRes, myPromosRes] = await Promise.all([
            api.get('/promotions/vendor/plans'),
            api.get('/promotions/vendor/my-promotions')
         ]);
         setPromotionPlans(plansRes.data || []);
         setMyPromotions(myPromosRes.data || []);
      } catch (err) {
         console.error('Failed to load promotion data');
      } finally {
         setPromotionLoading(false);
      }
   };

   useEffect(() => {
      if (activeSection !== 'promotions') return;
      fetchPlans();
   }, [activeSection]);

   const handleUpdateInfo = async (e) => {
      e.preventDefault();
      
      // 🛑 Validation: Opening and Closing time cannot be same
      if (data.workingHours.start === data.workingHours.end) {
         return toast.error('Opening and Closing time cannot be the same', {
            icon: '⏰',
            id: 'time-validation'
         });
      }

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

   const handleDeleteGalleryImage = async (url) => {
      if (!window.confirm('Delete this image from gallery?')) return;
      try {
         setLoading(true);
         const res = await api.post('/vendor/gallery/delete', { imageUrl: url });
         setCurrentMedia(res.data);
         toast.success('Image removed');
      } catch (err) {
         toast.error('Failed to delete image');
      } finally {
         setLoading(false);
      }
   };

   const handleUpdateSingleMedia = async (field, file) => {
      try {
         setLoading(true);
         const formData = new FormData();
         formData.append('media', file);
         formData.append('field', field);
         const res = await api.post('/vendor/media/single', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
         });
         setCurrentMedia(res.data);
         toast.success('Image updated!');
      } catch (err) {
         toast.error('Update failed');
      } finally {
         setLoading(false);
      }
   };

   const handleReplaceGalleryImage = async (oldUrl, file) => {
      try {
         setLoading(true);
         const formData = new FormData();
         formData.append('media', file);
         formData.append('oldUrl', oldUrl);
         const res = await api.post('/vendor/gallery/replace', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
         });
         setCurrentMedia(res.data);
         toast.success('Image replaced!');
      } catch (err) {
         toast.error('Replacement failed');
      } finally {
         setLoading(false);
      }
   };

   const handleDeleteVideo = async () => {
      if (!window.confirm('Remove promotional video?')) return;
      try {
         setLoading(true);
         const res = await api.delete('/vendor/video/delete');
         setCurrentMedia(res.data);
         toast.success('Video removed');
      } catch (err) {
         toast.error('Failed to remove video');
      } finally {
         setLoading(false);
      }
   };

   const handlePurchasePromotion = async () => {
      if (!promoDays || promoDays < 1) return toast.error('Minimum 1 day required');
      
      try {
         setLoading(true);
         
         // 1. Create order on backend
         const { data: orderData } = await api.post('/promotions/vendor/create-order', { days: promoDays });
         
         const options = {
            key: orderData.key_id,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "ZeroOne Promotion",
            description: `Boost Profile Visibility for ${promoDays} days`,
            order_id: orderData.orderId,
            handler: async (response) => {
               try {
                  setLoading(true);
                  // 2. Verify payment on backend
                  await api.post('/promotions/vendor/verify-payment', {
                     razorpay_order_id: response.razorpay_order_id,
                     razorpay_payment_id: response.razorpay_payment_id,
                     razorpay_signature: response.razorpay_signature,
                     days: promoDays,
                     amountPaid: orderData.totalAmount
                  });
                  
                  toast.success('Payment successful! Promotion request sent.');
                  fetchPlans(); // Refresh status immediately
               } catch (err) {
                  toast.error(err.response?.data?.message || 'Verification failed');
               } finally {
                  setLoading(false);
               }
            },
            prefill: {
               name: data.shopName || useAuthStore.getState().user?.ownerName,
               contact: useAuthStore.getState().user?.phone,
               email: useAuthStore.getState().user?.email
            },
            theme: {
               color: "#2D2F6F",
            },
         };

         const rzp = new window.Razorpay(options);
         rzp.on('payment.failed', (response) => {
            toast.error('Payment failed: ' + response.error.description);
         });
         rzp.open();

      } catch (err) {
         toast.error(err.response?.data?.message || 'Failed to initialize payment');
      } finally {
         setLoading(false);
      }
   };

   const menuItems = [
      {
         key: 'shop_details',
         label: 'Partner Management',
         subtitle: 'Manage info, media, services & reports',
         icon: Store,
         iconBg: 'bg-blue-500/10',
         iconColor: 'text-blue-500',
      },
      {
         key: 'history',
         label: 'Booking History',
         subtitle: 'Partner booking history & date filter',
         icon: History,
         iconBg: 'bg-amber-500/10',
         iconColor: 'text-amber-500',
      },
      {
         key: 'transactions',
         label: 'Transaction History',
         subtitle: 'Partner earning history & filters',
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
         key: 'promotions',
         label: 'Promotions',
         subtitle: 'Boost visibility & reach clients',
         icon: TrendingUp,
         iconBg: 'bg-indigo-500/10',
         iconColor: 'text-indigo-500',
      },
      {
         key: 'theme',
         label: 'Appearance',
         subtitle: themeMode === 'system' ? 'Following system default' : isDarkMode ? 'Dark mode on' : 'Light mode on',
         icon: themeMode === 'system' ? Smartphone : isDarkMode ? Moon : Sun,
         iconBg: themeMode === 'system' ? 'bg-blue-500/10' : isDarkMode ? 'bg-slate-500/10' : 'bg-amber-500/10',
         iconColor: themeMode === 'system' ? 'text-blue-500' : isDarkMode ? 'text-slate-500' : 'text-amber-500',
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

   const [reportRange, setReportRange] = useState({
      from: dayjs().startOf('month').format('YYYY-MM-DD'),
      to: dayjs().format('YYYY-MM-DD')
   });
   const [downloadingReport, setDownloadingReport] = useState(false);

   const handleDownloadReport = async () => {
      try {
         setDownloadingReport(true);
         const { data } = await api.get(`/vendor/live-report?from=${reportRange.from}&to=${reportRange.to}`);
         
         const doc = new jsPDF();
         
         // Header
         doc.setFontSize(22);
         doc.setTextColor(0, 36, 107); // #00246b
         doc.text('Performance Report', 105, 20, { align: 'center' });
         
         doc.setFontSize(14);
         doc.setTextColor(50, 50, 50);
         doc.text(data.shopName || 'Shop Report', 105, 30, { align: 'center' });
         
         doc.setFontSize(10);
         doc.setTextColor(100, 100, 100);
         doc.text(`Period: ${dayjs(reportRange.from).format('DD/MM/YYYY')} to ${dayjs(reportRange.to).format('DD/MM/YYYY')}`, 105, 38, { align: 'center' });

         // Table
         const tableData = data.data.map(item => [
            item.staffName,
            item.attendance,
            item.totalBookings,
            item.cancelledByStaff,
            `Rs.${item.totalEarning}`
         ]);

         autoTable(doc, {
            startY: 50,
            head: [['Staff Name', 'Attendance (Days)', 'Total Bookings', 'Cancelled By Staff', 'Total Earnings']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [0, 36, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 },
            alternateRowStyles: { fillColor: [245, 247, 250] }
         });

         // Summary
         const finalY = doc.lastAutoTable.finalY + 15;
         const totalEarning = data.data.reduce((sum, item) => sum + item.totalEarning, 0);
         const totalBookings = data.data.reduce((sum, item) => sum + item.totalBookings, 0);

         doc.setFontSize(12);
         doc.setTextColor(0, 36, 107);
         doc.text('Report Summary', 14, finalY);
         
         doc.setFontSize(10);
         doc.setTextColor(50, 50, 50);
         doc.text(`Total Shop Bookings: ${totalBookings}`, 14, finalY + 8);
         doc.text(`Total Shop Earnings: Rs.${totalEarning}`, 14, finalY + 16);

         // Footer
         const pageCount = doc.internal.getNumberOfPages();
         for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Generated on ${dayjs().format('MMM DD, YYYY HH:mm')} | Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
         }

         doc.save(`Report_${data.shopName || 'Shop'}_${reportRange.from}.pdf`);
         toast.success('Report downloaded successfully! 📄');
      } catch (error) {
         console.error(error);
         toast.error('Failed to generate report');
      } finally {
         setDownloadingReport(false);
      }
   };

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
         <header className="px-4 pt-5 pb-3 sticky top-0 bg-slate-50/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
               <button
                  onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     if (activeSection === 'basic' || activeSection === 'media' || activeSection === 'live_report') {
                        setSearchParams({ section: 'shop_details' });
                     } else if (activeSection === 'promotions') {
                        setSearchParams({});
                     } else if (activeSection) {
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
                  {activeSection === 'shop_details' ? 'Partner Management' : activeSection === 'basic' ? 'Basic Info' : activeSection === 'media' ? 'Partner Media' : activeSection === 'promotions' ? 'Boost Visibility' : activeSection === 'history' ? 'Booking History' : activeSection === 'transactions' ? 'Transaction History' : activeSection === 'security' ? 'Security' : activeSection === 'theme' ? 'Appearance' : 'Account Settings'}
               </h1>
            </div>
         </header>

         <main className="px-4 mt-3 max-w-4xl mx-auto">
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
                           <ChevronRight size={16} className="text-slate-300 dark:text-gray-600 group-active:translate-x-0.5 transition-transform" />
                        </button>
                     ))}
                  </motion.div>
               )}

               {/* ── THEME SECTION ── */}
               {activeSection === 'theme' && (
                  <motion.section
                     key="theme"
                     initial={{ opacity: 0, x: 24 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 24 }}
                     transition={{ duration: 0.18 }}
                     className="space-y-4"
                  >
                     <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-3.5 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-gray-800">
                           <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center border border-orange-100/50">
                              {isDarkMode ? <Moon size={18} className="text-orange-500" /> : <Sun size={18} className="text-orange-500" />}
                           </div>
                           <div className="space-y-0.5 text-left">
                              <h3 className="text-[13px] font-black text-slate-800 dark:text-white tracking-tight leading-none">Dark mode</h3>
                              <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500 leading-tight">
                                 {themeMode === 'system' ? "We'll adjust based on your device's system settings" : themeMode === 'dark' ? 'Sleek energy efficient theme' : 'Classic light appearance'}
                              </p>
                           </div>
                        </div>

                        {/* Options */}
                        {[
                           { mode: 'dark', label: 'On', icon: Moon },
                           { mode: 'light', label: 'Off', icon: Sun },
                           { mode: 'system', label: 'System default', icon: Smartphone },
                        ].map(({ mode, label, icon: Icon }, index, arr) => {
                           const isSelected = themeMode === mode;
                           return (
                              <button
                                 key={mode}
                                 onClick={() => setThemeMode(mode)}
                                 className={`w-full flex items-center justify-between px-5 py-4 text-left transition-all active:scale-[0.98] ${
                                    index < arr.length - 1 ? 'border-b border-slate-100 dark:border-gray-800' : ''
                                 } ${isSelected ? 'bg-slate-50 dark:bg-gray-800/60' : 'hover:bg-slate-50/60 dark:hover:bg-gray-800/30'}`}
                              >
                                 <div className="flex items-center gap-3">
                                    <Icon size={15} strokeWidth={2.5} className={isSelected ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-gray-500'} />
                                    <span className={`text-[13px] font-black tracking-tight ${isSelected ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-gray-400'}`}>
                                       {label}
                                    </span>
                                 </div>
                                 {/* Animated radio */}
                                 <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected ? 'border-slate-800 dark:border-primary' : 'border-slate-300 dark:border-gray-600'
                                 }`}>
                                    {isSelected && (
                                       <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          className="w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-primary"
                                       />
                                    )}
                                 </div>
                              </button>
                           );
                        })}
                     </div>
                  </motion.section>
               )}

               {/* ── SHOP DETAILS SUBMENU ── */}
               {activeSection === 'shop_details' && (
                  <motion.div
                     key="shop_details_menu"
                     initial={{ opacity: 0, x: 24 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 24 }}
                     transition={{ duration: 0.18 }}
                     className="space-y-3"
                  >
                     {[
                        { label: 'Basic Info', subtitle: 'Name, address & timing', icon: Store, key: 'basic', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { label: 'Shop Media', subtitle: 'Gallery & featured images', icon: Camera, key: 'media', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                        { label: 'Services', subtitle: 'Manage listings & pricing', icon: LayoutGrid, path: '/vendor/services', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { label: 'Membership Plan', subtitle: 'Loyalty plans for clients', icon: Crown, path: '/vendor/memberships', color: 'text-primary', bg: 'bg-primary/10', key: 'memberships' },
                        { label: 'Reviews & Ratings', subtitle: 'View client feedback & stars', icon: Star, path: '/vendor/reviews', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                        { label: 'Live Report', subtitle: 'Performance PDF report', icon: FileDown, key: 'live_report', color: 'text-blue-500', bg: 'bg-blue-500/10' }
                     ].filter(item => {
                        if (item.key === 'memberships') return globalFeatures.membershipActive;
                        return true;
                     }).map((item) => (
                        <button
                           key={item.key || item.path}
                           onClick={() => item.path ? navigate(item.path) : setSearchParams({ section: item.key })}
                           className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm active:scale-[0.98] transition-all group"
                        >
                           <div className="flex items-center gap-4">
                              <div className={`p-3 ${item.bg} ${item.color} rounded-xl`}>
                                 <item.icon size={20} />
                              </div>
                              <div className="text-left">
                                 <h3 className="text-sm font-black text-slate-800 dark:text-white leading-none">{item.label}</h3>
                                 <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{item.subtitle}</p>
                              </div>
                           </div>
                           <ChevronRight size={18} className="text-slate-300 group-active:translate-x-1 transition-transform" />
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
                                 className="flex items-center gap-1 text-primary dark:text-gray-400 text-[8px] font-black capitalize tracking-widest hover:opacity-70 transition-all disabled:opacity-50"
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
                                 <div className={cn(
                                    "w-full py-2 pl-9 pr-4 bg-white dark:bg-gray-800 border rounded-lg text-sm font-bold text-gray-900 dark:text-white shadow-sm transition-all group-hover:border-primary/30",
                                    data.workingHours.start === data.workingHours.end ? "border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.1)]" : "border-slate-200/60 dark:border-gray-800"
                                 )}>
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
                                 <div className={cn(
                                    "w-full py-2 pl-9 pr-4 bg-white dark:bg-gray-800 border rounded-lg text-sm font-bold text-gray-900 dark:text-white shadow-sm transition-all group-hover:border-primary/30",
                                    data.workingHours.start === data.workingHours.end ? "border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.1)]" : "border-slate-200/60 dark:border-gray-800"
                                 )}>
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

                        <Button 
                           type="submit" 
                           loading={loading} 
                           disabled={data.workingHours.start === data.workingHours.end}
                           className={cn(
                              "w-full rounded-lg py-3 font-black capitalize tracking-widest text-[10px] shadow-lg transition-all active:scale-95",
                              data.workingHours.start === data.workingHours.end 
                                 ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                                 : "shadow-primary/20"
                           )}
                        >
                           {data.workingHours.start === data.workingHours.end ? 'Invalid Time Range' : 'Save Changes'}
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
                                 <div className="relative w-16 h-16 shrink-0 group/shop">
                                    <button 
                                       onClick={() => handleSetFeaturedImage(currentMedia.shopImage)}
                                       className={cn(
                                          "relative w-full h-full rounded-xl overflow-hidden border-2 transition-all",
                                          data.featuredImage === currentMedia.shopImage ? "border-[#1C2C4E] scale-95" : "border-transparent opacity-60 hover:opacity-100"
                                       )}
                                    >
                                       <img src={currentMedia.shopImage} className="w-full h-full object-cover" alt="Shop" />
                                       {data.featuredImage === currentMedia.shopImage && <div className="absolute inset-0 bg-[#1C2C4E]/20 flex items-center justify-center"><CheckCircle2 size={12} className="text-white" /></div>}
                                    </button>
                                    <input 
                                       type="file" 
                                       id="update-shop-image" 
                                       className="hidden" 
                                       accept="image/*"
                                       onChange={(e) => e.target.files[0] && handleUpdateSingleMedia('shopImage', e.target.files[0])} 
                                    />
                                    <label 
                                       htmlFor="update-shop-image"
                                       className="absolute -bottom-1 -right-1 p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-slate-100 dark:border-gray-700 cursor-pointer text-slate-400 hover:text-primary transition-all active:scale-90"
                                    >
                                       <Camera size={10} />
                                    </label>
                                 </div>
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
                              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-gray-800 shadow-sm group/img">
                                 <img src={img} className="w-full h-full object-cover" alt="" />
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center gap-2">
                                    <input 
                                       type="file" 
                                       id={`replace-img-${i}`} 
                                       className="hidden" 
                                       accept="image/*"
                                       onChange={(e) => e.target.files[0] && handleReplaceGalleryImage(img, e.target.files[0])} 
                                    />
                                    <label 
                                       htmlFor={`replace-img-${i}`}
                                       className="p-1.5 bg-white text-slate-600 rounded-lg shadow-lg cursor-pointer hover:text-primary transition-all active:scale-90"
                                    >
                                       <Camera size={12} />
                                    </label>
                                    <button 
                                       onClick={() => handleDeleteGalleryImage(img)}
                                       className="p-1.5 bg-rose-500 text-white rounded-lg shadow-lg hover:bg-rose-600 transition-all active:scale-90"
                                    >
                                       <Trash2 size={12} />
                                    </button>
                                 </div>
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
                           <div className="relative w-full h-24 bg-slate-50 dark:bg-gray-800/50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-gray-800 group/vid">
                              <Video className="text-gray-300" size={24} />
                              <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-sm"><CheckCircle2 size={10} /></div>
                              <button 
                                 onClick={handleDeleteVideo}
                                 className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover/vid:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]"
                              >
                                 <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                    <Trash2 size={16} />
                                 </div>
                              </button>
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
                              max={dayjs().format('YYYY-MM-DD')}
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
                              max={dayjs().format('YYYY-MM-DD')}
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
                              max={dayjs().format('YYYY-MM-DD')}
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
                              max={dayjs().format('YYYY-MM-DD')}
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

               {activeSection === 'promotions' && (
                  <motion.section
                     key="promotions"
                     initial={{ opacity: 0, x: 24 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 24 }}
                     transition={{ duration: 0.18 }}
                     className="space-y-4"
                  >
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-800 space-y-4">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                               <Zap size={18} strokeWidth={3} />
                            </div>
                            <div>
                               <h2 className="text-[14px] font-black text-slate-900 dark:text-white capitalize leading-none">Profile Promotion</h2>
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Enhance visibility in search results</p>
                            </div>
                        </div>

                        {promotionLoading ? (
                           <div className="flex flex-col items-center justify-center py-12 gap-3">
                              <Loader2 className="animate-spin text-primary" size={32} />
                              <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Fetching plans...</p>
                           </div>
                        ) : (
                           <div className="space-y-6">
                              {/* Active/Pending Promotions */}
                              {myPromotions.length > 0 && (
                                 <div className="space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Your Promotions</p>
                                    {myPromotions.filter(p => p.durationDays).map(promo => (
                                       <div 
                                          key={promo._id}
                                          className={cn(
                                             "p-4 rounded-2xl border flex items-center justify-between transition-all",
                                             promo.status === 'active' 
                                                ? "bg-emerald-500/5 border-emerald-500/20 shadow-sm shadow-emerald-500/10" 
                                                : promo.status === 'rejected'
                                                   ? "bg-red-500/5 border-red-500/20"
                                                   : "bg-amber-500/5 border-amber-500/20"
                                          )}
                                       >
                                          <div className="space-y-1">
                                             <div className="flex items-center gap-2">
                                                <h3 className="text-[13px] font-black text-slate-800 dark:text-white capitalize">{promo.planId?.name || 'Profile Boost'}</h3>
                                                <span className={cn(
                                                   "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest",
                                                   promo.status === 'active' ? "bg-emerald-500 text-white" : 
                                                   promo.status === 'rejected' ? "bg-red-500 text-white" : "bg-amber-500 text-white"
                                                )}>
                                                   {promo.status === 'active' ? 'Activated' : 
                                                    promo.status === 'rejected' ? 'Rejected' : 'Pending'}
                                                </span>
                                             </div>
                                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{promo.durationDays} Days Duration</p>
                                             
                                             {promo.status === 'active' ? (
                                                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                   <CheckCircle2 size={10} />
                                                   Your profile is now featured at the top in app
                                                </p>
                                             ) : promo.status === 'rejected' ? (
                                                <div className="space-y-1">
                                                   <p className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                                                      <XCircle size={10} />
                                                      Rejected • Amount Refunded to Wallet
                                                   </p>
                                                   {promo.rejectionReason && (
                                                      <p className="text-[9px] font-medium text-red-500/70 italic">
                                                         Reason: {promo.rejectionReason}
                                                      </p>
                                                   )}
                                                </div>
                                             ) : (
                                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                   <Clock size={10} />
                                                   Payment Done • Waiting for Admin Approval
                                                </p>
                                             )}
                                             
                                             {promo.status === 'active' && promo.endDate && (
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                   Expires: {new Date(promo.endDate).toLocaleDateString('en-GB')}
                                                </p>
                                             )}
                                          </div>
                                          <div className="text-right">
                                             <p className="text-[14px] font-black text-slate-800 dark:text-white">₹{promo.amountPaid}</p>
                                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">
                                                {promo.status === 'rejected' ? 'Refunded' : 'Order Verified'}
                                             </p>
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                               )}

                               {/* Custom Duration Selection */}
                               <div className="space-y-4">
                                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/5 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/10">
                                     <div className="flex items-center justify-between mb-3">
                                        <div>
                                           <h3 className="text-[13px] font-black text-slate-800 dark:text-white capitalize">Select Duration</h3>
                                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Rate: ₹{promoPricePerDay}/day</p>
                                        </div>
                                     </div>

                                     <div className="space-y-3">
                                        <div className="space-y-1">
                                           <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Boost Days</label>
                                           <div className="relative">
                                               <input 
                                                  type="text"
                                                  inputMode="numeric"
                                                  value={promoDays}
                                                  onChange={(e) => {
                                                     let val = e.target.value.replace(/[^0-9]/g, '');
                                                     if (val.length > 1 && val.startsWith('0')) {
                                                        val = val.replace(/^0+/, '');
                                                     }
                                                     setPromoDays(val === '' ? 0 : Number(val));
                                                  }}
                                                  className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border border-indigo-50 dark:border-gray-800 font-black text-md text-slate-800 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                               />
                                               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase tracking-widest">Days</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-xl border border-white/40 dark:border-gray-700/40">
                                           <div>
                                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Pay</p>
                                              <p className="text-xl font-black text-primary dark:text-white">₹{promoDays * promoPricePerDay}</p>
                                           </div>
                                           <button 
                                              onClick={handlePurchasePromotion}
                                              disabled={loading || myPromotions.some(p => p.status === 'active' || p.status === 'pending')}
                                              className="px-6 py-3 bg-primary text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-400 disabled:shadow-none"
                                           >
                                              {loading ? 'Wait...' : myPromotions.some(p => p.status === 'active' || p.status === 'pending') ? 'Active' : 'Pay Now'}
                                           </button>
                                        </div>
                                     </div>
                                  </div>
                               </div>

                              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
                                 <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                                 <p className="text-[9px] font-black text-amber-600/80 leading-relaxed uppercase tracking-tight">
                                    Once activated, your profile will be prioritized in discovery results for the selected duration. Admin approval takes up to 2 hours.
                                 </p>
                              </div>
                           </div>
                        )}
                     </div>
                  </motion.section>
               )}

               {activeSection === 'live_report' && (
                  <motion.section
                     key="live_report"
                     initial={{ opacity: 0, x: 24 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 24 }}
                     transition={{ duration: 0.18 }}
                     className="space-y-4"
                  >
                     <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-gray-800 space-y-6">
                        <div className="flex items-center gap-3">
                           <div className="p-3 bg-[#00246b]/10 text-[#00246b] rounded-2xl">
                              <FileDown size={24} />
                           </div>
                           <div>
                              <h2 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Live Report</h2>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Download performance PDF</p>
                           </div>
                        </div>

                        <div className="space-y-4 pt-2">
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">From Date</label>
                                 <input 
                                    type="date" 
                                    value={reportRange.from}
                                    max={dayjs().format('YYYY-MM-DD')}
                                    onChange={(e) => setReportRange(prev => ({ ...prev, from: e.target.value }))}
                                    className="w-full p-3.5 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#00246b]/20 transition-all"
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">To Date</label>
                                 <input 
                                    type="date" 
                                    value={reportRange.to}
                                    max={dayjs().format('YYYY-MM-DD')}
                                    onChange={(e) => setReportRange(prev => ({ ...prev, to: e.target.value }))}
                                    className="w-full p-3.5 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#00246b]/20 transition-all"
                                 />
                              </div>
                           </div>

                           <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
                              <Info className="text-amber-500 shrink-0" size={16} />
                              <p className="text-[9px] font-bold text-amber-700/80 leading-relaxed uppercase tracking-tight">
                                 This report includes staff attendance, total bookings, cancelled sessions, and earnings for the selected period.
                              </p>
                           </div>

                           <button
                              onClick={handleDownloadReport}
                              disabled={downloadingReport}
                              className="w-full py-4 bg-[#00246b] hover:bg-[#001b50] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#00246b]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                           >
                              {downloadingReport ? (
                                 <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Generating...</span>
                                 </>
                              ) : (
                                 <>
                                    <FileDown size={18} />
                                    <span>Download PDF Report</span>
                                 </>
                              )}
                           </button>
                        </div>
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

                      <div className="mt-4">
                            <button
                               onClick={() => setShowDeleteConfirm(true)}
                               className="w-full flex items-center justify-between p-4 bg-rose-50/50 dark:bg-rose-900/5 rounded-2xl border border-rose-100 dark:border-rose-900/20 active:scale-[0.98] transition-all group"
                            >
                               <div className="flex items-center gap-3">
                                  <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
                                     <Trash2 size={16} />
                                  </div>
                                  <div className="text-left">
                                     <p className="text-[11px] font-black text-rose-600 dark:text-rose-500 capitalize tracking-tight">Delete Account</p>
                                     <p className="text-[8px] text-rose-400 font-bold tracking-tighter capitalize mt-0.5">Permanently remove partner data</p>
                                  </div>
                               </div>
                               <ChevronRight size={14} className="text-rose-300 group-hover:translate-x-1 transition-transform" />
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
                     <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">Delete Partner Account?</h3>
                     <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500 mt-2 capitalize tracking-widest">
                        This will permanently remove your partner account, staff, and earnings history. This cannot be undone.
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
                     <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">Delete Partner Account?</h3>
                     <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500 mt-2 capitalize tracking-widest leading-relaxed px-2">
                        This will permanently remove your partner account, staff, and earnings history. This action cannot be undone.
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
