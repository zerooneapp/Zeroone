import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, CalendarDays, MessageSquareText } from 'lucide-react';
import api from '../services/api';
import dayjs from 'dayjs';
import { useVendorStore } from '../store/vendorStore';

const VendorReviews = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    reviewsData,
    reviewsLoading,
    fetchReviews: storeFetchReviews
  } = useVendorStore();

  const [vendor, setVendor] = useState(null);
  const [data, setData] = useState({ summary: { totalReviews: 0, avgRating: 0 }, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState('All');

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        if (!id) {
          // Vendor Mode: Use store for instant loading
          await storeFetchReviews();
          setData(reviewsData);
          setVendor(reviewsData.vendor); // Assuming store version includes vendor info or we get it from dashboardData
          setLoading(false);
          return;
        }

        // Public Mode: Regular fetch
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
  }, [id, reviewsData, storeFetchReviews]);

  const serviceFilters = ['All', ...new Set(
    (data.reviews || []).flatMap((review) => review.services || [])
  )];

  const filteredReviews = selectedService === 'All'
    ? data.reviews
    : data.reviews.filter((review) => (review.services || []).includes(selectedService));

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 p-4 pt-5 space-y-3">
        <div className="h-8 w-36 rounded-xl bg-slate-100 dark:bg-gray-900 animate-pulse" />
        <div className="h-16 rounded-2xl bg-slate-100 dark:bg-gray-900 animate-pulse" />
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-20 rounded-2xl bg-slate-100 dark:bg-gray-900 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800 px-4 pt-[40px] pb-2">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 active:scale-90 transition-all">
            <ArrowLeft size={18} strokeWidth={3} />
          </button>
          <div className="min-w-0">
            <h1 className="text-[16px] font-black text-[#0B1222] dark:text-white tracking-tight truncate">
              Reviews
            </h1>
            <p className="text-[9px] font-black text-[#0B1222]/35 dark:text-gray-400 tracking-widest uppercase truncate">
              {vendor?.shopName || 'Shop Reviews'}
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 pt-[100px] space-y-2">
        {/* Summary Bar */}
        <section className="bg-white dark:bg-gray-900 border border-[#00246b]/10 dark:border-gray-800 rounded-xl px-3 py-2 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <Star size={13} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[15px] font-black text-[#0B1222] dark:text-white">
                {data.summary.avgRating || 0}
              </span>
              <span className="text-[9px] font-black text-[#0B1222]/35 dark:text-gray-400 tracking-widest uppercase ml-1">Avg Rating</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-black text-[#0B1222] dark:text-white">
                {data.summary.totalReviews || 0}
              </span>
              <span className="text-[9px] font-black text-[#0B1222]/35 dark:text-gray-400 tracking-widest uppercase">Reviews</span>
            </div>
          </div>
        </section>

        {/* Service Filter Chips */}
        {serviceFilters.length > 1 && (
          <section className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {serviceFilters.map((service) => (
              <button
                key={service}
                onClick={() => setSelectedService(service)}
                className={`px-2.5 py-1 rounded-[10px] whitespace-nowrap text-[9px] font-black tracking-widest transition-all ${
                  selectedService === service
                    ? 'bg-[#00246b] text-white shadow-lg shadow-[#00246b]/20'
                    : 'bg-white dark:bg-gray-900 text-[#0B1222] dark:text-white border border-[#00246b]/10 dark:border-gray-800'
                }`}
              >
                {service}
              </button>
            ))}
          </section>
        )}

        {/* Reviews List */}
        <section className="space-y-1.5">
          {filteredReviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-900/40 p-6 text-center">
              <MessageSquareText size={20} className="mx-auto text-slate-300 dark:text-gray-700" />
              <p className="mt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                No reviews found
              </p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div
                key={review._id}
                className="bg-white dark:bg-gray-900 border border-[#00246b]/10 dark:border-gray-800 rounded-xl px-3 py-2 shadow-sm"
              >
                {/* Top row: avatar + name + rating + date */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 dark:bg-gray-800 shrink-0">
                      {review.user?.image ? (
                        <img src={review.user.image} alt={review.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-gray-300">
                          {(review.user?.name || 'U').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[11px] font-black text-[#0B1222] dark:text-white truncate leading-tight">
                        {review.user?.name || 'Verified User'}
                      </h3>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={8}
                            className={star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 dark:text-gray-700'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 shrink-0">
                    <CalendarDays size={9} />
                    {dayjs(review.date).format('DD MMM YY')}
                  </div>
                </div>

                {/* Comment */}
                {review.comment ? (
                  <p className="text-[10px] font-semibold text-slate-600 dark:text-gray-300 leading-snug mt-1.5">
                    {review.comment}
                  </p>
                ) : (
                  <p className="text-[8px] font-black text-slate-300 dark:text-gray-600 uppercase tracking-widest mt-1">
                    No written comment
                  </p>
                )}

                {/* Service Tags */}
                {(review.services || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {review.services.map((service) => (
                      <span
                        key={`${review._id}-${service}`}
                        className="px-1.5 py-0.5 rounded-md bg-[#00246b]/5 dark:bg-white/5 border border-[#00246b]/10 dark:border-gray-800 text-[7px] font-black text-[#0B1222] dark:text-white uppercase tracking-widest"
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
