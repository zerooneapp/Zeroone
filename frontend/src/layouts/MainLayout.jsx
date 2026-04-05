import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Navbar from './Navbar';
import ReviewPopup from '../components/ReviewPopup';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

const MainLayout = () => {
  const { role, isAuthenticated } = useAuthStore();
  const [unreviewed, setUnreviewed] = useState(null);
  const location = useLocation();

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
    <div className="min-h-screen bg-gradient-to-br from-white via-white/80 to-blue-50/30 dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-950 dark:to-blue-950/10 text-text-light dark:text-text-dark pb-[2px]">
      {!['/account', '/booking-status', '/cart', '/checkout-review', '/booking-success', '/service', '/favorites', '/bookings'].some(path => location.pathname.startsWith(path)) && <Header />}
      <main className="max-w-4xl mx-auto animate-in fade-in duration-500">
        <Outlet />
      </main>
      <Navbar />

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
