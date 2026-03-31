const express = require('express');
const router = express.Router();
const { getUnreviewedBooking, submitReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// All review routes are protected
router.use(protect);

router.get('/unreviewed', getUnreviewedBooking);
router.post('/submit', submitReview);

module.exports = router;
