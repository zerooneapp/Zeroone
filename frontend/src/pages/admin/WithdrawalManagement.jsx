import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, Clock, CheckCircle2, XCircle, 
  Search, Filter, ExternalLink, Landmark, 
  CreditCard, AlertCircle, Eye, Check, X,
  MoreVertical, FileText, Send, User, Store, Settings,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const WithdrawalManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processModal, setProcessModal] = useState({ isOpen: false, type: 'approve', requestId: null });
  const [settingsModal, setSettingsModal] = useState(false);
  const [minAmount, setMinAmount] = useState(100);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/withdrawals${filter !== 'all' ? `?status=${filter}` : ''}`);
      setRequests(res.data);
    } catch (err) {
      toast.error('Failed to load withdrawal requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      setMinAmount(res.data.minWithdrawalAmount || 100);
    } catch (err) {
      console.error('Failed to load settings');
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchSettings();
  }, [filter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const handleProcess = async () => {
    if (!processModal.requestId) return;
    if (processModal.type === 'reject' && !rejectionReason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      const status = processModal.type === 'approve' ? 'approved' : 'rejected';
      await api.patch(`/admin/withdrawals/${processModal.requestId}`, {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
        adminNotes
      });
      
      toast.success(`Request ${status} successfully`);
      setProcessModal({ isOpen: false, type: 'approve', requestId: null });
      setRejectionReason('');
      setAdminNotes('');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setProcessing(true);
      await api.patch('/admin/settings', { minWithdrawalAmount: Number(minAmount) });
      toast.success('Withdrawal limit updated');
      setSettingsModal(false);
    } catch (err) {
      toast.error('Failed to update limit');
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.vendorId?.shopName?.toLowerCase().includes(search.toLowerCase()) ||
    req.referenceId?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const currentRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500 bg-slate-50 dark:bg-gray-950 min-h-screen font-sans pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#00246b] dark:text-white tracking-tight">Withdrawal Management</h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Review partner payouts</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSettingsModal(true)}
            className="p-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg text-[#00246b] dark:text-white hover:bg-[#00246b] hover:text-white transition-all shadow-sm"
          >
            <Settings size={18} />
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-[#00246b]/20 text-xs w-full md:w-48"
            />
          </div>
          <div className="flex bg-white dark:bg-gray-900 p-1 rounded-lg border border-slate-200 dark:border-gray-800">
            {['all', 'pending', 'approved', 'rejected'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${filter === s ? 'bg-[#00246b] text-white shadow-md shadow-[#00246b]/10' : 'text-slate-500 hover:text-slate-600'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white dark:bg-gray-900 rounded-xl animate-pulse border border-slate-100 dark:border-gray-800" />)}
          </div>
        ) : currentRequests.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-slate-200">
            <AlertCircle className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500 font-black uppercase tracking-widest text-[11px]">No requests found</p>
          </div>
        ) : (
          <>
            {currentRequests.map((req) => (
              <motion.div 
                key={req._id}
                layout
                className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 p-3 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
              >
                {/* Status Indicator Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  req.status === 'pending' ? 'bg-amber-400' :
                  req.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'
                }`} />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      req.method === 'upi' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400'
                    }`}>
                      {req.method === 'upi' ? <CreditCard size={20} /> : <Landmark size={20} />}
                    </div>
                    <div className="space-y-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 dark:text-white text-sm tracking-tight">{req.vendorId?.shopName}</h3>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                          req.status === 'pending' ? 'bg-amber-50 text-amber-500' :
                          req.status === 'approved' ? 'bg-emerald-50 text-emerald-500' :
                          'bg-red-50 text-red-500'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                         <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                           <Clock size={10} /> {dayjs(req.createdAt).format('DD MMM, hh:mm A')}
                         </p>
                         <p className="text-[8px] font-black text-[#00246b]/40 dark:text-white/40 uppercase tracking-tighter">{req.referenceId}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[240px] md:border-l border-slate-100 dark:border-gray-800/60 md:pl-6">
                    {/* Amount Row */}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[8px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-wider">Amount</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">₹{req.amount.toLocaleString()}</span>
                    </div>

                    {/* Payout Details Row */}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[8px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-wider">Payout Details</span>
                      {req.method === 'upi' ? (
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1 bg-indigo-50/50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                          <CreditCard size={10} className="text-indigo-500" /> {req.upiDetails?.upiId}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1 bg-blue-50/50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md leading-none">
                          <Landmark size={10} className="text-blue-500" /> {req.bankDetails?.bankName} ({req.bankDetails?.accountNumber.slice(-4)})
                        </span>
                      )}
                    </div>

                    {/* Processed/Actions Row */}
                    <div className="flex items-center justify-between gap-4">
                      {req.status === 'pending' ? (
                        <>
                          <span className="text-[8px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-wider">Actions</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setProcessModal({ isOpen: true, type: 'reject', requestId: req._id })}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 font-black text-[9px] uppercase rounded-lg border border-red-100 transition-all active:scale-95 flex items-center gap-1.5"
                            >
                              <X size={12} strokeWidth={3} /> Reject
                            </button>
                            <button 
                              onClick={() => setProcessModal({ isOpen: true, type: 'approve', requestId: req._id })}
                              className="px-3 py-1.5 bg-[#00246b] hover:bg-[#001b50] text-white font-black text-[9px] uppercase rounded-lg shadow-sm shadow-[#00246b]/20 transition-all active:scale-95 flex items-center gap-1.5"
                            >
                              <Check size={12} strokeWidth={3} /> Approve
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-[8px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-wider">Processed</span>
                          <span className="text-[9px] font-black text-slate-600 dark:text-slate-500 bg-slate-50 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                            {req.processedAt ? dayjs(req.processedAt).format('DD MMM YY') : 'N/A'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {req.rejectionReason && (
                  <div className="mt-2 p-2 bg-red-50/50 dark:bg-red-500/10 rounded-lg border border-red-100 dark:border-red-500/20">
                    <p className="text-[9px] font-bold text-red-600/80 dark:text-red-400 leading-relaxed truncate"><span className="font-black uppercase text-[8px] mr-1 dark:text-white">Rejected:</span> {req.rejectionReason}</p>
                  </div>
                )}

                {req.adminNotes && (
                  <div className="mt-2 p-2 bg-slate-50/50 dark:bg-gray-800/40 rounded-lg border border-slate-100 dark:border-gray-800">
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed truncate"><span className="font-black uppercase text-[8px] mr-1 dark:text-white">Admin:</span> {req.adminNotes}</p>
                  </div>
                )}
              </motion.div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8 py-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                
                <div className="flex items-center gap-1.5">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => paginate(i + 1)}
                      className={`w-7 h-7 rounded-lg font-black text-[10px] transition-all ${
                        currentPage === i + 1 
                          ? 'bg-[#00246b] text-white' 
                          : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-gray-800"
            >
              <div className="p-4 bg-[#00246b] text-white text-center relative">
                <button onClick={() => setSettingsModal(false)} className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-full">
                  <X size={16} />
                </button>
                <h2 className="text-lg font-black tracking-tight">Withdrawal Settings</h2>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-100">Platform rules</p>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Min Withdrawal Limit (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#00246b] dark:text-white" size={16} />
                    <input 
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-base font-black outline-none focus:ring-2 focus:ring-[#00246b]/10 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSettingsModal(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-500 font-black text-[10px] uppercase rounded-xl">Cancel</button>
                  <button onClick={handleUpdateSettings} disabled={processing} className="flex-1 py-2.5 bg-[#00246b] text-white font-black text-[10px] uppercase rounded-xl shadow-lg shadow-[#00246b]/20">
                    {processing ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Process Modal */}
      <AnimatePresence>
        {processModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className={`p-4 flex items-center gap-3 ${processModal.type === 'approve' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  {processModal.type === 'approve' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight">{processModal.type === 'approve' ? 'Confirm Approval' : 'Reject Request'}</h2>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-100">Review carefully</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {processModal.type === 'reject' && (
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Rejection Reason *</label>
                    <textarea 
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Why is it being rejected?"
                      className="w-full p-3 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500/10 min-h-[80px] dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Admin Notes (Optional)</label>
                  <textarea 
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal reference..."
                    className="w-full p-3 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#00246b]/10 min-h-[60px] dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setProcessModal({ isOpen: false, type: 'approve', requestId: null })} className="flex-1 py-2.5 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-500 font-black text-[10px] uppercase rounded-xl">Cancel</button>
                  <button onClick={handleProcess} disabled={processing} className={`flex-1 py-2.5 text-white font-black text-[10px] uppercase rounded-xl shadow-lg ${processModal.type === 'approve' ? 'bg-emerald-500 shadow-emerald-500/10' : 'bg-red-50'}`}>
                    {processing ? 'Wait...' : (processModal.type === 'approve' ? 'Yes, Approve' : 'Reject')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WithdrawalManagement;
