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
      basic: "bg-gray-100 text-gray-500 border-gray-200",
      standard: "bg-blue-50 text-blue-500 border-blue-100",
      premium: "bg-purple-50 text-purple-500 border-purple-100"
    };
    return (
      <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full border", styles[level] || styles.basic)}>
        {level}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-50 text-amber-500",
      active: "bg-emerald-50 text-emerald-500",
      approved: "bg-blue-50 text-blue-500",
      blocked: "bg-red-50 text-red-500",
      rejected: "bg-gray-100 text-gray-400"
    };
    return (
      <span className={cn("text-[10px] font-black uppercase px-2 py-1 rounded-lg", styles[status])}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* 🔍 TOP CONTROL BAR */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-black dark:text-white tracking-tight italic">Vendor Fleet 🏪</h1>
            <div className="flex items-center gap-2">
               <button onClick={fetchVendors} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-primary transition-colors">
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-1">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
               <input 
                 type="text"
                 placeholder="Search shop, owner..."
                 className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-primary/20 outline-none transition-all dark:text-white"
                 value={filters.search}
                 onChange={(e) => setFilters({...filters, search: e.target.value})}
               />
            </div>
            {['status', 'serviceLevel', 'planType', 'isActive'].map((f) => (
               <select 
                 key={f}
                 className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 focus:ring-2 ring-primary/20 outline-none appearance-none"
                 value={filters[f]}
                 onChange={(e) => setFilters({...filters, [f]: e.target.value})}
               >
                  <option value="">{f.toUpperCase()}</option>
                  {f === 'status' && ['pending', 'active', 'blocked'].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                  {f === 'serviceLevel' && ['basic', 'standard', 'premium'].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                  {f === 'planType' && ['daily', 'monthly', 'trial'].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                  {f === 'isActive' && [<option key="t" value="true">VISIBILE</option>, <option key="f" value="false">HIDDEN</option>]}
               </select>
            ))}
         </div>
      </div>

      {/* 📋 TABLE VIEW */}
      <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden overflow-x-auto">
         <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
               <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Shop Details</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Owner</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Level & Plan</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Wallet</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Active</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Actions</th>
               </tr>
            </thead>
            <tbody>
               <AnimatePresence mode='popLayout'>
                  {vendors.map((vendor) => (
                    <motion.tr 
                      key={vendor._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => { setSelectedVendor(vendor); setIsDrawerOpen(true); }}
                      className="group border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 cursor-pointer transition-colors"
                    >
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-lg">
                                {vendor.shopName.charAt(0)}
                             </div>
                             <div>
                                <h4 className="font-black dark:text-white group-hover:text-primary transition-colors uppercase tracking-tight">{vendor.shopName}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                   <MapPin size={10} /> {vendor.location?.address?.split(',')[0] || 'N/A'}
                                </p>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-6 text-xs font-black dark:text-white uppercase">
                          {vendor.ownerId?.name}
                       </td>
                       <td className="px-6 py-6 space-y-2">
                          {getLevelBadge(vendor.serviceLevel)}
                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                             {vendor.subscription?.type || 'No Plan'}
                          </div>
                       </td>
                       <td className="px-6 py-6">
                          <span className={cn(
                            "text-sm font-black",
                            vendor.walletBalance < 100 ? "text-red-500" : "text-emerald-500"
                          )}>
                             ₹{vendor.walletBalance.toFixed(2)}
                          </span>
                       </td>
                       <td className="px-6 py-6">
                          {getStatusBadge(vendor.status)}
                       </td>
                       <td className="px-6 py-6 text-center">
                          <div className={cn(
                            "inline-flex w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm",
                            vendor.isActive ? "bg-emerald-500" : "bg-red-500"
                          )} />
                       </td>
                       <td className="px-8 py-6 text-right">
                          <button className="p-2 text-gray-300 hover:text-primary transition-colors">
                             <ChevronRight size={20} />
                          </button>
                       </td>
                    </motion.tr>
                  ))}
               </AnimatePresence>
            </tbody>
         </table>
         
         {vendors.length === 0 && !loading && (
           <div className="p-20 text-center space-y-4">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
                 <Store size={40} />
              </div>
              <p className="font-black text-gray-400 uppercase tracking-widest text-sm">No vendors found</p>
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
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-xl bg-white dark:bg-gray-900 z-[110] shadow-2xl flex flex-col"
            >
               {/* Drawer Header */}
               <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-primary text-white rounded-[1.5rem] flex items-center justify-center font-black text-2xl italic">
                        {selectedVendor.shopName.charAt(0)}
                     </div>
                     <div>
                        <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">{selectedVendor.shopName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                           {getLevelBadge(selectedVendor.serviceLevel)}
                           {getStatusBadge(selectedVendor.status)}
                        </div>
                     </div>
                  </div>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400"
                  >
                     <XCircle size={24} />
                  </button>
               </div>

               {/* Drawer Content */}
               <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  
                  {/* HARD BLOCK WARNING */}
                  {(selectedVendor.walletBalance < 100 || !selectedVendor.subscription?.isActive) && (
                    <div className="p-5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-3xl flex items-center gap-4 text-red-500">
                       <AlertCircle size={24} className="shrink-0" />
                       <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                          ⚠️ Vendor Inactive — Not visible to customers due to low balance or expired plan.
                       </p>
                    </div>
                  )}

                  {/* INFO GRID */}
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-6">
                        <Section title="Basic Info" icon={User}>
                           <InfoItem label="Owner" value={selectedVendor.ownerId?.name} />
                           <InfoItem label="Phone" value={selectedVendor.ownerId?.phone} />
                           <InfoItem label="Location" value={selectedVendor.location?.address} />
                           <InfoItem label="Category" value={selectedVendor.category?.name || 'Uncategorized'} />
                        </Section>

                        <Section title="Performance" icon={TrendingUp}>
                           <div className="grid grid-cols-2 gap-4">
                              <Stat label="Total Orders" value={selectedVendor.totalBookings || '120'} />
                              <Stat label="Earnings" value={`₹${selectedVendor.totalEarnings || '45k'}`} />
                              <Stat label="Views" value={selectedVendor.engagement?.profileViews || '0'} icon={Eye} />
                              <Stat label="Clicks" value={selectedVendor.engagement?.serviceClicks || '0'} icon={MousePointer2} />
                           </div>
                        </Section>
                     </div>

                     <div className="space-y-6">
                        <Section title="Subscription" icon={CreditCard}>
                           <InfoItem label="Current Plan" value={selectedVendor.subscription?.type?.toUpperCase() || 'NONE'} />
                           <InfoItem label="Wallet" value={`₹${selectedVendor.walletBalance.toFixed(2)}`} highlight={selectedVendor.walletBalance < 100} />
                           <InfoItem label="Next Deduction" value={selectedVendor.subscription?.nextDeductionDate ? new Date(selectedVendor.subscription.nextDeductionDate).toLocaleDateString() : 'N/A'} />
                           <div className="mt-4">
                              <button 
                                onClick={() => handleAction(selectedVendor._id, 'toggle-active')}
                                className={cn(
                                  "w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border",
                                  selectedVendor.isActive 
                                    ? "bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/20" 
                                    : "bg-gray-100 text-gray-400 border-gray-200"
                                )}
                              >
                                 {selectedVendor.isActive ? "Visible in Marketplace" : "Force Hidden"}
                              </button>
                           </div>
                        </Section>

                        <Section title="Quick Actions" icon={Zap}>
                           <div className="grid grid-cols-2 gap-3">
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
                                icon={Ban} label={selectedVendor.status === 'blocked' ? "Unblock" : "Block"} color="red" 
                                active={selectedVendor.status === 'blocked'}
                              />
                              <ActionButton 
                                onClick={() => {
                                  const amount = prompt('Enter amount to add:');
                                  if (amount) handleAction(selectedVendor._id, 'add-balance', { amount: Number(amount) });
                                }} 
                                icon={Wallet} label="Add Balance" color="primary" 
                              />
                           </div>
                        </Section>
                     </div>
                  </div>
                  
                  {/* VERIFICATION DOCUMENTS */}
                  <Section title="Verification Documents" icon={Shield}>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedVendor.panCard ? (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">PAN Card</p>
                          <a href={selectedVendor.panCard} target="_blank" rel="noreferrer" className="block h-48 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden group relative">
                             <img src={selectedVendor.panCard} alt="PAN" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="text-white" size={24} />
                             </div>
                          </a>
                        </div>
                      ) : (
                        <div className="h-48 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-[10px] font-black text-gray-300 uppercase italic">PAN Missing</div>
                      )}
                      
                      {selectedVendor.aadhaar ? (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Aadhaar Card</p>
                          <a href={selectedVendor.aadhaar} target="_blank" rel="noreferrer" className="block h-48 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden group relative">
                             <img src={selectedVendor.aadhaar} alt="Aadhaar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="text-white" size={24} />
                             </div>
                          </a>
                        </div>
                      ) : (
                        <div className="h-48 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-[10px] font-black text-gray-300 uppercase italic">Aadhaar Missing</div>
                      )}
                    </div>
                  </Section>

                  {/* RECENT ACTIVITY */}
                  <Section title="Recent Activity" icon={History}>
                     <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border border-dashed border-gray-200 dark:border-gray-700">
                        Activity Logs Coming Soon...
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
  <div className="space-y-4">
     <div className="flex items-center gap-2 px-2">
        <Icon size={16} className="text-primary" />
        <h3 className="text-xs font-black dark:text-white uppercase tracking-widest">{title}</h3>
     </div>
     <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-4">
        {children}
     </div>
  </div>
);

const InfoItem = ({ label, value, highlight }) => (
  <div>
     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
     <p className={cn("text-xs font-black uppercase dark:text-white", highlight && "text-red-500")}>
        {value || '---'}
     </p>
  </div>
);

const Stat = ({ label, value, icon: Icon }) => (
  <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
     <p className="text-[8px] font-black text-gray-400 uppercase mb-1">{label}</p>
     <div className="flex items-center justify-center gap-1">
        {Icon && <Icon size={10} className="text-primary" />}
        <span className="text-sm font-black dark:text-white">{value}</span>
     </div>
  </div>
);

const ActionButton = ({ icon: Icon, label, color, onClick, active }) => {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-500 border-emerald-100 active:bg-emerald-500 active:text-white",
    red: "bg-red-50 text-red-500 border-red-100 active:bg-red-500 active:text-white",
    primary: "bg-primary/5 text-primary border-primary/10 active:bg-primary active:text-white"
  };
  
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all active:scale-95",
        colors[color],
        active && color === 'red' && "bg-red-500 text-white"
      )}
    >
       <Icon size={20} />
       <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
};

export default VendorManagement;
