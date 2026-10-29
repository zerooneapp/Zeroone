import { create } from 'zustand';
import api from '../services/api';
import { getSharedSettings } from '../services/sharedSettings';
import dayjs from 'dayjs';

// In-flight dedupe: if the same GET (url + params) is already running, reuse
// its promise instead of sending a second identical request. Several places
// (layout, dashboard prefetch, pages) trigger the same fetch at the same time.
const inFlightGets = new Map();
const dedupedGet = (url, config) => {
  const key = url + '|' + JSON.stringify(config?.params || {});
  if (inFlightGets.has(key)) return inFlightGets.get(key);
  const request = api.get(url, config).finally(() => inFlightGets.delete(key));
  inFlightGets.set(key, request);
  return request;
};

// Cache freshness. fetchedAt[section] holds when that section was last loaded:
// - key missing        -> never loaded (show loader, fetch)
// - younger than TTL   -> fresh (no request on revisit)
// - older than TTL / 0 -> stale (show cached data, refresh silently)
// "Loaded" no longer depends on the list being non-empty, so a section that is
// genuinely empty (0 offers, 0 reviews) is cached too instead of re-showing a
// loader on every visit.
const CACHE_TTL_MS = 30 * 1000;
const hasLoaded = (fetchedAt, key) => typeof fetchedAt?.[key] === 'number';
const isFresh = (fetchedAt, key) =>
  hasLoaded(fetchedAt, key) && Date.now() - fetchedAt[key] < CACHE_TTL_MS;
const stamp = (state, key) => ({ fetchedAt: { ...state.fetchedAt, [key]: Date.now() } });

// Runs low-priority work after the screen has rendered, so it does not
// compete with the requests the current screen actually needs.
export const runWhenIdle = (fn) => {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => fn(), { timeout: 3000 });
  } else {
    setTimeout(fn, 1500);
  }
};


// The active shop id is already known (dashboard bundle or the stored shop),
// so the extra /dashboards/vendor round-trip is only a last resort.
const resolveVendorId = async (get) => {
  const known = get().dashboardData?.vendorId || localStorage.getItem('activeVendorId');
  if (known) return known;
  const dashRes = await dedupedGet('/dashboards/vendor');
  return dashRes.data.vendorId;
};

