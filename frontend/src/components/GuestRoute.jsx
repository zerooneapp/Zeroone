import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const GuestRoute = ({ children }) => {
  const { isAuthenticated, role, isInitialized, user } = useAuthStore();

  if (!isInitialized) return null;

  if (isAuthenticated) {
    const dashboardMap = {
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard',
      vendor: (user?.status === 'approved' || user?.status === 'active' || user?.status === 'inactive') ? '/vendor/dashboard' : '/vendor-pending',
      staff: '/staff',
      customer: '/'
    };
    return <Navigate to={dashboardMap[role] || '/'} replace />;
  }

  return children || <Outlet />;
};

export default GuestRoute;
