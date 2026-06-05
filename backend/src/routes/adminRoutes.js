const express = require('express');
const { 
  getPendingVendors, approveVendor, rejectVendor, toggleBlockUser,
  addBalance, createPlan, updatePlan, getRevenueReport,
  getAllUsers, getUserBookings, getFilteredBookings,
  createCategory, getCategories, getAdminAccounts,
  createAdminAccount, toggleAdminAccountBlock, deleteAdminAccount,
  extendVendorFreeTrial, notifyLowBalance, updateAdminProfile,
  getWithdrawalRequests, processWithdrawalRequest,
  getAdminDashboard, getVendors, toggleBlockVendor, toggleVendorActive,
  getVendorInsights, getUserDetail, getBookingDetail, adminCancelBooking,
  updateCategory, deleteCategory, getSubscriptionPlans,
  getGlobalSettings, updateGlobalSettings, broadcastNotification,
  getStaffLiveReport, deleteVendor, getAllStaff, toggleBlockStaff
} = require('../controllers/adminController');
const { getAdminTransactions } = require('../controllers/transactionController');
const {
  getAdminReviews, approveReview, approveAllReviews, deleteReview
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require admin or super admin role
router.use(protect, authorize('admin', 'super_admin'));

// 👑 Dashboard
router.get('/dashboard', getAdminDashboard);

// Vendor Approvals & Management
router.get('/vendors/pending', getPendingVendors);
router.get('/vendors', getVendors);
router.get('/vendors/:id/insights', getVendorInsights);
router.patch('/vendors/:id/approve', approveVendor);
router.patch('/vendors/:id/reject', rejectVendor);
router.patch('/vendors/:id/block', toggleBlockVendor);
router.patch('/vendors/:id/toggle-active', toggleVendorActive);
router.patch('/vendors/:id/add-balance', addBalance);
router.patch('/vendors/:id/extend-trial', extendVendorFreeTrial);
router.delete('/vendors/:id', deleteVendor);

// Withdrawal Management
router.get('/withdrawals', getWithdrawalRequests);
router.patch('/withdrawals/:id', processWithdrawalRequest);

// Revenue & Reporting
router.get('/reports/revenue', getRevenueReport);
router.get('/reports/live', getStaffLiveReport);
router.get('/transactions', getAdminTransactions);

// Reviews
router.get('/reviews', getAdminReviews);
router.post('/reviews/approve-all', approveAllReviews);
router.post('/reviews/:id/approve', approveReview);
router.delete('/reviews/:id', deleteReview);

// User, Staff & Booking Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id/block', toggleBlockUser);
router.get('/users/:userId/bookings', getUserBookings);

router.get('/staff', getAllStaff);
router.patch('/staff/:id/block', toggleBlockStaff);

router.get('/bookings', getFilteredBookings);
router.get('/bookings/:id', getBookingDetail);
router.patch('/bookings/:id/cancel', adminCancelBooking);

// Category Management
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Subscription Plans
router.get('/plans', getSubscriptionPlans);
router.post('/plans', createPlan);
router.patch('/plans/:id', updatePlan);

// Global Settings
router.get('/settings', getGlobalSettings);
router.patch('/settings', updateGlobalSettings);

// Notifications
router.post('/broadcast', broadcastNotification);
router.post('/notify-low-balance', notifyLowBalance);

// Super Admin & Admin Access Management
router.get('/admins', authorize('super_admin'), getAdminAccounts);
router.post('/admins', authorize('super_admin'), createAdminAccount);
router.patch('/admins/:id/block', authorize('super_admin'), toggleAdminAccountBlock);
router.delete('/admins/:id', authorize('super_admin'), deleteAdminAccount);
router.patch('/profile', updateAdminProfile);

module.exports = router;
