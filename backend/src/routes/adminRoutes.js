const express = require('express');
const { 
  getPendingVendors, 
  approveVendor, 
  rejectVendor, 
  toggleBlockUser,
  addBalance,
  createPlan,
  updatePlan,
  getRevenueReport,
  getAllUsers,
  getUserBookings,
  getFilteredBookings,
  createCategory,
  getCategories,
  getAdminAccounts,
  createAdminAccount,
  toggleAdminAccountBlock,
  deleteAdminAccount,
  extendVendorFreeTrial,
  notifyLowBalance
} = require('../controllers/adminController');
const { getAdminTransactions } = require('../controllers/transactionController');
const {
  getAdminReviews,
  approveReview,
  approveAllReviews,
  deleteReview
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require admin or super admin role
router.use(protect, authorize('admin', 'super_admin'));

// 👑 Dashboard
router.get('/dashboard', require('../controllers/adminController').getAdminDashboard);

// Vendor Approvals
router.get('/vendors/pending', getPendingVendors);
// Vendor Management (Step 3)
router.get('/vendors', require('../controllers/adminController').getVendors);
router.patch('/vendors/:id/approve', approveVendor);
router.patch('/vendors/:id/reject', rejectVendor);
router.patch('/vendors/:id/block', require('../controllers/adminController').toggleBlockVendor);
router.patch('/vendors/:id/toggle-active', require('../controllers/adminController').toggleVendorActive);
router.patch('/vendors/:id/add-balance', addBalance);
router.patch('/vendors/:id/extend-trial', extendVendorFreeTrial);
router.get('/vendors/:id/insights', require('../controllers/adminController').getVendorInsights);

// Subscription Plans
router.post('/plans', createPlan);
router.patch('/plans/:id', updatePlan);

// Revenue & Reporting
router.get('/revenue', getRevenueReport);
router.get('/transactions', getAdminTransactions);
router.get('/reviews', getAdminReviews);
router.post('/reviews/approve-all', approveAllReviews);
router.post('/reviews/:id/approve', approveReview);
router.delete('/reviews/:id', deleteReview);

// User & Booking Management
router.patch('/users/:id/block', toggleBlockUser);
router.get('/users', getAllUsers);
router.get('/users/:id', require('../controllers/adminController').getUserDetail);
router.get('/users/:userId/bookings', getUserBookings);
router.get('/bookings', getFilteredBookings);
router.get('/bookings/:id', require('../controllers/adminController').getBookingDetail);
router.patch('/bookings/:id/cancel', require('../controllers/adminController').adminCancelBooking);

// Category Management
router.post('/categories', createCategory);
router.get('/categories', getCategories);
router.patch('/categories/:id', require('../controllers/adminController').updateCategory);
router.delete('/categories/:id', require('../controllers/adminController').deleteCategory);

// Subscription Plans
router.post('/plans', createPlan);
router.get('/plans', require('../controllers/adminController').getSubscriptionPlans);
router.patch('/plans/:id', updatePlan);

// Global Settings
router.get('/settings', require('../controllers/adminController').getGlobalSettings);
router.patch('/settings', require('../controllers/adminController').updateGlobalSettings);

// Notifications
router.post('/broadcast', require('../controllers/adminController').broadcastNotification);
router.post('/notify-low-balance', notifyLowBalance);

// Super Admin Access Management
router.get('/admins', authorize('super_admin'), getAdminAccounts);
router.post('/admins', authorize('super_admin'), createAdminAccount);
router.patch('/admins/:id/block', authorize('super_admin'), toggleAdminAccountBlock);
router.delete('/admins/:id', authorize('super_admin'), deleteAdminAccount);

module.exports = router;
