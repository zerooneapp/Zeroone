import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle2, AlertCircle, ShoppingBag, CreditCard, Clock3 } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import useNotificationStore from '../store/notificationStore';

dayjs.extend(relativeTime);

const NotificationDrawer = ({ isOpen, onClose }) => {
  const { notifications, loading, fetchNotifications, markAsRead, deleteNotification } = useNotificationStore();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const getIcon = (type) => {
    switch (type) {
      case 'BOOKING_CONFIRMED': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'BOOKING_CANCELLED': return <AlertCircle size={16} className="text-red-500" />;
      case 'BOOKING_RESCHEDULED': return <Clock3 size={16} className="text-[#1C2C4E]" />;
      case 'ASSIGNMENT_RECEIVED': return <ShoppingBag size={16} className="text-[#1C2C4E]" />;
      case 'LOW_BALANCE': return <CreditCard size={16} className="text-orange-500" />;
      default: return <Bell size={16} className="text-[#1C2C4E]" />;
    }
  };

  const activeNotifications = notifications.filter(n => !n.isRead);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl shadow-2xl z-[120] flex flex-col border-l border-white/20 dark:border-gray-800/20"
          >
            <div className="px-4 pt-5 pb-3 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Notifications</h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">
                  {activeNotifications.length > 0 ? `${activeNotifications.length} updates & alerts` : 'Updates & alerts'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800 active:scale-90 transition-all shadow-sm"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
              {loading && notifications.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm rounded-2xl animate-pulse border border-white/20 dark:border-gray-800/20" />
                ))
              ) : activeNotifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 select-none pb-20">
                  <div className="p-5 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm rounded-[2.5rem] mb-4 border border-white/20 dark:border-gray-800/20">
                    <Bell size={48} strokeWidth={1.5} className="text-gray-300" />
                  </div>
                  <p className="font-black text-xs uppercase tracking-widest text-gray-400">All caught up!</p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">No new alerts for you.</p>
                </div>
              ) : (
                activeNotifications.map((n) => (
                  <motion.div
                    key={n._id}
                    layout
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3.5 rounded-2xl border transition-all bg-white/60 dark:bg-gray-900/40 backdrop-blur-md border-white/40 dark:border-gray-800/40 shadow-sm hover:shadow-md relative group cursor-pointer"
                    onClick={() => markAsRead(n._id)}
                  >
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-gray-800 shadow-sm border border-slate-100 dark:border-gray-700 flex items-center justify-center shrink-0">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-tight truncate text-gray-900 dark:text-white">
                              {n.title}
                            </p>
                          </div>
                          <span className="text-[8px] text-gray-400 font-black uppercase tracking-tighter shrink-0 mt-0.5">
                            {dayjs(n.createdAt).fromNow()}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug font-bold mt-0.5 uppercase tracking-tighter opacity-80">
                          {n.message}
                        </p>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n._id);
                        }}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDrawer;
