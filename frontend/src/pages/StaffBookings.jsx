import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ClipboardList, ArrowLeft
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import Navbar from '../layouts/Navbar';
import CancellationModal from '../components/CancellationModal';
import GlassConfirmationModal from '../components/GlassConfirmationModal';
import BookingCard from '../components/BookingCard';

const StaffBookings = () => {
   const { user, myBookings, fetchMyBookings } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = location.state?.tab || 'upcoming';
  const [bookings, setBookings] = useState(myBookings || []);
  const [loading, setLoading] = useState(!myBookings);
  const [activeTab, setActiveTab] = useState(initialTab); // upcoming, completed
  const [startDate, setStartDate] = useState(
    initialTab === 'completed'
      ? dayjs().subtract(30, 'day').format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD')
  );
  const [endDate, setEndDate] = useState(
    initialTab === 'completed'
      ? dayjs().format('YYYY-MM-DD')
      : dayjs().add(30, 'day').format('YYYY-MM-DD')
  );
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [hasInStockProducts, setHasInStockProducts] = useState(false);

  // Check inventory for Add Product button (staff-specific endpoint)
  useEffect(() => {
    api.get('/inventory/staff').then(res => {
      const items = res.data || [];
      setHasInStockProducts(items.some(item => item.stock > 0));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (myBookings) {
      setBookings(myBookings);
    }
  }, [myBookings]);

  const fetchBookings = async () => {
    try {
      if (bookings.length === 0) setLoading(true);
      await fetchMyBookings();
    } catch (err) {
      toast.error('Failed to sync assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    const handleGlobalEvent = (e) => {
      const type = e.detail?.type;
      const refreshTypes = [
        'STAFF_ASSIGNED', 
        'BOOKING_CANCELLED', 
        'BOOKING_COMPLETED', 
        'BOOKING_RESCHEDULED',
        'ASSIGNMENT_RECEIVED',
        'NEW_BOOKING'
      ];
      
      if (refreshTypes.includes(type)) {
        fetchBookings();
      }
    };
    
    window.addEventListener('new-socket-notification', handleGlobalEvent);
    return () => window.removeEventListener('new-socket-notification', handleGlobalEvent);
  }, []);
  const filteredBookings = bookings.filter(b => {
    let isCorrectStatus = false;
    if (activeTab === 'upcoming') {
      isCorrectStatus = b.status === 'confirmed' || b.status === 'assigned' || b.status === 'pending';
    } else if (activeTab === 'completed') {
      isCorrectStatus = b.status === 'completed';
    } else if (activeTab === 'cancelled') {
      isCorrectStatus = b.status === 'cancelled';
    }
    const bookingDate = dayjs(b.startTime).format('YYYY-MM-DD');
    const isWithinRange = bookingDate >= startDate && bookingDate <= endDate;
    return isCorrectStatus && isWithinRange;
  });


  const handleStatusUpdate = async (bookingId, action, reason = '') => {
    if (action === 'cancel' && !reason) {
      setSelectedBookingId(bookingId);
      setIsCancelModalOpen(true);
      return;
    }
    try {
      setActionLoadingId(bookingId);
      await api.patch(`/bookings/${bookingId}/status`, { action, reason });
      toast.success(`Booking ${action === 'complete' ? 'completed' : 'cancelled'}`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleComplete = (bookingId) => {
    setSelectedBookingId(bookingId);
    setIsCompleteModalOpen(true);
  };

  const handleCancel = (bookingId) => {
    handleStatusUpdate(bookingId, 'cancel');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'upcoming') {
      setStartDate(dayjs().format('YYYY-MM-DD'));
      setEndDate(dayjs().add(30, 'day').format('YYYY-MM-DD'));
    } else {
      setStartDate(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
      setEndDate(dayjs().format('YYYY-MM-DD'));
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      {/* 📱 OPTIMIZED MOBILE HEADER */}
      <div className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 pt-[48px] px-5 pb-2 transform-gpu">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/staff')}
            className="p-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all font-bold"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-[15px] font-black text-gray-900 dark:text-white tracking-tight uppercase">Schedule</h1>
          <div className="w-8"></div>
        </div>

        <div className="space-y-3">
          {/* Row 1: Range Filter */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <div className="flex-1">
              <div className="relative group">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  className="w-full h-8 bg-white dark:bg-gray-800 border-none rounded-lg px-2 text-[9px] font-black text-gray-900 dark:text-white focus:ring-1 ring-primary/20 cursor-pointer"
                />
              </div>
            </div>

            <div className="text-gray-300 flex items-center justify-center">
              <ChevronLeft className="rotate-180 opacity-20" size={14} strokeWidth={3} />
            </div>

            <div className="flex-1">
              <div className="relative group">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  className="w-full h-8 bg-white dark:bg-gray-800 border-none rounded-lg px-2 text-[9px] font-black text-gray-900 dark:text-white focus:ring-1 ring-primary/20 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Status Tabs */}
          <div className="flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            {['upcoming', 'completed', 'cancelled'].map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === tab
                  ? 'bg-white dark:bg-gray-800 text-[#00246b] dark:text-white shadow-xl shadow-black/5'
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
      <div className="p-4 pt-[238px] space-y-3">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="space-y-3 px-1">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-50 dark:bg-gray-900 rounded-[2rem] animate-pulse" />)}
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="space-y-3">
              {filteredBookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  onComplete={handleComplete}
                  onCancel={handleCancel}
                  loadingId={actionLoadingId}
                  hasInStockProducts={hasInStockProducts}
                  inventoryPath="/staff/inventory"
                  customersBasePath="/staff"
                />
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

      <CancellationModal 
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedBookingId(null);
        }}
        onConfirm={(reason) => handleStatusUpdate(selectedBookingId, 'cancel', reason)}
      />

      <GlassConfirmationModal
        isOpen={isCompleteModalOpen}
        onClose={() => {
          setIsCompleteModalOpen(false);
          setSelectedBookingId(null);
        }}
        onConfirm={() => {
          handleStatusUpdate(selectedBookingId, 'complete');
          setIsCompleteModalOpen(false);
        }}
        title="Complete Booking"
        message="Are you sure this booking is fully completed? This will finalize the revenue."
        confirmText="Yes, Complete"
        cancelText="Not Yet"
      />
    </div>
  );
};

export default StaffBookings;
