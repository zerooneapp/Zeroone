import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, ArrowLeft, CheckCircle2, AlertCircle, 
    ShoppingBag, CreditCard, Clock, Trash2, 
    CheckSquare, Square, CheckCircle, Send, Plus
} from 'lucide-react';
import useNotificationStore from '../../../store/notificationStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';

dayjs.extend(relativeTime);

const AdminNotificationList = () => {
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
        // Fetch with explicit role 'admin' for super_admin safety
        fetchNotifications('admin');
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
            await markAllAsRead('admin');
            toast.success('All marked as read', { id: loadingToast });
        } catch (err) {
            toast.error('Failed to update', { id: loadingToast });
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'VENDOR_APPROVED': return <CheckCircle2 size={18} className="text-emerald-500" />;
            case 'VENDOR_REJECTED': return <AlertCircle size={18} className="text-red-500" />;
            case 'NEW_BOOKING': return <ShoppingBag size={18} className="text-primary" />;
            case 'SYSTEM_ALERT': return <AlertCircle size={18} className="text-orange-500" />;
            case 'BROADCAST': return <Send size={18} className="text-indigo-500" />;
            default: return <Bell size={18} className="text-primary" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-20">
            {/* 🏙️ PREMIUM HEADER */}
            <header className="px-5 pt-6 pb-4 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl z-40 border-b border-slate-200/60 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                            <Bell size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                {isSelectionMode ? `${selectedIds.length} Selected` : 'Admin Alerts'}
                            </h1>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1.5 opacity-80">
                                {isSelectionMode ? 'Bulk Management' : 'System Logs & Requests'}
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
                                <button onClick={toggleSelectionMode} className="p-2 text-slate-400"><X size={20} /></button>
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={handleMarkAllRead}
                                    className="p-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-400 hover:text-primary transition-all shadow-sm"
                                    title="Mark all as read"
                                >
                                    <CheckCircle size={20} />
                                </button>
                                <button 
                                    onClick={toggleSelectionMode}
                                    className="p-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-400 hover:text-primary transition-all shadow-sm"
                                >
                                    <CheckSquare size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="px-5 mt-8 max-w-4xl mx-auto space-y-3">
                <AnimatePresence mode="popLayout">
                    {loading && notifications.length === 0 ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-24 bg-white dark:bg-gray-900 rounded-[2rem] animate-pulse border border-slate-100 dark:border-gray-800" />
                        ))
                    ) : notifications.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-32 flex flex-col items-center justify-center text-center select-none"
                        >
                            <div className="p-10 bg-white dark:bg-gray-900 rounded-[3.5rem] mb-6 border border-slate-200/60 dark:border-gray-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                                <Bell size={64} strokeWidth={1} className="text-slate-200 dark:text-gray-800" />
                            </div>
                            <p className="font-black text-base uppercase tracking-[0.25em] text-slate-900 dark:text-white">Inbox Empty</p>
                            <p className="text-[11px] text-slate-400 mt-2 uppercase font-black tracking-widest opacity-60">No system notifications to display.</p>
                        </motion.div>
                    ) : (
                        notifications.map((n) => (
                            <motion.div
                                key={n._id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`group p-5 rounded-[2rem] border transition-all duration-300 relative cursor-pointer ${
                                    selectedIds.includes(n._id) 
                                        ? 'bg-primary/10 border-primary ring-1 ring-primary/20' 
                                        : n.isRead
                                            ? 'bg-white dark:bg-gray-900/40 border-slate-200/60 dark:border-gray-800/60 opacity-75'
                                            : 'bg-white dark:bg-gray-900 border-white dark:border-gray-800 shadow-xl shadow-slate-200/30 dark:shadow-none'
                                }`}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        toggleSelect(n._id);
                                    } else {
                                        if (!n.isRead) markAsRead(n._id, 'admin');
                                    }
                                }}
                            >
                                <div className="flex gap-5">
                                    <div className="relative shrink-0">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                                            n.isRead ? 'bg-slate-50 dark:bg-gray-800/50 text-slate-400' : 'bg-slate-50 dark:bg-gray-800 shadow-inner'
                                        }`}>
                                            {getIcon(n.type)}
                                        </div>
                                        {isSelectionMode && (
                                            <div className="absolute -top-1 -left-1">
                                                {selectedIds.includes(n._id) ? (
                                                    <CheckCircle2 size={20} className="text-primary fill-white shadow-sm" />
                                                ) : (
                                                    <Square size={20} className="text-slate-300 fill-white" />
                                                )}
                                            </div>
                                        )}
                                        {!n.isRead && !isSelectionMode && (
                                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm animate-pulse" />
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className={`text-sm font-black tracking-tight leading-tight ${n.isRead ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                                {n.title}
                                            </p>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0 mt-0.5">
                                                {dayjs(n.createdAt).fromNow()}
                                            </span>
                                        </div>
                                        <p className={`text-[11.5px] leading-relaxed font-bold mt-1.5 tracking-tight ${n.isRead ? 'text-slate-400' : 'text-slate-500 dark:text-gray-400'}`}>
                                            {n.message}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </main>

            {/* 🛠️ BULK ACTION FLOATING BAR */}
            <AnimatePresence>
                {isSelectionMode && selectedIds.length > 0 && (
                    <motion.div 
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6"
                    >
                        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-5 rounded-[2.5rem] shadow-2xl flex items-center justify-between border border-white/10">
                            <div className="flex items-center gap-3 pl-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{selectedIds.length} Selected</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsSelectionMode(false)}
                                    className="px-5 py-2 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleDeleteSelected}
                                    className="px-6 py-2.5 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/30 active:scale-95 transition-all"
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

const X = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

export default AdminNotificationList;
