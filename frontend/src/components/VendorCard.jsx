import React from 'react';
import { Star, MapPin } from 'lucide-react';
import { cn } from '../utils/cn';
import Card from './Card';
import { useNavigate } from 'react-router-dom';

const VendorCard = ({ vendor, variant = 'full' }) => {
  const navigate = useNavigate();
  const isSmall = variant === 'small';

  return (
    <Card
      className={cn(
        "p-0 overflow-hidden border border-slate-200/60 dark:border-gray-800 shadow-sm transition-all duration-300 w-full h-auto bg-white dark:bg-gray-950 rounded-2xl relative active:scale-[0.98]"
      )}
      onClick={() => navigate(`/service/${vendor._id}`)}
    >
      {/* Top: Image HUB */}
      <div className="relative w-full aspect-[16/6] min-h-[140px] overflow-hidden bg-slate-50 dark:bg-gray-900 border-b border-slate-50 dark:border-gray-800">
        <img
          src={vendor.shopImage || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200'}
          alt={vendor.shopName}
          className="w-full h-full object-cover transition-transform duration-700"
        />
        {!vendor.isShopOpen && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-white text-slate-900 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-xl">Closed</span>
          </div>
        )}

        {/* Elite Rating Floating Node */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-1.5 py-1 rounded-lg shadow-xl border border-white/20">
          <Star size={10} fill="#F59E0B" className="text-amber-500 border-none" />
          <span className="text-[10px] font-black text-slate-900 dark:text-white leading-none">{vendor.rating || '4.6'}</span>
        </div>
      </div>

      {/* Bottom: Content HUB */}
      <div className={cn("p-3 space-y-2.5")}>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0 leading-none">
            <h3 className={cn("font-extrabold text-[#1C2C4E] dark:text-white truncate uppercase tracking-tight text-[11px]")}>
              {vendor.shopName}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 opacity-60">
              <MapPin size={10} strokeWidth={3} className="text-slate-400 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {((vendor.dist?.calculated || 1100) / 1000).toFixed(1)} km away
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-50 dark:border-gray-800/60">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-black text-slate-900 dark:text-white italic tracking-tight leading-none">₹{vendor.price || '120'}</p>
            {vendor.serviceCount > 1 && (
              <span className="text-[7px] font-black text-primary border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded-lg uppercase tracking-widest leading-none">
                +{vendor.serviceCount - 1} MORE
              </span>
            )}
          </div>

          <button
            className={cn(
              "font-black uppercase tracking-widest bg-slate-900 text-white shadow-xl transition-all px-4 py-2 text-[8px] rounded-lg border-b-2 border-white/10 active:scale-90"
            )}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/service/${vendor._id}`);
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </Card>
  );
};

export default VendorCard;
