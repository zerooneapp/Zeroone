import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Sun,
  Moon,
  Wallet,
  Power,
  Calendar,
  ChevronLeft,
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
  Heart,
  Phone,
  Lock,
  Crown,
  IndianRupee,
  Clock
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
import { useVendorStore } from '../store/vendorStore';
import { useAuthStore } from '../store/authStore';
import useSocket from '../hooks/useSocket';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import NotificationDrawer from '../components/NotificationDrawer';
import CreateSlotModal from '../components/CreateSlotModal';
import EmergencyClosureModal from '../components/EmergencyClosureModal';
import GlassConfirmationModal from '../components/GlassConfirmationModal';
import { cn } from '../utils/cn';

const prettifyTransactionLabel = (value = '') =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const toPascalCase = (str = '') =>
  str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const VendorDashboard = () => {
  const navigate = useNavigate();
  const {
    dashboardData: data,
    dashboardLoading: loading,
    dashboardTransactions: recentTransactions,
    dashboardUnreadCount: unreadCount,
    dashboardGlobalFeatures: globalFeatures,
    fetchDashboard,
    fetchCustomerBookingHistory,
    setDashboardData: setData
  } = useVendorStore();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [isCreateSlotOpen, setIsCreateSlotOpen] = useState(false);
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [showWalletValue, setShowWalletValue] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [completeBookingModal, setCompleteBookingModal] = useState({ isOpen: false, bookingId: null });

  // Client History States
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleViewHistory = async (customer) => {
    setSelectedCustomer(customer);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const histData = await fetchCustomerBookingHistory(
        customer.customerId,
        customer.isWalkIn,
        customer.customerName,
        customer.customerPhone
      );
      setHistoryBookings(histData || []);
    } catch (err) {
      toast.error('Failed to fetch booking history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFetch = async (force = false) => {
    try {
      const res = await fetchDashboard(force);
      const schedule = res?.todaySchedule || [];
      schedule.forEach((item) => {
        if (item.customerPhone) {
          fetchCustomerBookingHistory(
            item.customerId,
            item.isWalkIn,
            item.customerName,
            item.customerPhone
          ).catch(() => {});
        }
      });
    } catch (err) {
      toast.error('Failed to load dashboard data');
    }
  };

  const { role, user } = useAuthStore();
  const socket = useSocket(user?._id);

  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const currentShopId = localStorage.getItem('activeVendorId') || user?.lastActiveVendorId;
  const currentShop = user?.shops?.find(s => s._id === currentShopId) || user?.shops?.[0];
  const otherShops = user?.shops?.filter(s => s._id !== currentShop?._id) || [];

  const handleSwitchShop = async (shopId) => {
    try {
      await api.patch('/auth/switch-shop', { vendorId: shopId });
      localStorage.setItem('activeVendorId', shopId);
      const updatedUser = { ...user, lastActiveVendorId: shopId };
      useAuthStore.getState().updateUser(updatedUser);
      setIsShopDropdownOpen(false);
      toast.success('Shop switched successfully');
      window.location.reload();
    } catch (err) {
      toast.error('Failed to switch shop');
    }
  };

  useEffect(() => {
    handleFetch();

    // 📡 Real-time Refresh: Listen for socket notifications to update dashboard data
    const handleRealtimeUpdate = (event) => {
      const notification = event.detail;
      // Refresh dashboard if it's a booking related notification
      if (['NEW_BOOKING', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'STAFF_ASSIGNED'].includes(notification.type)) {
        console.log('[DASHBOARD-REFRESH] Refreshing due to notification:', notification.type);
        handleFetch(true);
      }
    };

    window.addEventListener('new-socket-notification', handleRealtimeUpdate);

    // 📡 Real-time Status Sync
    if (socket) {
      socket.on('SHOP_STATUS_UPDATED', (data) => {
        if (data.isShopOpen !== undefined) {
          useVendorStore.getState().setShopStatus(data.isShopOpen);
          toast(data.isShopOpen ? 'Shop is now ONLINE' : 'Shop is now OFFLINE', {
            icon: data.isShopOpen ? '🟢' : '🔴',
            id: 'shop-status-sync'
          });
        }
      });
    }

    const timer = setInterval(() => {
      setShowWalletValue((prev) => !prev);
    }, 3000);

    return () => {
      window.removeEventListener('new-socket-notification', handleRealtimeUpdate);
      if (socket) socket.off('SHOP_STATUS_UPDATED');
      clearInterval(timer);
    };
  }, [socket]);

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

    const nextCards = data.activeStaffCards || [];
    if (!nextCards.some((card) => card.id === selectedAssignee) && selectedAssignee !== 'all') {
      setSelectedAssignee('all');
    }
  }, [data, selectedAssignee]);

  const handleToggleStatus = async () => {
    console.log('[TOGGLE-DEBUG] Clicked', {
      isShopOpen: data?.isShopOpen,
      subscriptionActive: data?.subscription?.isActive,
      statusLoading
    });

    if (!data || !data.subscription) {
      console.log('[TOGGLE-DEBUG] No data or subscription found');
      return;
    }

    if (!data.subscription.isActive) {
      console.log('[TOGGLE-DEBUG] Blocked: Subscription inactive');
      return toast.error('Account Inactive. Recharge to resume', { icon: '\uD83D\uDEA8' });
    }

    if (statusLoading) {
      console.log('[TOGGLE-DEBUG] Blocked: Already loading');
      return;
    }

    const isCurrentlyActive = data.isShopOpen && !data.isClosedToday;
    const newStatus = !isCurrentlyActive;

    // Check if we are toggling OFF during business hours => Trigger Emergency Closure
    if (isCurrentlyActive === true && data.workingHours) {
      console.log('[TOGGLE-DEBUG] Checking Business Hours...');
      const now = dayjs();

      const parseWorkingTime = (timeStr = '') => {
        if (!timeStr) return 0;
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return 0;
        let [_, h, m, mod] = match;
        h = parseInt(h, 10); m = parseInt(m, 10);
        if (mod.toUpperCase() === 'PM' && h < 12) h += 12;
        if (mod.toUpperCase() === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      };

      const startMin = parseWorkingTime(data.workingHours?.start);
      let endMin = parseWorkingTime(data.workingHours?.end);
      if (endMin === 0 && data.workingHours?.end?.match(/12:00\s*AM/i)) {
        endMin = 1440;
      }
      const nowMin = now.hour() * 60 + now.minute();

      console.log(`[STATUS-DEBUG] Time Check: Now(${nowMin}), Start(${startMin}), End(${endMin})`);

      if (nowMin >= startMin && nowMin <= endMin) {
        console.log('[TOGGLE-DEBUG] Triggering Emergency Modal');
        setIsClosureModalOpen(true);
        return;
      }
    }

    // Optimistic Update
    setData((prev) => ({
      ...prev,
      isShopOpen: newStatus,
      isClosedToday: newStatus ? false : prev.isClosedToday
    }));

    try {
      setStatusLoading(true);
      console.log('[TOGGLE-DEBUG] Calling API...', { isShopOpen: newStatus, isClosedToday: newStatus ? false : undefined });
      await api.patch('/vendor/shop-status', {
        isShopOpen: newStatus,
        isClosedToday: newStatus ? false : undefined
      });
      toast.success(newStatus ? 'Shop is now OPEN' : 'Shop is now CLOSED');
    } catch (err) {
      setData((prev) => ({
        ...prev,
        isShopOpen: isCurrentlyActive,
        isClosedToday: !isCurrentlyActive && prev.isClosedToday
      }));
      toast.error('Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCompleteBooking = (id) => {
    setCompleteBookingModal({ isOpen: true, bookingId: id });
  };

  const executeCompleteBooking = async () => {
    const id = completeBookingModal.bookingId;
    if (!id) return;

    try {
      await api.patch(`/bookings/${id}/status`, { action: 'complete' });
      toast.success('Booking marked as completed', {
        icon: '\u2705'
      });
      fetchDashboard(true);
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const actionTiles = useMemo(() => [
    { label: 'New Entry', icon: CalendarPlus, onClick: () => setIsCreateSlotOpen(true) },
    { label: "Client's", icon: Heart, path: '/vendor/customers' },
    data?.serviceMode === 'home'
      ? { label: 'Staff', icon: Lock, locked: true }
      : { label: 'Staff', icon: Users, path: '/vendor/staff' },
    { label: 'Wallet', icon: Wallet, path: '/vendor/wallet' }
  ], [data?.serviceMode]);

  const activeSchedule = useMemo(() =>
    (data?.schedule || []).filter(item => ['pending', 'confirmed', 'assigned', 'pending_completion'].includes(item.status)),
    [data?.schedule]
  );

  const filteredSchedule = useMemo(() => activeSchedule.filter((item) => {
    if (!data?.hasRegisteredStaff || selectedAssignee === 'all') return true;
    if (selectedAssignee === 'owner') return item.staffType === 'owner';
    return item.staffId === selectedAssignee;
  }), [activeSchedule, data?.hasRegisteredStaff, selectedAssignee]);

  const activeStaffCards = useMemo(() => data?.activeStaffCards || [], [data?.activeStaffCards]);

  const displaySchedule = data?.hasRegisteredStaff
    ? filteredSchedule
    : activeSchedule;

  // REMOVED GLOBAL LOADING RETURN FOR PROGRESSIVE LOADING

  const getStaffCardClasses = (cardId) =>
    cn(
      'min-w-[132px] rounded-2xl border px-3 py-2.5 shadow-sm transition-all active:scale-95 flex items-center gap-2.5',
      selectedAssignee === cardId
        ? 'border-[#00246b] dark:border-white bg-white dark:bg-gray-800 shadow-[0_8px_18px_-12px_rgba(28,44,78,0.45)]'
        : 'border-slate-200 bg-white/90 dark:bg-gray-900 dark:border-gray-800'
    );

  const renderScheduleCard = (item, idx) => (
    <motion.div
      key={item.id || idx}
      whileTap={{ scale: 0.98 }}
      className="bg-white/70 dark:bg-gray-900/60 backdrop-blur-md p-2.5 mx-1.5 rounded-xl border border-white/40 dark:border-gray-800/40 shadow-sm flex items-center justify-between group"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-gray-800 group-hover:shadow-md transition-all">
          <img
            src={item.customerImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.customerName || 'Customer')}&background=00246b&color=ffffff&bold=true`}
            alt={item.customerName || 'Customer'}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="space-y-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[12px] font-black text-slate-800 dark:text-white leading-tight tracking-tight">
              {item.customerName}
            </h4>
          </div>
          <div className="flex flex-col gap-1 text-[8px] font-bold text-slate-400 tracking-tight mt-1">
            <div className="flex items-center gap-1.5">
              <Clock size={8} className="text-[#00246b] dark:text-blue-400 shrink-0" />
              <span className="text-[#00246b] dark:text-white uppercase">{item.time} {item.totalDuration ? `(${item.totalDuration} min)` : ''}</span>
              <span className="opacity-20">&bull;</span>
              <span className="truncate max-w-[150px]">{item.service}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="uppercase">{item.staffType === 'owner' ? 'Owner' : 'Staff'}</span>
              <span className="opacity-20">&bull;</span>
              <span className="truncate max-w-[150px]">{item.staffName || 'Owner'}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item.customerPhone && (
          <a
            href={`tel:${item.customerPhone}`}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-gray-700 shadow-sm active:scale-95 transition-all text-[#00246b] dark:text-blue-400"
            title="Call Customer"
          >
          <Phone size={12} strokeWidth={2.5} />
          </a>
        )}
      <button
        onClick={() => handleCompleteBooking(item.id)}
        className="px-4 py-2 bg-[#00246b] dark:bg-[#00246b] text-white rounded-lg text-[8px] font-black tracking-widest active:scale-90 shadow-lg shadow-[#00246b]/10 transition-all font-bold"
      >
        Done
      </button>
    </div>
    </motion.div >
  );

return (
  <div className="min-h-full bg-slate-50 dark:bg-gray-950 transition-colors duration-500 overflow-x-hidden no-scrollbar pb-16">
    <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-[100] px-4 pt-[48px] pb-3 flex items-center justify-between bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-black tracking-tighter leading-none flex items-center mr-1">
            <span className="text-[#00246b] dark:text-white">Zero</span>
            <span className="text-[#00246b]/30 dark:text-white">One</span>
          </h1>

        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => setIsNotificationsOpen(true)}
          className="relative w-8 h-8 flex items-center justify-center transition-transform active:scale-90"
        >
          <Bell size={18} className="text-slate-700 dark:text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-950 shadow-sm animate-pulse" />
          )}
        </button>
        <div className="flex items-center gap-2 pr-1">
          {loading ? (
            <div className="w-11 h-6 bg-slate-100 dark:bg-gray-800 rounded-full animate-pulse" />
          ) : (
            <button
              onClick={handleToggleStatus}
              className={cn(
                "w-11 h-6 rounded-full relative transition-all duration-300",
                data?.isShopOpen && !data?.isClosedToday ? 'bg-[#00246b]' : 'bg-slate-200 dark:bg-gray-800',
                statusLoading ? 'opacity-50 cursor-wait' : 'active:scale-95'
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                (data?.isShopOpen && !data?.isClosedToday) ? 'left-6' : 'left-1'
              )} />
            </button>
          )}
        </div>
      </div>
    </header>

    <main className="px-2.5 space-y-2 pt-[100px]">
      {data && !data.subscription?.isActive && (
        <section className="px-0.5 mb-2">
          <div
            onClick={() => navigate('/vendor/wallet')}
            className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-rose-500/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center shadow-lg shadow-rose-500/20">
                <Crown size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">Profile Inactive</h3>
                <p className="text-[9px] font-bold text-rose-500/70 uppercase tracking-tighter">Services hidden from marketplace</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-500 text-white px-3 py-1.5 rounded-lg">
              <span className="text-[9px] font-black uppercase tracking-widest">Reactivate</span>
              <ChevronRight size={10} strokeWidth={3} />
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-4 gap-1 px-0.5">
        {actionTiles.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              if (data && !data.subscription?.isActive && action.label !== 'Wallet') {
                toast.error('Recharge to enable this feature', { icon: '🚨' });
                navigate('/vendor/wallet');
                return;
              }
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
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-gray-900 rounded-lg border border-[#00246b]/5 dark:border-gray-800 shadow-[0_12px_30px_-10px_rgba(28,44,78,0.15)] active:scale-95 transition-all group lg:hover:shadow-[0_20px_40px_-12px_rgba(28,44,78,0.2)]",
              data && !data.subscription?.isActive && action.label !== 'Wallet' && "opacity-60 grayscale-[0.5]"
            )}
          >
            <div className="w-9 h-9 bg-[#00246b] dark:bg-[#00246b] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00246b]/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
              <action.icon size={18} strokeWidth={2.5} className="text-white" />
            </div>
            <div className="px-1 text-center font-black">
              <span className="text-[10px] text-[#00246b] dark:text-gray-300 tracking-tight leading-none block uppercase">
                {action.label}
              </span>
            </div>
          </button>
        ))}
      </section>

      <section className="px-0.5">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-1 pb-0">
          <div 
            className="bg-[#00246b] dark:bg-gray-900 py-2 px-2 rounded-lg shadow-lg border border-white/10 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <p className="text-[8px] font-black text-white/90 tracking-tighter leading-none mb-2 truncate">Today revenue</p>
            {loading ? (
              <div className="h-4 w-12 bg-white/20 rounded animate-pulse" />
            ) : (
              <p className="text-[16px] font-black text-white leading-none truncate">&#8377;{data?.stats?.todayEarnings?.toLocaleString() || '0'}</p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 py-2 px-2 rounded-lg border border-[#00246b]/10 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center text-center overflow-hidden">
            <p className="text-[8px] font-black text-[#00246b] dark:text-white tracking-tighter leading-none mb-2 truncate">Today clients</p>
            {loading ? (
              <div className="h-4 w-8 bg-slate-100 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <p className="text-[16px] font-black text-[#00246b] dark:text-white leading-none truncate">{data?.stats?.todayBookings || '0'}</p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 py-2 px-2 rounded-lg border border-[#00246b]/10 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center text-center overflow-hidden">
            <p className="text-[8px] font-black text-[#00246b] dark:text-white tracking-tighter leading-none mb-2 truncate">Services done</p>
            {loading ? (
              <div className="h-4 w-8 bg-slate-100 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <p className="text-[16px] font-black text-[#00246b] dark:text-white leading-none truncate">
                {data?.schedule?.filter((item) => item.status === 'completed').length || 0}
              </p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 py-2 px-2 rounded-lg border border-[#00246b]/10 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center text-center overflow-hidden">
            <p className="text-[8px] font-black text-[#00246b] dark:text-white tracking-tighter leading-none mb-2 truncate">Upcoming</p>
            {loading ? (
              <div className="h-4 w-8 bg-slate-100 dark:bg-gray-800 rounded-pulse animate-pulse" />
            ) : (
              <p className="text-[16px] font-black text-[#00246b] dark:text-white leading-none truncate">
                {data?.schedule?.filter((item) => ['pending', 'confirmed', 'assigned', 'pending_completion'].includes(item.status)).length || 0}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-2 pt-0">
        {(loading || (data?.hasRegisteredStaff && activeStaffCards.length > 1)) && (
          <div className="space-y-2 px-0.5">
            <h2 className="text-[10px] font-black text-[#00246b] dark:text-white tracking-tight opacity-80 uppercase">
              Active Staff
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="min-w-[132px] h-[58px] rounded-2xl border border-slate-100 bg-white dark:bg-gray-900 animate-pulse shrink-0" />
                ))
              ) : (
                activeStaffCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedAssignee(card.id)}
                    className={getStaffCardClasses(card.id)}
                  >
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-gray-700 dark:bg-gray-800 shrink-0">
                      <img
                        src={card.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(card.name || 'Staff')}&background=00246b&color=ffffff&bold=true`}
                        alt={card.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-[11px] font-black uppercase tracking-tight text-[#00246b] dark:text-white">
                        {card.name}
                      </p>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-tight text-slate-400">
                        {card.type === 'owner' ? 'Owner' : `${card.todayBookings} Today`}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="px-0.5">
          <h2 className="text-[10px] font-black text-[#00246b] dark:text-white tracking-tight opacity-80 uppercase">
            Today's clients
          </h2>
        </div>

        <div className="space-y-1">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white dark:bg-gray-900 mx-0.5 rounded-lg animate-pulse border border-slate-100 dark:border-gray-800" />
            ))
          ) : filteredSchedule.length === 0 ? (
            <div className="py-12 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-slate-200 dark:border-gray-800 flex flex-col items-center justify-center gap-2 group shadow-sm mx-0.5">
              <div className="w-10 h-10 bg-slate-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-slate-300 group-hover:text-[#00246b] transition-colors">
                <Calendar size={18} />
              </div>
              <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">No appointments found</p>
            </div>
          ) : (
            filteredSchedule.map((item, idx) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => item.customerPhone && navigate(`/vendor/customers?phone=${item.customerPhone}`)}
                className="relative bg-white dark:bg-gray-900 p-2 mx-0.5 rounded-lg shadow-sm border border-[#00246b]/10 dark:border-gray-800 flex items-center group cursor-pointer hover:border-slate-300 dark:hover:border-gray-700/80 transition-colors"
              >
                {/* Vertically Centered: Call + Done buttons */}
                <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1.5 z-10">
                  {item.customerPhone && (
                    <a
                      href={`tel:${item.customerPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-gray-700 shadow-sm active:scale-95 transition-all text-[#00246b] dark:text-blue-400"
                      title="Call Customer"
                    >
                      <Phone size={12} strokeWidth={2.5} />
                    </a>
                  )}
                  {!['completed', 'cancelled'].includes(item.status) && (() => {
                    // Use endTime if available, else startTime + duration, else item.time for today
                    let isTimeOver = false;
                    if (item.endTime) {
                      isTimeOver = new Date(item.endTime).getTime() < Date.now();
                    } else if (item.startTime) {
                      isTimeOver = new Date(item.startTime).getTime() + (item.totalDuration || 30) * 60000 < Date.now();
                    } else if (item.time) {
                      // item.time is like "02:00 PM", parse against today
                      const [timePart, ampm] = item.time.split(' ');
                      let [h, m] = timePart.split(':').map(Number);
                      if (ampm === 'PM' && h !== 12) h += 12;
                      if (ampm === 'AM' && h === 12) h = 0;
                      const apptEnd = new Date();
                      apptEnd.setHours(h, m + (item.totalDuration || 30), 0, 0);
                      isTimeOver = apptEnd.getTime() < Date.now();
                    }
                    return (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCompleteBooking(item.id); }}
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black tracking-widest active:scale-90 transition-all ${
                          isTimeOver
                            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500'
                            : 'text-white bg-[#00246b] shadow-[#00246b]/10 shadow-lg'
                        }`}
                      >
                        Done
                      </button>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2.5 pr-20">
                  <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-gray-800 group-hover:shadow-md transition-all shrink-0">
                    <img
                      src={item.customerImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.customerName || 'Customer')}&background=00246b&color=ffffff&bold=true`}
                      alt={item.customerName || 'Customer'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-0 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[12px] font-black text-[#00246b] dark:text-white leading-tight tracking-tight">
                        {item.customerName}
                      </h4>
                    </div>
                    <div className="flex flex-col gap-1 text-[8px] font-bold text-slate-400 tracking-tight mt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#00246b] dark:text-white uppercase">{item.time}</span>
                        <span className="opacity-20">&bull;</span>
                        <span className="truncate max-w-[150px]">{item.service}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="uppercase">{item.staffType === 'owner' ? 'Owner' : 'Staff'}</span>
                        <span className="opacity-20">&bull;</span>
                        <span className="truncate max-w-[80px]">{item.staffName || 'Owner'}</span>
                        {item.totalDuration && (
                          <>
                            <span className="opacity-20">&bull;</span>
                            <Clock size={8} className="text-slate-400 shrink-0" />
                            <span>{item.totalDuration} min</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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
                &#x1F6A8;
              </div>
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-black tracking-tight dark:text-white leading-tight">Profile Restricted</h2>
                <p className="text-[10px] text-slate-400 font-bold tracking-normal leading-relaxed px-6 opacity-80">
                  Reconnect with customers. Restores slot visibility instantly.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRetentionModal(false);
                  navigate('/vendor/wallet');
                }}
                className="w-full py-5 bg-[#0B1222] dark:bg-gray-800 text-white font-black text-xs tracking-widest rounded-lg active:scale-95 shadow-2xl shadow-slate-900/20 dark:shadow-gray-950/20 transition-all"
              >
                Boost Visibility Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {isNotificationsOpen && <NotificationDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />}
    <CreateSlotModal isOpen={isCreateSlotOpen} onClose={() => setIsCreateSlotOpen(false)} onRefresh={() => fetchDashboard(true)} />
    {isClosureModalOpen && <EmergencyClosureModal isOpen={isClosureModalOpen} onClose={() => setIsClosureModalOpen(false)} onCreated={() => fetchDashboard(true)} />}



    {/* Enhanced Glass Confirmation Modal */}
    {completeBookingModal.isOpen && (
      <GlassConfirmationModal
        isOpen={completeBookingModal.isOpen}
        onClose={() => setCompleteBookingModal({ isOpen: false, bookingId: null })}
        onConfirm={executeCompleteBooking}
        title="Complete Booking"
        message="Are you sure this booking is fully completed? This will finalize the revenue."
        confirmText="Yes, Complete"
        cancelText="Not Yet"
      />
    )}

    {/* Client History Overlay Modal */}
    <AnimatePresence>
      {isHistoryOpen && selectedCustomer && (
        <motion.div 
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="fixed inset-0 z-[150] bg-slate-50 dark:bg-gray-950 flex flex-col"
        >
          <div className="w-full max-w-4xl mx-auto h-full flex flex-col bg-white dark:bg-gray-900">
            {/* Modal Header */}
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-gray-800 px-4 pt-[48px] pb-3 flex items-center gap-4">
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 bg-slate-100 dark:bg-gray-800 rounded-xl active:scale-90 transition-all"
              >
                <ChevronLeft size={18} className="text-slate-600 dark:text-gray-300" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-100 dark:border-gray-700">
                  <img 
                    src={selectedCustomer.customerImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCustomer.customerName)}&background=E2E8F0&color=1C2C4E&bold=true`} 
                    alt={selectedCustomer.customerName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold text-[#00246b] dark:text-white tracking-tight">
                    {toPascalCase(selectedCustomer.customerName)}
                  </h1>
                  <p className="text-[9px] text-slate-400 font-bold dark:text-gray-400">
                    Booking History
                  </p>
                </div>
              </div>
            </header>

            {/* Modal Body */}
            <main className="p-4 overflow-y-auto no-scrollbar flex-1 space-y-4">
              {historyLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-t-[#00246b] border-slate-200 dark:border-gray-800 rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading history...</p>
                </div>
              ) : historyBookings.length === 0 ? (
                <div className="py-24 text-center space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-slate-500 dark:text-gray-500">No completed visits found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyBookings.map((booking) => (
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
                </div>
              )}
            </main>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
};

export default VendorDashboard;




