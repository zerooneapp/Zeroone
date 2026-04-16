import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Navbar from './Navbar';
import ReviewPopup from '../components/ReviewPopup';
import NotificationDrawer from '../components/NotificationDrawer';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import useSocket from '../hooks/useSocket';

const MainLayout = () => {
  const { role, isAuthenticated, user } = useAuthStore();
  useSocket(user?._id);
  const [unreviewed, setUnreviewed] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const shouldHideHeader = ['/account', '/booking-status', '/cart', '/checkout-review', '/booking-success', '/service', '/favorites', '/bookings']
    .some(path => location.pathname.startsWith(path));
  const checkUnreviewed = async () => {
    if (!isAuthenticated || role !== 'customer') return;
    try {
      const res = await api.get('/reviews/unreviewed');
      if (res.data) setUnreviewed(res.data);
    } catch (err) {
      console.error('Feedback check failed');
    }
  };

  useEffect(() => {
    checkUnreviewed();
  }, [location.pathname, isAuthenticated, role]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-text-light dark:text-text-dark">
      {!shouldHideHeader && (
        <Header onOpenNotifications={() => setShowNotifications(true)} />
      )}
      <main className="max-w-4xl mx-auto animate-in fade-in duration-500">
        <Outlet />
      </main>
      <Navbar />
      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {unreviewed && (
        <ReviewPopup
          booking={unreviewed}
          onClose={() => setUnreviewed(null)}
        />
      )}
    </div>
  );
};

export default MainLayout;
