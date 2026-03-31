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
  getCategories
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require Admin role
router.use(protect, authorize('admin'));

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

// Subscription Plans
router.post('/plans', createPlan);
router.patch('/plans/:id', updatePlan);

// Revenue & Reporting
router.get('/revenue', getRevenueReport);

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

// Broadcast
router.post('/broadcast', require('../controllers/adminController').broadcastNotification);

module.exports = router;
