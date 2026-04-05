import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ArrowLeft, CheckCircle2, AlertCircle, ShoppingBag, CreditCard, Clock, X } from 'lucide-react';
import api from '../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        fetchNotifications();
    }, []);

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
            case 'BOOKING_CONFIRMED': return <CheckCircle2 size={18} className="text-emerald-500" />;
            case 'BOOKING_CANCELLED': return <AlertCircle size={18} className="text-red-500" />;
            case 'BOOKING_RESCHEDULED': return <Clock size={18} className="text-blue-500" />;
            case 'ASSIGNMENT_RECEIVED': return <ShoppingBag size={18} className="text-primary" />;
            case 'LOW_BALANCE': return <CreditCard size={18} className="text-orange-500" />;
            default: return <Bell size={18} className="text-primary" />;
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-gray-950 pb-32">
            <header className="px-4 pt-5 pb-3 sticky top-0 bg-background-light/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 flex items-center justify-center active:scale-90 transition-all font-bold"
                    >
                        <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Notifications</h1>
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1 opacity-80">Updates & Alerts</p>
                    </div>
                </div>
            </header>

            <main className="px-4 mt-4 max-w-2xl mx-auto space-y-2">
                <AnimatePresence mode="popLayout">
                    {loading && notifications.length === 0 ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-24 bg-slate-50 dark:bg-gray-900 rounded-2xl animate-pulse border border-slate-100 dark:border-gray-800" />
                        ))
                    ) : notifications.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-20 flex flex-col items-center justify-center text-center select-none"
                        >
                            <div className="p-6 bg-slate-50 dark:bg-gray-900 rounded-[2.5rem] mb-4 border border-slate-100 dark:border-gray-800 shadow-sm">
                                <Bell size={48} strokeWidth={1.5} className="text-slate-300 dark:text-gray-700" />
                            </div>
                            <p className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-white">All caught up!</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">No new alerts for you.</p>
                        </motion.div>
                    ) : (
                        notifications.map((n) => (
                            <motion.div
                                key={n._id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${n.isRead
                                    ? 'bg-white dark:bg-gray-900/30 border-slate-100 dark:border-gray-800 shadow-sm'
                                    : 'bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-md dark:shadow-none'
                                    }`}
                                onClick={() => !n.isRead && markRead(n._id)}
                            >
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-slate-100 dark:border-gray-700 flex items-center justify-center shrink-0">
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-xs font-black uppercase tracking-tight truncate ${n.isRead ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>{n.title}</p>
                                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter shrink-0 mt-0.5">{dayjs(n.createdAt).fromNow()}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug font-bold mt-1 uppercase tracking-tighter opacity-80">
                                            {n.message}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default Notifications;
