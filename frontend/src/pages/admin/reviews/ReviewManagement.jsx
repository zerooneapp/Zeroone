import React, { useState, useEffect } from 'react';
import {
    Star, Search, Filter, MessageSquare,
    Trash2, ShieldCheck, ShieldAlert, MoreVertical,
    User, Calendar, ExternalLink, ThumbsUp,
    AlertCircle, CheckCircle2, TrendingUp, Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';
import { format } from 'date-fns';

const ReviewManagement = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        reviews: [],
        summary: {
            avgRating: 4.8,
            totalReviews: 1240,
            pendingModeration: 12
        }
    });
    const [filters, setFilters] = useState({
        search: '',
        rating: 'all', // all, 4+, 3-, 1
        status: 'all' // all, pending, approved
    });

    const fetchReviews = async () => {
        try {
            setLoading(true);
            // Mocking for Elite HUD design
            const mockData = {
                summary: {
                    avgRating: 4.8,
                    totalReviews: 1240,
                    pendingModeration: 12
                },
                reviews: [
                    { id: 'RV-101', user: 'Amit G.', vendor: 'Elite Car Spa', service: 'Full Body Ceramic', rating: 5, comment: 'Phenomenal service! The attention to detail is world-class.', date: new Date(), status: 'approved' },
                    { id: 'RV-102', user: 'Sneha R.', vendor: 'Quick Wash', service: 'Interior Deep Clean', rating: 2, comment: 'Punctuality was an issue. Cleaning was average.', date: new Date(), status: 'pending' },
                    { id: 'RV-103', user: 'Vikram S.', vendor: 'Prime Care', service: 'Foam Wash Pro', rating: 4, comment: 'Good wash, very fast.', date: new Date(), status: 'approved' },
                    { id: 'RV-104', user: 'Kunal P.', vendor: 'Elite Car Spa', service: 'Manual Polish', rating: 1, comment: 'Spam review - testing platform limits.', date: new Date(), status: 'pending' },
                ]
            };
            setData(mockData);
        } catch (err) {
            toast.error('Reputation database synchronization failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleAction = async (id, action) => {
        try {
            // api.post(`/admin/reviews/${id}/${action}`)
            toast.success(`Review ${action === 'approve' ? 'Authorized' : 'Suppressed'} 🛡️`);
            fetchReviews();
        } catch (err) {
            toast.error('Moderation cycle failed');
        }
    };

    const filteredReviews = data.reviews.filter(rv => {
        const matchesSearch = rv.user.toLowerCase().includes(filters.search.toLowerCase()) ||
            rv.vendor.toLowerCase().includes(filters.search.toLowerCase()) ||
            rv.comment.toLowerCase().includes(filters.search.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="space-y-5 pb-20 animate-in fade-in duration-500">

            {/* ⚙️ REPUTATION COMMAND HEADER */}
            <div className="p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b-2 border-b-primary/20">
                <div className="space-y-1">
                    <h1 className="text-[24px] font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Reputation Hub</h1>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-60">Global Moderation & Feedback Integrity Hub</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 px-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-3">
                        <div className="text-emerald-600 font-black text-[18px] italic tracking-tighter">{data.summary.avgRating}</div>
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} fill={s <= Math.round(data.summary.avgRating) ? "currentColor" : "none"} className="text-emerald-500" />)}
                        </div>
                    </div>
                    <button className="h-10 px-4 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 italic">
                        <ShieldCheck size={14} strokeWidth={3} />
                        Verify All
                    </button>
                </div>
            </div>

            {/* 📊 SUMMARY HUD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <SummaryCard
                    label="Global Avg Performance"
                    value={`${data.summary.avgRating}/5.0`}
                    icon={TrendingUp}
                    color="primary"
                    sub="Platform-wide customer satisfaction"
                />
                <SummaryCard
                    label="Aggregated Feedback"
                    value={data.summary.totalReviews}
                    icon={MessageSquare}
                    color="slate"
                    sub="Total authenticated review nodes"
                />
                <SummaryCard
                    label="Quarantined Reviews"
                    value={data.summary.pendingModeration}
                    icon={AlertCircle}
                    color="amber"
                    sub="Nodes awaiting administrative audit"
                />
            </div>

            {/* 📁 FEEDBACK MATRIX */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <AnimatePresence mode="popLayout">
                    {filteredReviews.map((rv, idx) => (
                        <motion.div
                            key={rv.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-[12px] font-black text-slate-400 border border-slate-100 dark:border-gray-700 uppercase italic">
                                        {rv.user[0]}
                                    </div>
                                    <div className="space-y-0.5 leading-none">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{rv.user}</h3>
                                            {rv.status === 'pending' && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[7px] font-black uppercase italic tracking-widest">Awaiting Audit</span>}
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                                            Target: <span className="text-primary italic">{rv.vendor}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} fill={s <= rv.rating ? "currentColor" : "none"} className={cn(rv.rating >= 4 ? "text-emerald-500" : "text-amber-500")} />)}
                                    </div>
                                    <span className="text-[8px] font-black text-slate-300 uppercase italic tracking-tighter opacity-60">{format(rv.date, 'dd MMM yyyy HH:mm')}</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-gray-800/40 p-4 rounded-xl border border-slate-100 dark:border-gray-800 relative group-hover:bg-white dark:group-hover:bg-gray-800 transition-all">
                                <div className="absolute -top-3 left-3 bg-white dark:bg-gray-900 px-2 flex items-center gap-1.5 border border-slate-100 dark:border-gray-800 rounded-lg py-0.5">
                                    <MessageSquare size={10} className="text-slate-200" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60 italic">Node Trace</span>
                                </div>
                                <p className="text-[12px] font-bold text-slate-600 dark:text-gray-300 leading-relaxed italic">"{rv.comment}"</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-slate-200/50 dark:bg-gray-700/50 rounded text-[8px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest italic">{rv.service}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-auto">
                                {rv.status === 'pending' ? (
                                    <>
                                        <button
                                            onClick={() => handleAction(rv.id, 'approve')}
                                            className="flex-1 h-9 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-500 hover:text-white transition-all italic flex items-center justify-center gap-2"
                                        >
                                            <ShieldCheck size={14} strokeWidth={3} />
                                            Authorize
                                        </button>
                                        <button
                                            onClick={() => handleAction(rv.id, 'delete')}
                                            className="w-9 h-9 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                        >
                                            <Ban size={14} strokeWidth={3} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1 h-9 flex items-center gap-2 px-3 opacity-60">
                                            <CheckCircle2 size={12} className="text-emerald-500" />
                                            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest italic">Live on Platform</span>
                                        </div>
                                        <button
                                            onClick={() => handleAction(rv.id, 'delete')}
                                            className="w-9 h-9 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center"
                                        >
                                            <Trash2 size={14} strokeWidth={3} />
                                        </button>
                                    </>
                                )}
                                <button className="w-9 h-9 text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-center">
                                    <MoreVertical size={14} strokeWidth={3} />
                                </button>
                            </div>

                            {/* Micro Decoration */}
                            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full transform translate-x-8 -translate-y-8 opacity-0 group-hover:opacity-100 transition-all" />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredReviews.length === 0 && (
                <div className="p-20 text-center space-y-4 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800 animate-in zoom-in duration-500 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto text-slate-200 border border-slate-100 italic">
                        <ShieldAlert size={32} strokeWidth={3} />
                    </div>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] italic opacity-60">No reputation nodes detected in this quadrant</p>
                </div>
            )}

        </div>
    );
};

const SummaryCard = ({ label, value, icon: Icon, color, sub }) => (
    <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4 transition-all hover:shadow-md border-b-2" style={{ borderBottomColor: color === 'primary' ? 'var(--primary)' : color === 'rose' ? '#f43f5e' : color === 'amber' ? '#f59e0b' : '#94a3b8' }}>
        <div className="flex items-center justify-between">
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border",
                color === 'primary' ? "bg-primary/5 text-primary border-primary/20" :
                    color === 'rose' ? "bg-rose-50 text-rose-600 border-rose-100" :
                        color === 'amber' ? "bg-amber-50 text-amber-600 border-amber-100" :
                            "bg-slate-50 text-slate-600 border-slate-100"
            )}>
                <Icon size={18} strokeWidth={3} />
            </div>
            <div className="text-right">
                <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest opacity-60 leading-none">{label}</p>
                <p className="text-[18px] font-black text-slate-900 dark:text-white tracking-tighter italic mt-1">{value}</p>
            </div>
        </div>
        <div className="pt-3 border-t border-slate-50 dark:border-gray-800 flex items-center gap-2">
            <div className={cn("w-1 h-1 rounded-full", color === 'primary' ? "bg-primary" : color === 'rose' ? "bg-rose-500" : color === 'amber' ? "bg-amber-500" : "bg-slate-400")} />
            <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-tighter opacity-70 italic">{sub}</p>
        </div>
    </div>
);

export default ReviewManagement;
