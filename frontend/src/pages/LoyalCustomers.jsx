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
  Users,
  UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { useVendorStore } from '../store/vendorStore';

const toPascalCase = (str = '') =>
  str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const LoyalCustomers = () => {
  const navigate = useNavigate();
  const {
    clientsData: customers,
    clientsLoading: loading,
    fetchClients
  } = useVendorStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, repeat, high-spender
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleFetch = async (force = false) => {
    try {
      await fetchClients(force);
    } catch (err) {
      toast.error('Failed to load customers');
    }
  };

  useEffect(() => {
    handleFetch();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const filteredCustomers = customers.filter(c => {
    const trimmedSearch = search.trim().toLowerCase();
    const matchesSearch = !trimmedSearch ||
      c.name.toLowerCase().includes(trimmedSearch) || 
      c.phone.includes(trimmedSearch);
    
    if (filter === 'repeat') return matchesSearch && c.bookingCount >= 2;
    if (filter === 'high-spender') return matchesSearch && c.totalSpent > 1000;
    if (filter === 'inactive') return matchesSearch && dayjs().diff(dayjs(c.lastBooking), 'day') >= 30;
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-gray-800 px-4 pt-[48px] pb-3 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-1.5 bg-slate-100 dark:bg-gray-800 rounded-xl active:scale-90 transition-all"
        >
          <ChevronLeft size={18} className="text-slate-600 dark:text-gray-300" />
        </button>
        <h1 className="text-md font-black text-[#00246b] dark:text-white tracking-tight">
          Loyal Customers
        </h1>
      </header>

      <main className="pt-[104px] px-4 space-y-4">
        {/* Search & Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl py-2.5 pl-11 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#00246b]/20 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: 'all', label: 'All Clients', icon: Users },
              { id: 'repeat', label: 'Repeat (2+)', icon: Star },
              { id: 'high-spender', label: 'Top Spenders', icon: Wallet },
              { id: 'inactive', label: 'Inactive (30d+)', icon: UserX }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 ${
                  filter === btn.id 
                    ? 'bg-[#00246b]/5 text-[#00246b] border border-[#00246b] shadow-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' 
                    : 'bg-white dark:bg-gray-900 text-slate-500 border border-slate-100 dark:border-gray-800'
                }`}
              >
                <btn.icon size={10} />
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2.5">
          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-white dark:bg-gray-900 rounded-2xl animate-pulse" />
            ))
          ) : filteredCustomers.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Users size={28} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No customers found</p>
            </div>
          ) : (
            <>
              {paginatedCustomers.map((customer, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={customer._id}
                  className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-slate-100 dark:border-gray-800 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 shrink-0 bg-slate-50 dark:bg-gray-800 rounded-full overflow-hidden border border-slate-100 dark:border-gray-700">
                        <img 
                          src={customer.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=E2E8F0&color=1C2C4E&bold=true`} 
                          alt={customer.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-[#00246b] dark:text-white tracking-tight">
                          {toPascalCase(customer.name)}
                        </h3>
                      </div>
                    </div>
                    {customer.bookingCount >= 2 && (
                      <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <Star size={8} fill="currentColor" />
                        <span className="text-[7.5px] font-black uppercase tracking-tighter">Loyal</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-100 dark:border-gray-800">
                    <div className="space-y-0.5">
                      <p className="text-[7.5px] font-bold text-slate-400 uppercase">Visits</p>
                      <div className="flex items-center gap-1 text-[#00246b] dark:text-white">
                        <Calendar size={9} />
                        <span className="text-xs font-black">{customer.bookingCount}</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[7.5px] font-bold text-slate-400 uppercase">Spend</p>
                      <div className="flex items-center gap-1 text-[#00246b] dark:text-white">
                        <Wallet size={9} />
                        <span className="text-xs font-black">₹{customer.totalSpent % 1 === 0 ? customer.totalSpent : Number(customer.totalSpent).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[7.5px] font-bold text-slate-400 uppercase">Last Visit</p>
                      <p className="text-[10px] font-black text-[#00246b] dark:text-white">
                        {dayjs(customer.lastBooking).format('MMM DD')}
                      </p>
                    </div>
                  </div>

                </motion.div>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 pb-8 px-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-4 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#00246b] dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-sm"
                  >
                    Prev
                  </button>
                  <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-4 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#00246b] dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default LoyalCustomers;
