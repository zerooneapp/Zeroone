const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitNotification } = require('./socketService');

const VALID_ROLES = new Set(['customer', 'vendor', 'staff', 'admin']);

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
    recipients,
    userIds, 
    role, 
    type, 
    title, 
    message, 
    data = {}, 
    referenceId = '', 
    isSilent = false 
  }) {
    let resolvedRecipients = [];

    if (Array.isArray(recipients) && recipients.length > 0) {
      resolvedRecipients = recipients
        .filter((recipient) => recipient?.userId && VALID_ROLES.has(recipient.role))
        .map((recipient) => ({
          userId: recipient.userId,
          role: recipient.role
        }));
    } else {
      if (!VALID_ROLES.has(role)) {
        throw new Error(`Invalid notification role: ${role}`);
      }

      const ids = Array.isArray(userIds) ? userIds : [userIds];
      resolvedRecipients = ids
        .filter(Boolean)
        .map((userId) => ({ userId, role }));
    }
    
    // 1. Create In-App Notifications (MongoDB)
    const notifications = [];
    for (const recipient of resolvedRecipients) {
      try {
        const notif = await Notification.create({
          userId: recipient.userId,
          role: recipient.role,
          type,
          title,
          message,
          data,
          referenceId,
          isSilent
        });
        notifications.push(notif);
        
        // 2. Dispatch Real-time (Socket.io)
        emitNotification(recipient.userId, notif);
        
        // 3. Dispatch Push (Async - Don't await)
        if (!isSilent) {
          this._dispatchPush(recipient.userId, {
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
