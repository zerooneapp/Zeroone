import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, ChevronRight, ChevronDown, Store, User, MapPin,
  CreditCard, Wallet, Zap, Shield, CheckCircle, XCircle, Ban,
  Plus, History, TrendingUp, Eye, MousePointer2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';
import dayjs from 'dayjs';

const VendorManagement = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [minimumWalletThreshold, setMinimumWalletThreshold] = useState(100);
  const [vendorInsights, setVendorInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsRange, setInsightsRange] = useState(() => {
    const today = dayjs();
    const end = today.format('YYYY-MM-DD');
    const start = today.startOf('month').format('YYYY-MM-DD');
    return { from: start, to: end };
  });
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
      const params = { ...filters, page, limit: 10 };
      Object.keys(params).forEach((key) => !params[key] && delete params[key]);

      const res = await api.get('/admin/vendors', { params });
      setVendors(res.data.vendors || []);
      setTotalPages(res.data.totalPages || 1);
      setMinimumWalletThreshold(res.data.minimumWalletThreshold || 100);
    } catch (error) {
      toast.error('Failed to fetch partners');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = setTimeout(fetchVendors, 300);
    return () => clearTimeout(timer);
  }, [fetchVendors]);

  // 🔄 Auto-Polling: Refresh list every 30 seconds for real-time status updates
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (!isDrawerOpen && !loading) {
        fetchVendors();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
  }, [fetchVendors, isDrawerOpen, loading]);

  useEffect(() => {
    const fetchVendorInsights = async () => {
      if (!isDrawerOpen || !selectedVendor?._id) return;
      try {
        setInsightsLoading(true);
        const res = await api.get(`/admin/vendors/${selectedVendor._id}/insights`, {
          params: insightsRange
        });
        setVendorInsights(res.data);
      } catch (error) {
        toast.error('Failed to load partner insights');
      } finally {
        setInsightsLoading(false);
      }
    };

    fetchVendorInsights();
  }, [isDrawerOpen, selectedVendor?._id, insightsRange.from, insightsRange.to]);

  const refreshSelectedVendor = async (vendorId, fallbackVendor) => {
    try {
      const res = await api.get('/admin/vendors', {
        params: { search: fallbackVendor?.shopName || '', page: 1, limit: 50 }
      });
      const nextVendor = (res.data.vendors || []).find((vendor) => vendor._id === vendorId);
      setSelectedVendor(nextVendor || fallbackVendor || null);
    } catch {
      setSelectedVendor(fallbackVendor || null);
    }
  };

  const handleAction = async (vendorId, action, payload = {}) => {
    const previousVendors = [...vendors];
    try {
      let message = 'Action completed';

      if (action === 'approve') {
        await api.patch(`/admin/vendors/${vendorId}/approve`);
        message = 'Partner approved';
      } else if (action === 'reject') {
        await api.patch(`/admin/vendors/${vendorId}/reject`, payload);
        message = 'Partner rejected';
      } else if (action === 'block') {
        await api.patch(`/admin/vendors/${vendorId}/block`);
        message = 'Partner status updated';
      } else if (action === 'toggle-active') {
        await api.patch(`/admin/vendors/${vendorId}/toggle-active`);
        message = 'Marketplace visibility updated';
      } else if (action === 'add-balance') {
        await api.patch(`/admin/vendors/${vendorId}/add-balance`, payload);
        message = 'Balance added';
      } else if (action === 'extend-trial') {
        const res = await api.patch(`/admin/vendors/${vendorId}/extend-trial`, payload);
        message = res.data?.message || 'Free trial extended';
      }

      toast.success(message);
      await fetchVendors();

      if (selectedVendor && selectedVendor._id === vendorId) {
        await refreshSelectedVendor(vendorId, selectedVendor);
      }
    } catch (error) {
      setVendors(previousVendors);
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const getLevelBadge = (level) => {
    const styles = {
      basic: 'bg-slate-50 text-slate-400 border-slate-200',
      standard: 'bg-blue-50 text-blue-500 border-blue-100',
      premium: 'bg-purple-50 text-purple-500 border-purple-100',
      luxury: 'bg-amber-50 text-amber-600 border-amber-200'
    };

    return (
      <span className={cn('text-[10px] font-black capitalize px-2 py-0.5 rounded-md border tracking-tighter', styles[level] || styles.basic)}>
        {level}
      </span>
    );
  };

  const getStatusBadge = (status, vendor) => {
    if (status === 'pending' && vendor && !vendor.isProfileComplete) {
      return (
        <span className="text-[10px] font-black capitalize px-2 py-0.5 rounded-md border tracking-tighter bg-slate-50 text-slate-400 border-slate-200 flex items-center gap-1 w-fit">
          <AlertCircle size={10} /> Incomplete
        </span>
      );
    }

    const styles = {
      pending: 'bg-amber-50 text-amber-500 border-amber-100/50',
      active: 'bg-emerald-50 text-emerald-500 border-emerald-100/50',
      inactive: 'bg-orange-50 text-orange-500 border-orange-100/50',
      approved: 'bg-blue-50 text-blue-500 border-blue-100/50',
      blocked: 'bg-red-50 text-red-500 border-red-100/50',
      rejected: 'bg-slate-50 text-slate-400 border-slate-200'
    };

    return (
      <span className={cn('text-[10px] font-black capitalize px-2 py-0.5 rounded-md border tracking-tighter', styles[status] || styles.pending)}>
        {status === 'active' ? 'approved' : status}
      </span>
    );
  };


  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-500">
      <div className="p-4 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-black text-slate-900 dark:text-white tracking-tight capitalize">Partner Fleet</h1>
            <p className="text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] mt-1 opacity-60">Manage your elite merchant network</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchVendors} className="p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl text-slate-400 border border-slate-100 dark:border-gray-700 active:scale-90 transition-all">
              <RefreshCw size={18} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={3} />
            <input
              type="text"
              placeholder="Search shop, owner..."
              className="w-full pl-10 pr-4 h-11 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[14px] font-black capitalize tracking-tight focus:ring-2 ring-primary/20 outline-none transition-all dark:text-white placeholder:text-slate-300"
              value={filters.search}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, search: e.target.value }));
              }}
            />
          </div>

          {['status', 'serviceLevel', 'planType', 'isActive'].map((field) => {
            const labels = {
              status: 'STATUS',
              serviceLevel: 'SERVICE LEVEL',
              planType: 'PLAN TYPE',
              isActive: 'IS ACTIVE'
            };
            return (
              <div key={field} className="relative group">
                <select
                className="w-full px-3.5 pr-10 h-11 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[11px] font-black capitalize tracking-widest text-slate-500 focus:ring-2 ring-primary/20 outline-none appearance-none cursor-pointer group-hover:bg-slate-100 dark:group-hover:bg-gray-700 transition-all dark:text-slate-200"
                value={filters[field]}
                onChange={(e) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, [field]: e.target.value }));
                }}
              >
                <option value="">{labels[field]}</option>
                {field === 'status' && ['pending', 'active', 'inactive', 'blocked', 'rejected'].map((option) => (
                  <option key={option} value={option}>{option === 'active' ? 'APPROVED' : option.toUpperCase()}</option>
                ))}
                {field === 'serviceLevel' && ['standard', 'premium', 'luxury'].map((option) => (
                  <option key={option} value={option}>{option.toUpperCase()}</option>
                ))}
                {field === 'planType' && ['daily', 'monthly', 'trial'].map((option) => (
                  <option key={option} value={option}>{option.toUpperCase()}</option>
                ))}
                {field === 'isActive' && (
                  <>
                    <option value="true">VISIBLE</option>
                    <option value="false">HIDDEN</option>
                  </>
                )}
              </select>
              <ChevronDown size={14} strokeWidth={4} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-colors" />
            </div>
          )})}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-800">
              <th className="px-5 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60">Shop Details</th>
              <th className="px-3 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60">Owner</th>
              <th className="px-3 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60">Level & Plan</th>
              <th className="px-3 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60">Wallet</th>
              <th className="px-3 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60">Status</th>
              <th className="px-3 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60 text-center">Active</th>
              <th className="px-5 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
            <AnimatePresence mode="popLayout">
              {vendors.map((vendor) => (
                <motion.tr
                  key={vendor._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setSelectedVendor(vendor);
                    setIsDrawerOpen(true);
                  }}
                  className="group hover:bg-slate-50/80 dark:hover:bg-gray-800/80 cursor-pointer transition-all"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[15px] shadow-lg border border-white/10 shrink-0 overflow-hidden">
                        {vendor.featuredImage || vendor.shopImage ? (
                           <img src={vendor.featuredImage || vendor.shopImage} className="w-full h-full object-cover" alt="" />
                        ) : (
                           vendor.shopName.charAt(0)
                        )}
                      </div>
                      <div className="leading-tight">
                        <h4 className="text-[14px] font-black text-slate-900 dark:text-white capitalize tracking-tight group-hover:text-primary transition-colors">{vendor.shopName}</h4>
                        <p className="text-[11px] font-black text-slate-400 capitalize tracking-widest flex items-center gap-1 mt-1">
                          <MapPin size={10} strokeWidth={3} /> {vendor.address?.split(',')[0] || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-[13px] font-black text-slate-900 dark:text-white capitalize tracking-tight opacity-80">
                    {vendor.ownerName || vendor.ownerId?.name || 'N/A'}
                  </td>
                  <td className="px-3 py-3.5 leading-none">
                    <div className="flex flex-col gap-1.5">
                      {getLevelBadge(vendor.serviceLevel)}
                      <div className="text-[10px] font-black text-slate-300 dark:text-slate-600 capitalize tracking-widest pl-0.5">
                        {vendor.subscription?.type || 'No Plan'}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={cn(
                      'text-[15px] font-black tracking-tighter', 
                      (vendor.subscription?.type !== 'trial' && vendor.walletBalance < minimumWalletThreshold) ? 'text-red-500' : 'text-emerald-500'
                    )}>
                      Rs {vendor.walletBalance?.toFixed(2) || '0.00'}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">{getStatusBadge(vendor.status, vendor)}</td>
                  <td className="px-3 py-3.5 text-center">
                    <div className={cn('inline-flex w-3 h-3 rounded-full border border-white dark:border-gray-900 shadow-sm', vendor.isActive ? 'bg-emerald-500' : 'bg-red-500')} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="p-1.5 text-slate-200 group-hover:text-primary transition-all active:scale-95">
                      <ChevronRight size={18} strokeWidth={3} />
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
            <p className="font-black text-slate-300 dark:text-slate-600 capitalize tracking-widest text-[12px]">No elite partners found</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="rounded-xl border border-slate-200 dark:border-gray-800 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
            className="rounded-xl border border-slate-200 dark:border-gray-800 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

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
              <div className="p-6 px-7 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-950 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 dark:bg-primary text-white rounded-xl flex items-center justify-center font-black text-[20px] shadow-xl border border-white/10 shrink-0 overflow-hidden">
                    {selectedVendor.featuredImage || selectedVendor.shopImage ? (
                       <img src={selectedVendor.featuredImage || selectedVendor.shopImage} className="w-full h-full object-cover" alt="" />
                    ) : (
                       selectedVendor.shopName.charAt(0)
                    )}
                  </div>
                  <div className="leading-tight pt-1">
                    <h2 className="text-[20px] font-black text-slate-900 dark:text-white capitalize tracking-tight">{selectedVendor.shopName}</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      {getLevelBadge(selectedVendor.serviceLevel)}
                      {getStatusBadge(selectedVendor.status, selectedVendor)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl text-slate-400 active:scale-95 transition-all border border-slate-100 dark:border-gray-700"
                >
                  <XCircle size={22} strokeWidth={3} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 px-7 space-y-6 no-scrollbar pb-32">
                {(!selectedVendor.subscription?.isActive || (selectedVendor.subscription?.type !== 'trial' && selectedVendor.walletBalance < minimumWalletThreshold)) && (
                  <div className="p-3.5 px-5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-4 text-red-500">
                    <AlertCircle size={22} strokeWidth={3} className="shrink-0" />
                    <p className="text-[11px] font-black capitalize tracking-widest leading-normal">
                      Partner inactive. Marketplace visibility may be restricted.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-6">
                    <Section title="Fleet Node Info" icon={User}>
                      <InfoItem label="Owner Entity" value={selectedVendor.ownerName || selectedVendor.ownerId?.name} />
                      <InfoItem label="Comms Node" value={selectedVendor.ownerId?.phone} />
                      <InfoItem label="Service Mode" value="Shop Service" />
                      <InfoItem label="Base Registry" value={selectedVendor.address} />
                      <InfoItem label="Market Node" value={selectedVendor.category?.name || 'Uncategorized'} />
                    </Section>

                    <Section title="Performance" icon={TrendingUp}>
                      <div className="grid grid-cols-2 gap-3">
                        <Stat label="Orders" value={selectedVendor.totalBookings || '0'} />
                        <Stat label="Revenue" value={`Rs ${selectedVendor.totalEarnings || '0'}`} />
                        <Stat label="Reach" value={selectedVendor.engagement?.profileViews || selectedVendor.profileViews || '0'} icon={Eye} />
                        <Stat label="CTR" value={selectedVendor.engagement?.serviceClicks || selectedVendor.serviceClicks || '0'} icon={MousePointer2} />
                      </div>
                    </Section>
                  </div>

                  <div className="space-y-6">
                    <Section title="Financials" icon={CreditCard}>
                      <InfoItem label="Active Plan" value={selectedVendor.subscription?.type?.toUpperCase() || 'NONE'} />
                      <InfoItem 
                        label="Vault Balance" 
                        value={`Rs ${selectedVendor.walletBalance?.toFixed(2) || '0.00'}`} 
                        highlight={selectedVendor.subscription?.type !== 'trial' && selectedVendor.walletBalance < minimumWalletThreshold} 
                      />
                      <InfoItem
                        label="Free Trial Ends"
                        value={selectedVendor.freeTrial?.isActive && selectedVendor.freeTrial?.expiryDate
                          ? dayjs(selectedVendor.freeTrial.expiryDate).format('YYYY-MM-DD')
                          : 'Not Active'}
                      />
                      <div className="mt-4">
                        <button
                          onClick={() => handleAction(selectedVendor._id, 'toggle-active')}
                          className={cn(
                            'w-full py-2.5 rounded-xl font-black text-[11px] capitalize tracking-widest transition-all border shadow-sm active:scale-95',
                            selectedVendor.isActive
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20'
                              : 'bg-red-500 text-white border-red-600 shadow-red-500/10'
                          )}
                        >
                          {selectedVendor.isActive ? 'Marketplace Visible' : 'Force Hidden'}
                        </button>
                      </div>
                    </Section>

                    <Section title="Command Actions" icon={Zap}>
                      <div className="grid grid-cols-2 gap-2.5">
                        {selectedVendor.status === 'pending' && (
                          <>
                            <ActionButton 
                              onClick={() => handleAction(selectedVendor._id, 'approve')} 
                              icon={CheckCircle} 
                              label="Approve" 
                              color="emerald" 
                              disabled={!selectedVendor.isProfileComplete}
                              tooltip={!selectedVendor.isProfileComplete ? 'Complete profile required' : ''}
                            />
                            <ActionButton onClick={() => handleAction(selectedVendor._id, 'reject', { rejectionReason: 'Admin rejected' })} icon={XCircle} label="Reject" color="red" />
                          </>
                        )}
                        <ActionButton
                          onClick={() => handleAction(selectedVendor._id, 'block')}
                          icon={Ban}
                          label={selectedVendor.status === 'blocked' ? 'Restore' : 'Suspend'}
                          color="red"
                          active={selectedVendor.status === 'blocked'}
                        />
                        <ActionButton
                          onClick={() => {
                            const amount = prompt('Enter amount to add:');
                            if (!amount) return;
                            const parsedAmount = Number(amount);
                            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                              toast.error('Please enter a valid amount');
                              return;
                            }
                            handleAction(selectedVendor._id, 'add-balance', { amount: parsedAmount });
                          }}
                          icon={Wallet}
                          label="Add Credit"
                          color="primary"
                        />
                        <ActionButton
                          onClick={() => {
                            const days = prompt('Extend free trial by how many days?', '7');
                            if (!days) return;
                            const parsedDays = Number(days);
                            if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
                              toast.error('Please enter a valid number of days');
                              return;
                            }
                            handleAction(selectedVendor._id, 'extend-trial', { days: parsedDays });
                          }}
                          icon={Plus}
                          label="Extend Trial"
                          color="primary"
                        />
                      </div>
                    </Section>
                  </div>
                </div>

                <Section title="Elite Registry Vault" icon={Shield}>
                  <div className="grid grid-cols-2 gap-3.5">
                    <DocumentTile title="PAN Card" src={selectedVendor.panCard} />
                    <DocumentTile title="GST Certificate" src={selectedVendor.gstCertificate} />
                    <DocumentTile title="Shop Registration" src={selectedVendor.shopRegistration} />
                    <DocumentTile title="Aadhaar Front" src={selectedVendor.aadhaarFront} />
                    <DocumentTile title="Aadhaar Back" src={selectedVendor.aadhaarBack} />
                  </div>
                </Section>

                <Section title="System Activity" icon={History}>
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-950 rounded-xl border border-slate-100 dark:border-gray-800 p-2">
                      <div className="flex-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">From</label>
                        <input
                          type="date"
                          value={insightsRange.from}
                          onChange={(e) => setInsightsRange((prev) => ({ ...prev, from: e.target.value }))}
                          className="w-full bg-transparent px-2 py-1.5 text-[10px] font-black text-slate-900 dark:text-white focus:ring-0 border-none"
                        />
                      </div>
                      <div className="text-slate-300 dark:text-slate-600 text-sm font-black">›</div>
                      <div className="flex-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">To</label>
                        <input
                          type="date"
                          value={insightsRange.to}
                          onChange={(e) => setInsightsRange((prev) => ({ ...prev, to: e.target.value }))}
                          className="w-full bg-transparent px-2 py-1.5 text-[10px] font-black text-slate-900 dark:text-white focus:ring-0 border-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Stat label="Bookings" value={vendorInsights?.summary?.totalBookings || 0} />
                      <Stat label="Revenue" value={`Rs ${vendorInsights?.summary?.totalRevenue || 0}`} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Stat label="Completed" value={vendorInsights?.summary?.completedBookings || 0} />
                      <Stat label="Cancelled" value={vendorInsights?.summary?.cancelledBookings || 0} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest px-1 opacity-70">Booking Log</p>
                      {insightsLoading ? (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/40 text-center text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                          Loading
                        </div>
                      ) : !(vendorInsights?.bookings || []).length ? (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/40 text-center text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                          No bookings in range
                        </div>
                      ) : (
                        vendorInsights.bookings.slice(0, 6).map((booking) => (
                          <div key={booking._id} className="p-3 rounded-xl bg-white dark:bg-gray-950 border border-slate-100 dark:border-gray-800">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">
                                  {booking.customerName}
                                </p>
                                <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase mt-1 truncate">
                                  {booking.services?.map((service) => service.name).join(', ') || 'Service Booking'}
                                </p>
                                <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 tracking-widest uppercase mt-1">
                                  {dayjs(booking.startTime).format('YYYY-MM-DD')} • {booking.staffName}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[11px] font-black text-slate-900 dark:text-white">Rs {booking.totalPrice || 0}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{booking.status}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest px-1 opacity-70">Revenue Log</p>
                      {insightsLoading ? (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/40 text-center text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                          Loading
                        </div>
                      ) : !(vendorInsights?.revenue || []).length ? (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/40 text-center text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                          No revenue in range
                        </div>
                      ) : (
                        vendorInsights.revenue.slice(0, 6).map((entry) => (
                          <div key={entry._id} className="p-3 rounded-xl bg-white dark:bg-gray-950 border border-slate-100 dark:border-gray-800 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">{entry.description}</p>
                              <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 tracking-widest uppercase mt-1">
                                {dayjs(entry.timestamp).format('YYYY-MM-DD')} • {dayjs(entry.timestamp).format('HH:mm')}
                              </p>
                            </div>
                            <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">Rs {entry.amount || 0}</p>
                          </div>
                        ))
                      )}
                    </div>
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

const Section = ({ title, icon: Icon, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <Icon size={16} strokeWidth={3} className="text-primary" />
      <h3 className="text-[12px] font-black text-slate-900 dark:text-white capitalize tracking-[0.15em] opacity-80">{title}</h3>
    </div>
    <div className="p-4.5 bg-slate-50 dark:bg-gray-900/40 rounded-xl border border-slate-100 dark:border-gray-800 space-y-3.5">
      {children}
    </div>
  </div>
);

const InfoItem = ({ label, value, highlight }) => (
  <div className="leading-tight">
    <p className="text-[11px] font-black text-slate-400 capitalize tracking-widest mb-1 opacity-60">{label}</p>
    <p className={cn('text-[13px] font-black capitalize dark:text-white tracking-tight', highlight && 'text-red-500')}>
      {value || '---'}
    </p>
  </div>
);

const Stat = ({ label, value, icon: Icon }) => (
  <div className="p-3 bg-white dark:bg-gray-950 rounded-xl border border-slate-100 dark:border-gray-800 text-center shadow-sm">
    <p className="text-[10px] font-black text-slate-400 capitalize mb-1 tracking-tighter opacity-70">{label}</p>
    <div className="flex items-center justify-center gap-1">
      {Icon && <Icon size={12} strokeWidth={3} className="text-primary" />}
      <span className="text-[14px] font-black dark:text-white">{value}</span>
    </div>
  </div>
);

const ActionButton = ({ icon: Icon, label, color, onClick, active, disabled, tooltip }) => {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-500 border-emerald-100/50 active:bg-emerald-500 active:text-white disabled:opacity-40 disabled:bg-slate-50 disabled:text-slate-300 disabled:border-slate-100',
    red: 'bg-red-50 text-red-500 border-red-100/50 active:bg-red-500 active:text-white disabled:opacity-40',
    primary: 'bg-primary/5 text-primary border-primary/10 active:bg-primary active:text-white disabled:opacity-40'
  };

  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      title={tooltip}
      className={cn(
        'flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border transition-all shadow-sm relative group/btn',
        colors[color],
        active && color === 'red' && 'bg-red-500 text-white',
        disabled && 'cursor-not-allowed grayscale-[0.5]'
      )}
    >
      <Icon size={20} strokeWidth={3} />
      <span className="text-[10px] font-black capitalize tracking-tighter">{label}</span>
      {disabled && tooltip && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[8px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-50">
          {tooltip}
        </div>
      )}
    </button>
  );
};

const DocumentTile = ({ title, src }) => {
  if (!src) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest px-1">{title}</p>
        <div className="h-40 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-slate-200 dark:border-gray-700 flex items-center justify-center text-[10px] font-black text-slate-300 capitalize leading-tight text-center p-4">
          {title} Missing
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest px-1">{title}</p>
      <a href={src} target="_blank" rel="noreferrer" className="block h-40 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 overflow-hidden group relative active:scale-[0.98] transition-all">
        <img src={src} alt={title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <Eye size={24} strokeWidth={3} className="text-white" />
        </div>
      </a>
    </div>
  );
};

export default VendorManagement;
