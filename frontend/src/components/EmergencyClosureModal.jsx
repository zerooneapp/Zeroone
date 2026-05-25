import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CalendarDays, Clock3, X } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '../services/api';

const getInitialWindow = () => {
  const now = dayjs();
  const start = now.second(0).millisecond(0);
  const end = start.add(2, 'hour');

  return {
    startDate: start.format('YYYY-MM-DD'),
    startTime: start.format('HH:mm'),
    endDate: end.format('YYYY-MM-DD'),
    endTime: end.format('HH:mm'),
    reason: ''
  };
};

const EmergencyClosureModal = ({ isOpen, onClose, onCreated }) => {
  const [activeClosures, setActiveClosures] = useState([]);
  const [loadingClosures, setLoadingClosures] = useState(false);
  const [form, setForm] = useState(getInitialWindow);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchActiveClosures = async () => {
    try {
      setLoadingClosures(true);
      const res = await api.get('/vendor/closures');
      setActiveClosures(res.data);
    } catch (err) {
      console.error('Failed to fetch active closures', err);
    } finally {
      setLoadingClosures(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setForm(getInitialWindow());
      setPreview(null);
      setPreviewing(false);
      setCreating(false);
      fetchActiveClosures();
    }
  }, [isOpen]);

  const handleEndClosure = async (closureId) => {
    try {
      await api.patch(`/vendor/closures/${closureId}/end`);
      toast.success('Closure ended successfully');
      fetchActiveClosures();
      if (preview) setPreview(null); // Clear preview to force re-check
    } catch (err) {
      toast.error('Failed to end closure');
    }
  };

  const payload = useMemo(() => ({
    startTime: dayjs(`${form.startDate}T${form.startTime}`).toISOString(),
    endTime: dayjs(`${form.endDate}T${form.endTime}`).toISOString(),
    reason: form.reason.trim()
  }), [form]);

  const handlePreview = async () => {
    try {
      setPreviewing(true);
      const res = await api.post('/vendor/closures/preview', payload);
      setPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to preview closure');
    } finally {
      setPreviewing(false);
    }
  };

  const handleCreate = async () => {
    // 🛑 Validation: Start and End cannot be same or End before Start
    const start = dayjs(payload.startTime);
    const end = dayjs(payload.endTime);
    
    if (end.isBefore(start) || end.isSame(start)) {
      return toast.error('End time must be after Start time', {
        icon: '⏰',
        id: 'time-validation'
      });
    }

    try {
      setCreating(true);
      const res = await api.post('/vendor/closures', payload);
      toast.success('Booking window blocked successfully');
      onCreated?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate closure');
    } finally {
      setCreating(false);
    }
  };

  const handleFormChange = (updates) => {
    setForm(prev => ({ ...prev, ...updates }));
    setPreview(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2rem] border border-slate-200/70 dark:border-gray-800 shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black capitalize tracking-[0.25em] text-amber-500">Emergency Window</p>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-1">Emergency Booking Window</h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={16} className="text-slate-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Active Closures Section */}
              {activeClosures.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black capitalize tracking-[0.2em] text-amber-600 dark:text-amber-400">Current Active Closures</p>
                  <div className="space-y-2">
                    {activeClosures.map((item) => (
                      <div key={item.closure._id} className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black text-slate-900 dark:text-white">
                            {dayjs(item.closure.startTime).format('DD MMM, hh:mm A')} - {dayjs(item.closure.endTime).format('hh:mm A')}
                          </p>
                          <p className="text-[8px] font-bold text-amber-600 dark:text-amber-500 mt-0.5">{item.closure.reason || 'No reason provided'}</p>
                        </div>
                        <button 
                          onClick={() => handleEndClosure(item.closure._id)}
                          className="px-3 py-1.5 bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider rounded-lg shadow-sm active:scale-95 transition-all"
                        >
                          End Now
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-[8px] font-black capitalize tracking-[0.2em] text-slate-400">Start Date</span>
                  <div className="flex items-center gap-2 px-3 py-3 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                    <CalendarDays size={14} className="text-slate-400" />
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => handleFormChange({ startDate: e.target.value })}
                      className="w-full bg-transparent text-[11px] font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[8px] font-black capitalize tracking-[0.2em] text-slate-400">Start Time</span>
                  <div className="flex items-center gap-2 px-3 py-3 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                    <Clock3 size={14} className="text-slate-400" />
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => handleFormChange({ startTime: e.target.value })}
                      className="w-full bg-transparent text-[11px] font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[8px] font-black capitalize tracking-[0.2em] text-slate-400">End Date</span>
                  <div className="flex items-center gap-2 px-3 py-3 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                    <CalendarDays size={14} className="text-slate-400" />
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => handleFormChange({ endDate: e.target.value })}
                      className="w-full bg-transparent text-[11px] font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[8px] font-black capitalize tracking-[0.2em] text-slate-400">End Time</span>
                  <div className="flex items-center gap-2 px-3 py-3 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                    <Clock3 size={14} className="text-slate-400" />
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => handleFormChange({ endTime: e.target.value })}
                      className="w-full bg-transparent text-[11px] font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </label>
              </div>

              <label className="space-y-1.5 block">
                <span className="text-[8px] font-black capitalize tracking-[0.2em] text-slate-400">Reason</span>
                <textarea
                  value={form.reason}
                  onChange={(e) => handleFormChange({ reason: e.target.value })}
                  placeholder="Optional note for your team and customers"
                  rows={3}
                  className="w-full px-3 py-3 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 text-[11px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none"
                />
              </label>

              {preview && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/10 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                        <AlertTriangle size={18} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black capitalize tracking-[0.2em] text-amber-600 dark:text-amber-400">
                          Booking Impact Preview
                        </p>
                        <p className="text-[12px] font-black text-slate-900 dark:text-white">
                          {preview.impactedBookings.length} confirmed booking{preview.impactedBookings.length === 1 ? '' : 's'} to resolve.
                        </p>
                        <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5">
                          <span className="opacity-60 uppercase tracking-widest text-[8px]">Affected Value:</span>
                          ₹{preview.impactedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0)}
                        </p>
                        {preview.conflicts?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-[10px] font-bold text-rose-500">
                              Overlap detected with existing closure:
                            </p>
                            {preview.conflicts.map((c, i) => (
                              <p key={i} className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded-md inline-block">
                                {dayjs(c.startTime).format('hh:mm A')} - {dayjs(c.endTime).format('hh:mm A')}
                              </p>
                            ))}
                            <p className="text-[9px] text-slate-500 font-medium">
                              Please adjust your timing or end the existing closure first.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {preview.impactedBookings.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-gray-700 text-center">
                        <p className="text-[10px] font-black text-slate-500 dark:text-gray-400 capitalize tracking-[0.2em]">
                          No existing bookings will be affected
                        </p>
                      </div>
                    ) : (
                      preview.impactedBookings.map((booking) => (
                        <div
                          key={booking._id}
                          className="p-3 rounded-xl bg-white dark:bg-gray-950 border border-slate-100 dark:border-gray-800 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[12px] font-black text-slate-900 dark:text-white">
                                {booking.userId?.name || booking.walkInCustomerName || 'Customer'}
                              </p>
                              <p className="text-[9px] font-black text-slate-400 capitalize tracking-[0.18em] mt-1">
                                {dayjs(booking.startTime).format('DD MMM, hh:mm A')}
                              </p>
                            </div>
                            <p className="text-[10px] font-black text-slate-500 dark:text-gray-400 text-right">
                              {booking.services.map((service) => service.name).join(' • ')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-gray-800 flex items-center justify-end gap-2 bg-slate-50/70 dark:bg-gray-950/40">
              <button
                onClick={handlePreview}
                disabled={previewing || creating || dayjs(payload.startTime).isSame(dayjs(payload.endTime))}
                className="h-11 px-4 bg-white dark:bg-gray-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-gray-700 text-[10px] font-black capitalize tracking-[0.2em] active:scale-95 transition-all disabled:opacity-50"
              >
                {previewing ? 'Checking...' : (dayjs(payload.startTime).isSame(dayjs(payload.endTime)) ? 'Invalid Range' : 'Preview Impact')}
              </button>
              <button
                onClick={handleCreate}
                disabled={!preview || previewing || creating || (preview.conflicts?.length > 0) || dayjs(payload.startTime).isSame(dayjs(payload.endTime))}
                className={`h-11 px-5 rounded-xl text-[10px] font-black capitalize tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center min-w-[140px] ${
                  (!preview || previewing || creating || (preview.conflicts?.length > 0) || dayjs(payload.startTime).isSame(dayjs(payload.endTime)))
                    ? 'bg-slate-200 dark:bg-gray-800 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                    : 'bg-slate-900 dark:bg-[#1C2C4E] text-white'
                }`}
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Block Booking Window'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EmergencyClosureModal;
