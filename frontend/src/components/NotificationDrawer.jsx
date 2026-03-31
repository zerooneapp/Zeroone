import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle2, AlertCircle, ShoppingBag, CreditCard } from 'lucide-react';
import api from '../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const NotificationDrawer = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark read');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'BOOKING_CONFIRMED': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'BOOKING_CANCELLED': return <AlertCircle size={16} className="text-red-500" />;
      case 'BOOKING_RESCHEDULED': return <Clock size={16} className="text-blue-500" />;
      case 'ASSIGNMENT_RECEIVED': return <ShoppingBag size={16} className="text-primary" />;
      case 'LOW_BALANCE': return <CreditCard size={16} className="text-orange-500" />;
      default: return <Bell size={16} className="text-primary" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          
          {/* Drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Notifications</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Updates & Alerts</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {loading && notifications.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-50 dark:bg-gray-800/50 rounded-3xl animate-pulse" />
                ))
              ) : notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
                  <Bell size={64} strokeWidth={1} className="mb-4" />
                  <p className="font-bold text-sm">All caught up!</p>
                  <p className="text-xs">No new notifications for you.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n._id}
                    className={`p-4 rounded-[2rem] border transition-all ${
                      n.isRead 
                      ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800' 
                      : 'bg-primary/5 border-primary/10 shadow-sm'
                    }`}
                    onClick={() => !n.isRead && markRead(n._id)}
                  >
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center shrink-0">
                        {getIcon(n.type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                           <p className={`text-xs font-black ${n.isRead ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>{n.title}</p>
                           <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{dayjs(n.createdAt).fromNow()}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  </div>
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
