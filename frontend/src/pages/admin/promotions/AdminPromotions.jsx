import React, { useState, useEffect } from 'react';
import { 
  Zap, Plus, CheckCircle, XCircle, Clock, 
  IndianRupee, Calendar, Trash2, Edit2, Loader2
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const AdminPromotions = () => {
  const [plans, setPlans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', amount: '', durationDays: '', description: '' });
  const [tab, setTab] = useState('pending'); // pending | active | transactions
  const [dailyPrice, setDailyPrice] = useState(10);
  const [savingPrice, setSavingPrice] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, settingsRes, txRes] = await Promise.all([
        api.get('/promotions/admin/requests'),
        api.get('/admin/settings'),
        api.get('/promotions/admin/transactions')
      ]);
      setRequests(reqRes.data);
      setDailyPrice(settingsRes.data.promotionPricePerDay || 10);
      setTransactions(txRes.data || []);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await api.post('/promotions/admin/plans', newPlan);
      toast.success('Plan created successfully');
      setIsModalOpen(false);
      setNewPlan({ name: '', amount: '', durationDays: '', description: '' });
      fetchData();
    } catch (err) {
      toast.error('Failed to create plan');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/promotions/admin/requests/${id}/approve`);
      toast.success('Promotion approved!');
      fetchData();
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled

    try {
      await api.patch(`/promotions/admin/requests/${id}/reject`, { reason });
      toast.success('Promotion rejected and refunded!');
      fetchData();
    } catch (err) {
      toast.error('Rejection failed');
    }
  };

  const handleUpdateDailyPrice = async () => {
    try {
      setSavingPrice(true);
      await api.patch('/admin/settings', { promotionPricePerDay: dailyPrice });
      toast.success('Global daily price updated!');
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setSavingPrice(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const activeRequests = requests.filter(r => r.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white capitalize tracking-tight">Promotion Management</h1>
          <p className="text-[13px] font-black text-slate-400 capitalize tracking-[0.2em] mt-1">Manage partner profile boosts</p>
        </div>
      </div>

      {/* 🚀 GLOBAL DAILY PRICE SETTING */}
      <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-50 dark:border-gray-800">
               <IndianRupee size={20} strokeWidth={3} />
            </div>
            <div>
               <h3 className="text-[14px] font-black text-slate-800 dark:text-white capitalize leading-tight">Daily Promotion Rate</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Vendors pay this amount per day of boost</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <div className="relative w-32">
               <input 
                  type="text"
                  inputMode="numeric"
                  value={dailyPrice}
                  onChange={(e) => {
                     let val = e.target.value.replace(/[^0-9]/g, '');
                     if (val.length > 1 && val.startsWith('0')) {
                        val = val.replace(/^0+/, '');
                     }
                     setDailyPrice(val === '' ? 0 : Number(val));
                  }}
                  className="w-full py-2.5 pl-4 pr-10 bg-white dark:bg-gray-800 border border-indigo-100 dark:border-gray-800 rounded-xl text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
               />
               <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">/DAY</span>
            </div>
            <button 
               onClick={handleUpdateDailyPrice}
               disabled={savingPrice}
               className="px-6 py-2.5 bg-slate-900 dark:bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
               {savingPrice ? 'Syncing...' : 'Update Rate'}
            </button>
         </div>
      </div>

      <div className="flex gap-4 border-b border-slate-100 dark:border-gray-800">
        <button 
          onClick={() => setTab('pending')}
          className={`pb-3 px-1 text-[12px] font-black uppercase tracking-widest transition-all ${tab === 'pending' ? 'text-primary dark:text-white border-b-2 border-primary dark:border-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Pending Requests ({pendingRequests.length})
        </button>
        <button 
          onClick={() => setTab('active')}
          className={`pb-3 px-1 text-[12px] font-black uppercase tracking-widest transition-all ${tab === 'active' ? 'text-primary dark:text-white border-b-2 border-primary dark:border-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Active Boosts ({activeRequests.length})
        </button>
        <button 
          onClick={() => setTab('transactions')}
          className={`pb-3 px-1 text-[12px] font-black uppercase tracking-widest transition-all ${tab === 'transactions' ? 'text-primary dark:text-white border-b-2 border-primary dark:border-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Transactions ({transactions.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Loading promotions...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tab === 'transactions' ? (
            transactions.map(tx => (
              <div key={tx._id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-slate-100 dark:border-gray-800 flex items-center justify-between group hover:shadow-xl transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${tx.category === 'promotion_refund' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'} rounded-xl flex items-center justify-center`}>
                    {tx.category === 'promotion_refund' ? (
                      <XCircle size={24} strokeWidth={3} />
                    ) : (
                      <CheckCircle size={24} strokeWidth={3} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black text-slate-900 dark:text-white capitalize leading-none">
                      {tx.vendorId?.shopName || 'Unknown Partner'}
                    </h3>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">
                      {tx.description || 'Promotion Payment'} • {new Date(tx.timestamp).toLocaleString('en-GB')}
                    </p>
                    {tx.gatewayPaymentId && (
                      <p className="text-[9px] font-bold text-slate-400 dark:text-gray-500 font-mono mt-1">
                        ID: {tx.gatewayPaymentId}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right leading-none">
                    <p className={`text-[18px] font-black ${tx.category === 'promotion_refund' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {tx.category === 'promotion_refund' ? '-' : '+'}₹{tx.amount}
                    </p>
                    <p className={`text-[9px] font-black ${tx.category === 'promotion_refund' ? 'text-rose-500' : 'text-emerald-500'} uppercase tracking-widest mt-1`}>
                      {tx.category === 'promotion_refund' ? 'Refunded' : 'Paid'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            (tab === 'pending' ? pendingRequests : activeRequests).map(req => (
              <div key={req._id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-slate-100 dark:border-gray-800 flex items-center justify-between group hover:shadow-xl transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${req.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'} rounded-xl flex items-center justify-center`}>
                    <Zap size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black text-slate-900 dark:text-white capitalize leading-none">{req.vendorId?.shopName}</h3>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">
                      {req.durationDays} Days • {req.status === 'active' ? `Expires ${new Date(req.endDate).toLocaleDateString('en-GB')}` : 'Profile Boost'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right leading-none">
                    <p className="text-[18px] font-black text-slate-900 dark:text-white">₹{req.amountPaid}</p>
                    <p className={`text-[9px] font-black ${req.status === 'active' ? 'text-emerald-500' : 'text-primary dark:text-white'} uppercase tracking-widest mt-1`}>
                      {req.status === 'active' ? 'Activated' : 'Payment Verified'}
                    </p>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApprove(req._id)}
                        className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all border border-emerald-100"
                      >
                        <CheckCircle size={20} strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => handleReject(req._id)}
                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-100"
                      >
                        <XCircle size={20} strokeWidth={3} />
                      </button>
                    </div>
                  )}
                  {req.status === 'active' && (
                    <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/20">
                      Live
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {((tab === 'transactions' ? transactions : (tab === 'pending' ? pendingRequests : activeRequests)).length === 0) && (
            <div className="py-20 text-center border-2 border-dashed border-slate-100 dark:border-gray-800 rounded-3xl text-slate-300 font-black uppercase tracking-[0.2em] text-[11px]">
              No {tab === 'transactions' ? 'transactions' : `${tab} promotions`} found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPromotions;
