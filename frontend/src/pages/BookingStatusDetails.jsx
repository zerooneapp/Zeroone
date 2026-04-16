import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, ShieldCheck, MapPin, Phone, MessageSquare, AlertTriangle, XCircle, CheckCircle2, Sparkles } from 'lucide-react';
import api from '../services/api';
import Button from '../components/Button';
import SectionTitle from '../components/SectionTitle';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const BookingStatusDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of mind / Want to postpone');
  
  const cancelOptions = [
    "Running late / Not enough time",
    "Need a different time slot (preferred slot not available)",
    "Location is too far",
    "Traffic or travel issues",
    "Change of mind / Want to postpone"
  ];

  const fetchDetails = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get('/bookings/my');
      const found = res.data.find(b => b._id === id);
      setBooking(found);
    } catch (err) {
      toast.error('Failed to load details');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails(true);

    // 🚀 LIVE SYNC: Listen for real-time status updates from vendor
    const handleStatusUpdateEvent = (e) => {
      const notification = e.detail;
      // If notification is about THIS booking, refresh details immediately
      if (notification?.data?.bookingId === id) {
        fetchDetails(false);
      }
    };

    window.addEventListener('new-socket-notification', handleStatusUpdateEvent);
    return () => window.removeEventListener('new-socket-notification', handleStatusUpdateEvent);
  }, [id]);

  const processCancellation = async () => {
    try {
      setCancelling(true);
      await api.patch(`/bookings/${id}/status`, { action: 'cancel', reason: cancelReason });
      toast.success('Booking cancelled successfully');
      setShowCancelPrompt(false);
      fetchDetails(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return (
    <div className="p-10 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto" />
      <p className="mt-4 text-gray-400">Loading details...</p>
    </div>
  );

  if (!booking) return (
    <div className="p-10 text-center">
      <p className="text-gray-500">Booking not found</p>
      <Button className="mt-4" onClick={() => navigate('/bookings')}>Back to History</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-gray-950 pb-32">
      <div className="p-3.5 pt-4 flex items-center justify-between sticky top-0 bg-background-light/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all">
          <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
        </button>
        <span className="font-black text-[11px] tracking-widest text-slate-400">Booking status</span>
        <div className="w-10"></div>
      </div>

      <div className="px-5 mt-4 space-y-4 pb-20">
        {/* Live Status Badge */}
        <div className="flex flex-col items-center py-4 bg-white dark:bg-gray-900/50 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.01)]">
          <div className={`p-3 rounded-2xl border-2 mb-3 shadow-xl ${booking.status === 'confirmed' ? 'bg-blue-500 text-white border-blue-100 dark:border-blue-900/30' :
              booking.status === 'completed' ? 'bg-green-500 text-white border-green-100 dark:border-green-900/30' :
                'bg-red-500 text-white border-red-100 dark:border-red-900/30'
            }`}>
            {booking.status === 'confirmed' ? <Clock size={24} strokeWidth={3} /> :
              booking.status === 'completed' ? <CheckCircle2 size={24} strokeWidth={3} /> :
                <XCircle size={24} strokeWidth={3} />}
          </div>
          <h1 className="text-lg font-black capitalize tracking-tight text-gray-900 dark:text-white leading-none">{booking.status}</h1>
          <p className="text-[8px] font-black tracking-widest text-slate-400 mt-1.5 opacity-60">Order #{booking._id.slice(-6).toUpperCase()}</p>
        </div>

        {booking.status === 'cancelled' && booking.cancelReason && (
          <section className="p-3.5 bg-rose-50/70 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/20 shadow-sm space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                <AlertTriangle size={15} />
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-rose-500">
                  Cancellation Reason
                </p>
                <p className="text-[11px] font-black text-slate-900 dark:text-white leading-tight">
                  {booking.cancelReason}
                </p>
                {booking.cancelledByRole && (
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-white/50">
                    Cancelled by {booking.cancelledByRole}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Professional Details (Contact Rule Applies) */}
        <section className="space-y-2">
          <p className="text-[9px] font-black text-slate-400 tracking-widest px-1">Service provider</p>
          <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 overflow-hidden shadow-inner shrink-0">
              <img 
                src={booking.staffId?.image || `https://i.pravatar.cc/150?u=${booking.staffId?._id || 'staff'}`} 
                onError={(e) => { e.target.src = `https://i.pravatar.cc/150?u=${booking.staffId?._id || 'staff'}` }}
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex-1 leading-none">
              <p className="font-extrabold text-[13px] text-gray-900 dark:text-white tracking-tight">{booking.staffId?.name || 'Assigning soon...'}</p>
              <div className="flex items-center gap-1.5 text-blue-500 font-black text-[8px] tracking-widest mt-1">
                <ShieldCheck size={10} strokeWidth={3} /> Verified specialist
              </div>
            </div>

            {booking.canContact && (
              <div className="flex gap-2">
                <a href={`tel:${booking.staffId?.phone}`} className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shadow-sm active:scale-90 transition-all">
                  <Phone size={16} strokeWidth={3} />
                </a>
              </div>
            )}
          </div>


        </section>

        {/* Schedule Info */}
        <section className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[8px] font-black tracking-widest text-slate-400 dark:text-white/40 leading-none uppercase">Scheduled date</p>
              <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-900 dark:text-white tracking-tighter mt-1 leading-none">
                <Calendar size={12} strokeWidth={3} className="text-primary" />
                {dayjs(booking.startTime).format('dddd, DD MMMM')}
              </div>
            </div>
            <div className="space-y-1 text-right flex flex-col items-end">
              <p className="text-[8px] font-black tracking-widest text-slate-400 dark:text-white/40 leading-none uppercase">Arrival time</p>
              <div className="flex items-center gap-1.5 text-[11px] font-black text-primary dark:text-blue-400 tracking-tighter mt-1 leading-none">
                <Clock size={12} strokeWidth={3} />
                {dayjs(booking.startTime).format('hh:mm A')}
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-50 dark:border-gray-800 space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles size={12} strokeWidth={3} className="text-primary mt-0.5 shrink-0" />
              <p className="text-[10px] font-black tracking-tight text-[#1C2C4E] dark:text-white leading-tight">
                {booking.services?.map(s => s.name).join(', ') || 'Service Details'}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={12} strokeWidth={3} className="text-slate-300 dark:text-gray-600 mt-0.5 shrink-0" />
              <p className="text-[10px] font-black tracking-tight text-slate-400 dark:text-white/60 leading-tight">
                {booking.serviceAddress || booking.vendorId?.address || 'Location information unavailable'}
              </p>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        {booking.status === 'confirmed' && (
          <div className="space-y-2 pt-2">
            <button
              className="w-full h-11 bg-primary text-white rounded-xl shadow-xl shadow-primary/20 font-black text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all border border-white/10 disabled:opacity-50"
              onClick={() => navigate('/cart', {
                state: {
                  rescheduleBookingId: id,
                  vendor: booking.vendorId,
                  rescheduleItems: booking.services.map(s => ({ _id: s.serviceId, name: s.name, price: s.price, duration: s.duration, bufferTime: s.bufferTime || 0 })),
                  rescheduleTotalDuration: booking.totalDuration,
                  rescheduleSelection: {
                    date: dayjs(booking.startTime).format('YYYY-MM-DD'),
                    time: dayjs(booking.startTime).format('HH:mm'),
                    staffId: booking.staffId?._id || booking.staffId || '',
                    staffName: booking.staffId?.name || '',
                    staffImage: booking.staffId?.image || ''
                  }
                }
              })}
              disabled={!booking.canReschedule}
            >
              Reschedule Booking
            </button>

            {showCancelPrompt ? (
              <div className="w-full bg-slate-50 dark:bg-gray-800 p-3 rounded-xl border border-red-500/20 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 text-center">Select Cancellation Reason</p>
                <select 
                  className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-2 text-[10px] font-bold text-gray-700 dark:text-gray-300 outline-none mb-3"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                >
                  {cancelOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <div className="flex gap-2">
                  <button className="flex-1 h-9 bg-slate-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-black text-[9px] tracking-widest uppercase active:scale-95 transition-all" onClick={() => setShowCancelPrompt(false)} disabled={cancelling}>Keep Booking</button>
                  <button className="flex-1 h-9 bg-red-500 text-white rounded-lg font-black text-[9px] tracking-widest uppercase active:scale-95 transition-all flex items-center justify-center disabled:opacity-50" onClick={processCancellation} disabled={cancelling}>{cancelling ? 'Wait...' : 'Confirm'}</button>
                </div>
              </div>
            ) : (
              <button
                className="w-full h-10 bg-slate-50 dark:bg-gray-800/80 text-red-500 rounded-xl border border-slate-100 dark:border-gray-700 font-black text-[9px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                onClick={() => setShowCancelPrompt(true)}
                disabled={!booking.canCancel || cancelling}
              >
                {cancelling ? 'Processing...' : 'Cancel Booking'}
              </button>
            )}
            {!booking.canCancel && (
              <p className="text-center text-[8px] font-black text-slate-400 tracking-widest opacity-60 leading-none pt-1">
                You can only cancel 30 minutes before schedule.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingStatusDetails;
