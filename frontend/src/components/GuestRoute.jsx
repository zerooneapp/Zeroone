import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const GuestRoute = ({ children }) => {
  const { isAuthenticated, role, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-alabaster dark:bg-onyx">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    const dashboardMap = {
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard',
      vendor: '/vendor/dashboard',
      staff: '/staff',
      customer: '/'
    };
    return <Navigate to={dashboardMap[role] || '/'} replace />;
  }

  return children || <Outlet />;
};

export default GuestRoute;
