const express = require('express');
const { getCategories } = require('../controllers/adminController');
const { getNearbyVendors, getVendorDetail } = require('../controllers/vendorController');
const { listServices } = require('../controllers/serviceController');
const { listStaff } = require('../controllers/staffController');
const { getAvailableSlots } = require('../controllers/slotController');
const { previewPublicPricing } = require('../controllers/offerController');

const router = express.Router();

// Public Discovery Routes
router.get('/categories', getCategories);
router.get('/vendors/nearby', getNearbyVendors);
router.get('/vendors/:id', getVendorDetail);
router.get('/services', listServices);
router.get('/staff', listStaff);
router.get('/slots', getAvailableSlots);
router.get('/pricing/preview', previewPublicPricing);

module.exports = router;
