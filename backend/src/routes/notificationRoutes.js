const express = require('express');
const { 
  getNotifications, 
  markAsRead, 
  getUnreadCount,
  deleteNotification 
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead); // Handles both :id and 'all'
router.delete('/:id', deleteNotification); // Handles both :id and 'bulk'

module.exports = router;
