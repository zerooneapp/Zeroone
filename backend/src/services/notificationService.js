const admin = require('firebase-admin');
const Notification = require('../models/Notification');
const NotificationLog = require('../models/NotificationLog');
const User = require('../models/User');
const Staff = require('../models/Staff');
const { emitNotification } = require('./socketService');

// Firebase Admin Initialization (Secure Environment Variable Method)
try {
  const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
  };

  if (admin.apps.length === 0 && firebaseConfig.projectId && firebaseConfig.clientEmail && firebaseConfig.privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig)
    });
    console.log('[NOTIFICATION-SERVICE] Firebase Admin Initialized Successfully');
  } else if (admin.apps.length === 0) {
    console.warn('[NOTIFICATION-SERVICE] Skipping Firebase initialization: Missing environment variables.');
  }
} catch (error) {
  console.error('[NOTIFICATION-SERVICE-FATAL] Firebase Admin initialization failed:', error.message);
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
      if (admin.apps.length === 0) return;

      // 🛡️ 1. Enhanced Deduplication Key (Role-agnostic for same event)
      // If payload has a stable ID (like bookingId), use it instead of role-specific referenceId
      const eventId = payload.data?.bookingId || payload.data?.id || Date.now();
      const notificationId = `${userId}_${payload.data?.type || 'GEN'}_${eventId}`;

      // 🚫 2. Backend Duplicate Prevention (L1 - Persistent)
      const exists = await NotificationLog.findOne({ 
        notificationId,
        createdAt: { $gt: new Date(Date.now() - 1000 * 60) } // Only dedupe within last 60 seconds
      });
      if (exists) return;

      // 🧠 3. Memory-based Throttle (L0 - Immediate)
      // This catches rapid-fire calls before DB roundtrip
      if (!global.notificationThrottle) global.notificationThrottle = new Set();
      if (global.notificationThrottle.has(notificationId)) return;
      global.notificationThrottle.add(notificationId);
      setTimeout(() => global.notificationThrottle.delete(notificationId), 5000); // 5s throttle

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

      const rawIds = Array.isArray(userIds) ? userIds : [userIds];
      const uniqueIds = [...new Set(rawIds.filter(Boolean).map(id => id.toString()))];
      
      resolvedRecipients = uniqueIds.map((userId) => ({ userId, role }));
    }

    // 🛡️ Deduplicate recipients to prevent double-sending in a single call
    const seenUsers = new Set();
    resolvedRecipients = resolvedRecipients.filter(r => {
      const key = `${r.userId}_${r.role}`;
      if (seenUsers.has(key)) return false;
      seenUsers.add(key);
      return true;
    });

    const notifications = [];
    for (const recipient of resolvedRecipients) {
      try {
        const payloadData = {
          ...data,
          type: data.type || type,
          id: data.id || referenceId || Date.now()
        };

        // 🏠 1. Create In-App Notifications (MongoDB) - Use upsert for idempotency
        let notif;
        if (referenceId) {
          // If referenceId exists, try to find existing or create new (upsert)
          // This prevents duplicates even if the create call is retried or concurrent
          const result = await Notification.findOneAndUpdate(
            { userId: recipient.userId, type, referenceId },
            { 
              $setOnInsert: { 
                role: recipient.role,
                title,
                message,
                data: payloadData,
                isSilent,
                createdAt: new Date()
              } 
            },
            { upsert: true, new: true, rawResult: true }
          );
          
          // Only proceed if it was newly inserted
          if (result.lastErrorObject?.updatedExisting) {
            console.log(`[Notification-Skip] Duplicate suppressed for user ${recipient.userId} (Ref: ${referenceId})`);
            continue; 
          }
          notif = result.value || result;
        } else {
          // Fallback for notifications without referenceId (still subject to unique index {userId, type, undefined})
          notif = await Notification.create({
            userId: recipient.userId,
            role: recipient.role,
            type,
            title,
            message,
            data: payloadData,
            referenceId,
            isSilent
          });
        }
        
        notifications.push(notif);

        // ⚡ 2. Dispatch Real-time (Socket.io)
        emitNotification(recipient.userId, notif);

        // 📲 3. Dispatch Push (Async/Non-blocking)
        if (!isSilent) {
          this._dispatchPush(recipient.userId, {
            title,
            message,
            data: payloadData
          });
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`[Notification-Skip] Unique constraint hit for user ${recipient.userId}`);
        } else {
          console.error('[NotificationService-Error]', error.message);
        }
      }
    }

    return notifications;
  }

  /**
   * Broadcasts a notification to all administrators (Admin Dashboard Sync)
   */
  static async notifyAdmins({ type, title, message, data = {}, isSilent = true }) {
    try {
      const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } }).select('_id');
      if (!admins.length) return;

      const adminIds = admins.map(a => a._id);
      return this.sendNotification({
        userIds: adminIds,
        role: 'admin',
        type,
        title,
        message,
        data,
        isSilent
      });
    } catch (error) {
      console.error('[NotificationService-AdminNotify-Error]', error.message);
    }
  }
}

module.exports = NotificationService;
