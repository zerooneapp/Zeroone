import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, CalendarDays, MessageSquareText } from 'lucide-react';
import api from '../services/api';
import dayjs from 'dayjs';

const VendorReviews = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [data, setData] = useState({ summary: { totalReviews: 0, avgRating: 0 }, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState('All');

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const [vendorRes, reviewsRes] = await Promise.all([
          api.get(`/vendors/${id}`),
          api.get(`/reviews/vendor/${id}`)
        ]);

        setVendor(vendorRes.data);
        setData(reviewsRes.data || { summary: { totalReviews: 0, avgRating: 0 }, reviews: [] });
      } catch (error) {
        setVendor(null);
        setData({ summary: { totalReviews: 0, avgRating: 0 }, reviews: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [id]);

  const serviceFilters = ['All', ...new Set(
    (data.reviews || []).flatMap((review) => review.services || [])
  )];

  const filteredReviews = selectedService === 'All'
    ? data.reviews
    : data.reviews.filter((review) => (review.services || []).includes(selectedService));

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 p-4 pt-5 space-y-4">
        <div className="h-10 w-40 rounded-xl bg-slate-100 dark:bg-gray-900 animate-pulse" />
        <div className="h-24 rounded-3xl bg-slate-100 dark:bg-gray-900 animate-pulse" />
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-32 rounded-3xl bg-slate-100 dark:bg-gray-900 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-20">
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 active:scale-90 transition-all">
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <div className="min-w-0">
            <h1 className="text-[18px] font-black text-[#0B1222] dark:text-white tracking-tight truncate">
              Reviews
            </h1>
            <p className="text-[10px] font-black text-[#0B1222]/35 dark:text-gray-400 tracking-widest uppercase truncate">
              {vendor?.shopName || 'Shop Reviews'}
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        <section className="bg-white dark:bg-gray-900 border border-[#1C2C4E]/10 dark:border-gray-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-[#0B1222]/35 dark:text-gray-400 tracking-widest uppercase">
                Average Rating
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Star size={18} className="text-yellow-400 fill-yellow-400" />
                <span className="text-2xl font-black text-[#0B1222] dark:text-white">
                  {data.summary.avgRating || 0}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-[#0B1222]/35 dark:text-gray-400 tracking-widest uppercase">
                Total Reviews
              </p>
              <p className="text-2xl font-black text-[#0B1222] dark:text-white mt-1">
                {data.summary.totalReviews || 0}
              </p>
            </div>
          </div>
        </section>

        <section className="flex gap-2 overflow-x-auto no-scrollbar">
          {serviceFilters.map((service) => (
            <button
              key={service}
              onClick={() => setSelectedService(service)}
              className={`px-3 py-1.5 rounded-[12px] whitespace-nowrap text-[10px] font-black tracking-widest transition-all ${
                selectedService === service
                  ? 'bg-gradient-to-br from-[#1C2C4E] to-[#2D3F6E] text-white shadow-xl shadow-[#1C2C4E]/20'
                  : 'bg-white dark:bg-gray-900 text-[#0B1222] dark:text-white border border-[#1C2C4E]/10 dark:border-gray-800 shadow-sm'
              }`}
            >
              {service}
            </button>
          ))}
        </section>

        <section className="space-y-3">
          {filteredReviews.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-900/40 p-10 text-center">
              <MessageSquareText size={30} className="mx-auto text-slate-300 dark:text-gray-700" />
              <p className="mt-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                No reviews found
              </p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div
                key={review._id}
                className="bg-white dark:bg-gray-900 border border-[#1C2C4E]/10 dark:border-gray-800 rounded-3xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-100 dark:bg-gray-800 shrink-0">
                      {review.user?.image ? (
                        <img src={review.user.image} alt={review.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[12px] font-black text-slate-500 dark:text-gray-300">
                          {(review.user?.name || 'U').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-black text-[#0B1222] dark:text-white truncate">
                        {review.user?.name || 'Verified User'}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={11}
                            className={star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 dark:text-gray-700'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 shrink-0">
                    <CalendarDays size={11} />
                    {dayjs(review.date).format('DD MMM YYYY')}
                  </div>
                </div>

                {review.comment ? (
                  <p className="text-[12px] font-bold text-slate-600 dark:text-gray-300 leading-relaxed">
                    {review.comment}
                  </p>
                ) : (
                  <p className="text-[11px] font-black text-slate-300 dark:text-gray-600 uppercase tracking-widest">
                    No written comment
                  </p>
                )}

                {(review.services || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.services.map((service) => (
                      <span
                        key={`${review._id}-${service}`}
                        className="px-2.5 py-1 rounded-xl bg-[#1C2C4E]/5 dark:bg-white/5 border border-[#1C2C4E]/10 dark:border-gray-800 text-[9px] font-black text-[#0B1222] dark:text-white uppercase tracking-widest"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
};

export default VendorReviews;
