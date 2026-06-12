import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CalendarDays, Clock3, X, User } from 'lucide-react';
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

const StaffClosureModal = ({ isOpen, onClose, staff, onCreated }) => {
  const [form, setForm] = useState(getInitialWindow);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeClosures, setActiveClosures] = useState([]);
  const [loadingClosures, setLoadingClosures] = useState(false);

  const fetchActiveClosures = async () => {
    if (!staff?._id) return;
    try {
      setLoadingClosures(true);
      const res = await api.get('/vendor/staff-closures');
      const staffClosures = res.data.filter(
        (item) => item.closure?.staffId === staff._id && item.closure?.status === 'active'
      );
      setActiveClosures(staffClosures);
    } catch (err) {
      console.error('Failed to fetch active closures', err);
    } finally {
      setLoadingClosures(false);
    }
  };

  const handleEndClosure = async (closureId) => {
    try {
      await api.patch(`/vendor/staff-closures/${closureId}/end`);
      toast.success('Absence ended successfully');
      fetchActiveClosures();
      if (preview) setPreview(null);
      onCreated?.();
    } catch (err) {
      toast.error('Failed to end absence');
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

  const handlePreview = async () => {
    try {
      const start = dayjs(`${form.startDate}T${form.startTime}`);
      const end = dayjs(`${form.endDate}T${form.endTime}`);

      if (!start.isValid() || !end.isValid()) {
        toast.error('Please enter a valid date and time');
        return;
      }

      const activePayload = {
        staffId: staff?._id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        reason: form.reason.trim(),
        autoCancel: true
      };

      setPreviewing(true);
      const res = await api.post('/vendor/staff-closures/preview', activePayload);
      setPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to preview absence');
    } finally {
      setPreviewing(false);
    }
  };

  const handleCreate = async () => {
    try {
      const start = dayjs(`${form.startDate}T${form.startTime}`);
      const end = dayjs(`${form.endDate}T${form.endTime}`);

      if (!start.isValid() || !end.isValid()) {
        toast.error('Invalid date or time');
        return;
      }

      const activePayload = {
        staffId: staff?._id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        reason: form.reason.trim(),
        autoCancel: true
      };

      setCreating(true);
      const res = await api.post('/vendor/staff-closures', activePayload);
      toast.success(`${staff?.name}'s absence recorded. ${res.data.cancelledCount || 0} bookings cancelled.`);
      onCreated?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record absence');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4">
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
            className="relative z-10 w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col bg-white dark:bg-gray-900 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/70 dark:border-gray-800 shadow-2xl overflow-hidden"
          >
            <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-gray-800 flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-black capitalize tracking-[0.25em] text-indigo-500">Staff Absence Window</p>
                  <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-1">Deactivate {staff?.name}</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={15} className="text-slate-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-3.5 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto no-scrollbar">
              {/* Active Closures Section */}
              {activeClosures.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black capitalize tracking-[0.2em] text-amber-600 dark:text-amber-400">Current Active Absences</p>
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

              <div className="grid grid-cols-2 gap-2.5">
                <label className="space-y-1">
                  <span className="text-[8px] font-black capitalize tracking-[0.2em] text-slate-400">Start Date</span>
                  <div className="flex items-center gap-2 px-2.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                    <CalendarDays size={13} className="text-slate-400" />
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="w-full bg-transparent text-[11px] font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </label>

                <label className="space-y-1">
                  <span className="text-[8px] font-black capitalize tracking-[0.2em] text-slate-400">Start Time</span>
                  <div className="flex items-center gap-2 px-2.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                    <Clock3 size={13} className="text-slate-400" />
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="w-full bg-transparent text-[11px] font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </label>

                <label className="space-y-1">
                  <span className="text-[8px] font-black capitalize tracking-[0.2em] text-slate-400">End Date</span>
                  <div className="flex items-center gap-2 px-2.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                    <CalendarDays size={13} className="text-slate-400" />
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="w-full bg-transparent text-[11px] font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </label>

                <label className="space-y-1">
                  <span className="text-[8px] font-black capitalize tracking-[0.2em] text-slate-400">End Time</span>
                  <div className="flex items-center gap-2 px-2.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                    <Clock3 size={13} className="text-slate-400" />
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="w-full bg-transparent text-[11px] font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </label>
              </div>

              <label className="space-y-1.5 block">
                <span className="text-[8px] font-black capitalize tracking-[0.2em] text-slate-400">Reason for Absence</span>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Medical leave, family emergency, etc. Customers will see this reason if their booking is cancelled."
                  rows={2}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 text-[11px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none"
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
                          Impact Preview
                        </p>
                        <p className="text-[12px] font-black text-slate-900 dark:text-white">
                          {preview.impactedBookings.length} confirmed assignment{preview.impactedBookings.length === 1 ? '' : 's'} affected.
                        </p>
                        <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5">
                          <span className="opacity-60 uppercase tracking-widest text-[8px]">Estimated Loss:</span>
                          ₹{preview.impactedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0)}
                        </p>
                        {preview.conflicts?.length > 0 && (
                          <p className="text-[10px] font-bold text-rose-500">
                            Another active absence already overlaps this range for {staff?.name}.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {preview.impactedBookings.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-gray-700 text-center">
                        <p className="text-[10px] font-black text-slate-500 dark:text-gray-400 capitalize tracking-[0.2em]">
                          No assignments will be affected
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

            <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-gray-800 flex items-center justify-end gap-2 bg-slate-50/70 dark:bg-gray-950/40 shrink-0">
              <button
                onClick={handlePreview}
                disabled={previewing || creating}
                className="h-11 px-4 bg-white dark:bg-gray-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-gray-700 text-[10px] font-black capitalize tracking-[0.2em] active:scale-95 transition-all disabled:opacity-50"
              >
                {previewing ? 'Checking...' : 'Preview Impact'}
              </button>
              <button
                onClick={handleCreate}
                disabled={!preview || previewing || creating || preview.conflicts?.length > 0}
                className="h-11 px-5 bg-indigo-600 text-white rounded-xl text-[10px] font-black capitalize tracking-[0.2em] shadow-lg active:scale-95 transition-all disabled:opacity-40"
              >
                {creating ? 'Processing...' : 'Confirm Absence'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default StaffClosureModal;
