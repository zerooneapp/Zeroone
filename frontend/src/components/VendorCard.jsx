import React from 'react';
import { Star, MapPin, Home } from 'lucide-react';
import { cn } from '../utils/cn';
import Card from './Card';
import { useNavigate } from 'react-router-dom';

const VendorCard = ({ vendor, variant = 'full' }) => {
  const navigate = useNavigate();
  const isSmall = variant === 'small';
  const distanceInKm =
    typeof vendor.dist?.calculated === 'number'
      ? vendor.dist.calculated / 1000
      : null;
  const supportsHomeService =
    vendor.serviceType === 'home' ||
    vendor.serviceType === 'both' ||
    (vendor.services || []).some((service) => service.type === 'home' || service.type === 'both');

  return (
    <Card 
      className={cn(
        "p-0 overflow-hidden border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-xl transition-all duration-500 w-full h-auto bg-white/95 dark:bg-gray-900/80 rounded-[24px] mb-1.5 active:scale-[0.98]"
      )} 
      onClick={() => navigate(`/service/${vendor._id}`)}
    >
      {/* Top: Image HUB (Balanced Visual) */}
      <div className="relative w-full aspect-[16/5.2] min-h-[110px] overflow-hidden">
        <img 
          src={vendor.serviceImage || vendor.images?.[0] || vendor.shopImage || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200'} 
          alt={vendor.shopName} 
          className="w-full h-full object-cover bg-gray-100 opacity-90 transition-transform duration-700"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200';
          }}
        />
        {!vendor.isShopOpen && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
             <span className="bg-white text-[#1C2C4E] px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">Closed</span>
          </div>
        )}
      </div>

      {/* Bottom: Content HUB (Elite Density) */}
      <div className={cn("p-2.5 flex flex-col justify-between space-y-1")}>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className={cn("font-black text-[#1C2C4E] dark:text-white truncate capitalize tracking-tighter leading-none text-[13px]")}>
              {vendor.shopName}
            </h3>
            <div className="flex items-center gap-1 mt-0 opacity-80">
              <MapPin size={10} className="text-[#0B1222] dark:text-blue-400 shrink-0" />
              <span className="text-[10px] font-bold capitalize truncate text-[#0B1222] dark:text-gray-300">
                {distanceInKm !== null ? `${distanceInKm.toFixed(1)} km away` : 'Nearby'}
              </span>
            </div>
            {supportsHomeService && (
              <div className="mt-1 inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                <Home size={9} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Home Service</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 bg-[#1C2C4E]/5 dark:bg-white/10 px-1.5 py-0.5 rounded-lg shrink-0">
            <Star size={10} fill="#1C2C4E" className="text-[#1C2C4E] dark:text-blue-400" />
            <span className="text-[10px] font-black text-[#1C2C4E] dark:text-white">{vendor.rating || '4.6'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800/50">
           <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-[11px] font-bold text-[#1C2C4E] dark:text-gray-300 truncate flex-shrink">
                 {vendor.service || 'Service'}
              </span>
               <div className="flex flex-col items-start gap-0.5">
                  <div className="flex items-center gap-1.5 leading-none">
                     <p className="text-[14px] font-black text-[#1C2C4E] dark:text-white whitespace-nowrap">
                        ₹{vendor.discountedPrice || vendor.price || '120'}
                     </p>
                     {vendor.discountedPrice && (
                        <span className="text-[10px] font-bold text-gray-400 line-through">₹{vendor.price}</span>
                     )}
                  </div>
                  {vendor.offerLabel && (
                     <div className="flex items-center gap-1 bg-red-500 rounded-md px-1 py-0.5 shadow-sm shadow-red-500/10">
                        <Tag size={6} className="text-white fill-white" />
                        <span className="text-[7.5px] font-black text-white uppercase tracking-wider">{vendor.offerLabel}</span>
                     </div>
                  )}
               </div>
              {vendor.serviceCount > 1 && (
                <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/10 px-1.5 py-0.5 rounded-lg uppercase tracking-tighter shrink-0">
                  + {vendor.serviceCount - 1}
                </span>
              )}
           </div>

           <button 
             className={cn(
               "font-black tracking-wider capitalize bg-[#1C2C4E] text-white shadow-sm transition-all px-3 py-1.5 text-[11px] rounded-lg"
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
