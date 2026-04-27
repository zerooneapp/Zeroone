import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, vendorStatus, loading, isInitialized, user } = useAuthStore();
  const location = useLocation();

  // Optimistic Rendering: Wait until session is fully restored to avoid incorrect redirects on refresh
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-alabaster dark:bg-onyx">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginPath = location.pathname.startsWith('/admin')
      ? '/admin-login'
      : (['/vendor', '/staff'].some((prefix) => location.pathname.startsWith(prefix))
        ? '/vendor-login'
        : '/login');
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to their respective dashboards if they try to access unauthorized role areas
    const dashboardMap = {
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard',
      vendor: '/vendor/dashboard',
      staff: '/staff/dashboard',
      customer: '/'
    };
    return <Navigate to={dashboardMap[role] || '/'} replace />;
  }

  // 🛡️ HARD BLOCK LOGIC FOR VENDORS (Strict Verification Lock)
  if (role === 'vendor' && location.pathname.startsWith('/vendor')) {
    if (location.pathname !== '/vendor-pending' && !(user?.status === 'approved' || user?.status === 'active')) {
      return <Navigate to="/vendor-pending" replace />;
    }
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
