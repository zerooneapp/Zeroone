import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  MessageSquare,
  MoreVertical,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  TrendingUp
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
      avgRating: 0,
      totalReviews: 0,
      pendingModeration: 0
    }
  });
  const [filters, setFilters] = useState({
    search: '',
    rating: 'all',
    status: 'all'
  });

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/reviews', { params: filters });
      setData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reputation database synchronization failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchReviews, filters.search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [filters]);

  const handleAction = async (id, action) => {
    try {
      if (action === 'approve') {
        await api.post(`/admin/reviews/${id}/approve`);
        toast.success('Review authorized');
      } else {
        await api.delete(`/admin/reviews/${id}`);
        toast.success('Review removed');
      }
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Moderation cycle failed');
    }
  };

  const handleApproveAll = async () => {
    try {
      await api.post('/admin/reviews/approve-all');
      toast.success('All pending reviews verified');
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk verification failed');
    }
  };

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-500">
      <div className="p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b-2 border-b-primary/20">
        <div className="space-y-1">
          <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tighter capitalize leading-none">Reputation Hub</h1>
          <p className="text-[12px] font-black text-slate-400 capitalize tracking-[0.2em] opacity-60">Global Moderation & Feedback Integrity Hub</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 px-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-3">
            <div className="text-emerald-600 font-black text-[22px] tracking-tighter">{data.summary.avgRating}</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={14}
                  fill={star <= Math.round(data.summary.avgRating) ? 'currentColor' : 'none'}
                  className="text-emerald-500"
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleApproveAll}
            className="h-11 px-5 bg-slate-900 text-white rounded-xl font-black text-[11px] capitalize tracking-widest shadow-lg shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
          >
            <ShieldCheck size={18} strokeWidth={3} />
            Verify All
          </button>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-gray-600" size={18} strokeWidth={3} />
          <input
            type="text"
            placeholder="SEARCH USER, VENDOR OR COMMENT..."
            className="w-full pl-11 pr-4 h-12 bg-slate-50 dark:bg-gray-800 border-none rounded-xl text-[14px] font-black capitalize tracking-widest focus:ring-2 ring-primary/20 outline-none dark:text-white transition-all placeholder:text-slate-300"
            value={filters.search}
            onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))}
          />
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          {['all', 'approved', 'pending'].map((status) => (
            <button
              key={status}
              onClick={() => setFilters((previous) => ({ ...previous, status }))}
              className={cn(
                'flex-1 h-12 px-6 rounded-xl text-[11px] font-black capitalize tracking-widest transition-all border shadow-sm',
                filters.status === status
                  ? 'bg-slate-900 text-white border-slate-900 scale-[1.02]'
                  : 'bg-white dark:bg-gray-800 text-slate-400 border-slate-100 dark:border-gray-700 hover:bg-slate-50'
              )}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          {['all', '4+', '3-', '1'].map((rating) => (
            <button
              key={rating}
              onClick={() => setFilters((previous) => ({ ...previous, rating }))}
              className={cn(
                'flex-1 h-12 px-6 rounded-xl text-[11px] font-black capitalize tracking-widest transition-all border shadow-sm',
                filters.rating === rating
                  ? 'bg-primary text-white border-primary scale-[1.02]'
                  : 'bg-slate-50 dark:bg-gray-800 text-slate-400 border-slate-100 dark:border-gray-700 hover:bg-slate-50'
              )}
            >
              {rating}
            </button>
          ))}
        </div>
      </div>

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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <AnimatePresence mode="popLayout">
          {!loading && data.reviews.map((review, index) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ delay: index * 0.03 }}
              className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col gap-5 group hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-[15px] font-black text-slate-400 border border-slate-100 dark:border-gray-700 capitalize">
                    {review.user?.[0] || 'U'}
                  </div>
                  <div className="space-y-1.5 leading-none">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-black text-slate-900 dark:text-white capitalize tracking-tighter pt-0.5">{review.user}</h3>
                      {review.status === 'pending' && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[9px] font-black capitalize tracking-widest">
                          Awaiting Audit
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-black text-slate-400 capitalize tracking-widest opacity-60">
                      Target: <span className="text-primary">{review.vendor}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        fill={star <= review.rating ? 'currentColor' : 'none'}
                        className={cn(review.rating >= 4 ? 'text-emerald-500' : 'text-amber-500')}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-slate-300 capitalize tracking-tighter opacity-60">
                    {format(new Date(review.date), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-gray-800/40 p-5 rounded-xl border border-slate-100 dark:border-gray-800 relative group-hover:bg-white dark:group-hover:bg-gray-800 transition-all">
                <div className="absolute -top-3 left-4 bg-white dark:bg-gray-900 px-3 flex items-center gap-2 border border-slate-100 dark:border-gray-800 rounded-lg py-1 shadow-sm">
                  <MessageSquare size={12} className="text-slate-200" />
                  <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest opacity-60">Node Trace</span>
                </div>
                <p className="text-[14px] font-bold text-slate-600 dark:text-gray-300 leading-relaxed pt-1">"{review.comment}"</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="px-3 py-1 bg-slate-200/50 dark:bg-gray-700/50 rounded-lg text-[10px] font-black text-slate-500 dark:text-gray-400 capitalize tracking-widest">
                    {review.service}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-auto pt-2">
                {review.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleAction(review._id, 'approve')}
                      className="flex-1 h-11 bg-emerald-50 text-emerald-600 rounded-xl text-[11px] font-black capitalize tracking-widest border border-emerald-100 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <ShieldCheck size={18} strokeWidth={3} />
                      Authorize
                    </button>
                    <button
                      onClick={() => handleAction(review._id, 'delete')}
                      className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                    >
                      <Ban size={18} strokeWidth={3} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 h-11 flex items-center gap-2.5 px-4 opacity-70">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span className="text-[11px] font-black text-slate-400 capitalize tracking-widest">Live on Platform</span>
                    </div>
                    <button
                      onClick={() => handleAction(review._id, 'delete')}
                      className="w-11 h-11 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center"
                    >
                      <Trash2 size={18} strokeWidth={3} />
                    </button>
                  </>
                )}
                <button className="w-11 h-11 text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-center">
                  <MoreVertical size={18} strokeWidth={3} />
                </button>
              </div>

              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full transform translate-x-10 -translate-y-10 opacity-0 group-hover:opacity-100 transition-all" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {loading && (
        <div className="p-20 text-center space-y-4 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800 animate-pulse shadow-sm">
          <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto text-slate-200 border border-slate-100">
            <ShieldAlert size={40} strokeWidth={3} />
          </div>
          <p className="font-black text-slate-400 capitalize tracking-widest text-[12px] opacity-60">Loading moderation feed</p>
        </div>
      )}

      {!loading && data.reviews.length === 0 && (
        <div className="p-20 text-center space-y-4 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800 animate-in zoom-in duration-500 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto text-slate-200 border border-slate-100">
            <ShieldAlert size={40} strokeWidth={3} />
          </div>
          <p className="font-black text-slate-400 capitalize tracking-widest text-[12px] opacity-60">No reputation nodes detected in this quadrant</p>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4 transition-all hover:shadow-md border-b-2" style={{ borderBottomColor: color === 'primary' ? 'var(--primary)' : color === 'rose' ? '#f43f5e' : color === 'amber' ? '#f59e0b' : '#94a3b8' }}>
    <div className="flex items-center justify-between">
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border',
        color === 'primary' ? 'bg-primary/5 text-primary border-primary/20' :
          color === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-100' :
            color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' :
              'bg-slate-50 text-slate-600 border-slate-100'
      )}>
        <Icon size={24} strokeWidth={3} />
      </div>
      <div className="text-right">
        <p className="text-[12px] font-black text-slate-400 capitalize tracking-widest opacity-60 leading-none">{label}</p>
        <p className="text-[22px] font-black text-slate-900 dark:text-white tracking-tighter mt-1">{value}</p>
      </div>
    </div>
    <div className="pt-3 border-t border-slate-50 dark:border-gray-800 flex items-center gap-2">
      <div className={cn('w-1.5 h-1.5 rounded-full', color === 'primary' ? 'bg-primary' : color === 'rose' ? 'bg-rose-500' : color === 'amber' ? 'bg-amber-500' : 'bg-slate-400')} />
      <p className="text-[11px] font-black text-slate-400 capitalize tracking-tighter opacity-70">{sub}</p>
    </div>
  </div>
);

export default ReviewManagement;
