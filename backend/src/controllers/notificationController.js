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
    const userRole = req.query.role || (req.user ? req.user.role : (req.staff ? 'staff' : null));
    
    const query = { userId: { $in: ownerIds } };
    if (userRole && userRole !== 'super_admin') {
      // super_admin sees all or specifically admin role notifications
      query.role = userRole === 'super_admin' ? 'admin' : userRole;
    }

    const notifications = await Notification.find(query)
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
    const userRole = req.query.role || (req.user ? req.user.role : (req.staff ? 'staff' : null));
    
    const roleFilter = {};
    if (userRole && userRole !== 'super_admin') {
       roleFilter.role = userRole === 'super_admin' ? 'admin' : userRole;
    }

    if (req.params.id === 'all') {
      await Notification.updateMany(
        { userId: { $in: ownerIds }, isRead: false, ...roleFilter },
        { isRead: true }
      );
      return res.status(200).json({ message: 'All notifications marked as read' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: { $in: ownerIds }, ...roleFilter },
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
    const userRole = req.query.role || (req.user ? req.user.role : (req.staff ? 'staff' : null));
    
    const query = { 
      userId: { $in: ownerIds },
      isRead: false 
    };

    if (userRole && userRole !== 'super_admin') {
       query.role = userRole === 'super_admin' ? 'admin' : userRole;
    }

    const count = await Notification.countDocuments(query);
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

    if (req.params.id === 'bulk') {
      const { ids } = req.body;
      if (!Array.isArray(ids)) return res.status(400).json({ message: 'IDs array required' });
      
      await Notification.deleteMany({
        _id: { $in: ids },
        userId: { $in: ownerIds }
      });
      return res.status(200).json({ message: 'Notifications deleted' });
    }

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
