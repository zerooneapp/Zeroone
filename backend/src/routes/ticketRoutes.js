const express = require('express');
const {
  createTicket,
  getUserTickets,
  adminGetTickets,
  adminUpdateTicketStatus
} = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// User Routes
router.post('/', protect, createTicket);
router.get('/my', protect, getUserTickets);

// Admin Routes
router.get('/admin', protect, authorize('admin', 'super_admin'), adminGetTickets);
router.patch('/admin/:id', protect, authorize('admin', 'super_admin'), adminUpdateTicketStatus);

module.exports = router;
