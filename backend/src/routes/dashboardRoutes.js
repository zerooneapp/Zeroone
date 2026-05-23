const express = require('express');
const { getVendorDashboard, getAdminDashboard } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { isApprovedVendor } = require('../middleware/vendorMiddleware');

const router = express.Router();

// Vendor Dashboard Route
router.get('/vendor', protect, isApprovedVendor, getVendorDashboard);

// Admin Dashboard Route
router.get('/admin', protect, authorize('admin', 'super_admin'), getAdminDashboard);

module.exports = router;
