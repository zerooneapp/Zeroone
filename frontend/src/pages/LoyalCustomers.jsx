import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Search, 
  Star, 
  Calendar, 
  Wallet, 
  Phone,
  MessageSquare,
  Filter,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const LoyalCustomers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, repeat, high-spender

  const fetchLoyalCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vendor/loyal-customers');
      setCustomers(res.data);
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyalCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone.includes(search);
    
    if (filter === 'repeat') return matchesSearch && c.bookingCount >= 2;
    if (filter === 'high-spender') return matchesSearch && c.totalSpent > 1000;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-gray-800 px-4 py-4 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-slate-100 dark:bg-gray-800 rounded-xl active:scale-90 transition-all"
        >
          <ChevronLeft size={20} className="text-slate-600 dark:text-gray-300" />
        </button>
        <h1 className="text-lg font-black text-[#1C2C4E] dark:text-white uppercase tracking-tight">
          Loyal Customers
        </h1>
      </header>

      <main className="pt-24 px-4 space-y-6">
        {/* Search & Filter */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C2C4E]/20 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: 'All Clients', icon: Users },
              { id: 'repeat', label: 'Repeat (2+)', icon: Star },
              { id: 'high-spender', label: 'Top Spenders', icon: Wallet }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
                  filter === btn.id 
                    ? 'bg-[#1C2C4E] text-white shadow-lg shadow-[#1C2C4E]/20' 
                    : 'bg-white dark:bg-gray-900 text-slate-500 border border-slate-100 dark:border-gray-800'
                }`}
              >
                <btn.icon size={12} />
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-white dark:bg-gray-900 rounded-2xl animate-pulse" />
            ))
          ) : filteredCustomers.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Users size={32} />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No customers found</p>
            </div>
          ) : (
            filteredCustomers.map((customer, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={customer._id}
                className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-gray-800 rounded-full overflow-hidden border border-slate-100 dark:border-gray-700">
                      <img 
                        src={customer.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=E2E8F0&color=1C2C4E&bold=true`} 
                        alt={customer.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-black text-[#1C2C4E] dark:text-white uppercase tracking-tight">
                        {customer.name}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400">{customer.phone}</p>
                    </div>
                  </div>
                  {customer.bookingCount >= 2 && (
                    <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Star size={10} fill="currentColor" />
                      <span className="text-[8px] font-black uppercase tracking-tighter">Loyal</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50 dark:border-gray-800">
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Visits</p>
                    <div className="flex items-center gap-1 text-[#1C2C4E] dark:text-white">
                      <Calendar size={10} />
                      <span className="text-xs font-black">{customer.bookingCount}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Spend</p>
                    <div className="flex items-center gap-1 text-[#1C2C4E] dark:text-white">
                      <Wallet size={10} />
                      <span className="text-xs font-black">₹{customer.totalSpent}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Last Visit</p>
                    <p className="text-[10px] font-black text-[#1C2C4E] dark:text-white">
                      {dayjs(customer.lastBooking).format('MMM DD')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <a 
                    href={`tel:${customer.phone}`}
                    className="flex-1 py-2.5 bg-slate-50 dark:bg-gray-800 text-[#1C2C4E] dark:text-white rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    <Phone size={12} />
                    Call
                  </a>
                  <button 
                    onClick={() => {
                      const cleanPhone = customer.phone.replace(/\D/g, '');
                      const message = encodeURIComponent(`Hello ${customer.name}, we're happy to have you as a loyal client!`);
                      window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
                    }}
                    className="flex-1 py-2.5 bg-[#1C2C4E] text-white rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    <MessageSquare size={12} />
                    Message
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default LoyalCustomers;
