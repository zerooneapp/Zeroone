const express = require('express');
const { createBooking, getMyBookings, updateBookingStatus } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All booking routes require login

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.patch('/:id/status', updateBookingStatus);
router.patch('/:id/reschedule', require('../controllers/bookingController').rescheduleBooking);

module.exports = router;
