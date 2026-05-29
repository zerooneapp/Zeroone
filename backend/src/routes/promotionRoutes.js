const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Admin Routes
router.post('/admin/plans', protect, authorize('admin', 'super_admin'), promotionController.createPlan);
router.get('/admin/plans', protect, authorize('admin', 'super_admin'), promotionController.getPlansAdmin);
router.get('/admin/requests', protect, authorize('admin', 'super_admin'), promotionController.getPromotionRequests);
router.patch('/admin/requests/:id/approve', protect, authorize('admin', 'super_admin'), promotionController.approvePromotion);
router.patch('/admin/requests/:id/reject', protect, authorize('admin', 'super_admin'), promotionController.rejectPromotion);
router.get('/admin/transactions', protect, authorize('admin', 'super_admin'), promotionController.getPromotionTransactions);

// Vendor Routes
router.get('/vendor/plans', protect, authorize('vendor', 'admin'), promotionController.getAvailablePlans);
router.get('/vendor/my-promotions', protect, authorize('vendor', 'admin'), promotionController.getVendorPromotions);
router.get('/vendor/transactions', protect, authorize('vendor', 'admin'), promotionController.getVendorPromotionTransactions);
router.post('/vendor/create-order', protect, authorize('vendor', 'admin'), promotionController.createOrder);
router.post('/vendor/verify-payment', protect, authorize('vendor', 'admin'), promotionController.verifyPayment);
router.post('/vendor/purchase', protect, authorize('vendor', 'admin'), promotionController.purchasePromotion);

module.exports = router;
