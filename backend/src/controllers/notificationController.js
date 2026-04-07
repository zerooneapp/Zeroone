const Notification = require('../models/Notification');

const getNotificationOwnerIds = (req) => {
  if (req.user?._id) {
    return [req.user._id];
  }

  if (req.staff?._id) {
    return [req.staff.userId, req.staff._id].filter(Boolean);
  }

  return [];
};

// @desc    Get user notifications
// @route   GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const ownerIds = getNotificationOwnerIds(req);
    const notifications = await Notification.find({ userId: { $in: ownerIds } })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const ownerIds = getNotificationOwnerIds(req);
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: { $in: ownerIds } },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const ownerIds = getNotificationOwnerIds(req);
    const count = await Notification.countDocuments({ 
      userId: { $in: ownerIds },
      isRead: false 
    });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    const ownerIds = getNotificationOwnerIds(req);
    const notification = await Notification.findOneAndDelete({ 
      _id: req.params.id, 
      userId: { $in: ownerIds } 
    });
    
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.status(200).json({ message: 'Notification removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getNotifications, markAsRead, getUnreadCount, deleteNotification };
