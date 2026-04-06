import React, { useState, useEffect, useCallback } from 'react';
import {
   Search, Filter, RefreshCw, MoreVertical,
   ChevronRight, Store, User, Phone, MapPin,
   CreditCard, Wallet, Zap, Star, Shield,
   CheckCircle, XCircle, Ban, Plus, History,
   LayoutDashboard, TrendingUp, Eye, MousePointer2,
   AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const VendorManagement = () => {
   const [vendors, setVendors] = useState([]);
   const [loading, setLoading] = useState(true);
   const [selectedVendor, setSelectedVendor] = useState(null);
   const [isDrawerOpen, setIsDrawerOpen] = useState(false);
   const [minimumWalletThreshold, setMinimumWalletThreshold] = useState(100);

   // Filters State
   const [filters, setFilters] = useState({
      search: '',
      status: '',
      serviceLevel: '',
      planType: '',
      isActive: ''
   });
   const [page, setPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);

   const fetchVendors = useCallback(async () => {
      try {
         setLoading(true);
         const params = {
            ...filters,
            page,
            limit: 10
         };
         // Clean empty filters
         Object.keys(params).forEach(key => !params[key] && delete params[key]);

         const res = await api.get('/admin/vendors', { params });
         setVendors(res.data.vendors);
         setTotalPages(res.data.totalPages);
         setMinimumWalletThreshold(res.data.minimumWalletThreshold || 100);
      } catch (err) {
         toast.error('Failed to fetch vendors');
      } finally {
         setLoading(false);
      }
   }, [filters, page]);

   useEffect(() => {
      const timer = setTimeout(fetchVendors, 300);
      return () => clearTimeout(timer);
   }, [fetchVendors]);

   const handleAction = async (vendorId, action, payload = {}) => {
      // Optimistic UI
      const previousVendors = [...vendors];
      try {
         if (action === 'approve') {
            await api.patch(`/admin/vendors/${vendorId}/approve`);
            toast.success('Vendor Approved ✅');
         } else if (action === 'reject') {
            await api.patch(`/admin/vendors/${vendorId}/reject`, payload);
            toast.success('Vendor Rejected ❌');
         } else if (action === 'block') {
            await api.patch(`/admin/vendors/${vendorId}/block`);
            toast.success('Status Toggled 🚫');
         } else if (action === 'toggle-active') {
            await api.patch(`/admin/vendors/${vendorId}/toggle-active`);
            toast.success('Visibility Toggled ⚡');
         } else if (action === 'add-balance') {
            await api.patch(`/admin/vendors/${vendorId}/add-balance`, payload);
            toast.success('Balance Added 💰');
         }

         fetchVendors();
         if (selectedVendor && selectedVendor._id === vendorId) {
            // Refresh drawer data if needed
            const updated = await api.get(`/admin/vendors?search=${selectedVendor.shopName}`);
            setSelectedVendor(updated.data.vendors[0]);
         }
      } catch (err) {
         setVendors(previousVendors);
         toast.error(err.response?.data?.message || 'Action failed');
      }
   };

   const getLevelBadge = (level) => {
      const styles = {
         basic: "bg-slate-50 text-slate-400 border-slate-200",
         standard: "bg-blue-50 text-blue-500 border-blue-100",
         premium: "bg-purple-50 text-purple-500 border-purple-100",
         luxury: "bg-amber-50 text-amber-600 border-amber-200"
      };
      return (
         <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-md border tracking-tighter", styles[level] || styles.basic)}>
            {level}
         </span>
      );
   };

   const getStatusBadge = (status) => {
      const styles = {
         pending: "bg-amber-50 text-amber-500 border-amber-100/50",
         active: "bg-emerald-50 text-emerald-500 border-emerald-100/50",
         inactive: "bg-orange-50 text-orange-500 border-orange-100/50",
         approved: "bg-blue-50 text-blue-500 border-blue-100/50",
         blocked: "bg-red-50 text-red-500 border-red-100/50",
         rejected: "bg-slate-50 text-slate-300 border-slate-200"
      };
      return (
         <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-md border tracking-tighter", styles[status])}>
            {status}
         </span>
      );
   };

   return (
      <div className="space-y-5 pb-20 animate-in fade-in duration-500">

         {/* 🔍 TOP CONTROL BAR */}
         <div className="p-4 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-[20px] font-black text-slate-900 dark:text-white tracking-tight uppercase">Vendor Fleet</h1>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 opacity-60">Manage your elite merchant network</p>
               </div>
               <div className="flex items-center gap-2">
                  <button onClick={fetchVendors} className="p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl text-slate-400 border border-slate-100 dark:border-gray-700 active:scale-90 transition-all">
                     <RefreshCw size={16} strokeWidth={3} className={loading ? "animate-spin" : ""} />
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
               <div className="relative lg:col-span-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} strokeWidth={3} />
                  <input
                     type="text"
                     placeholder="Search shop, owner..."
                     className="w-full pl-10 pr-4 h-10 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[12px] font-black uppercase tracking-tight focus:ring-2 ring-primary/20 outline-none transition-all dark:text-white placeholder:text-slate-300"
                     value={filters.search}
                     onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
               </div>
               {['status', 'serviceLevel', 'planType', 'isActive'].map((f) => (
                  <select
                     key={f}
                     className="px-3.5 h-10 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 focus:ring-2 ring-primary/20 outline-none appearance-none cursor-pointer"
                     value={filters[f]}
                     onChange={(e) => setFilters({ ...filters, [f]: e.target.value })}
                  >
                     <option value="">{f.toUpperCase()}</option>
                     {f === 'status' && ['pending', 'active', 'inactive', 'blocked', 'rejected'].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                     {f === 'serviceLevel' && ['standard', 'premium', 'luxury'].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                     {f === 'planType' && ['daily', 'monthly', 'trial'].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                     {f === 'isActive' && [<option key="t" value="true">VISIBLE</option>, <option key="f" value="false">HIDDEN</option>]}
                  </select>
               ))}
            </div>
         </div>

         {/* 📋 TABLE VIEW */}
         <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50/50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-800">
                     <th className="px-5 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Shop Details</th>
                     <th className="px-3 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Owner</th>
                     <th className="px-3 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Level & Plan</th>
                     <th className="px-3 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Wallet</th>
                     <th className="px-3 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Status</th>
                     <th className="px-3 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60 text-center">Active</th>
                     <th className="px-5 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                  <AnimatePresence mode='popLayout'>
                     {vendors.map((vendor) => (
                        <motion.tr
                           key={vendor._id}
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           exit={{ opacity: 0 }}
                           onClick={() => { setSelectedVendor(vendor); setIsDrawerOpen(true); }}
                           className="group hover:bg-slate-50/80 dark:hover:bg-gray-800/80 cursor-pointer transition-all"
                        >
                           <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3.5">
                                 <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[15px] italic shadow-lg border border-white/10">
                                    {vendor.shopName.charAt(0)}
                                 </div>
                                 <div className="leading-tight">
                                    <h4 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors">{vendor.shopName}</h4>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                                       <MapPin size={8} strokeWidth={3} /> {vendor.location?.address?.split(',')[0] || 'N/A'}
                                    </p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-3 py-3.5 text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight opacity-80">
                              {vendor.ownerId?.name}
                           </td>
                           <td className="px-3 py-3.5  leading-none">
                              <div className="flex flex-col gap-1.5">
                                 <span className={cn("text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md border text-center w-fit",
                                    vendor.serviceLevel === 'basic' ? "bg-slate-50 text-slate-400 border-slate-200" :
                                       vendor.serviceLevel === 'standard' ? "bg-blue-50 text-blue-500 border-blue-100" :
                                          vendor.serviceLevel === 'premium' ? "bg-purple-50 text-purple-500 border-purple-100" :
                                             "bg-amber-50 text-amber-600 border-amber-200"
                                 )}>
                                    {vendor.serviceLevel}
                                 </span>
                                 <div className="text-[7.5px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest pl-0.5 italic">
                                    {vendor.subscription?.type || 'No Plan'}
                                 </div>
                              </div>
                           </td>
                           <td className="px-3 py-3.5">
                              <span className={cn(
                                 "text-[13px] font-black italic tracking-tighter",
                                 vendor.walletBalance < minimumWalletThreshold ? "text-red-500" : "text-emerald-500"
                              )}>
                                 ₹{vendor.walletBalance.toFixed(2)}
                              </span>
                           </td>
                           <td className="px-3 py-3.5">
                              {getStatusBadge(vendor.status)}
                           </td>
                           <td className="px-3 py-3.5 text-center">
                              <div className={cn(
                                 "inline-flex w-2.5 h-2.5 rounded-full border border-white dark:border-gray-900 shadow-sm",
                                 vendor.isActive ? "bg-emerald-500" : "bg-red-500"
                              )} />
                           </td>
                           <td className="px-5 py-3.5 text-right">
                              <button className="p-1.5 text-slate-200 group-hover:text-primary transition-all active:scale-95">
                                 <ChevronRight size={16} strokeWidth={3} />
                              </button>
                           </td>
                        </motion.tr>
                     ))}
                  </AnimatePresence>
               </tbody>
            </table>

            {vendors.length === 0 && !loading && (
               <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-slate-200 dark:text-slate-700 border border-slate-100 dark:border-gray-700">
                     <Store size={32} strokeWidth={3} />
                  </div>
                  <p className="font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest text-[9px] italic">No elite vendors found</p>
               </div>
            )}
         </div>

         {/* 🚀 HYBRID DRAWER */}
         <AnimatePresence>
            {isDrawerOpen && selectedVendor && (
               <>
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => setIsDrawerOpen(false)}
                     className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                  />
                  <motion.div
                     initial={{ x: '100%' }}
                     animate={{ x: 0 }}
                     exit={{ x: '100%' }}
                     transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                     className="fixed inset-y-0 right-0 w-full max-w-xl bg-white dark:bg-gray-950 z-[110] shadow-2xl flex flex-col border-l border-slate-200/60 dark:border-gray-800"
                  >
                     {/* Drawer Header */}
                     <div className="p-6 px-7 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-950 sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-slate-900 dark:bg-primary text-white rounded-xl flex items-center justify-center font-black text-[18px] shadow-xl italic border border-white/10">
                              {selectedVendor.shopName.charAt(0)}
                           </div>
                           <div className="leading-tight pt-1">
                              <h2 className="text-[18px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedVendor.shopName}</h2>
                              <div className="flex items-center gap-2 mt-1.5">
                                 {getLevelBadge(selectedVendor.serviceLevel)}
                                 {getStatusBadge(selectedVendor.status)}
                              </div>
                           </div>
                        </div>
                        <button
                           onClick={() => setIsDrawerOpen(false)}
                           className="p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl text-slate-400 active:scale-95 transition-all border border-slate-100 dark:border-gray-700"
                        >
                           <XCircle size={18} strokeWidth={3} />
                        </button>
                     </div>

                     {/* Drawer Content */}
                     <div className="flex-1 overflow-y-auto p-6 px-7 space-y-6 no-scrollbar pb-32">

                        {/* HARD BLOCK WARNING */}
                        {(selectedVendor.walletBalance < minimumWalletThreshold || !selectedVendor.subscription?.isActive) && (
                           <div className="p-3.5 px-5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-4 text-red-500">
                              <AlertCircle size={20} strokeWidth={3} className="shrink-0" />
                              <p className="text-[9px] font-black uppercase tracking-widest leading-normal">
                                 Vendor Inactive — Restricted from marketplace visibility.
                              </p>
                           </div>
                        )}

                        {/* INFO GRID */}
                        <div className="grid grid-cols-2 gap-5">
                           <div className="space-y-6">
                              <Section title="Fleet Node Info" icon={User}>
                                 <InfoItem label="Owner Entity" value={selectedVendor.ownerId?.name} />
                                 <InfoItem label="Comms Node" value={selectedVendor.ownerId?.phone} />
                                 <InfoItem label="Base Registry" value={selectedVendor.location?.address} />
                                 <InfoItem label="Market Node" value={selectedVendor.category?.name || 'Uncategorized'} />
                              </Section>

                              <Section title="Performance" icon={TrendingUp}>
                                 <div className="grid grid-cols-2 gap-3">
                                    <Stat label="Orders" value={selectedVendor.totalBookings || '120'} />
                                    <Stat label="Revenue" value={`₹${selectedVendor.totalEarnings || '45k'}`} />
                                    <Stat label="Reach" value={selectedVendor.engagement?.profileViews || '0'} icon={Eye} />
                                    <Stat label="CTR" value={selectedVendor.engagement?.serviceClicks || '0'} icon={MousePointer2} />
                                 </div>
                              </Section>
                           </div>

                           <div className="space-y-6">
                              <Section title="Financials" icon={CreditCard}>
                                 <InfoItem label="Active Plan" value={selectedVendor.subscription?.type?.toUpperCase() || 'NONE'} />
                                 <InfoItem label="Vault Balance" value={`₹${selectedVendor.walletBalance.toFixed(2)}`} highlight={selectedVendor.walletBalance < minimumWalletThreshold} />
                                 <InfoItem label="Next Sync" value={selectedVendor.subscription?.nextDeductionDate ? new Date(selectedVendor.subscription.nextDeductionDate).toLocaleDateString() : 'N/A'} />
                                 <div className="mt-4">
                                    <button
                                       onClick={() => handleAction(selectedVendor._id, 'toggle-active')}
                                       className={cn(
                                          "w-full py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border shadow-sm active:scale-95",
                                          selectedVendor.isActive
                                             ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                                             : "bg-slate-50 text-slate-400 border-slate-200"
                                       )}
                                    >
                                       {selectedVendor.isActive ? "Marketplace Visible" : "Force Hidden"}
                                    </button>
                                 </div>
                              </Section>

                              <Section title="Command Actions" icon={Zap}>
                                 <div className="grid grid-cols-2 gap-2.5">
                                    {selectedVendor.status === 'pending' && (
                                       <>
                                          <ActionButton
                                             onClick={() => handleAction(selectedVendor._id, 'approve')}
                                             icon={CheckCircle} label="Approve" color="emerald"
                                          />
                                          <ActionButton
                                             onClick={() => handleAction(selectedVendor._id, 'reject')}
                                             icon={XCircle} label="Reject" color="red"
                                          />
                                       </>
                                    )}
                                    <ActionButton
                                       onClick={() => handleAction(selectedVendor._id, 'block')}
                                       icon={Ban} label={selectedVendor.status === 'blocked' ? "Restore" : "Suspend"} color="red"
                                       active={selectedVendor.status === 'blocked'}
                                    />
                                    <ActionButton
                                       onClick={() => {
                                          const amount = prompt('Enter amount to add:');
                                          if (amount) handleAction(selectedVendor._id, 'add-balance', { amount: Number(amount) });
                                       }}
                                       icon={Wallet} label="Add Credit" color="primary"
                                    />
                                 </div>
                              </Section>
                           </div>
                        </div>

                        {/* VERIFICATION DOCUMENTS */}
                        <Section title="Elite Registry Vault" icon={Shield}>
                           <div className="grid grid-cols-2 gap-3.5">
                              {selectedVendor.panCard ? (
                                 <div className="space-y-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">PAN Card</p>
                                    <a href={selectedVendor.panCard} target="_blank" rel="noreferrer" className="block h-40 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 overflow-hidden group relative active:scale-[0.98] transition-all">
                                       <img src={selectedVendor.panCard} alt="PAN" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                       <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                          <Eye size={20} strokeWidth={3} className="text-white" />
                                       </div>
                                    </a>
                                 </div>
                              ) : (
                                 <div className="h-40 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-slate-200 dark:border-gray-700 flex items-center justify-center text-[8px] font-black text-slate-300 uppercase italic">PAN Entry Missing</div>
                              )}

                              {selectedVendor.aadhaarFront ? (
                                 <div className="space-y-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Aadhaar Front</p>
                                    <a href={selectedVendor.aadhaarFront} target="_blank" rel="noreferrer" className="block h-40 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 overflow-hidden group relative active:scale-[0.98] transition-all">
                                       <img src={selectedVendor.aadhaarFront} alt="Aadhaar Front" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                       <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                          <Eye size={20} strokeWidth={3} className="text-white" />
                                       </div>
                                    </a>
                                 </div>
                              ) : (
                                 <div className="h-40 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-slate-200 dark:border-gray-700 flex items-center justify-center text-[8px] font-black text-slate-300 uppercase leading-tight text-center p-4 italic">Aadhaar<br />Front Missing</div>
                              )}

                              {selectedVendor.aadhaarBack ? (
                                 <div className="space-y-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Aadhaar Back</p>
                                    <a href={selectedVendor.aadhaarBack} target="_blank" rel="noreferrer" className="block h-40 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 overflow-hidden group relative active:scale-[0.98] transition-all">
                                       <img src={selectedVendor.aadhaarBack} alt="Aadhaar Back" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                       <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                          <Eye size={20} strokeWidth={3} className="text-white" />
                                       </div>
                                    </a>
                                 </div>
                              ) : (
                                 <div className="h-40 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-slate-200 dark:border-gray-700 flex items-center justify-center text-[8px] font-black text-slate-300 uppercase leading-tight text-center p-4 italic">Aadhaar<br />Back Missing</div>
                              )}
                           </div>
                        </Section>

                        {/* RECENT ACTIVITY */}
                        <Section title="System Activity" icon={History}>
                           <div className="bg-slate-50 dark:bg-gray-800/40 rounded-xl p-6 text-center text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] border border-dashed border-slate-200 dark:border-gray-800 italic">
                              Activity Logs Encrypted
                           </div>
                        </Section>

                     </div>

                  </motion.div>
               </>
            )}
         </AnimatePresence>

      </div>
   );
};

// --- SUB COMPONENTS ---

const Section = ({ title, icon: Icon, children }) => (
   <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
         <Icon size={14} strokeWidth={3} className="text-primary" />
         <h3 className="text-[10px] font-black italic text-slate-900 dark:text-white uppercase tracking-[0.15em] opacity-80">{title}</h3>
      </div>
      <div className="p-4.5 bg-slate-50 dark:bg-gray-900/40 rounded-xl border border-slate-100 dark:border-gray-800 space-y-3.5">
         {children}
      </div>
   </div>
);

const InfoItem = ({ label, value, highlight }) => (
   <div className="leading-tight">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-60">{label}</p>
      <p className={cn("text-[11px] font-black uppercase dark:text-white tracking-tight", highlight && "text-red-500")}>
         {value || '---'}
      </p>
   </div>
);

const Stat = ({ label, value, icon: Icon }) => (
   <div className="p-3 bg-white dark:bg-gray-950 rounded-xl border border-slate-100 dark:border-gray-800 text-center shadow-sm">
      <p className="text-[7.5px] font-black text-slate-400 uppercase mb-1 tracking-tighter opacity-70">{label}</p>
      <div className="flex items-center justify-center gap-1">
         {Icon && <Icon size={9} strokeWidth={3} className="text-primary" />}
         <span className="text-[12px] font-black dark:text-white italic">{value}</span>
      </div>
   </div>
);

const ActionButton = ({ icon: Icon, label, color, onClick, active }) => {
   const colors = {
      emerald: "bg-emerald-50 text-emerald-500 border-emerald-100/50 active:bg-emerald-500 active:text-white",
      red: "bg-red-50 text-red-500 border-red-100/50 active:bg-red-500 active:text-white",
      primary: "bg-primary/5 text-primary border-primary/10 active:bg-primary active:text-white"
   };

   return (
      <button
         onClick={onClick}
         className={cn(
            "flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border transition-all active:scale-[0.9] shadow-sm",
            colors[color],
            active && color === 'red' && "bg-red-500 text-white"
         )}
      >
         <Icon size={18} strokeWidth={3} />
         <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
      </button>
   );
};

export default VendorManagement;
