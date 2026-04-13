const admin = require('firebase-admin');
const Notification = require('../models/Notification');
const NotificationLog = require('../models/NotificationLog');
const User = require('../models/User');
const Staff = require('../models/Staff');
const { emitNotification } = require('./socketService');

// Firebase Admin Initialization
try {
  const serviceAccount = require('../config/zeroone.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('[NOTIFICATION-SERVICE] Firebase Admin Initialized');
} catch (error) {
  console.error('[NOTIFICATION-SERVICE-FATAL] Firebase Admin initialization failed:', error.message);
  console.warn('[NOTIFICATION-SERVICE] Falling back to MOCK mode. Please check backend/src/config/firebase-service-account.json');
}

const VALID_ROLES = new Set(['customer', 'vendor', 'staff', 'admin']);

const toFcmSafeData = (data = {}) =>
  Object.entries(data).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;

    if (typeof value === 'string') {
      acc[key] = value;
      return acc;
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      acc[key] = String(value);
      return acc;
    }

    if (value instanceof Date) {
      acc[key] = value.toISOString();
      return acc;
    }

    if (typeof value?.toString === 'function' && value.toString() !== '[object Object]') {
      acc[key] = value.toString();
      return acc;
    }

    acc[key] = JSON.stringify(value);
    return acc;
  }, {});

class NotificationService {
  /**
   * Send Push Notification through FCM (Production-Ready & Duplicate-Safe)
   */
  static async _dispatchPush(userId, payload) {
    try {
      const notificationId = `${userId}_${payload.data?.type || 'GEN'}_${payload.data?.id || Date.now()}`;

      // 🚫 1. Backend Duplicate Prevention (L1)
      const exists = await NotificationLog.findOne({ notificationId });
      if (exists) return;

      // 🔄 2. Token Collection (Check both User and Staff)
      let entity = await User.findById(userId);
      if (!entity) {
        entity = await Staff.findById(userId);
      }

      if (!entity) return;

      let tokens = [...(entity.fcmTokens || []), ...(entity.fcmTokenMobile || [])];
      tokens = [...new Set(tokens)].filter(Boolean); // Deduplicate & Filter empty

      if (!tokens.length) {
        console.log(`[PUSH-SKIP] No tokens for entity ${userId}`);
        return;
      }

      // 🚀 3. Multicast Send
      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: payload.title,
          body: payload.message || payload.body
        },
        data: toFcmSafeData({
          ...payload.data,
          notificationId // Sent for Frontend Dedupe (L3)
        })
      });

      // 📝 4. Log Success (L1/L2 Lock)
      const invalidTokens = [];
      (response.responses || []).forEach((result, index) => {
        if (result.success) return;

        const token = tokens[index];
        const code = result.error?.code || 'unknown';
        const message = result.error?.message || 'Unknown push error';

        console.warn(`[PUSH-FAIL] user=${userId} token=${token} code=${code} message=${message}`);

        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(token);
        }
      });

      if (invalidTokens.length) {
        entity.fcmTokens = (entity.fcmTokens || []).filter((token) => !invalidTokens.includes(token));
        entity.fcmTokenMobile = (entity.fcmTokenMobile || []).filter((token) => !invalidTokens.includes(token));
        await entity.save();
        console.log(`[PUSH-CLEANUP] Removed ${invalidTokens.length} invalid token(s) for entity ${userId}`);
      }

      await NotificationLog.create({
        notificationId,
        userId,
        tokens
      });

      console.log(
        `[PUSH-SUCCESS] Delivered to ${response.successCount} devices for user ${userId} (failed: ${response.failureCount || 0})`
      );
    } catch (error) {
      console.error('[PUSH-ERROR]', error.message);
    }
  }

  /**
   * Centrally manages all system notifications (In-App + Push)
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
      if (role && !VALID_ROLES.has(role)) {
        throw new Error(`Invalid notification role: ${role}`);
      }

      const ids = Array.isArray(userIds) ? userIds : [userIds];
      resolvedRecipients = ids
        .filter(Boolean)
        .map((userId) => ({ userId, role }));
    }

    const notifications = [];
    for (const recipient of resolvedRecipients) {
      try {
        // Enforce notificationId for data payload if not provided
        const payloadData = {
          ...data,
          type: data.type || type,
          id: data.id || referenceId || Date.now()
        };

        // 🏠 1. Create In-App Notifications (MongoDB)
        const notif = await Notification.create({
          userId: recipient.userId,
          role: recipient.role,
          type,
          title,
          message,
          data: payloadData,
          referenceId,
          isSilent
        });
        notifications.push(notif);

        // ⚡ 2. Dispatch Real-time (Socket.io)
        emitNotification(recipient.userId, notif);

        // 📲 3. Dispatch Push (Async/Non-blocking)
        if (!isSilent) {
          // Fire and forget to keep API response fast
          this._dispatchPush(recipient.userId, {
            title,
            message,
            data: payloadData
          });
        }
      } catch (error) {
        if (error.code !== 11000) {
          console.error('[NotificationService-Error]', error.message);
        }
      }
    }

    return notifications;
  }
}

module.exports = NotificationService;

