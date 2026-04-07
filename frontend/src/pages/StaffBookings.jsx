import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, Phone, CheckCircle, 
  ChevronLeft, Filter, Search, ClipboardList,
  Lock, ArrowLeft, MapPin
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../layouts/Navbar';

const StaffBookings = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, completed
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookings/my');
      setBookings(res.data || []);
    } catch (err) {
      toast.error('Failed to sync assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter(b => {
    const isCorrectStatus = activeTab === 'upcoming' 
      ? (b.status === 'confirmed' || b.status === 'assigned') 
      : b.status === 'completed';
    const isCorrectDate = new Date(b.startTime).toISOString().split('T')[0] === selectedDate;
    return isCorrectStatus && isCorrectDate;
  });

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const handleStatusUpdate = async (bookingId, action) => {
     try {
       await api.patch(`/bookings/${bookingId}/status`, { action });
       toast.success(`Booking completed!`);
       fetchBookings();
     } catch (err) {
       toast.error(err.response?.data?.message || 'Update failed');
     }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
       {/* 📱 OPTIMIZED MOBILE HEADER */}
       <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 pt-5 px-5 pb-3">
          <div className="flex items-center gap-4 mb-5">
             <button 
               onClick={() => navigate('/staff')}
               className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl active:scale-90 transition-transform"
             >
                <ArrowLeft size={20} />
             </button>
             <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Schedule</h1>
          </div>

          <div className="space-y-3">
             {/* Row 1: Filter & Date */}
             <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                   <input 
                     type="date" 
                     value={selectedDate}
                     onChange={(e) => setSelectedDate(e.target.value)}
                     className="w-full h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 text-xs font-black text-gray-900 dark:text-white focus:ring-0"
                   />
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                   <Filter size={18} />
                </div>
             </div>

             {/* Row 2: Status Tabs (Moved Below for Mobile Reach) */}
             <div className="flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                {['upcoming', 'completed'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
                      activeTab === tab 
                        ? 'bg-white dark:bg-gray-800 text-primary dark:text-white shadow-xl shadow-black/5' 
                        : 'text-gray-400'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
             </div>
          </div>
       </div>

       {/* Assignments List Area */}
       <div className="p-4 space-y-3">
          <AnimatePresence mode="wait">
            {loading ? (
               <div className="space-y-3 px-1">
                  {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-50 dark:bg-gray-900 rounded-[2rem] animate-pulse" />)}
               </div>
            ) : filteredBookings.length > 0 ? (
               <div className="space-y-3">
                  {filteredBookings.map((booking) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={booking._id}
                      className="bg-white dark:bg-gray-900 p-5 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-300 overflow-hidden">
                             {booking.userId?.image ? <img src={booking.userId.image} className="w-full h-full object-cover" alt={booking.userId?.name || 'Customer'} /> : <User size={20} />}
                           </div>
                           <div>
                              <h3 className="text-sm font-black text-gray-900 dark:text-white leading-none">
                                 {booking.walkInCustomerName || booking.userId?.name || 'Client'}
                              </h3>
                              <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                 <Clock size={10} /> {formatTime(booking.startTime)}
                              </p>
                           </div>
                        </div>
                        
                        {/* 📞 SYNCED CONTACT: Uses Backend Permission */}
                        {booking.canContact ? (
                           <a href={`tel:${booking.userId?.phone}`} className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">
                              <Phone size={18} />
                           </a>
                        ) : (
                           <div className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-300 rounded-xl border border-gray-100 dark:border-gray-800 opacity-40">
                              <Lock size={18} />
                           </div>
                        )}
                      </div>

                      <div className="space-y-3 mb-5 px-1">
                        <div className="space-y-1.5">
                          {booking.services?.map((s, idx) => (
                            <div key={idx} className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                               <div className="w-1 h-1 bg-primary/40 rounded-full" />
                               {s.name || s.serviceId?.name || 'Service Task'}
                            </div>
                          ))}
                        </div>
                        
                        {/* 📊 ASSIGNMENT METRICS: Price & Duration */}
                        <div className="flex items-center gap-4 py-2 border-y border-gray-50 dark:border-gray-800/30">
                           <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center text-emerald-600">
                                 <span className="text-[10px] font-black italic select-none">₹</span>
                              </div>
                              <span className="text-[11px] font-black text-gray-700 dark:text-gray-300">₹{booking.totalPrice}</span>
                           </div>
                           <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600">
                                 <Clock size={10} />
                              </div>
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">{booking.totalDuration} Mins</span>
                           </div>
                        </div>

                        {/* 📍 LOCATION AWARENESS */}
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <MapPin size={12} className="text-gray-400" />
                              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 truncate max-w-[170px]">
                                 {booking.serviceAddress || 'Shop Service'}
                              </p>
                           </div>
                           {booking.serviceAddress && (
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.serviceAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-black text-primary uppercase tracking-widest underline decoration-dotted"
                              >
                                Navigate
                              </a>
                           )}
                        </div>
                      </div>

                      {activeTab === 'upcoming' && (
                        <button 
                          onClick={() => handleStatusUpdate(booking._id, 'complete')}
                          className="w-full h-13 bg-gray-900 dark:bg-primary text-white rounded-[1.25rem] flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
                        >
                           <CheckCircle size={18} />
                           Finalize Assignment
                        </button>
                      )}
                    </motion.div>
                  ))}
               </div>
            ) : (
               <div className="py-24 text-center space-y-6">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] flex items-center justify-center mx-auto text-gray-200">
                     <ClipboardList size={40} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">No assignments found</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">{activeTab} List is Empty</p>
                  </div>
               </div>
            )}
          </AnimatePresence>
       </div>

       <Navbar />
    </div>
  );
};

export default StaffBookings;
