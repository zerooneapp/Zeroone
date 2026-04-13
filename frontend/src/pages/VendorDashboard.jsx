import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Sun,
  Moon,
  Wallet,
  Power,
  Calendar,
  ChevronRight,
  ChevronDown,
  MapPin,
  X,
  ShieldCheck,
  CalendarPlus,
  LayoutGrid,
  Briefcase,
  Percent,
  Users,
  Ticket,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { useThemeStore } from '../store/themeStore';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import NotificationDrawer from '../components/NotificationDrawer';
import CreateSlotModal from '../components/CreateSlotModal';
import EmergencyClosureModal from '../components/EmergencyClosureModal';
import { cn } from '../utils/cn';

const prettifyTransactionLabel = (value = '') =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [data, setData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCreateSlotOpen, setIsCreateSlotOpen] = useState(false);
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [showWalletValue, setShowWalletValue] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('all');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, unreadRes, transactionsRes] = await Promise.all([
        api.get('/vendor/dashboard'),
        api.get('/notifications/unread-count'),
        api.get('/vendor/transactions', { params: { status: 'completed' } })
      ]);
      setData(dashRes.data);
      setUnreadCount(unreadRes.data.count || 0);
      setRecentTransactions((transactionsRes.data || []).slice(0, 4));
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(() => {
      setShowWalletValue((prev) => !prev);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data && !data.subscription?.isActive) {
      const lastShown = localStorage.getItem('lastRetentionPopup');
      const now = Date.now();
      const cooldown = 24 * 60 * 60 * 1000;
      if (!lastShown || now - parseInt(lastShown, 10) > cooldown) {
        setShowRetentionModal(true);
        localStorage.setItem('lastRetentionPopup', now.toString());
      }
    }
  }, [data]);

  useEffect(() => {
    if (!data?.hasRegisteredStaff) {
      setSelectedAssignee('all');
      return;
    }

    const nextCards = (data.activeStaffCards || []).filter((card) => card.type === 'owner' || data.hasRegisteredStaff);
    if (!nextCards.some((card) => card.id === selectedAssignee) && selectedAssignee !== 'all') {
      setSelectedAssignee('all');
    }
  }, [data, selectedAssignee]);

  const handleToggleStatus = async () => {
    if (!data.subscription?.isActive) {
      return toast.error('Account Inactive. Recharge to resume', { icon: '🚨' });
    }
    if (statusLoading) return;

    const previousStatus = data.isShopOpen;
    const newStatus = !previousStatus;

    // Check if we are toggling OFF during business hours => Trigger Emergency Closure
    if (previousStatus === true) {
      const now = dayjs();
      const parseWorkingTime = (timeStr = '') => {
        const [time, mod] = timeStr.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (mod === 'PM' && h < 12) h += 12;
        if (mod === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      };

      const startMin = parseWorkingTime(data.workingHours?.start);
      const endMin = parseWorkingTime(data.workingHours?.end);
      const nowMin = now.hour() * 60 + now.minute();

      if (nowMin >= startMin && nowMin <= endMin) {
        setIsClosureModalOpen(true);
        return;
      }
    }

    setData((prev) => ({ ...prev, isShopOpen: newStatus }));

    try {
      setStatusLoading(true);
      await api.patch('/vendor/shop-status', { isShopOpen: newStatus });
      toast.success(newStatus ? 'Shop is now OPEN' : 'Shop is now CLOSED');
    } catch (err) {
      setData((prev) => ({ ...prev, isShopOpen: previousStatus }));
      toast.error('Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCompleteBooking = async (id) => {
    if (!window.confirm('Are you sure this booking is fully completed?')) {
      return;
    }

    try {
      await api.patch(`/bookings/${id}/status`, { action: 'complete' });
      toast.success('Booking marked as completed');
      fetchDashboard();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-6 space-y-6 pt-24 animate-pulse">
        <div className="flex justify-between items-start h-16 bg-white dark:bg-gray-900 rounded-lg" />
        <div className="h-32 bg-white dark:bg-gray-900 rounded-lg" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square bg-white dark:bg-gray-900 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const actionTiles = [
    { label: 'New Booking', icon: CalendarPlus, onClick: () => setIsCreateSlotOpen(true) },
    { label: 'Offers', icon: Ticket, path: '/vendor/offers' },
    data.serviceMode === 'home'
      ? { label: 'Staff', icon: Lock, locked: true }
      : { label: 'Staff', icon: Users, path: '/vendor/staff' },
    { label: 'Wallet', icon: Wallet, path: '/vendor/wallet' }
  ];
  const activeSchedule = (data.schedule || []).filter(
    (item) => item.status === 'confirmed' || item.status === 'assigned'
  );
  const filteredSchedule = activeSchedule.filter((item) => {
    if (!data.hasRegisteredStaff || selectedAssignee === 'all') return true;
    if (selectedAssignee === 'owner') return item.staffType === 'owner';
    return item.staffId === selectedAssignee;
  });
  const activeStaffCards = (data.activeStaffCards || []).filter((card) => {
    if (card.type === 'owner') return true;
    return data.hasRegisteredStaff;
  });
  const displaySchedule = data.hasRegisteredStaff
    ? filteredSchedule
    : activeSchedule;

  const getStaffCardClasses = (cardId) =>
    cn(
      'min-w-[132px] rounded-2xl border px-3 py-2.5 shadow-sm transition-all active:scale-95 flex items-center gap-2.5',
      selectedAssignee === cardId
        ? 'border-[#344474] bg-white shadow-[0_8px_18px_-12px_rgba(52,68,116,0.45)]'
        : 'border-slate-200 bg-white/90 dark:bg-gray-900 dark:border-gray-800'
    );

  const renderScheduleCard = (item, idx) => (
    <motion.div
      key={item.id || idx}
      whileTap={{ scale: 0.98 }}
      className="bg-white dark:bg-gray-900 p-2 mx-1.5 rounded-lg shadow-sm border border-[#344474]/10 dark:border-gray-800 flex items-center justify-between group"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-gray-800 group-hover:shadow-md transition-all">
          <img
            src={item.customerImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.customerName}${idx}`}
            alt={item.customerName || 'Customer'}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="space-y-0">
          <h4 className="text-[12px] font-black text-slate-800 dark:text-white leading-tight tracking-tight">
            {item.customerName}
          </h4>
          <div className="flex flex-col gap-1 text-[8px] font-bold text-slate-400 tracking-widest mt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[#344474] uppercase">{item.time}</span>
              <span className="opacity-20">•</span>
              <span className="truncate max-w-[150px]">{item.service}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="uppercase">{item.staffType === 'owner' ? 'Owner' : 'Staff'}</span>
              <span className="opacity-20">•</span>
              <span className="truncate max-w-[150px]">{item.staffName || 'Owner'}</span>
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={() => handleCompleteBooking(item.id)}
        className="px-4 py-2 bg-[#344474] dark:bg-[#344474] text-white rounded-lg text-[8px] font-black tracking-widest active:scale-90 shadow-lg shadow-[#344474]/10 transition-all font-bold"
      >
        Done
      </button>
    </motion.div>
  );

  return (
    <div className="bg-slate-50 dark:bg-gray-950 transition-colors duration-500 overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-[100] px-4 py-2.5 flex items-center justify-between bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-black tracking-tighter leading-none flex items-center">
              <span className="text-[#344474] dark:text-white">Zero</span>
              <span className="text-[#344474]/30 dark:text-gray-600">One</span>
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-gray-500">
            <MapPin size={8} strokeWidth={3} />
            <span className="text-[9.5px] font-black tracking-tight text-slate-500 dark:text-gray-400">
              {data.address?.split(',').slice(-1)[0]?.trim().split(' ')[0] || 'Indore'}
            </span>
            <ChevronDown size={10} className="ml-0.5" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative w-8 h-8 flex items-center justify-center transition-transform active:scale-90"
          >
            <Bell size={18} className="text-slate-700 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 border-2 border-white dark:border-gray-950 rounded-full" />
            )}
          </button>
          <div className="flex items-center gap-2 pr-1">
            <span className={cn("text-[8px] font-black uppercase tracking-widest transition-colors duration-300",
              data.isShopOpen && !data.isClosedToday ? "text-[#344474] dark:text-blue-400" : "text-slate-400 dark:text-gray-600")}>
              {data.isShopOpen ? 'Online' : 'Offline'}
            </span>
            <button
              onClick={handleToggleStatus}
              disabled={!data.subscription?.isActive || statusLoading}
              className={cn(
                "relative h-6 w-11 rounded-full p-1 transition-all duration-500 active:scale-90 shrink-0 border border-transparent shadow-sm",
                data.isShopOpen && !data.isClosedToday
                  ? "bg-[#344474] shadow-[0_4px_12px_rgba(52,68,116,0.3)]"
                  : "bg-slate-200 dark:bg-gray-800 border-slate-300/10"
              )}
            >
              <motion.div
                animate={{ x: (data.isShopOpen && !data.isClosedToday) ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="h-4 w-4 rounded-full bg-white shadow-md flex items-center justify-center pointer-events-none"
              >
                <Power
                  size={8}
                  strokeWidth={4}
                  className={cn(data.isShopOpen && !data.isClosedToday ? "text-[#344474]" : "text-slate-400")}
                />
              </motion.div>
            </button>
          </div>
        </div>
      </header>

      <main className="px-1.5 space-y-1 pt-[65px]">
        <section className="grid grid-cols-4 gap-1 px-0.5">
          {actionTiles.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                if (action.locked) {
                  toast('Only for shop partners', { icon: '🔒' });
                  return;
                }
                if (action.onClick) {
                  action.onClick();
                  return;
                }
                navigate(action.path);
              }}
              className="flex flex-col items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-gray-900 rounded-[15px] border border-[#344474]/5 dark:border-gray-800 shadow-[0_12px_30px_-10px_rgba(52,68,116,0.15)] active:scale-95 transition-all group lg:hover:shadow-[0_20px_40px_-12px_rgba(52,68,116,0.2)]"
            >
              <div className="w-9 h-9 bg-[#344474] dark:bg-[#344474] rounded-2xl flex items-center justify-center shadow-lg shadow-[#344474]/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
                <action.icon size={18} strokeWidth={2.5} className="text-white" />
              </div>
              <div className="px-1 text-center font-black">
                <span className="text-[10px] text-[#344474] dark:text-gray-300 tracking-tight leading-none block uppercase">
                  {action.label}
                </span>
              </div>
            </button>
          ))}
        </section>

        <section className="px-0.5">
          <div className="grid gap-1.5 pb-0" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 0.85fr' }}>
            <div className="bg-[#344474] dark:bg-gray-900 py-2.5 px-1.5 rounded-lg shadow-lg border border-white/20 flex flex-col justify-center overflow-hidden">
              <p className="text-[8px] font-black text-white/90 tracking-tight leading-none mb-1.5 truncate">Today revenue</p>
              <p className="text-[17px] font-black text-white leading-none truncate">₹{data.stats.todayEarnings.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 py-2.5 px-1.5 rounded-lg border border-[#344474]/10 dark:border-gray-800 shadow-sm flex flex-col justify-center overflow-hidden">
              <p className="text-[8px] font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5 truncate">Today clients</p>
              <p className="text-[17px] font-black text-slate-900 dark:text-white leading-none truncate">{data.stats.todayBookings}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 py-2.5 px-1.5 rounded-lg border border-[#344474]/10 dark:border-gray-800 shadow-sm flex flex-col justify-center overflow-hidden">
              <p className="text-[8px] font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5 truncate">Services done</p>
              <p className="text-[17px] font-black text-slate-900 dark:text-white leading-none truncate">
                {data.schedule.filter((item) => item.status === 'completed').length || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 py-2.5 px-1.5 rounded-lg border border-[#344474]/10 dark:border-gray-800 shadow-sm flex flex-col justify-center overflow-hidden">
              <p className="text-[8px] font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5 truncate">Pending</p>
              <p className="text-[17px] font-black text-slate-900 dark:text-white leading-none truncate">
                {data.schedule.filter((item) => item.status === 'confirmed').length || 0}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-2 pt-0">
          {data.hasRegisteredStaff && (
            <div className="space-y-2 px-1">
              <h2 className="text-[10px] font-black text-slate-800 dark:text-white tracking-tight opacity-80 uppercase">
                Active Staff
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {activeStaffCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedAssignee(card.id)}
                    className={getStaffCardClasses(card.id)}
                  >
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-gray-700 dark:bg-gray-800 shrink-0">
                      <img
                        src={card.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(card.name)}`}
                        alt={card.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-[11px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        {card.name}
                      </p>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-slate-400">
                        {card.type === 'owner' ? 'Owner' : `${card.todayBookings} Today`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-1">
            <h2 className="text-[10px] font-black text-slate-800 dark:text-white tracking-tight opacity-80 uppercase">
              Today's clients
            </h2>
          </div>`r`n`r`n          <div className="space-y-1">
            {filteredSchedule.length === 0 ? (
              <div className="py-12 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-slate-200 dark:border-gray-800 flex flex-col items-center justify-center gap-2 group shadow-sm mx-0.5">
                <div className="w-10 h-10 bg-slate-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-slate-300 group-hover:text-[#344474] transition-colors">
                  <Calendar size={18} />
                </div>
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">No appointments found</p>
              </div>
            ) : (
              filteredSchedule.map((item, idx) => (
                <motion.div
                  key={idx}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-gray-900 p-2 mx-1.5 rounded-lg shadow-sm border border-[#344474]/10 dark:border-gray-800 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-gray-800 group-hover:shadow-md transition-all">
                      <img
                        src={item.customerImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.customerName}${idx}`}
                        alt={item.customerName || 'Customer'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-0">
                      <h4 className="text-[12px] font-black text-slate-800 dark:text-white leading-tight tracking-tight">
                        {item.customerName}
                      </h4>
                      <div className="flex flex-col gap-1 text-[8px] font-bold text-slate-400 tracking-widest mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#344474] uppercase">{item.time}</span>
                          <span className="opacity-20">•</span>
                          <span className="truncate max-w-[150px]">{item.service}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase">{item.staffType === 'owner' ? 'Owner' : 'Staff'}</span>
                          <span className="opacity-20">â€¢</span>
                          <span className="truncate max-w-[150px]">{item.staffName || 'Owner'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {item.status === 'confirmed' ? (
                    <button
                      onClick={() => handleCompleteBooking(item.id)}
                      className="px-4 py-2 bg-[#344474] dark:bg-[#344474] text-white rounded-lg text-[8px] font-black tracking-widest active:scale-90 shadow-lg shadow-[#344474]/10 transition-all font-bold"
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/vendor/bookings')}
                      className="bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm active:scale-95 transition-all text-[10px] font-bold flex items-center gap-1"
                    >
                      View Details
                      <ChevronRight size={10} className="text-[#344474]" />
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </section>


      </main>

      <AnimatePresence>
        {showRetentionModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 pb-32">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRetentionModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-md overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] relative z-10"
            >
              <button onClick={() => setShowRetentionModal(false)} className="absolute top-6 right-6 p-2 bg-slate-50 dark:bg-gray-800 rounded-lg">
                <X size={16} />
              </button>
              <div className="p-10 space-y-8">
                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-lg flex items-center justify-center mx-auto text-4xl shadow-inner shadow-rose-500/5">
                  🚨
                </div>
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-black tracking-tight dark:text-white leading-tight italic uppercase">Profile Restricted</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed px-6 opacity-80">
                    Reconnect with customers. Restores slot visibility instantly.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowRetentionModal(false);
                    navigate('/vendor/wallet');
                  }}
                  className="w-full py-5 bg-[#344474] dark:bg-[#344474] text-white font-black uppercase text-xs tracking-[0.2em] rounded-lg active:scale-95 shadow-2xl shadow-slate-900/20 dark:shadow-[#344474]/20 transition-all italic"
                >
                  Boost Visibility Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <NotificationDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <CreateSlotModal isOpen={isCreateSlotOpen} onClose={() => setIsCreateSlotOpen(false)} onRefresh={fetchDashboard} />
      <EmergencyClosureModal isOpen={isClosureModalOpen} onClose={() => setIsClosureModalOpen(false)} onCreated={fetchDashboard} />
    </div>
  );
};

export default VendorDashboard;




