import { create } from 'zustand';
import api from '../services/api';
import dayjs from 'dayjs';

export const useVendorStore = create((set, get) => ({
  dashboardData: null,
  dashboardLoading: false,
  dashboardUnreadCount: 0,
  dashboardTransactions: [],
  dashboardGlobalFeatures: { membershipActive: true, subscriptionActive: true },
  
  bookingsData: [],
  bookingsLoading: false,
  lastBookingParams: null,

  staffData: [],
  staffLoading: false,

  walletData: null,
  transactionsData: [],
  withdrawalsData: [],
  walletLoading: false,

  promotionsData: [],
  promotionsLoading: false,

  servicesData: [],
  servicesLoading: false,

  clientsData: [],
  clientsLoading: false,

  reviewsData: { summary: { totalReviews: 0, avgRating: 0 }, reviews: [] },
  reviewsLoading: false,

  membershipData: [],
  membershipLoading: false,

  closuresData: [],
  closuresLoading: false,


  fetchDashboard: async (force = false) => {
    // If we already have data and it's not a force refresh, don't show loading state
    const { dashboardData } = get();
    if (dashboardData && !force) {
      // Just do a silent refresh in the background
      silentDashboardRefresh(set, get);
      return;
    }

    if (force !== 'silent') {
      set({ dashboardLoading: true });
    }
    try {
      const { data: bundle } = await api.get('/vendor/dashboard-bundle');
      
      const dashboardData = {
        ...bundle.dashboard,
        subscription: bundle.wallet?.subscription || null,
        walletBalance: bundle.wallet?.walletBalance || 0
      };
      
      const settingsRes = await api.get('/settings/shared');
      const globalFeatures = settingsRes.data?.features || { membershipActive: true, subscriptionActive: true };

      set({
        dashboardData,
        dashboardUnreadCount: bundle.unreadCount || 0,
        dashboardTransactions: (bundle.transactions || []).slice(0, 4),
        dashboardGlobalFeatures: globalFeatures,
        dashboardLoading: false
      });

      // Pre-fetch staff and wallet data while dashboard is loading for seamless transitions
      get().fetchStaff();
      get().fetchWallet();
      get().fetchPromotions();
      get().fetchServices();
      get().fetchClients();
      get().fetchReviews();
      get().fetchMemberships();
      
      // Pre-fetch bookings with default roster view
      get().fetchBookings({ 
        status: 'confirmed', 
        from: dayjs().format('YYYY-MM-DD'), 
        to: dayjs().add(7, 'day').format('YYYY-MM-DD') 
      });
      get().fetchClosures();

    } catch (err) {
      console.error('Failed to load dashboard data', err);
      set({ dashboardLoading: false });
      throw err;
    }
  },

  fetchStaff: async (force = false) => {
    const { staffData } = get();
    if (staffData.length > 0 && !force) {
      silentStaffRefresh(set);
      return;
    }

    if (force !== 'silent') {
      set({ staffLoading: true });
    }
    try {
      const res = await api.get('/staff/manage/all', { params: { includeInactive: true } });
      set({
        staffData: res.data,
        staffLoading: false
      });
    } catch (err) {
      console.error('Failed to load staff roster', err);
      set({ staffLoading: false });
    }
  },

  fetchWallet: async (force = false) => {
    const { walletData } = get();
    if (walletData && !force) {
      silentWalletRefresh(set);
      return;
    }

    set({ walletLoading: true });
    try {
      const [walletRes, transactionsRes, withdrawalsRes] = await Promise.all([
        api.get('/vendor/wallet/overview'),
        api.get('/vendor/transactions'),
        api.get('/vendor/wallet/withdrawals')
      ]);

      set({
        walletData: walletRes.data,
        transactionsData: transactionsRes.data,
        withdrawalsData: withdrawalsRes.data,
        walletLoading: false
      });
    } catch (err) {
      console.error('Failed to load wallet data', err);
      set({ walletLoading: false });
    }
  },

  fetchPromotions: async (force = false) => {
    const { promotionsData } = get();
    if (promotionsData.length > 0 && !force) {
      silentPromotionsRefresh(set);
      return;
    }

    set({ promotionsLoading: true });
    try {
      const res = await api.get('/offers');
      set({
        promotionsData: res.data,
        promotionsLoading: false
      });
    } catch (err) {
      console.error('Failed to load promotions', err);
      set({ promotionsLoading: false });
    }
  },

  fetchServices: async (force = false) => {
    const { servicesData } = get();
    if (servicesData.length > 0 && !force) {
      silentServicesRefresh(set);
      return;
    }

    set({ servicesLoading: true });
    try {
      const res = await api.get('/services/manage/all', { params: { includeInactive: true } });
      set({
        servicesData: res.data,
        servicesLoading: false
      });
    } catch (err) {
      console.error('Failed to load services', err);
      set({ servicesLoading: false });
    }
  },

  fetchClients: async (force = false) => {
    const { clientsData } = get();
    if (clientsData.length > 0 && !force) {
      silentClientsRefresh(set);
      return;
    }

    set({ clientsLoading: true });
    try {
      const res = await api.get('/vendor/loyal-customers');
      set({
        clientsData: res.data,
        clientsLoading: false
      });
    } catch (err) {
      console.error('Failed to load clients', err);
      set({ clientsLoading: false });
    }
  },

  fetchReviews: async (force = false) => {
    const { reviewsData } = get();
    if (reviewsData.reviews.length > 0 && !force) {
      silentReviewsRefresh(set);
      return;
    }

    set({ reviewsLoading: true });
    try {
      const res = await api.get('/vendor/reviews');
      set({
        reviewsData: res.data || { summary: { totalReviews: 0, avgRating: 0 }, reviews: [] },
        reviewsLoading: false
      });
    } catch (err) {
      console.error('Failed to load reviews', err);
      set({ reviewsLoading: false });
    }
  },

  fetchMemberships: async (force = false) => {
    const { membershipData, dashboardData } = get();
    if (membershipData.length > 0 && !force) {
      silentMembershipRefresh(set);
      return;
    }

    set({ membershipLoading: true });
    try {
      let vId = dashboardData?.vendorId;
      if (!vId) {
        const dashRes = await api.get('/dashboards/vendor');
        vId = dashRes.data.vendorId;
      }
      
      const res = await api.get(`/memberships/vendor/${vId}`);
      set({
        membershipData: res.data,
        membershipLoading: false
      });
    } catch (err) {
      console.error('Failed to load memberships', err);
      set({ membershipLoading: false });
    }
  },

  fetchClosures: async (force = false) => {
    const { closuresData } = get();
    if (closuresData.length > 0 && !force) {
      silentClosuresRefresh(set);
      return;
    }
    if (force !== 'silent') {
      set({ closuresLoading: true });
    }
    try {
      const res = await api.get('/vendor/closures');
      set({ closuresData: res.data || [], closuresLoading: false });
    } catch (err) {
      console.error('Failed to load closures', err);
      set({ closuresLoading: false });
    }
  },


  fetchBookings: async (params, force = false) => {
    const { bookingsData, lastBookingParams } = get();
    
    // Check if params are the same as last time
    const paramsChanged = JSON.stringify(params) !== JSON.stringify(lastBookingParams);

    if (lastBookingParams && !paramsChanged && !force) {
      // Background refresh
      silentBookingsRefresh(set, params);
      return;
    }

    if (force !== 'silent') {
      set({ bookingsLoading: true });
    }
    try {
      const res = await api.get('/vendor/bookings', { params });
      set({
        bookingsData: res.data,
        lastBookingParams: params,
        bookingsLoading: false
      });
    } catch (err) {
      console.error('Failed to load bookings', err);
      set({ bookingsLoading: false });
      throw err;
    }
  },

  setDashboardData: (update) => set((state) => ({ 
    dashboardData: typeof update === 'function' ? update(state.dashboardData) : update 
  })),
  setBookingsData: (update) => set((state) => ({ 
    bookingsData: typeof update === 'function' ? update(state.bookingsData) : update 
  })),
  setStaffData: (update) => set((state) => ({ 
    staffData: typeof update === 'function' ? update(state.staffData) : update 
  })),
  setPromotionsData: (update) => set((state) => ({ 
    promotionsData: typeof update === 'function' ? update(state.promotionsData) : update 
  })),
  setServicesData: (update) => set((state) => ({ 
    servicesData: typeof update === 'function' ? update(state.servicesData) : update 
  })),
  setClientsData: (update) => set((state) => ({ 
    clientsData: typeof update === 'function' ? update(state.clientsData) : update 
  })),
  setReviewsData: (update) => set((state) => ({ 
    reviewsData: typeof update === 'function' ? update(state.reviewsData) : update 
  })),
  setMembershipData: (update) => set((state) => ({ 
    membershipData: typeof update === 'function' ? update(state.membershipData) : update 
  })),
  setShopStatus: (isOpen) => set((state) => ({
    dashboardData: state.dashboardData ? { ...state.dashboardData, isShopOpen: isOpen } : state.dashboardData
  })),
}));

