import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, vendorStatus, loading, isInitialized, user } = useAuthStore();
  const location = useLocation();

  // Optimistic Rendering: Wait if not initialized, UNLESS we already have complete cached auth state
  if (!isInitialized) {
    if (!isAuthenticated || !user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-alabaster dark:bg-onyx">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
  }

  if (!isAuthenticated) {
    const isBusinessArea = ['/vendor', '/staff', '/admin'].some((prefix) =>
      location.pathname.startsWith(prefix)
    );
    const loginPath = isBusinessArea ? '/vendor-login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to their respective dashboards if they try to access unauthorized role areas
    const dashboardMap = {
      admin: '/admin/dashboard',
      vendor: '/vendor/dashboard',
      staff: '/staff/dashboard',
      customer: '/'
    };
    return <Navigate to={dashboardMap[role] || '/'} replace />;
  }

  // 🛡️ HARD BLOCK LOGIC FOR VENDORS (Strict Verification Lock)
  if (role === 'vendor' && location.pathname.startsWith('/vendor')) {
    const user = useAuthStore.getState().user;
    if (user?.status === 'pending' && location.pathname !== '/vendor-pending') {
      return <Navigate to="/vendor-pending" replace />;
    }
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