export const useVendorStore = create((set, get) => ({
  fetchedAt: {},

  vendorProfileData: null,

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

  membershipMembers: [],
  membershipRequests: [],
  membershipMembersLoading: false,
  membershipRequestsLoading: false,
  membershipMembersPages: 1,
  membershipRequestsPages: 1,

  closuresData: [],
  closuresLoading: false,


  fetchDashboard: async (force = false) => {
    // If we already have data and it's not a force refresh, don't show loading state
    const { dashboardData, fetchedAt } = get();
    if (dashboardData && !force) {
      // Coming back to Home: refresh only the dashboard bundle, and only when
      // stale. Other sections refresh when their own page is opened.
      if (!isFresh(fetchedAt, 'dashboard')) {
        silentDashboardRefresh(set);
      }
      return;
    }

    if (force !== 'silent') {
      set({ dashboardLoading: true });
    }
    try {
      // Bundle and shared settings in parallel (settings used to wait for the
      // bundle to finish first).
      const [{ data: bundle }, settingsRes] = await Promise.all([
        dedupedGet('/vendor/dashboard-bundle'),
        getSharedSettings()
      ]);

      const dashboardData = {
        ...bundle.dashboard,
        subscription: bundle.wallet?.subscription || null,
        walletBalance: bundle.wallet?.walletBalance || 0
      };

      const globalFeatures = settingsRes.data?.features || { membershipActive: true, subscriptionActive: true };

      set((state) => ({
        dashboardData,
        dashboardUnreadCount: bundle.unreadCount || 0,
        dashboardTransactions: (bundle.transactions || []).slice(0, 4),
        dashboardGlobalFeatures: globalFeatures,
        dashboardLoading: false,
        ...stamp(state, 'dashboard')
      }));

      // Pre-fetch in two groups. Needed right away: bookings (default roster
      // view) and closures, used by the next most likely screen.
      get().fetchBookings({
        status: 'confirmed'
      }).catch(() => {});
      get().fetchClosures();

      // Everything else (incl. the ~200KB loyal-customers list) loads once
      // the dashboard has rendered and the browser is idle. Opening one of
      // those pages earlier still fetches it immediately (and shares any
      // request already in flight).
      runWhenIdle(() => {
        get().fetchStaff();
        get().fetchWallet();
        get().fetchPromotions();
        get().fetchServices();
        get().fetchClients();
        get().fetchReviews();
        get().fetchMemberships();
        get().fetchMembershipMembers(1, 10, true);
        get().fetchMembershipRequests(1, 10, true);
      });

    } catch (err) {
      console.error('Failed to load dashboard data', err);
      set({ dashboardLoading: false });
      throw err;
    }
  },

  // Shop profile for the Account page. Re-opening the page within the cache
  // window reuses it; any save (non-GET request) marks it stale, so the next
  // open loads fresh data.
  fetchVendorProfile: async (force = false) => {
    const { fetchedAt, vendorProfileData } = get();
    if (!force && vendorProfileData && isFresh(fetchedAt, 'profile')) {
      return vendorProfileData;
    }
    const res = await dedupedGet('/vendor/profile');
    set((state) => ({ vendorProfileData: res.data, ...stamp(state, 'profile') }));
    return res.data;
  },

  fetchStaff: async (force = false) => {
    const { fetchedAt } = get();
    if (hasLoaded(fetchedAt, 'staff') && !force) {
      if (!isFresh(fetchedAt, 'staff')) silentStaffRefresh(set);
      return;
    }

    if (force !== 'silent') {
      set({ staffLoading: true });
    }
    try {
      const res = await dedupedGet('/staff/manage/all', { params: { includeInactive: true } });
      set((state) => ({
        staffData: res.data,
        staffLoading: false,
        ...stamp(state, 'staff')
      }));
    } catch (err) {
      console.error('Failed to load staff roster', err);
      set({ staffLoading: false });
    }
  },

  fetchWallet: async (force = false) => {
    const { fetchedAt } = get();
    if (hasLoaded(fetchedAt, 'wallet') && !force) {
      if (!isFresh(fetchedAt, 'wallet')) silentWalletRefresh(set);
      return;
    }

    set({ walletLoading: true });
    try {
      const [walletRes, transactionsRes, withdrawalsRes] = await Promise.all([
        dedupedGet('/vendor/wallet/overview'),
        dedupedGet('/vendor/transactions'),
        dedupedGet('/vendor/wallet/withdrawals')
      ]);

      set((state) => ({
        walletData: walletRes.data,
        transactionsData: transactionsRes.data,
        withdrawalsData: withdrawalsRes.data,
        walletLoading: false,
        ...stamp(state, 'wallet')
      }));
    } catch (err) {
      console.error('Failed to load wallet data', err);
      set({ walletLoading: false });
    }
  },

  fetchPromotions: async (force = false) => {
    const { fetchedAt } = get();
    if (hasLoaded(fetchedAt, 'promotions') && !force) {
      if (!isFresh(fetchedAt, 'promotions')) silentPromotionsRefresh(set);
      return;
    }

    set({ promotionsLoading: true });
    try {
      const res = await dedupedGet('/offers');
      set((state) => ({
        promotionsData: res.data,
        promotionsLoading: false,
        ...stamp(state, 'promotions')
      }));
    } catch (err) {
      console.error('Failed to load promotions', err);
      set({ promotionsLoading: false });
    }
  },

  fetchServices: async (force = false) => {
    const { fetchedAt } = get();
    if (hasLoaded(fetchedAt, 'services') && !force) {
      if (!isFresh(fetchedAt, 'services')) silentServicesRefresh(set);
      return;
    }

    set({ servicesLoading: true });
    try {
      const res = await dedupedGet('/services/manage/all', { params: { includeInactive: true } });
      set((state) => ({
        servicesData: res.data,
        servicesLoading: false,
        ...stamp(state, 'services')
      }));
    } catch (err) {
      console.error('Failed to load services', err);
      set({ servicesLoading: false });
    }
  },

  fetchClients: async (force = false) => {
    const { fetchedAt } = get();
    if (hasLoaded(fetchedAt, 'clients') && !force) {
      if (!isFresh(fetchedAt, 'clients')) silentClientsRefresh(set);
      return;
    }

    set({ clientsLoading: true });
    try {
      const res = await dedupedGet('/vendor/loyal-customers');
      set((state) => ({
        clientsData: res.data,
        clientsLoading: false,
        ...stamp(state, 'clients')
      }));
    } catch (err) {
      console.error('Failed to load clients', err);
      set({ clientsLoading: false });
    }
  },

  fetchCustomerBookingHistory: async (customerId, isWalkIn, name, phone) => {
    if (phone && window.__PREFETCHED_DATA__?.customerHistories?.[phone]) {
      return window.__PREFETCHED_DATA__.customerHistories[phone];
    }
    try {
      const res = await dedupedGet('/vendor/customer-history', {
        params: { customerId, isWalkIn, name, phone }
      });
      if (phone) {
        if (!window.__PREFETCHED_DATA__.customerHistories) {
          window.__PREFETCHED_DATA__.customerHistories = {};
        }
        window.__PREFETCHED_DATA__.customerHistories[phone] = res.data;
      }
      return res.data;
    } catch (err) {
      console.error('Failed to fetch customer history', err);
      throw err;
    }
  },

  fetchReviews: async (force = false) => {
    const { fetchedAt } = get();
    if (hasLoaded(fetchedAt, 'reviews') && !force) {
      if (!isFresh(fetchedAt, 'reviews')) silentReviewsRefresh(set);
      return;
    }

    set({ reviewsLoading: true });
    try {
      const res = await dedupedGet('/vendor/reviews');
      set((state) => ({
        reviewsData: res.data || { summary: { totalReviews: 0, avgRating: 0 }, reviews: [] },
        reviewsLoading: false,
        ...stamp(state, 'reviews')
      }));
    } catch (err) {
      console.error('Failed to load reviews', err);
      set({ reviewsLoading: false });
    }
  },

  fetchMemberships: async (force = false) => {
    const { dashboardData, fetchedAt } = get();
    if (hasLoaded(fetchedAt, 'memberships') && !force) {
      if (!isFresh(fetchedAt, 'memberships')) silentMembershipRefresh(set, get);
      return;
    }

    set({ membershipLoading: true });
    try {
      const vId = await resolveVendorId(get);

      const res = await dedupedGet(`/memberships/vendor/${vId}`);
      set((state) => ({
        membershipData: res.data,
        membershipLoading: false,
        ...stamp(state, 'memberships')
      }));
    } catch (err) {
      console.error('Failed to load memberships', err);
      set({ membershipLoading: false });
    }
  },

  fetchMembershipMembers: async (page = 1, limit = 10, force = false) => {
    const { fetchedAt } = get();
    // Only page 1 is cached (as before); other pages always load.
    if (hasLoaded(fetchedAt, 'membershipMembers') && !force && page === 1) {
      if (!isFresh(fetchedAt, 'membershipMembers')) silentMembershipMembersRefresh(set, page, limit);
      return;
    }

    if (force !== 'silent') {
      set({ membershipMembersLoading: true });
    }
    try {
      const res = await dedupedGet(`/memberships/vendor/members?page=${page}&limit=${limit}`);
      set((state) => ({
        membershipMembers: res.data.memberships || [],
        membershipMembersPages: res.data.pages || 1,
        membershipMembersLoading: false,
        ...(page === 1 ? stamp(state, 'membershipMembers') : {})
      }));
    } catch (err) {
      console.error('Failed to load membership members', err);
      set({ membershipMembersLoading: false });
    }
  },

  fetchMembershipRequests: async (page = 1, limit = 10, force = false) => {
    const { fetchedAt } = get();
    // Only page 1 is cached (as before); other pages always load.
    if (hasLoaded(fetchedAt, 'membershipRequests') && !force && page === 1) {
      if (!isFresh(fetchedAt, 'membershipRequests')) silentMembershipRequestsRefresh(set, page, limit);
      return;
    }

    if (force !== 'silent') {
      set({ membershipRequestsLoading: true });
    }
    try {
      const res = await dedupedGet(`/memberships/vendor/requests?page=${page}&limit=${limit}`);
      set((state) => ({
        membershipRequests: res.data.requests || [],
        membershipRequestsPages: res.data.pages || 1,
        membershipRequestsLoading: false,
        ...(page === 1 ? stamp(state, 'membershipRequests') : {})
      }));
    } catch (err) {
      console.error('Failed to load membership requests', err);
      set({ membershipRequestsLoading: false });
    }
  },

  fetchClosures: async (force = false) => {
    const { fetchedAt } = get();
    if (hasLoaded(fetchedAt, 'closures') && !force) {
      if (!isFresh(fetchedAt, 'closures')) silentClosuresRefresh(set);
      return;
    }
    if (force !== 'silent') {
      set({ closuresLoading: true });
    }
    try {
      const res = await dedupedGet('/vendor/closures');
      set((state) => ({ closuresData: res.data || [], closuresLoading: false, ...stamp(state, 'closures') }));
    } catch (err) {
      console.error('Failed to load closures', err);
      set({ closuresLoading: false });
    }
  },


  fetchBookings: async (params, force = false) => {
    const { lastBookingParams, fetchedAt } = get();

    // Check if params are the same as last time
    const paramsChanged = JSON.stringify(params) !== JSON.stringify(lastBookingParams);

    if (lastBookingParams && !paramsChanged && !force) {
      // Background refresh, skipped while the same list is still fresh
      if (!isFresh(fetchedAt, 'bookings')) silentBookingsRefresh(set, params);
      return;
    }

    if (force !== 'silent') {
      set({ bookingsLoading: true });
    }
    try {
      const res = await dedupedGet('/vendor/bookings', { params });
      set((state) => ({
        bookingsData: res.data,
        lastBookingParams: params,
        bookingsLoading: false,
        ...stamp(state, 'bookings')
      }));
    } catch (err) {
      console.error('Failed to load bookings', err);
      set({ bookingsLoading: false });
      throw err;
    }
  },

  // Light realtime refresh: only the dashboard bundle and the current bookings
  // list, without re-fetching every other section.
  refreshDashboardAndBookings: async () => {
    await silentDashboardRefresh(set);

    const { lastBookingParams } = get();
    if (lastBookingParams) {
      silentBookingsRefresh(set, lastBookingParams);
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

// Any successful write (POST/PUT/PATCH/DELETE) can change what the vendor
// sections show, so mark every cached section stale (not unloaded): the next
// visit or non-forced fetch refreshes silently instead of serving data from
// before the change for up to CACHE_TTL_MS.
api.interceptors.response.use((response) => {
  const method = String(response?.config?.method || 'get').toLowerCase();
  if (method !== 'get') {
    useVendorStore.setState((state) => {
      const keys = Object.keys(state.fetchedAt || {});
      if (!keys.length) return {};
      return { fetchedAt: Object.fromEntries(keys.map((key) => [key, 0])) };
    });
  }
  return response;
});

async function silentDashboardRefresh(set) {
  try {
    const { data: bundle } = await dedupedGet('/vendor/dashboard-bundle');
    const dashboardData = {
      ...bundle.dashboard,
      subscription: bundle.wallet?.subscription || null,
      walletBalance: bundle.wallet?.walletBalance || 0
    };
    set((state) => ({
      dashboardData,
      dashboardUnreadCount: bundle.unreadCount || 0,
      dashboardTransactions: (bundle.transactions || []).slice(0, 4),
      ...stamp(state, 'dashboard')
    }));
  } catch (err) {
    console.error('Silent dashboard refresh failed', err);
  }
}

async function silentStaffRefresh(set) {
  try {
    const res = await dedupedGet('/staff/manage/all', { params: { includeInactive: true } });
    set((state) => ({ staffData: res.data, ...stamp(state, 'staff') }));
  } catch (err) {
    console.error('Silent staff refresh failed', err);
  }
}

async function silentWalletRefresh(set) {
  try {
    const [walletRes, transactionsRes, withdrawalsRes] = await Promise.all([
      dedupedGet('/vendor/wallet/overview'),
      dedupedGet('/vendor/transactions'),
      dedupedGet('/vendor/wallet/withdrawals')
    ]);
    set((state) => ({
      walletData: walletRes.data,
      transactionsData: transactionsRes.data,
      withdrawalsData: withdrawalsRes.data,
      ...stamp(state, 'wallet')
    }));
  } catch (err) {
    console.error('Silent wallet refresh failed', err);
  }
}

async function silentPromotionsRefresh(set) {
  try {
    const res = await dedupedGet('/offers');
    set((state) => ({ promotionsData: res.data, ...stamp(state, 'promotions') }));
  } catch (err) {
    console.error('Silent promotions refresh failed', err);
  }
}

async function silentServicesRefresh(set) {
  try {
    const res = await dedupedGet('/services/manage/all', { params: { includeInactive: true } });
    set((state) => ({ servicesData: res.data, ...stamp(state, 'services') }));
  } catch (err) {
    console.error('Silent services refresh failed', err);
  }
}

async function silentClientsRefresh(set) {
  try {
    const res = await dedupedGet('/vendor/loyal-customers');
    set((state) => ({ clientsData: res.data, ...stamp(state, 'clients') }));
  } catch (err) {
    console.error('Silent clients refresh failed', err);
  }
}

async function silentReviewsRefresh(set) {
  try {
    const res = await dedupedGet('/vendor/reviews');
    set((state) => ({
      reviewsData: res.data || { summary: { totalReviews: 0, avgRating: 0 }, reviews: [] },
      ...stamp(state, 'reviews')
    }));
  } catch (err) {
    console.error('Silent reviews refresh failed', err);
  }
}

async function silentMembershipRefresh(set, get) {
  try {
    const vId = await resolveVendorId(get);
    const res = await dedupedGet(`/memberships/vendor/${vId}`);
    set((state) => ({ membershipData: res.data, ...stamp(state, 'memberships') }));
  } catch (err) {
    console.error('Silent membership refresh failed', err);
  }
}

async function silentBookingsRefresh(set, params) {
  try {
    const res = await dedupedGet('/vendor/bookings', { params });
    set((state) => ({
      bookingsData: res.data,
      lastBookingParams: params,
      ...stamp(state, 'bookings')
    }));
  } catch (err) {
    console.error('Silent bookings refresh failed', err);
  }
}

async function silentClosuresRefresh(set) {
  try {
    const res = await dedupedGet('/vendor/closures');
    set((state) => ({ closuresData: res.data || [], ...stamp(state, 'closures') }));
  } catch (err) {
    console.error('Silent closures refresh failed', err);
  }
}

async function silentMembershipMembersRefresh(set, page, limit) {
  try {
    const res = await dedupedGet(`/memberships/vendor/members?page=${page}&limit=${limit}`);
    set((state) => ({
      membershipMembers: res.data.memberships || [],
      membershipMembersPages: res.data.pages || 1,
      ...(page === 1 ? stamp(state, 'membershipMembers') : {})
    }));
  } catch (err) {
    console.error('Silent membership members refresh failed', err);
  }
}

async function silentMembershipRequestsRefresh(set, page, limit) {
  try {
    const res = await dedupedGet(`/memberships/vendor/requests?page=${page}&limit=${limit}`);
    set((state) => ({
      membershipRequests: res.data.requests || [],
      membershipRequestsPages: res.data.pages || 1,
      ...(page === 1 ? stamp(state, 'membershipRequests') : {})
    }));
  } catch (err) {
    console.error('Silent membership requests refresh failed', err);
  }
}