async function silentDashboardRefresh(set, get) {
  try {
    const { data: bundle } = await api.get('/vendor/dashboard-bundle');
    const dashboardData = {
      ...bundle.dashboard,
      subscription: bundle.wallet?.subscription || null,
      walletBalance: bundle.wallet?.walletBalance || 0
    };
    set({
      dashboardData,
      dashboardUnreadCount: bundle.unreadCount || 0,
      dashboardTransactions: (bundle.transactions || []).slice(0, 4),
    });
    
    // Also silently refresh staff and wallet if they were already loaded
    if (get().staffData.length > 0) {
      silentStaffRefresh(set);
    }
    if (get().walletData) {
      silentWalletRefresh(set);
    }
    if (get().promotionsData.length > 0) {
      silentPromotionsRefresh(set);
    }
    if (get().servicesData.length > 0) {
      silentServicesRefresh(set);
    }
    if (get().clientsData.length > 0) {
      silentClientsRefresh(set);
    }
    if (get().reviewsData.reviews.length > 0) {
      silentReviewsRefresh(set);
    }
    if (get().membershipData.length > 0) {
      silentMembershipRefresh(set);
    }
    if (get().bookingsData.length > 0 && get().lastBookingParams) {
      silentBookingsRefresh(set, get().lastBookingParams);
    }
    if (get().closuresData.length > 0) {
      silentClosuresRefresh(set);
    }

  } catch (err) {
    console.error('Silent dashboard refresh failed', err);
  }
}

