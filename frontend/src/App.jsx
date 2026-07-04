import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import VendorLayout from './layouts/VendorLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages - Lazy Loaded
const Home = lazy(() => import('./pages/Home'));
const Nearby = lazy(() => import('./pages/Nearby'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const VendorReviews = lazy(() => import('./pages/VendorReviews'));
const Cart = lazy(() => import('./pages/Cart'));
const CheckoutReview = lazy(() => import('./pages/CheckoutReview'));
const BookingSuccess = lazy(() => import('./pages/BookingSuccess'));
import MyBookings from './pages/MyBookings';
const BookingStatusDetails = lazy(() => import('./pages/BookingStatusDetails'));
const Account = lazy(() => import('./pages/Account'));
const Favorites = lazy(() => import('./pages/Favorites'));
const PersonalInformation = lazy(() => import('./pages/PersonalInformation'));
const SavedAddresses = lazy(() => import('./pages/SavedAddresses'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const PaymentMethods = lazy(() => import('./pages/PaymentMethods'));
const SecuritySettings = lazy(() => import('./pages/SecuritySettings'));
const Preferences = lazy(() => import('./pages/Preferences'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const VendorPrivacyPolicy = lazy(() => import('./pages/VendorPrivacyPolicy'));
const ContactSupport = lazy(() => import('./pages/ContactSupport'));
const VendorContactSupport = lazy(() => import('./pages/VendorContactSupport'));
const MyMemberships = lazy(() => import('./pages/MyMemberships'));
const HelpDesk = lazy(() => import('./pages/HelpDesk'));
const MyTickets = lazy(() => import('./pages/MyTickets'));
const TicketManagement = lazy(() => import('./pages/admin/tickets/TicketManagement'));

// Auth - Lazy Loaded
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const VendorLogin = lazy(() => import('./pages/VendorLogin'));
const VendorSignup = lazy(() => import('./pages/VendorSignup'));
const VendorVerification = lazy(() => import('./pages/VendorVerification'));

// Vendor Pages - Lazy Loaded
const VendorDashboard = lazy(() => import('./pages/VendorDashboard'));
const VendorBookings = lazy(() => import('./pages/VendorBookings'));
const VendorServices = lazy(() => import('./pages/VendorServices'));
import VendorStaff from './pages/VendorStaff';
const VendorStaffProfile = lazy(() => import('./pages/VendorStaffProfile'));
const StaffReviews = lazy(() => import('./pages/StaffReviews'));
const VendorOffers = lazy(() => import('./pages/VendorOffers'));
const VendorWallet = lazy(() => import('./pages/VendorWallet'));
const VendorProfile = lazy(() => import('./pages/VendorProfile'));
const ServiceForm = lazy(() => import('./pages/ServiceForm'));
const StaffForm = lazy(() => import('./pages/StaffForm'));
const OfferForm = lazy(() => import('./pages/OfferForm'));
const PendingVerification = lazy(() => import('./pages/PendingVerification'));
const LoyalCustomers = lazy(() => import('./pages/LoyalCustomers'));
const MembershipPlans = lazy(() => import('./pages/MembershipPlans'));
const MembershipPlanForm = lazy(() => import('./pages/MembershipPlanForm'));
const VendorInventory = lazy(() => import('./pages/VendorInventory'));

// Admin Pages - Lazy Loaded
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const VendorManagement = lazy(() => import('./pages/admin/vendors/VendorManagement'));
const UserManagement = lazy(() => import('./pages/admin/users/UserManagement'));
const UserDetail = lazy(() => import('./pages/admin/users/UserDetail'));
const StaffManagement = lazy(() => import('./pages/admin/staff/StaffManagement'));
const BookingManagement = lazy(() => import('./pages/admin/bookings/BookingManagement'));
const AdminBookingDetail = lazy(() => import('./pages/admin/bookings/AdminBookingDetail'));
const CategoryManagement = lazy(() => import('./pages/admin/categories/CategoryManagement'));
const SubscriptionPlans = lazy(() => import('./pages/admin/plans/SubscriptionPlans'));
const PlatformSettings = lazy(() => import('./pages/admin/settings/PlatformSettings'));
const BroadcastSystem = lazy(() => import('./pages/admin/notifications/BroadcastSystem'));
const AdminNotificationList = lazy(() => import('./pages/admin/notifications/AdminNotificationList'));
const TransactionManagement = lazy(() => import('./pages/admin/transactions/TransactionManagement'));
const ReviewManagement = lazy(() => import('./pages/admin/reviews/ReviewManagement'));
const AdminManagement = lazy(() => import('./pages/admin/admins/AdminManagement'));
const AdminPromotions = lazy(() => import('./pages/admin/promotions/AdminPromotions'));
const WithdrawalManagement = lazy(() => import('./pages/admin/WithdrawalManagement'));
const PartnerMembership = lazy(() => import('./pages/admin/PartnerMembership'));

// Staff Pages
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
import StaffBookings from './pages/StaffBookings';
import StaffAccount from './pages/StaffAccount';
const StaffHistory = lazy(() => import('./pages/StaffHistory'));
const StaffInventory = lazy(() => import('./pages/StaffInventory'));

// Components & Utils
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import VendorLoader from './components/VendorLoader';
import AdminLoader from './components/AdminLoader';
import AddressPopup from './components/AddressPopup';
import ScrollToTop from './components/ScrollToTop';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { Toaster, toast, useToasterStore } from 'react-hot-toast';
import { requestForToken, onMessageListener } from './config/firebase';
import { saveTokenToBackend } from './services/fcmService';
import useSocket from './hooks/useSocket';

function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const onSystemThemeChange = useThemeStore((state) => state.onSystemThemeChange);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  // Limit toasts to 1 at a time globally
  const { toasts } = useToasterStore();
  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= 1)
      .forEach((t) => toast.remove(t.id));
  }, [toasts]);

  // Global socket listener for authenticated users
  useSocket(user?._id);

  // Foreground Notification Listener
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      onMessageListener()
        .then((payload) => {
          if (!payload?.notification) return;
          console.log('[App.jsx] Foreground notification:', payload);

          // Only show Toast in foreground to avoid double notifications (system + toast)
          toast.success(
            <div>
              <b>{payload.notification.title}</b>
              <p className="text-sm">{payload.notification.body}</p>
            </div>,
            { duration: 5000 }
          );
        })
        .catch((err) => console.log('failed: ', err));
    }
  }, []);

  // Restore Session on Mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Handle Notifications Setup
  useEffect(() => {
    const setupNotifications = async () => {
      if (!isInitialized) return;

      if (isAuthenticated) {
        const token = await requestForToken();
        if (token) {
          await saveTokenToBackend(token);
        }
      }
    };

    setupNotifications();
  }, [isAuthenticated, isInitialized]);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (isAuthenticated) {
        logout();
        toast.error('Session expired, please log in again.', { id: 'session-expired' });
      }
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, [isDarkMode, logout]);

  // Listen for system theme changes (only applies when themeMode === 'system')
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => onSystemThemeChange();
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [onSystemThemeChange]);

  const toastStyle = {
    background: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.4)',
    color: isDarkMode ? '#fff' : '#00246b',
    borderRadius: '20px',
    padding: '10px 18px',
    fontSize: '11px',
    fontWeight: '900',
    letterSpacing: '0.02em',
    boxShadow: isDarkMode ? '0 8px 32px 0 rgba(0, 0, 0, 0.3)' : '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
    maxWidth: '90%',
  };

  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<AdminLoader />}>
        <Routes>
        {/* FULLY PUBLIC ROUTES — No auth required */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/vendor-privacy-policy" element={<VendorPrivacyPolicy />} />
        <Route path="/contact-support" element={<ContactSupport />} />
        <Route path="/vendor-contact-support" element={<VendorContactSupport />} />

        {/* PUBLIC GUEST ROUTES */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/vendor-login" element={<VendorLogin />} />
        </Route>
        <Route path="/vendor-signup" element={<VendorSignup />} />
        <Route path="/vendor-verification" element={<VendorVerification />} />
        <Route path="/vendor-pending" element={<PendingVerification />} />

        {/* CUSTOMER PANEL (WITH MAIN LAYOUT) */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="nearby" element={<Nearby />} />
          <Route path="service/:id" element={<ServiceDetail />} />
          <Route path="service/:id/reviews" element={<VendorReviews />} />
          <Route path="services/:id" element={<ServiceDetail />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="cart" element={<Cart />} />
          <Route path="notifications" element={<Notifications />} />

          <Route element={<ProtectedRoute allowedRoles={['customer', 'vendor', 'admin', 'staff']} />}>
            <Route path="checkout-review" element={<CheckoutReview />} />
            <Route path="booking-success" element={<BookingSuccess />} />
            <Route path="bookings" element={<MyBookings />} />
            <Route path="booking-status/:id" element={<BookingStatusDetails />} />
            <Route path="account" element={<Account />} />
            <Route path="account/info" element={<PersonalInformation />} />
            <Route path="account/addresses" element={<SavedAddresses />} />
            <Route path="account/notifications" element={<NotificationSettings />} />
            <Route path="account/payments" element={<PaymentMethods />} />
            <Route path="account/security" element={<SecuritySettings />} />
            <Route path="account/preferences" element={<Preferences />} />
            <Route path="account/memberships" element={<MyMemberships />} />
            <Route path="account/helpdesk" element={<HelpDesk />} />
            <Route path="account/my-tickets" element={<MyTickets />} />
          </Route>
        </Route>

        {/* VENDOR PANEL (WITH VENDOR LAYOUT) */}
        <Route
          path="/vendor"
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <VendorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/vendor/dashboard" replace />} />
          <Route path="dashboard" element={<VendorDashboard />} />
          <Route path="profile" element={<VendorProfile />} />
          <Route path="bookings" element={<VendorBookings />} />
          <Route path="services">
            <Route index element={<VendorServices />} />
            <Route path="add" element={<ServiceForm />} />
            <Route path="edit/:id" element={<ServiceForm />} />
          </Route>
          <Route path="staff">
            <Route index element={<VendorStaff />} />
            <Route path="add" element={<StaffForm />} />
            <Route path="edit/:id" element={<StaffForm />} />
            <Route path=":id" element={<VendorStaffProfile />} />
          </Route>
          <Route path="offers">
            <Route index element={<VendorOffers />} />
            <Route path="add" element={<OfferForm />} />
            <Route path="edit/:id" element={<OfferForm />} />
          </Route>
          <Route path="wallet" element={<VendorWallet />} />
          <Route path="reviews" element={<VendorReviews />} />
          <Route path="customers" element={<LoyalCustomers />} />
          <Route path="inventory" element={<VendorInventory />} />
          <Route path="membership">
            <Route index element={<MembershipPlans />} />
            <Route path="add" element={<MembershipPlanForm />} />
            <Route path="edit/:id" element={<MembershipPlanForm />} />
          </Route>
        </Route>

        {/* STAFF PANEL */}
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff']} />}>
          <Route index element={<StaffDashboard />} />
          <Route path="dashboard" element={<Navigate to="/staff" replace />} />
          <Route path="bookings" element={<StaffBookings />} />
          <Route path="account" element={<StaffAccount />} />
          <Route path="history" element={<StaffHistory />} />
          <Route path="reviews" element={<StaffReviews />} />
          <Route path="inventory" element={<StaffInventory />} />
        </Route>

        {/* ADMIN PANEL (WITH ADMIN LAYOUT) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="vendors" element={<VendorManagement />} />
          <Route path="users">
            <Route index element={<UserManagement />} />
            <Route path=":id" element={<UserDetail />} />
          </Route>
          <Route path="staff" element={<StaffManagement />} />
          <Route path="bookings">
            <Route index element={<BookingManagement />} />
            <Route path=":id" element={<AdminBookingDetail />} />
          </Route>
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="plans" element={<SubscriptionPlans />} />
          <Route path="settings" element={<PlatformSettings />} />
          <Route path="tickets" element={<TicketManagement />} />
          <Route path="membership-settings" element={<PartnerMembership />} />
          <Route path="promotions" element={<AdminPromotions />} />
          <Route path="withdrawals" element={<WithdrawalManagement />} />
          <Route path="notifications">
            <Route index element={<AdminNotificationList />} />
            <Route path="broadcast" element={<BroadcastSystem />} />
          </Route>
          <Route path="transactions" element={<TransactionManagement />} />
          <Route path="reviews" element={<ReviewManagement />} />
          <Route path="access" element={<AdminManagement />} />
        </Route>
      </Routes>
      </Suspense>

      <AddressPopup />
      <Toaster 
        position="top-center" 
        reverseOrder={false}
        containerStyle={{
          top: '75px',
        }}
        toastOptions={{
          style: toastStyle,
          success: {
            iconTheme: {
              primary: isDarkMode ? '#10B981' : '#00246b',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </Router>
  );
}

export default App;
