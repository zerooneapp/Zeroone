const express = require('express');
const {
  registerVendor, uploadDocs, getVendorProfile, getNearbyVendors,
  updateShopStatus, createOffer, getOffers, updateOffer, getVendorBookings,
  getVendorDashboard, getVendorDetail, updateShopProfile, createWalkIn, createManualBooking
} = require('../controllers/vendorController');
const { getTransactions } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const { isApprovedVendor } = require('../middleware/vendorMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/register', protect, registerVendor);
router.get('/profile', protect, getVendorProfile);
router.get('/dashboard', protect, isApprovedVendor, getVendorDashboard);
router.get('/nearby', getNearbyVendors); // Public discovery
router.get('/transactions', protect, isApprovedVendor, getTransactions);

// 1. Shop Control
router.patch('/shop-status', protect, isApprovedVendor, updateShopStatus);
router.patch('/update-profile', protect, isApprovedVendor, updateShopProfile);

// 2. Offer Management
router.post('/offers', protect, isApprovedVendor, createOffer);
router.get('/offers', protect, isApprovedVendor, getOffers);
router.patch('/offers/:id', protect, isApprovedVendor, updateOffer);

// 3. Filtered Bookings
router.get('/bookings', protect, isApprovedVendor, getVendorBookings);
router.post('/walk-in', protect, isApprovedVendor, createWalkIn);
router.post('/manual-booking', protect, isApprovedVendor, createManualBooking);

// Multipart upload for docs
router.post(
  '/upload-docs',
  protect,
  upload.fields([
    { name: 'aadhaarFront', maxCount: 1 },
    { name: 'aadhaarBack', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'shopImage', maxCount: 1 },
    { name: 'vendorPhoto', maxCount: 1 },
    { name: 'gallery', maxCount: 5 },
    { name: 'video', maxCount: 1 },
  ]),
  uploadDocs
);

module.exports = router;