async function silentStaffRefresh(set) {
  try {
    const res = await api.get('/staff/manage/all', { params: { includeInactive: true } });
    set({ staffData: res.data });
  } catch (err) {
    console.error('Silent staff refresh failed', err);
  }
}

async function silentWalletRefresh(set) {
  try {
    const [walletRes, transactionsRes, withdrawalsRes] = await Promise.all([
      api.get('/vendor/wallet/overview'),
      api.get('/vendor/transactions'),
      api.get('/vendor/wallet/withdrawals')
    ]);
    set({
      walletData: walletRes.data,
      transactionsData: transactionsRes.data,
      withdrawalsData: withdrawalsRes.data
    });
  } catch (err) {
    console.error('Silent wallet refresh failed', err);
  }
}

async function silentPromotionsRefresh(set) {
  try {
    const res = await api.get('/offers');
    set({ promotionsData: res.data });
  } catch (err) {
    console.error('Silent promotions refresh failed', err);
  }
}

async function silentServicesRefresh(set) {
  try {
    const res = await api.get('/services/manage/all', { params: { includeInactive: true } });
    set({ servicesData: res.data });
  } catch (err) {
    console.error('Silent services refresh failed', err);
  }
}

async function silentClientsRefresh(set) {
  try {
    const res = await api.get('/vendor/loyal-customers');
    set({ clientsData: res.data });
  } catch (err) {
    console.error('Silent clients refresh failed', err);
  }
}

async function silentReviewsRefresh(set) {
  try {
    const res = await api.get('/vendor/reviews');
    set({ reviewsData: res.data || { summary: { totalReviews: 0, avgRating: 0 }, reviews: [] } });
  } catch (err) {
    console.error('Silent reviews refresh failed', err);
  }
}

async function silentMembershipRefresh(set) {
  try {
    const dashRes = await api.get('/dashboards/vendor');
    const vId = dashRes.data.vendorId;
    const res = await api.get(`/memberships/vendor/${vId}`);
    set({ membershipData: res.data });
  } catch (err) {
    console.error('Silent membership refresh failed', err);
  }
}

async function silentBookingsRefresh(set, params) {
  try {
    const res = await api.get('/vendor/bookings', { params });
    set({
      bookingsData: res.data,
      lastBookingParams: params
    });
  } catch (err) {
    console.error('Silent bookings refresh failed', err);
  }
}

async function silentClosuresRefresh(set) {
  try {
    const res = await api.get('/vendor/closures');
    set({ closuresData: res.data || [] });
  } catch (err) {
    console.error('Silent closures refresh failed', err);
  }
}
