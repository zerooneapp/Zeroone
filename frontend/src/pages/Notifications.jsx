import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, ArrowLeft, CheckCircle2, AlertCircle, 
    ShoppingBag, CreditCard, Clock, Trash2, 
    CheckSquare, Square, CheckCircle, MoreVertical
} from 'lucide-react';
import useNotificationStore from '../store/notificationStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';

dayjs.extend(relativeTime);

const Notifications = () => {
    const navigate = useNavigate();
    const { 
        notifications, 
        loading, 
        fetchNotifications, 
        markAsRead, 
        markAllAsRead, 
        deleteBulk 
    } = useNotificationStore();

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedIds([]);
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === notifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n._id));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        
        const loadingToast = toast.loading('Deleting notifications...');
        try {
            await deleteBulk(selectedIds);
            toast.success(`${selectedIds.length} notifications deleted`, { id: loadingToast });
            setIsSelectionMode(false);
            setSelectedIds([]);
        } catch (err) {
            toast.error('Failed to delete', { id: loadingToast });
        }
    };

    const handleMarkAllRead = async () => {
        const loadingToast = toast.loading('Marking all as read...');
        try {
            await markAllAsRead();
            toast.success('All marked as read', { id: loadingToast });
        } catch (err) {
            toast.error('Failed to update', { id: loadingToast });
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'BOOKING_CONFIRMED': return <CheckCircle2 size={18} className="text-emerald-500" />;
            case 'BOOKING_CANCELLED': return <AlertCircle size={18} className="text-red-500" />;
            case 'BOOKING_RESCHEDULED': return <Clock size={18} className="text-blue-500" />;
            case 'ASSIGNMENT_RECEIVED': 
            case 'STAFF_ASSIGNED': return <ShoppingBag size={18} className="text-primary" />;
            case 'LOW_BALANCE': return <CreditCard size={18} className="text-orange-500" />;
            default: return <Bell size={18} className="text-primary" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-32">
            {/* 🏙️ PREMIUM FULL-SCREEN HEADER */}
            <header className="px-5 pt-6 pb-4 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl z-50 border-b border-slate-200/60 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => isSelectionMode ? toggleSelectionMode() : navigate(-1)}
                            className="w-10 h-10 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 flex items-center justify-center active:scale-90 transition-all"
                        >
                            <ArrowLeft size={20} className="text-slate-900 dark:text-white" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                {isSelectionMode ? `${selectedIds.length} Selected` : 'Notifications'}
                            </h1>
                            <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1.5">
                                {isSelectionMode ? 'Bulk Actions Enabled' : 'Alerts & Updates'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isSelectionMode ? (
                            <>
                                <button 
                                    onClick={handleSelectAll}
                                    className="p-2.5 text-slate-500 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest"
                                >
                                    {selectedIds.length === notifications.length ? 'None' : 'All'}
                                </button>
                                <button 
                                    onClick={handleDeleteSelected}
                                    disabled={selectedIds.length === 0}
                                    className={`p-2.5 rounded-xl ${selectedIds.length > 0 ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-slate-300'}`}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </>
                        ) : (
                            <div className="flex gap-1">
                                <button 
                                    onClick={handleMarkAllRead}
                                    className="p-2.5 text-slate-400 hover:text-primary transition-colors"
                                    title="Mark all as read"
                                >
                                    <CheckCircle size={20} />
                                </button>
                                <button 
                                    onClick={toggleSelectionMode}
                                    className="p-2.5 text-slate-400 hover:text-primary transition-colors"
                                >
                                    <CheckSquare size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="px-4 mt-6 max-w-2xl mx-auto space-y-3">
                <AnimatePresence mode="popLayout">
                    {loading && notifications.length === 0 ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-24 bg-white dark:bg-gray-900 rounded-3xl animate-pulse border border-slate-100 dark:border-gray-800 shadow-sm" />
                        ))
                    ) : notifications.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-32 flex flex-col items-center justify-center text-center select-none"
                        >
                            <div className="p-8 bg-white dark:bg-gray-900 rounded-[3rem] mb-6 border border-slate-200/60 dark:border-gray-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                                <Bell size={56} strokeWidth={1} className="text-slate-200 dark:text-gray-800" />
                            </div>
                            <p className="font-black text-sm uppercase tracking-[0.2em] text-slate-800 dark:text-white">All Clear</p>
                            <p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-widest opacity-60">No pending alerts at the moment.</p>
                        </motion.div>
                    ) : (
                        notifications.map((n) => (
                            <motion.div
                                key={n._id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`group p-4 rounded-3xl border transition-all duration-300 relative ${
                                    selectedIds.includes(n._id) 
                                        ? 'bg-primary/10 border-primary ring-1 ring-primary/20' 
                                        : n.isRead
                                            ? 'bg-white dark:bg-gray-900/40 border-slate-200/60 dark:border-gray-800/60 shadow-sm'
                                            : 'bg-white dark:bg-gray-900 border-white dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-none'
                                }`}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        toggleSelect(n._id);
                                    } else {
                                        if (!n.isRead) markAsRead(n._id);
                                    }
                                }}
                            >
                                <div className="flex gap-4">
                                    <div className="relative shrink-0">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                            n.isRead ? 'bg-slate-50 dark:bg-gray-800 text-slate-400' : 'bg-slate-50 dark:bg-gray-800 shadow-inner'
                                        }`}>
                                            {getIcon(n.type)}
                                        </div>
                                        {isSelectionMode && (
                                            <div className="absolute -top-1 -left-1">
                                                {selectedIds.includes(n._id) ? (
                                                    <CheckCircle2 size={18} className="text-primary fill-white" />
                                                ) : (
                                                    <Square size={18} className="text-slate-300 fill-white" />
                                                )}
                                            </div>
                                        )}
                                        {!n.isRead && !isSelectionMode && (
                                            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-gray-900 shadow-sm" />
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-[13px] font-black tracking-tight leading-tight ${n.isRead ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                                {n.title}
                                            </p>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter shrink-0 mt-0.5">
                                                {dayjs(n.createdAt).fromNow()}
                                            </span>
                                        </div>
                                        <p className={`text-[10.5px] leading-snug font-bold mt-1 tracking-tight opacity-80 ${n.isRead ? 'text-slate-400' : 'text-slate-500 dark:text-gray-400'}`}>
                                            {n.message}
                                        </p>
                                    </div>
                                </div>

                                {/* Hover effects for desktop */}
                                {!isSelectionMode && (
                                    <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1 text-slate-300 hover:text-slate-500">
                                            <MoreVertical size={14} />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </main>

            {/* 🛠️ BULK ACTION FLOATING BAR (EXTRA SAFETY) */}
            <AnimatePresence>
                {isSelectionMode && selectedIds.length > 0 && (
                    <motion.div 
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-24 left-6 right-6 z-50"
                    >
                        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-3xl shadow-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3 pl-2">
                                <span className="text-xs font-black uppercase tracking-widest">{selectedIds.length} Selected</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsSelectionMode(false)}
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest opacity-60"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleDeleteSelected}
                                    className="px-6 py-2 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Notifications;
