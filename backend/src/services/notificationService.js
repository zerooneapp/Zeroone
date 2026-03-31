const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Centrally manages all system notifications (In-App + Push)
 */
class NotificationService {
  /**
   * Internal method to dispatch push notifications via FCM (Async/Non-blocking)
   */
  static async _dispatchPush(userId, payload) {
    try {
      const user = await User.findById(userId).select('fcmTokens');
      if (!user || user.fcmTokens.length === 0) return;

      // Extract tokens
      const tokens = user.fcmTokens.map(t => t.token);
      
      // In a real production environment, we would use Firebase Admin SDK here.
      // firebaseAdmin.messaging().sendToDevice(tokens, payload);
      
      console.log(`[FCM-MOCK] Sent push to ${userId}: ${payload.notification.title}`);
    } catch (error) {
      console.error('[FCM-ERROR]', error.message);
    }
  }

  /**
   * Send notification to a single user or multiple users (Bulk)
   */
  static async sendNotification({ 
    userIds, 
    role, 
    type, 
    title, 
    message, 
    data = {}, 
    referenceId = '', 
    isSilent = false 
  }) {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    
    // 1. Create In-App Notifications (MongoDB)
    const notifications = [];
    for (const userId of ids) {
      try {
        const notif = await Notification.create({
          userId, role, type, title, message, data, referenceId, isSilent
        });
        notifications.push(notif);
        
        // 2. Dispatch Push (Async - Don't await)
        if (!isSilent) {
          this._dispatchPush(userId, {
            notification: { title, body: message },
            data: { ...data, type }
          });
        }
      } catch (error) {
        // If E11000 (duplicate key), skip silently as it's intended protection
        if (error.code !== 11000) {
          console.error('[NotificationService-Error]', error.message);
        }
      }
    }
    
    return notifications;
  }
}

module.exports = NotificationService;
