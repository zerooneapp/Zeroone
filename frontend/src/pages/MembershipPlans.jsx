import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Crown, Calendar, Info, Users, Phone, ShieldCheck, Clock, CheckCircle2, XCircle, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import GlassConfirmationModal from '../components/GlassConfirmationModal';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';
import { cn } from '../utils/cn';
import { useVendorStore } from '../store/vendorStore';

const MembershipPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    membershipData: storePlans, 
    membershipLoading: storeLoading, 
    fetchMemberships,
    setMembershipData: setPlans,
    membershipMembers: members,
    membershipRequests: requests,
    membershipMembersLoading: membersLoading,
    membershipRequestsLoading: requestsLoading,
    membershipMembersPages: membersPages,
    membershipRequestsPages: requestsPages,
    fetchMembershipMembers,
    fetchMembershipRequests
  } = useVendorStore();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plans');
  const [page, setPage] = useState(1);
  const [toggleLoadingId, setToggleLoadingId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);   // holds plan object
  const [showBlockedPopup, setShowBlockedPopup] = useState(null);    // holds error message
  const [deletingMemberId, setDeletingMemberId] = useState(null);
  const [showDeleteMemberConfirm, setShowDeleteMemberConfirm] = useState(null); // holds membership object


  // Derived state to use store for plans
  const plans = activeTab === 'plans' ? storePlans : [];
  const displayLoading = activeTab === 'plans' 
    ? storeLoading 
    : (activeTab === 'members' ? membersLoading : requestsLoading);
  const totalPages = activeTab === 'members' ? membersPages : requestsPages;


  const [globalMembershipActive, setGlobalMembershipActive] = useState(true);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      // Check global status
      const settingsRes = await api.get('/settings/shared');
      const isMembActive = settingsRes.data?.features?.membershipActive !== false;
      setGlobalMembershipActive(isMembActive);

      if (!isMembActive) {
        setLoading(false);
        return;
      }

      if (activeTab === 'plans') {
        await fetchMemberships();
      } else if (activeTab === 'members') {
        await fetchMembershipMembers(page, 10);
      } else {
        await fetchMembershipRequests(page, 10);
      }
    } catch (err) {
      console.error('Fetch data error:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId, status) => {
    try {
      setActionLoadingId(requestId);
      await api.patch(`/memberships/status/${requestId}`, { status });
      toast.success(status === 'active' ? 'Membership approved! 🎉' : 'Request rejected');
      fetchData(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    const hasData = activeTab === 'plans'
      ? storePlans.length > 0
      : (activeTab === 'members' ? members.length > 0 : requests.length > 0);
    fetchData(!hasData);
  }, [activeTab, page]);

  const handleToggle = async (id, isActive) => {
    if (toggleLoadingId === id) return;

    const original = [...plans];
    setPlans(prev => prev.map(p => p._id === id ? { ...p, isActive } : p));

    try {
      setToggleLoadingId(id);
      await api.patch(`/memberships/vendor/plans/${id}`, { isActive });
      toast.success(isActive ? 'Plan activated ✨' : 'Plan paused');
    } catch (err) {
      setPlans(original);
      toast.error('Failed to update status');
    } finally {
      setToggleLoadingId(null);
    }
  };



  const handleDeletePlan = async (plan) => {
    try {
      setDeletingId(plan._id);
      await api.delete(`/memberships/vendor/plans/${plan._id}`);
      toast.success('Plan deleted successfully');
      setShowDeleteConfirm(null);
      await fetchMemberships();
    } catch (err) {
      setShowDeleteConfirm(null);
      const data = err.response?.data;
      if (data?.hasActiveMembers) {
        setShowBlockedPopup(data.message);
      } else {
        toast.error(data?.message || 'Failed to delete plan');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteMember = async (membership) => {
    try {
      setDeletingMemberId(membership._id);
      await api.delete(`/memberships/vendor/members/${membership._id}`);
      toast.success('Record deleted successfully');
      setShowDeleteMemberConfirm(null);
      fetchData();
    } catch (err) {
      setShowDeleteMemberConfirm(null);
      const data = err.response?.data;
      toast.error(data?.message || 'Failed to delete record');
    } finally {
      setDeletingMemberId(null);
    }
  };

  const PlanSkeleton = () => (
    <div className="grid gap-4 mt-4">
      {[1, 2].map(i => <div key={i} className="h-44 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] animate-pulse" />)}
    </div>
  );

  const MemberSkeleton = () => (
    <div className="space-y-3 mt-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  );

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between px-2 py-6 mt-4 border-t border-slate-100 dark:border-gray-800">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100 dark:border-gray-700 disabled:opacity-40 active:scale-95 transition-all"
        >
          Previous
        </button>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-black text-[#00246b] uppercase tracking-tighter">Page</span>
          <span className="text-xs font-black text-slate-800 dark:text-white">{page} <span className="text-slate-400 font-medium">of</span> {totalPages}</span>
        </div>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100 dark:border-gray-700 disabled:opacity-40 active:scale-95 transition-all"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 px-4 pt-[40px] pb-3 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800/60 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendor/profile?section=shop_details')}
            className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-black tracking-tighter leading-none text-primary dark:text-white">Store Memberships</h1>
            <p className="text-[9px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em] opacity-80 leading-none">Loyalty Management</p>
          </div>
        </div>
        {activeTab === 'plans' && (
          <button
            onClick={() => navigate('/vendor/membership/add')}
            className="p-2.5 bg-[#00246b] text-white rounded-xl shadow-xl shadow-[#00246b]/20 active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        )}
      </header>

      <main className="px-4 pt-[106px]">
        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-gray-900 rounded-2xl mb-6">
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'plans' 
              ? 'bg-white dark:bg-gray-800 text-[#00246b] dark:text-white shadow-sm' 
              : 'text-slate-400'
            }`}
          >
            <Crown size={14} />
            Plans
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'requests' 
              ? 'bg-white dark:bg-gray-800 text-[#00246b] dark:text-white shadow-sm' 
              : 'text-slate-400'
            }`}
          >
            <Clock size={14} />
            Requests
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'members' 
              ? 'bg-white dark:bg-gray-800 text-[#00246b] dark:text-white shadow-sm' 
              : 'text-slate-400'
            }`}
          >
            <Users size={14} />
            Members
          </button>
        </div>


        {!globalMembershipActive ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-20 text-center space-y-6"
          >
            <div className="w-24 h-24 bg-slate-100 dark:bg-gray-800 rounded-[3rem] flex items-center justify-center mx-auto text-slate-300 dark:text-gray-600 border border-slate-200 dark:border-gray-700 shadow-inner">
              <ShieldCheck size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">System Deactivated</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] max-w-[280px] mx-auto leading-relaxed">
                The membership loyalty system has been temporarily disabled by the platform administrator.
              </p>
            </div>
            <button
              onClick={() => navigate('/vendor/dashboard')}
              className="px-8 py-3.5 bg-[#00246b] dark:bg-[#00246b] text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-xl active:scale-95 transition-all"
            >
              Return to Dashboard
            </button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {displayLoading ? (
              activeTab === 'plans' ? <PlanSkeleton /> : <MemberSkeleton />
            ) : activeTab === 'plans' ? (
              <motion.div
                key="plans-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* ... (Existing plans rendering logic) ... */}
                <div className="mb-6 p-4 bg-primary/5 dark:bg-primary/20 border border-primary/10 dark:border-primary/30 rounded-2xl flex items-start gap-3">
                  <Info className="text-primary dark:text-white mt-0.5" size={16} />
                  <p className="text-[10px] font-bold text-primary/70 dark:text-white/90 uppercase leading-relaxed tracking-tight">
                    Create membership plans for your loyal customers. They can buy these plans to get specific services for free during the plan period.
                  </p>
                </div>

                {plans.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-20 h-20 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto text-primary/30 border border-primary/10">
                      <Crown size={36} />
                    </div>
                    <div className="mt-5 space-y-1">
                      <h2 className="text-lg font-black text-gray-900 dark:text-white">No membership plans yet</h2>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[250px] mx-auto">Build a loyal customer base by offering exclusive subscription benefits.</p>
                    </div>
                    <button
                      onClick={() => navigate('/vendor/membership/add')}
                      className="mt-6 px-7 py-3.5 bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                    >
                      Create First Plan
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {plans.map((plan) => (
                      <motion.div
                        key={plan._id}
                        layout
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 p-4 shadow-sm space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-slate-800 dark:text-white capitalize">{plan.name}</h3>
                              {!plan.isActive && (
                                <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full text-[7px] font-black uppercase tracking-widest border border-red-500/20">Paused</span>
                              )}
                            </div>
                            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight line-clamp-2">{plan.description || 'No description provided'}</p>
                          </div>
                          <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-600">
                            <Crown size={16} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50 dark:border-gray-800">
                          <div className="space-y-0.5">
                             <p className="text-[8px] font-black text-slate-400 dark:text-white/60 uppercase tracking-widest">Price</p>
                            <p className="text-xs font-black text-primary dark:text-white">₹{plan.price}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[8px] font-black text-slate-400 dark:text-white/60 uppercase tracking-widest">Duration</p>
                            <p className="text-xs font-black text-slate-700 dark:text-white">{plan.durationDays} Days</p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                           <p className="text-[8px] font-black text-slate-400 dark:text-white/60 uppercase tracking-widest">Included Services & Limits</p>
                          <div className="flex flex-wrap gap-1">
                             {plan.services?.map(s => (
                              <span key={s.serviceId?._id || s._id} className="px-1.5 py-0.5 bg-slate-50 dark:bg-gray-800/80 text-slate-600 dark:text-slate-200 rounded-md text-[9px] font-black border border-slate-100 dark:border-gray-700/50">
                                {s.serviceId?.name || 'Service'} ({s.usageLimit})
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-1 w-full">
                          <button
                            onClick={() => setShowDeleteConfirm(plan)}
                            disabled={deletingId === plan._id || plan.activeMemberCount > 0}
                            className={cn(
                              "w-full py-2 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                              plan.activeMemberCount > 0
                                ? "bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500 cursor-not-allowed border border-slate-200/50 dark:border-gray-700/50 shadow-none"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 active:scale-95 disabled:opacity-50"
                            )}
                            title={plan.activeMemberCount > 0 ? "Cannot delete plan with active members" : "Delete Plan"}
                          >
                            <Trash2 size={12} strokeWidth={3} />
                            {deletingId === plan._id ? 'Deleting...' : 'Delete Plan'}
                          </button>
                          {plan.activeMemberCount > 0 && (
                            <span className="text-[7.5px] font-black text-amber-600 dark:text-amber-500 uppercase text-center tracking-wider leading-none mt-0.5">
                              {plan.activeMemberCount} Active Member{plan.activeMemberCount === 1 ? '' : 's'} • Cannot Delete
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : activeTab === 'requests' ? (
              <motion.div
                key="requests-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {requests.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-gray-800 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-300 dark:text-gray-600">
                      <Clock size={36} />
                    </div>
                    <h3 className="mt-6 text-lg font-black text-gray-900 dark:text-white">No pending requests</h3>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-2">New purchase requests will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((request) => (
                      <div 
                        key={request._id}
                        className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-gray-800 overflow-hidden border border-slate-100 dark:border-gray-700 shrink-0 shadow-inner">
                            <img 
                              src={request.userId?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.userId?.name || 'User')}&background=F1F5F9&color=1C2C4E&bold=true`} 
                              className="w-full h-full object-cover" 
                              alt="" 
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-xs text-slate-800 dark:text-white truncate capitalize">{request.userId?.name || 'Customer'}</h4>
                            <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                              <Phone size={9} />
                              <span className="text-[9px] font-bold">{request.userId?.phone}</span>
                            </div>
                          </div>
                          <div className={cn(
                            "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border",
                            request.status === 'pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                          )}>
                            {request.status}
                          </div>
                        </div>

                         <div className="p-2 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-slate-100 dark:border-gray-800 flex justify-between items-center">
                          <div className="space-y-0.5">
                            <p className="text-[7.5px] font-black text-slate-400 dark:text-white/60 uppercase tracking-widest">Requested Plan</p>
                            <p className="text-[11px] font-black text-[#00246b] dark:text-white capitalize leading-none">{request.planId?.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[7.5px] font-black text-slate-400 dark:text-white/60 uppercase tracking-widest">Amount to Collect</p>
                            <p className="text-[11px] font-black text-slate-700 dark:text-white leading-none">₹{request.planId?.price}</p>
                          </div>
                        </div>

                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRequestAction(request._id, 'active')}
                              disabled={actionLoadingId === request._id}
                              className="flex-1 py-2 bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                              <CheckCircle2 size={12} strokeWidth={3} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRequestAction(request._id, 'rejected')}
                              disabled={actionLoadingId === request._id}
                              className="flex-1 py-2 bg-red-500/10 text-red-600 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                            >
                              <XCircle size={12} strokeWidth={3} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <PaginationControls />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="members-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {members.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-gray-800 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-300 dark:text-gray-600">
                      <Users size={36} />
                    </div>
                    <h3 className="mt-6 text-lg font-black text-gray-900 dark:text-white">No active members</h3>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-2">When customers buy your plans, they will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {members.map((membership) => (
                      <div 
                        key={membership._id}
                        className="bg-white dark:bg-gray-900 p-3.5 rounded-xl border border-slate-100 dark:border-gray-800 shadow-sm flex flex-col gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-gray-800 overflow-hidden border border-slate-100 dark:border-gray-700 shrink-0 shadow-inner">
                            <img 
                              src={membership.userId?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(membership.userId?.name || 'User')}&background=F1F5F9&color=1C2C4E&bold=true`} 
                              className="w-full h-full object-cover" 
                              alt="" 
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-black text-xs text-slate-800 dark:text-white truncate capitalize">{membership.userId?.name || 'Customer'}</h4>
                              <span className="px-1 py-0.5 bg-amber-500/10 text-amber-600 rounded-md text-[6.5px] font-black uppercase tracking-tighter border border-amber-500/10 shrink-0">
                                {membership.planId?.name}
                              </span>
                              {/* Status Badge */}
                              {membership.status !== 'active' && (
                                <span className={cn(
                                  "px-1 py-0.5 rounded-md text-[6.5px] font-black uppercase tracking-tighter border shrink-0",
                                  membership.status === 'expired' && "bg-slate-100 dark:bg-gray-800 text-slate-400 border-slate-200 dark:border-gray-700",
                                  membership.status === 'rejected' && "bg-red-500/10 text-red-500 border-red-500/20",
                                  membership.status === 'cancelled' && "bg-orange-500/10 text-orange-500 border-orange-500/20",
                                  membership.status === 'pending' && "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                )}>
                                  {membership.status}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1 text-slate-400">
                                <Phone size={9} />
                                <span className="text-[9px] font-bold">{membership.userId?.phone}</span>
                              </div>
                              <div className={cn("flex items-center gap-0.5", dayjs(membership.endDate).isBefore(dayjs()) ? 'text-slate-400' : 'text-emerald-500')}>
                                <Calendar size={9} />
                                <span className="text-[8px] font-black uppercase tracking-tighter">
                                  {dayjs(membership.endDate).isBefore(dayjs()) ? 'Expired' : 'Expires'} {dayjs(membership.endDate).format('DD MMM')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 border border-blue-100 dark:border-blue-900/30">
                              <ShieldCheck size={14} />
                            </div>
                            {/* Delete button for past records */}
                            {(membership.status !== 'active' || dayjs(membership.endDate).isBefore(dayjs())) && (
                              <button
                                onClick={() => setShowDeleteMemberConfirm(membership)}
                                disabled={deletingMemberId === membership._id}
                                className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400 border border-red-100 dark:border-red-900/30 active:scale-90 transition-all disabled:opacity-40"
                              >
                                <Trash2 size={12} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Usage Progress - New Section */}
                        {membership.usage && membership.usage.length > 0 && (
                          <div className="pt-2.5 border-t border-slate-50 dark:border-gray-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Usage Progress</p>
                              {membership.ticketId && (
                                <p className="text-[7.5px] font-black text-[#00246b] dark:text-white uppercase tracking-widest leading-none">{membership.ticketId}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              {membership.usage.map((item, idx) => {
                                const percentage = Math.min((item.usedCount / item.usageLimit) * 100, 100);
                                const isExhausted = item.usedCount >= item.usageLimit;

                                return (
                                  <div key={item.serviceId?._id || item._id || idx} className="space-y-1">
                                    <div className="flex justify-between items-end">
                                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 capitalize leading-none">
                                        {item.serviceId?.name}
                                      </p>
                                      <p className="text-[9px] font-black text-[#00246b] dark:text-white tracking-tighter leading-none">
                                        {item.usedCount} / {item.usageLimit} <span className="text-slate-400 font-bold ml-0.5 uppercase text-[7px]">Used</span>
                                      </p>
                                    </div>
                                    <div className="h-1 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        className={cn(
                                          "h-full rounded-full transition-all duration-1000",
                                          isExhausted ? "bg-slate-300" : "bg-gradient-to-r from-[#00246b] to-[#00246b]/80"
                                        )}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <PaginationControls />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        )}
      </main>


      {/* 🗑️ DELETE CONFIRMATION POPUP */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deletingId && setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-[300px] bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-2xl relative z-10 text-center"
            >
              <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Delete Plan?</h3>
              <p className="text-[11px] font-bold text-slate-400 dark:text-gray-500 mt-2 uppercase tracking-widest leading-relaxed">
                "{showDeleteConfirm.name}" plan permanently delete ho jaayega. Yeh action undo nahi ho sakta.
              </p>
              <div className="flex flex-col gap-2 mt-6">
                <button
                  disabled={!!deletingId}
                  onClick={() => handleDeletePlan(showDeleteConfirm)}
                  className="w-full py-3.5 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {deletingId ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Yes, Delete'}
                </button>
                <button
                  disabled={!!deletingId}
                  onClick={() => setShowDeleteConfirm(null)}
                  className="w-full py-3.5 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚫 BLOCKED POPUP — Active Members Exist */}
      <AnimatePresence>
        {showBlockedPopup && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBlockedPopup(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-[300px] bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-2xl relative z-10 text-center"
            >
              <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <AlertTriangle size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Cannot Delete</h3>
              <p className="text-[11px] font-bold text-slate-400 dark:text-gray-500 mt-2 tracking-wide leading-relaxed">
                {showBlockedPopup}
              </p>
              <button
                onClick={() => setShowBlockedPopup(null)}
                className="mt-6 w-full py-3.5 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* 🗑️ DELETE MEMBER RECORD CONFIRMATION POPUP */}
      <AnimatePresence>
        {showDeleteMemberConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deletingMemberId && setShowDeleteMemberConfirm(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-[300px] bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-2xl relative z-10 text-center"
            >
              <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Delete Record?</h3>
              <p className="text-[11px] font-bold text-slate-400 dark:text-gray-500 mt-2 tracking-wide leading-relaxed">
                <span className="capitalize font-black text-slate-700 dark:text-white">{showDeleteMemberConfirm.userId?.name || 'Customer'}</span> ka membership record permanently delete ho jaayega.
              </p>
              <div className="flex flex-col gap-2 mt-6">
                <button
                  disabled={!!deletingMemberId}
                  onClick={() => handleDeleteMember(showDeleteMemberConfirm)}
                  className="w-full py-3.5 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {deletingMemberId ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Yes, Delete'}
                </button>
                <button
                  disabled={!!deletingMemberId}
                  onClick={() => setShowDeleteMemberConfirm(null)}
                  className="w-full py-3.5 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MembershipPlans;
