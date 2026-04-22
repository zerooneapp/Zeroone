import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import VendorLayout from './layouts/VendorLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import Home from './pages/Home';
import Nearby from './pages/Nearby';
import ServiceDetail from './pages/ServiceDetail';
import VendorReviews from './pages/VendorReviews';
import Cart from './pages/Cart';
import CheckoutReview from './pages/CheckoutReview';
import BookingSuccess from './pages/BookingSuccess';
import MyBookings from './pages/MyBookings';
import BookingStatusDetails from './pages/BookingStatusDetails';
import Account from './pages/Account';
import Favorites from './pages/Favorites';
import PersonalInformation from './pages/PersonalInformation';
import SavedAddresses from './pages/SavedAddresses';
import NotificationSettings from './pages/NotificationSettings';
import PaymentMethods from './pages/PaymentMethods';
import SecuritySettings from './pages/SecuritySettings';
import Preferences from './pages/Preferences';
import Notifications from './pages/Notifications';

// Auth
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLogin from './pages/AdminLogin';
import VendorLogin from './pages/VendorLogin';
import VendorSignup from './pages/VendorSignup';
import VendorVerification from './pages/VendorVerification';

// Vendor Pages
import VendorDashboard from './pages/VendorDashboard';
import VendorBookings from './pages/VendorBookings';
import VendorServices from './pages/VendorServices';
import VendorStaff from './pages/VendorStaff';
import VendorOffers from './pages/VendorOffers';
import VendorWallet from './pages/VendorWallet';
import VendorProfile from './pages/VendorProfile';
import ServiceForm from './pages/ServiceForm';
import StaffForm from './pages/StaffForm';
import OfferForm from './pages/OfferForm';
import PendingVerification from './pages/PendingVerification';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import VendorManagement from './pages/admin/vendors/VendorManagement';
import UserManagement from './pages/admin/users/UserManagement';
import UserDetail from './pages/admin/users/UserDetail';
import BookingManagement from './pages/admin/bookings/BookingManagement';
import AdminBookingDetail from './pages/admin/bookings/AdminBookingDetail';
import CategoryManagement from './pages/admin/categories/CategoryManagement';
import SubscriptionPlans from './pages/admin/plans/SubscriptionPlans';
import PlatformSettings from './pages/admin/settings/PlatformSettings';
import BroadcastSystem from './pages/admin/notifications/BroadcastSystem';
import TransactionManagement from './pages/admin/transactions/TransactionManagement';
import ReviewManagement from './pages/admin/reviews/ReviewManagement';
import AdminManagement from './pages/admin/admins/AdminManagement';
import {
  AdminNotifications
} from './pages/AdminModulePlaceholders';

// Components & Utils
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import AddressPopup from './components/AddressPopup';
import StaffDashboard from './pages/StaffDashboard';
import StaffBookings from './pages/StaffBookings';
import StaffAccount from './pages/StaffAccount';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { Toaster, toast } from 'react-hot-toast';
import { requestForToken, onMessageListener } from './config/firebase';
import { saveTokenToBackend } from './services/fcmService';

function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const logout = useAuthStore((state) => state.logout);

  // Foreground Notification Listener
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      onMessageListener()
        .then((payload) => {
          if (!payload?.notification) return;
          console.log('[App.jsx] Foreground notification:', payload);

          if (Notification.permission === 'granted') {
            try {
              const browserNotification = new Notification(
                payload.notification.title || 'New Notification',
                {
                  body: payload.notification.body || '',
                  icon: '/logo.png',
                  tag: payload.data?.notificationId || payload.messageId
                }
              );

              browserNotification.onclick = () => {
                window.focus();
                browserNotification.close();
              };
            } catch (error) {
              console.log('[App.jsx] Browser notification display failed:', error);
            }
          }

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
      logout();
      toast.error('Session expired, please log in again.');
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

  const toastStyle = {
    background: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.4)',
    color: isDarkMode ? '#fff' : '#1C2C4E',
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
      <Routes>
        {/* PUBLIC GUEST ROUTES */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/vendor-login" element={<VendorLogin />} />
          <Route path="/vendor-signup" element={<VendorSignup />} />
        </Route>
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
          </Route>
          <Route path="offers">
            <Route index element={<VendorOffers />} />
            <Route path="add" element={<OfferForm />} />
            <Route path="edit/:id" element={<OfferForm />} />
          </Route>
          <Route path="wallet" element={<VendorWallet />} />
        </Route>

        {/* STAFF PANEL */}
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff']} />}>
          <Route index element={<StaffDashboard />} />
          <Route path="dashboard" element={<Navigate to="/staff" replace />} />
          <Route path="bookings" element={<StaffBookings />} />
          <Route path="account" element={<StaffAccount />} />
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
          <Route path="bookings">
            <Route index element={<BookingManagement />} />
            <Route path=":id" element={<AdminBookingDetail />} />
          </Route>
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="plans" element={<SubscriptionPlans />} />
          <Route path="settings" element={<PlatformSettings />} />
          <Route path="notifications" element={<BroadcastSystem />} />
          <Route path="transactions" element={<TransactionManagement />} />
          <Route path="reviews" element={<ReviewManagement />} />
          <Route path="access" element={<AdminManagement />} />
        </Route>
      </Routes>

      <AddressPopup />
      <Toaster 
        position="top-center" 
        reverseOrder={false}
        toastOptions={{
          style: toastStyle,
          success: {
            iconTheme: {
              primary: isDarkMode ? '#10B981' : '#1C2C4E',
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
