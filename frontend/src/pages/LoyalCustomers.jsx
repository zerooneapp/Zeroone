import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  UserX,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { useVendorStore } from '../store/vendorStore';
import toast from 'react-hot-toast';

const toPascalCase = (str = '') =>
  str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const LoyalCustomers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    clientsData: customers,
    clientsLoading: loading,
    fetchClients,
    fetchCustomerBookingHistory
  } = useVendorStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, repeat, high-spender
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [historyProducts, setHistoryProducts] = useState([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState('services'); // 'services' or 'products'
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [openedFromList, setOpenedFromList] = useState(false);

  // Customer History Pagination States
  const [historyBookingsPage, setHistoryBookingsPage] = useState(1);
  const [historyProductsPage, setHistoryProductsPage] = useState(1);
  const HISTORY_ITEMS_PER_PAGE = 30;

  const paginatedHistoryBookings = useMemo(() => {
    return historyBookings.slice(
      (historyBookingsPage - 1) * HISTORY_ITEMS_PER_PAGE,
      historyBookingsPage * HISTORY_ITEMS_PER_PAGE
    );
  }, [historyBookings, historyBookingsPage]);

  const paginatedHistoryProducts = useMemo(() => {
    return historyProducts.slice(
      (historyProductsPage - 1) * HISTORY_ITEMS_PER_PAGE,
      historyProductsPage * HISTORY_ITEMS_PER_PAGE
    );
  }, [historyProducts, historyProductsPage]);

  const historyBookingsTotalPages = Math.ceil(historyBookings.length / HISTORY_ITEMS_PER_PAGE);
  const historyProductsTotalPages = Math.ceil(historyProducts.length / HISTORY_ITEMS_PER_PAGE);

  const handleViewHistory = async (customer, fromList = false) => {
    setOpenedFromList(fromList);
    setSelectedCustomer(customer);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    setActiveHistoryTab('services');
    setHistoryBookingsPage(1);
    setHistoryProductsPage(1);
    // Change the route query parameter to reflect the active customer history view
    navigate(`/vendor/customers?phone=${customer.phone}`, { replace: true });
    try {
      const data = await fetchCustomerBookingHistory(
        customer._id,
        customer.isWalkIn,
        customer.name,
        customer.phone
      );
      setHistoryBookings(data?.bookings || []);
      setHistoryProducts(data?.products || []);
    } catch (err) {
      toast.error('Failed to fetch booking history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFetch = async (force = false) => {
    try {
      await fetchClients(force);
    } catch (err) {
      toast.error('Failed to load customers');
    }
  };

  const openedPhoneRef = useRef(null);

  useEffect(() => {
    handleFetch();
  }, []);

  // Auto-open history if customer phone is passed in URL query parameters
  useEffect(() => {
    const queryPhone = new URLSearchParams(location.search).get('phone');
    if (customers.length > 0 && queryPhone) {
      const matchingCustomer = customers.find(c => c.phone === queryPhone);
      if (matchingCustomer && openedPhoneRef.current !== queryPhone) {
        openedPhoneRef.current = queryPhone;
        handleViewHistory(matchingCustomer);
      }
    } else if (!queryPhone) {
      openedPhoneRef.current = null;
    }
  }, [customers, location.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const filteredCustomers = customers
    .filter(c => {
      const trimmedSearch = search.trim().toLowerCase();
      const matchesSearch = !trimmedSearch ||
        c.name.toLowerCase().includes(trimmedSearch) || 
        c.phone.includes(trimmedSearch);
      
      if (filter === 'repeat') return matchesSearch && c.bookingCount >= 2;
      if (filter === 'high-spender') return matchesSearch && c.totalSpent > 1000;
      if (filter === 'inactive') return matchesSearch && dayjs().diff(dayjs(c.lastBooking), 'day') >= 30;
      return matchesSearch;
    })
    .sort((a, b) => new Date(b.lastBooking) - new Date(a.lastBooking));

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-gray-800 px-4 pt-[48px] pb-3 flex items-center gap-4">
        <button 
          onClick={() => navigate('/vendor/dashboard')}
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
                  onClick={() => handleViewHistory(customer, true)}
                  className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-slate-100 dark:border-gray-800 shadow-sm space-y-2 cursor-pointer hover:border-slate-300 dark:hover:border-gray-700/80 transition-colors"
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
                        <h3 className="font-extrabold text-sm text-[#00246b] dark:text-white tracking-tight flex items-center gap-1.5">
                          {toPascalCase(customer.name)}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold dark:text-gray-400">{customer.phone}</p>
                      </div>
                    </div>

                    {customer.bookingCount >= 2 && (
                      <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-md flex items-center gap-0.5 shrink-0 shadow-sm">
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
                        {dayjs(customer.lastBooking).format('DD MMM YYYY')}
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

      <AnimatePresence>
        {isHistoryOpen && selectedCustomer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-50 bg-slate-50 dark:bg-gray-950 flex flex-col"
          >
            <div className="w-full max-w-4xl mx-auto h-full flex flex-col bg-white dark:bg-gray-900">
              <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-gray-800 px-4 pt-[48px] pb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setIsHistoryOpen(false);
                      if (openedFromList) {
                        navigate('/vendor/customers', { replace: true });
                      } else {
                        navigate(-1);
                      }
                    }}
                    className="p-1.5 bg-slate-100 dark:bg-gray-800 rounded-xl active:scale-90 transition-all"
                  >
                    <ChevronLeft size={18} className="text-slate-600 dark:text-gray-300" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-100 dark:border-gray-700">
                      <img 
                        src={selectedCustomer.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCustomer.name)}&background=E2E8F0&color=1C2C4E&bold=true`} 
                        alt={selectedCustomer.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h1 className="text-sm font-extrabold text-[#00246b] dark:text-white tracking-tight">
                        {toPascalCase(selectedCustomer.name)}
                      </h1>
                      <p className="text-[9px] text-slate-400 font-bold dark:text-gray-400">
                        Booking History
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions: Call & WhatsApp */}
                <div className="flex items-center gap-2">
                  {selectedCustomer.phone && (
                    <a 
                      href={`tel:${selectedCustomer.phone}`}
                      className="p-2 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl text-slate-600 dark:text-gray-300 transition-all border border-slate-100 dark:border-gray-800/60"
                      title="Call Customer"
                    >
                      <Phone size={13} />
                    </a>
                  )}
                  {selectedCustomer.phone && (
                    <a 
                      href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 transition-all border border-emerald-100 dark:border-emerald-900/30"
                      title="WhatsApp Chat"
                    >
                      <MessageSquare size={13} />
                    </a>
                  )}
                </div>
              </header>

              {/* Toggle/Filter Tabs */}
              {historyProducts.length > 0 && (
                <div className="px-4 py-2 border-b border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <div className="flex bg-slate-100 dark:bg-gray-950 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveHistoryTab('services')}
                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                        activeHistoryTab === 'services'
                          ? 'bg-white dark:bg-gray-900 text-[#00246b] dark:text-white shadow-sm'
                          : 'text-slate-400 dark:text-gray-500'
                      }`}
                    >
                      Services ({historyBookings.length})
                    </button>
                    <button
                      onClick={() => setActiveHistoryTab('products')}
                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                        activeHistoryTab === 'products'
                          ? 'bg-white dark:bg-gray-900 text-[#00246b] dark:text-white shadow-sm'
                          : 'text-slate-400 dark:text-gray-500'
                      }`}
                    >
                      Products ({historyProducts.length})
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Body */}
              <main className="p-4 overflow-y-auto flex-1 space-y-4 pb-24">
                {historyLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-4 border-t-[#00246b] border-slate-200 dark:border-gray-800 rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading history...</p>
                  </div>
                ) : activeHistoryTab === 'services' ? (
                  historyBookings.length === 0 ? (
                    <div className="py-24 text-center space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-slate-500 dark:text-gray-500">No completed visits found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paginatedHistoryBookings.map((booking) => (
                        <div 
                          key={booking._id} 
                          className="p-3.5 bg-slate-50 dark:bg-gray-950 rounded-2xl border border-slate-100 dark:border-gray-900/60 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black text-[#00246b] dark:text-gray-300 bg-[#00246b]/5 dark:bg-gray-900 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                              {dayjs(booking.startTime).format('ddd, DD MMM YYYY')}
                            </span>
                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-gray-400 bg-slate-100/50 dark:bg-gray-800/50 px-2 py-1 rounded-lg">
                              <Clock size={10} className="text-[#00246b] dark:text-blue-400 shrink-0" />
                              <span>{dayjs(booking.startTime).format('hh:mm A')} {booking.totalDuration ? `(${booking.totalDuration} min)` : ''}</span>
                            </div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              ₹{booking.totalPrice}
                            </span>
                          </div>
                          <div className="pl-1 space-y-1">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Services Taken</p>
                            <div className="flex flex-wrap gap-1.5">
                              {booking.services.map((svc, sIdx) => (
                                <span 
                                  key={sIdx} 
                                  className="text-[10px] font-bold text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 px-2 py-0.5 rounded-md"
                                >
                                  {svc.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Services Pagination */}
                      {historyBookingsTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 pb-2 px-2">
                          <button
                            disabled={historyBookingsPage === 1}
                            onClick={() => setHistoryBookingsPage(prev => Math.max(prev - 1, 1))}
                            className="px-4 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#00246b] dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-sm"
                          >
                            Prev
                          </button>
                          <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">
                            Page {historyBookingsPage} of {historyBookingsTotalPages}
                          </span>
                          <button
                            disabled={historyBookingsPage === historyBookingsTotalPages}
                            onClick={() => setHistoryBookingsPage(prev => Math.min(prev + 1, historyBookingsTotalPages))}
                            className="px-4 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#00246b] dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-sm"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  historyProducts.length === 0 ? (
                    <div className="py-24 text-center space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-slate-500 dark:text-gray-500">No products purchased</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paginatedHistoryProducts.map((product) => (
                        <div 
                          key={product._id} 
                          className="p-2.5 bg-slate-50 dark:bg-gray-950 rounded-xl border border-slate-100 dark:border-gray-900/60 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex items-center gap-2.5">
                            {/* Left side: status indicator color bar */}
                            <div className={`w-1 h-8 rounded-full shrink-0 ${product.isReturn ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-[11px] font-black text-gray-900 dark:text-white truncate">{product.itemName}</h4>
                                {product.isReturn ? (
                                  <span className="text-[7px] font-black uppercase px-1 py-0.2 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded">
                                    Returned
                                  </span>
                                ) : (
                                  <span className="text-[7px] font-black uppercase px-1 py-0.2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded">
                                    Sold
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 dark:text-gray-500 uppercase mt-0.5">
                                <span>{dayjs(product.createdAt).format('DD MMM YYYY')}</span>
                                <span>&bull;</span>
                                <span>{dayjs(product.createdAt).format('hh:mm A')}</span>
                                <span>&bull;</span>
                                <span>Qty: {Math.abs(product.change)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-[11px] font-black tracking-tight ${product.isReturn ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {product.isReturn ? '-' : ''}₹{Math.abs(product.change) * (product.itemId?.price || 0)}
                            </span>
                            <p className="text-[7px] font-bold text-slate-400 dark:text-gray-500 uppercase mt-0.5">
                              ₹{product.itemId?.price || 0} each
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Products Pagination */}
                      {historyProductsTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 pb-2 px-2">
                          <button
                            disabled={historyProductsPage === 1}
                            onClick={() => setHistoryProductsPage(prev => Math.max(prev - 1, 1))}
                            className="px-4 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#00246b] dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-sm"
                          >
                            Prev
                          </button>
                          <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">
                            Page {historyProductsPage} of {historyProductsTotalPages}
                          </span>
                          <button
                            disabled={historyProductsPage === historyProductsTotalPages}
                            onClick={() => setHistoryProductsPage(prev => Math.min(prev + 1, historyProductsTotalPages))}
                            className="px-4 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#00246b] dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-sm"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoyalCustomers;
