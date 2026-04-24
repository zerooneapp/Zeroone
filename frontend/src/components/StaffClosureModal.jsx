import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CalendarDays, Clock3, X, User } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '../services/api';

const getInitialWindow = () => {
  const now = dayjs();
  const start = now.add(30, 'minute').second(0).millisecond(0);
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

  useEffect(() => {
    if (isOpen) {
      setForm(getInitialWindow());
      setPreview(null);
      setPreviewing(false);
      setCreating(false);
    }
  }, [isOpen]);

  const payload = useMemo(() => ({
    staffId: staff?._id,
    startTime: dayjs(`${form.startDate}T${form.startTime}`).toISOString(),
    endTime: dayjs(`${form.endDate}T${form.endTime}`).toISOString(),
    reason: form.reason.trim(),
    autoCancel: true // Always auto-cancel per client request
  }), [form, staff]);

  const handlePreview = async () => {
    try {
      setPreviewing(true);
      const res = await api.post('/vendor/staff-closures/preview', payload);
      setPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to preview absence');
    } finally {
      setPreviewing(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const res = await api.post('/vendor/staff-closures', payload);
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
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                  <User size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black capitalize tracking-[0.25em] text-indigo-500">Staff Absence Window</p>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-1">Deactivate {staff?.name}</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={16} className="text-slate-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-[8px] font-black capitalize tracking-[0.2em] text-slate-400">Start Date</span>
                  <div className="flex items-center gap-2 px-3 py-3 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                    <CalendarDays size={14} className="text-slate-400" />
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
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
                      onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
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
                      onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
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

            <div className="p-4 border-t border-slate-100 dark:border-gray-800 flex items-center justify-end gap-2 bg-slate-50/70 dark:bg-gray-950/40">
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
