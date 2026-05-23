const express = require('express');
const { getAvailableSlots, lockSlot } = require('../controllers/slotController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getAvailableSlots); // Public
router.post('/lock', protect, lockSlot); // Requires Auth

module.exports = router;
