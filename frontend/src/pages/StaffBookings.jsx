import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, ClipboardList, ArrowLeft
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
import CompleteBookingPaymentModal from '../components/CompleteBookingPaymentModal';
import BookingCard from '../components/BookingCard';

const StaffBookings = () => {
   const { user, myBookings, fetchMyBookings } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = location.state?.tab || 'upcoming';
  const [bookings, setBookings] = useState(myBookings || []);
  const [loading, setLoading] = useState(!myBookings);
  const [activeTab, setActiveTab] = useState(initialTab); // upcoming, completed
  const [currentPage, setCurrentPage] = useState(1);
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

  const filteredBookings = useMemo(() => {
    const list = bookings.filter(b => {
      if (activeTab === 'upcoming') {
        return b.status === 'confirmed' || b.status === 'assigned' || b.status === 'pending' || b.status === 'pending_completion';
      } else if (activeTab === 'completed') {
        return b.status === 'completed';
      } else if (activeTab === 'cancelled') {
        return b.status === 'cancelled';
      }
      return false;
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      if (activeTab === 'completed' || activeTab === 'cancelled') {
        return timeB - timeA; // Newest / today's bookings first
      }
      return timeA - timeB; // Chronological order for upcoming
    });
  }, [bookings, activeTab]);

  const ITEMS_PER_PAGE = 30;

  const totalPages = useMemo(() => {
    return Math.ceil(filteredBookings.length / ITEMS_PER_PAGE) || 1;
  }, [filteredBookings]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);


  const handleStatusUpdate = async (bookingId, action, reason = '', paymentType = null) => {
    if (action === 'cancel' && !reason) {
      setSelectedBookingId(bookingId);
      setIsCancelModalOpen(true);
      return;
    }
    try {
      setActionLoadingId(bookingId);
      await api.patch(`/bookings/${bookingId}/status`, { action, reason, paymentType });
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
    setCurrentPage(1);
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

        <div className="mb-2">
          {/* Status Tabs */}
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
      <div className="p-4 pt-[160px] pb-24 space-y-3 min-h-[calc(100vh-20px)] flex flex-col">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="space-y-3 px-1">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-50 dark:bg-gray-900 rounded-[2rem] animate-pulse" />)}
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="space-y-3">
              {paginatedBookings.map((booking) => (
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 pb-6 px-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(p => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-[10px] font-black text-slate-700 dark:text-gray-200 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-sm"
                  >
                    <ChevronLeft size={14} />
                    <span>PREV</span>
                  </button>

                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                    Page <span className="text-slate-900 dark:text-white font-black">{currentPage}</span> of {totalPages}
                  </span>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(p => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-[10px] font-black text-slate-700 dark:text-gray-200 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-sm"
                  >
                    <span>NEXT</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 my-auto py-12 min-h-[50vh]">
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

      <CompleteBookingPaymentModal
        isOpen={isCompleteModalOpen}
        onClose={() => {
          setIsCompleteModalOpen(false);
          setSelectedBookingId(null);
        }}
        onConfirm={(paymentType) => {
          handleStatusUpdate(selectedBookingId, 'complete', '', paymentType);
          setIsCompleteModalOpen(false);
        }}
        title="Complete Booking"
        message="Are you sure this booking is fully completed? Please select the payment method:"
      />
    </div>
  );
};

export default StaffBookings;
