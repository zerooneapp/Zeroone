import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import VendorLayout from './layouts/VendorLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import Home from './pages/Home';
import Nearby from './pages/Nearby';
import ServiceDetail from './pages/ServiceDetail';
import Cart from './pages/Cart';
import CheckoutReview from './pages/CheckoutReview';
import BookingSuccess from './pages/BookingSuccess';
import MyBookings from './pages/MyBookings';
import BookingStatusDetails from './pages/BookingStatusDetails';
import Account from './pages/Account';
import Favorites from './pages/Favorites';

// Auth
import Login from './pages/Login';
import Signup from './pages/Signup';
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
import {
  AdminNotifications
} from './pages/AdminModulePlaceholders';

// Components & Utils
import ProtectedRoute from './components/ProtectedRoute';
import AddressPopup from './components/AddressPopup';
import StaffDashboard from './pages/StaffDashboard';
import StaffBookings from './pages/StaffBookings';
import StaffAccount from './pages/StaffAccount';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'react-hot-toast';

function App() {
  const { isDarkMode } = useThemeStore();
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode, restoreSession]);

  return (
    <Router>
      <Routes>
        {/* PUBLIC GUEST ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/vendor-login" element={<VendorLogin />} />
        <Route path="/vendor-signup" element={<VendorSignup />} />
        <Route path="/vendor-verification" element={<VendorVerification />} />
        <Route path="/vendor-pending" element={<PendingVerification />} />

        {/* CUSTOMER PANEL (WITH MAIN LAYOUT) */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="nearby" element={<Nearby />} />
          <Route path="service/:id" element={<ServiceDetail />} />
          <Route path="services/:id" element={<ServiceDetail />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="cart" element={<Cart />} />

          <Route element={<ProtectedRoute allowedRoles={['customer', 'vendor', 'admin', 'staff']} />}>
            <Route path="checkout-review" element={<CheckoutReview />} />
            <Route path="booking-success" element={<BookingSuccess />} />
            <Route path="bookings" element={<MyBookings />} />
            <Route path="booking-status/:id" element={<BookingStatusDetails />} />
            <Route path="account" element={<Account />} />
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
            <ProtectedRoute allowedRoles={['admin']}>
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
        </Route>
      </Routes>

      <AddressPopup />
      <Toaster position="top-center" reverseOrder={false} />
    </Router>
  );
}

export default App;
