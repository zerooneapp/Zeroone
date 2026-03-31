import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, vendorStatus, loading, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-alabaster dark:bg-onyx">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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

  // 🛡️ HARD BLOCK LOGIC FOR VENDORS (Only for /vendor routes)
  if (role === 'vendor' && !vendorStatus.isActive && location.pathname.startsWith('/vendor')) {
    const allowedPathways = ['/vendor/dashboard', '/vendor/wallet'];
    const currentPath = location.pathname;
    
    const isAllowed = allowedPathways.some(path => currentPath === path || currentPath.startsWith(path));

    if (!isAllowed) {
      return <Navigate to="/vendor/dashboard" replace />;
    }
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
