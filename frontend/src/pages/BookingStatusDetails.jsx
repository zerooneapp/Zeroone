import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, ShieldCheck, MapPin, Phone, MessageSquare, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
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

  const fetchDetails = async () => {
    try {
      setLoading(true);
      // We could use GET /api/bookings/:id but getMyBookings returns all. 
      // For precision, let's assume we have a single fetch or use the main list.
      const res = await api.get('/bookings/my');
      const found = res.data.find(b => b._id === id);
      setBooking(found);
    } catch (err) {
      toast.error('Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel?')) return;
    try {
      setCancelling(true);
      await api.patch(`/bookings/${id}/status`, { action: 'cancel' });
      toast.success('Booking cancelled successfully');
      fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return (
    <div className="p-10 text-center animate-pulse">
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32 animate-in slide-in-from-bottom-6 duration-700">
      <div className="p-5 flex items-center justify-between sticky top-0 bg-background-light dark:bg-background-dark z-50">
        <button onClick={() => navigate(-1)} className="p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-black text-sm uppercase tracking-widest">Booking Status</h2>
        <div className="w-10"></div>
      </div>

      <div className="px-5 space-y-6">
        {/* Live Status Badge */}
        <div className="flex flex-col items-center py-6">
           <div className={`p-4 rounded-[2rem] border-4 mb-4 ${
             booking.status === 'confirmed' ? 'bg-blue-500 text-white border-blue-100 dark:border-blue-900/30 shadow-xl shadow-blue-500/20' :
             booking.status === 'completed' ? 'bg-green-500 text-white border-green-100 dark:border-green-900/30 shadow-xl shadow-green-500/20' :
             'bg-red-500 text-white border-red-100 dark:border-red-900/30'
           }`}>
              {booking.status === 'confirmed' ? <Clock size={32} /> :
               booking.status === 'completed' ? <CheckCircle2 size={32} /> : 
               <XCircle size={32} />}
           </div>
           <h1 className="text-2xl font-black capitalize tracking-tight">{booking.status}</h1>
           <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mt-1">Order #{booking._id.slice(-6).toUpperCase()}</p>
        </div>

        {/* Professional Details (Contact Rule Applies) */}
        <section>
          <SectionTitle title="Service Provider" />
          <div className="bg-white dark:bg-gray-900 p-5 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4 mt-3">
             <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img src={booking.staffId?.image || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
             </div>
             <div className="flex-1">
                <p className="font-bold dark:text-white">{booking.staffId?.name || 'Assigning soon...'}</p>
                <div className="flex items-center gap-1.5 text-blue-500 font-bold text-[10px] uppercase">
                   <ShieldCheck size={12} /> Verified Specialist
                </div>
             </div>
             
             {booking.canContact && (
                <div className="flex gap-2">
                   <a href={`tel:${booking.staffId?.phone}`} className="p-3 bg-primary/10 text-primary rounded-2xl active:scale-95 transition-transform">
                      <Phone size={18} />
                   </a>
                </div>
             )}
          </div>
          
          {!booking.canContact && booking.status === 'confirmed' && (
             <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5" />
                <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 leading-tight">
                  Contact details will be visible 30 mins before the appointment schedule.
                </p>
             </div>
          )}
        </section>

        {/* Schedule Info */}
        <section className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Scheduled Date</p>
                 <div className="flex items-center gap-2 text-sm font-bold dark:text-white">
                    <Calendar size={16} className="text-primary" />
                    {dayjs(booking.startTime).format('dddd, DD MMMM')}
                 </div>
              </div>
              <div className="space-y-1 text-right">
                 <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Arrival Time</p>
                 <div className="flex items-center gap-2 text-sm font-bold dark:text-white justify-end">
                    <Clock size={16} className="text-primary" />
                    {dayjs(booking.startTime).format('hh:mm A')}
                 </div>
              </div>
           </div>
           
            <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              <p className="text-xs font-medium text-gray-500">
                {booking.serviceAddress || booking.vendorId?.address || 'Location information unavailable'}
              </p>
            </div>
        </section>

        {/* Action Buttons */}
        {booking.status === 'confirmed' && (
           <div className="space-y-3 pt-4">
              <Button 
                className="w-full h-14 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-black gap-2"
                onClick={() => navigate('/cart', { 
                  state: { 
                    rescheduleBookingId: id,
                    vendor: booking.vendorId,
                    rescheduleItems: booking.services.map(s => ({ _id: s.serviceId, name: s.name, price: s.price, duration: s.duration }))
                  } 
                })}
                disabled={!booking.canReschedule}
              >
                Reschedule Booking
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full h-12 rounded-2xl border-red-100 text-red-500 hover:bg-red-50 dark:border-red-900/20 dark:hover:bg-red-900/10 gap-2 font-bold"
                onClick={handleCancel}
                disabled={!booking.canCancel || cancelling}
              >
                {cancelling ? 'Processing...' : 'Cancel Booking'}
              </Button>
              {!booking.canCancel && (
                 <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-tight">
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
