const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');
const { protect, authorize, optionalProtect } = require('../middleware/authMiddleware');
const { isApprovedVendor } = require('../middleware/vendorMiddleware');

// --- Vendor Routes ---

// Vendor Request Management (Specific routes MUST be before parameterized routes)
router.get('/vendor/requests', protect, authorize('vendor'), isApprovedVendor, membershipController.getVendorMembershipRequests);
router.patch('/status/:id', protect, authorize('vendor'), isApprovedVendor, membershipController.updateMembershipStatus);

// Vendor Plan Management
router.get('/vendor/members', protect, authorize('vendor'), isApprovedVendor, membershipController.getVendorMembers);
router.delete('/vendor/members/:id', protect, authorize('vendor'), isApprovedVendor, membershipController.deleteUserMembership);
router.post('/vendor/plans', protect, authorize('vendor'), isApprovedVendor, membershipController.createPlan);
router.get('/vendor/plans/:id', protect, authorize('vendor'), isApprovedVendor, membershipController.getPlanById);
router.patch('/vendor/plans/:id', protect, authorize('vendor'), isApprovedVendor, membershipController.updatePlan);
router.delete('/vendor/plans/:id', protect, authorize('vendor'), isApprovedVendor, membershipController.deletePlan);

// --- Public/Shared Routes ---
router.get('/vendor/:vendorId', optionalProtect, membershipController.getVendorPlans);

// --- User Routes ---
router.post('/request', protect, membershipController.requestManualPurchase);
router.post('/purchase/order', protect, membershipController.createPurchaseOrder);
router.post('/purchase/verify', protect, membershipController.verifyPurchase);
router.get('/my-memberships', protect, membershipController.getUserMemberships);
router.delete('/my-memberships/:id', protect, membershipController.deleteUserMembershipByUser);

module.exports = router;
