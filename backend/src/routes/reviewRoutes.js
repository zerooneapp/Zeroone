const express = require('express');
const router = express.Router();
const { getVendorReviews, getUnreviewedBooking, submitReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.get('/vendor/:vendorId', getVendorReviews);

// Remaining review routes are protected
router.use(protect);

router.get('/unreviewed', getUnreviewedBooking);
router.post('/submit', submitReview);

module.exports = router;
