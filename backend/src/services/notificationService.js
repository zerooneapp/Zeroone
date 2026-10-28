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
  static async _dispatchPush(userId, payload, targetPlatform = 'all') {
    try {
      const normalizedTargetPlatform = ['web', 'mobile', 'all'].includes(targetPlatform)
        ? targetPlatform
        : 'all';

      if (admin.apps.length === 0) {
        console.warn('[PUSH-SKIP] Firebase Admin is not initialized; check FIREBASE_* environment variables.');
        return {
          targetPlatform: normalizedTargetPlatform,
          tokenCount: 0,
          successCount: 0,
          failureCount: 1,
          error: 'Firebase Admin is not initialized'
        };
      }

      // 🛡️ 1. Generate a Stable, Content-Aware Deduplication Key
      // This prevents duplicates even if a stable ID is missing by hashing core content
      const eventId = payload.data?.bookingId || payload.data?.id || 'GLOBAL';
      const contentHash = `${payload.title}_${payload.message || payload.body}`.replace(/\s+/g, '').slice(0, 32);
      const platformSuffix = normalizedTargetPlatform === 'all' ? '' : '_' + normalizedTargetPlatform;
      const notificationId = userId + platformSuffix + '_' + (payload.data?.type || 'GEN') + '_' + eventId + '_' + contentHash;

      // 🧠 2. Immediate Memory Lock (L0 - Prevents race conditions in cluster/parallel calls)
      if (!global.notificationLock) global.notificationLock = new Set();
      if (global.notificationLock.has(notificationId)) {
        console.log(`[PUSH-THROTTLE] Blocking rapid-fire duplicate for user ${userId}`);
        return;
      }
      global.notificationLock.add(notificationId);
      // Release lock after 10 seconds to allow legitimate future notifications
      setTimeout(() => global.notificationLock.delete(notificationId), 10000);

      // 🚫 3. Atomic DB Check & Lock (L1 - Persistent check across restarts/processes)
      const exists = await NotificationLog.findOne({ 
        notificationId,
        createdAt: { $gt: new Date(Date.now() - 1000 * 10) } // 10s lookback
      });
      if (exists) {
        console.log(`[PUSH-SKIP] Persistent duplicate blocked for user ${userId}`);
        return;
      }

      // 🔄 4. Token Collection
      // A staff member can exist as a User (Staff.userId) AND as a Staff doc.
      // Booking targets use Staff.userId, but a staff-panel login saves the
      // FCM token on the Staff document. Resolve every linked record so the
      // token is found no matter which one it was stored on.
      const entities = [];
      const userDoc = await User.findById(userId);
      if (userDoc) entities.push(userDoc);
      const staffDocs = await Staff.find({ $or: [{ _id: userId }, { userId }] });
      entities.push(...staffDocs);

      if (!entities.length) return;

      // 🛡️ 4.1 Check Notification Settings (Respect User Preferences)
      const settings = entities.find((e) => e.notificationSettings)?.notificationSettings;
      if (settings) {
        // Global push toggle applies to everyone (Customer, Vendor, Staff)
        if (settings.push === false) {
          console.log(`[PUSH-SKIP] User ${userId} has disabled all push notifications`);
          return;
        }

        // Granular category checks - Applied ONLY to Customers
        // Vendors and Staff should always get Order/Assignment pushes unless they turn off push globally
        if (payload.role === 'customer') {
          const type = String(payload.data?.type || payload.type || '').toUpperCase();
          
          // Order/Booking Related
          const isOrderRelated = type.includes('BOOKING') || type.includes('ORDER') || type.includes('ASSIGNMENT') || type.includes('STAFF');
          if (isOrderRelated && settings.orders === false) {
            console.log(`[PUSH-SKIP] Customer ${userId} has disabled order/booking notifications`);
            return;
          }

          // Promotional Related
          const isPromotional = type.includes('PROMO') || type.includes('OFFER') || type.includes('DISCOUNT');
          if (isPromotional && settings.promotional === false) {
            console.log(`[PUSH-SKIP] Customer ${userId} has disabled promotional notifications`);
            return;
          }
        }
      }

      // 🔄 4. Token Selection: Send to every registered mobile device and
      // the latest web browser. Mobile users can have more than two devices,
      // and array position alone cannot tell us which device is currently
      // active. Invalid/expired tokens are removed below after FCM responds.
      // Booking reminders use only the latest mobile token so stale tokens
      // from previous app installs cannot multiply one reminder.
      const normalizeTokens = (values = []) => [...new Set(
        values
          .map((token) => typeof token === 'string' ? token.trim() : '')
          .filter(Boolean)
      )];
      const isBookingReminder = String(payload.data?.type || payload.type || '').toUpperCase() === 'BOOKING_REMINDER';
      const mobileTokenValues = entities.flatMap((entity) => isBookingReminder
        ? (entity.fcmTokenMobile || []).slice(-1)
        : (entity.fcmTokenMobile || []));
      const mobileTokens = normalizedTargetPlatform === 'web'
        ? []
        : normalizeTokens(mobileTokenValues);
      const webTokens = normalizedTargetPlatform === 'mobile'
        ? []
        : normalizeTokens(entities.flatMap((entity) => (entity.fcmTokens || []).slice(-3)));

      // Combine and deduplicate to prevent sending the same message twice to the same token
      const tokens = [...new Set([...webTokens, ...mobileTokens])].filter(Boolean);

      if (!tokens.length) {
        console.log(`[PUSH-SKIP] No tokens found for user ${userId}`);
        return;
      }
      
      // Keep the platform split in the log. A successful multicast can still
      // hide the fact that only the browser token was delivered.
      const webTokenSet = new Set(webTokens);
      console.log(
        `[PUSH-DEBUG] Sending to ${tokens.length} tokens for user ${userId}. ` +
        `Web: ${webTokens.length}, Mobile: ${mobileTokens.length}, ` +
        `Target Role: ${payload.role || 'N/A'}`
      );

      // 🚀 5. Multicast Send
      const pushTitleText = payload.title;
      const pushBodyText = payload.message || payload.body;
      const baseData = toFcmSafeData({
        ...payload.data,
        notificationId,
        click_action: "FLUTTER_NOTIFICATION_CLICK" // Standard for many mobile frameworks
      });

      // Web browsers get a DATA-ONLY message. With a `notification` key the
      // FCM SDK auto-displays it AND our own handlers (service worker /
      // foreground) display it again -> the same booking shows twice. Data-only
      // means exactly one display, rendered by firebase-messaging-sw.js (or
      // showForegroundNotification) using the same tag.
      const webResponse = webTokens.length
        ? await admin.messaging().sendEachForMulticast({
          tokens: webTokens,
          data: { ...baseData, title: String(pushTitleText || ''), body: String(pushBodyText || '') },
          webpush: { headers: { Urgency: 'high' } }
        })
        : { successCount: 0, failureCount: 0, responses: [] };

      const mobileOnlyTokens = mobileTokens.filter((token) => !webTokenSet.has(token));
      const mobileResponse = mobileOnlyTokens.length ? await admin.messaging().sendEachForMulticast({
        tokens: mobileOnlyTokens,
        notification: {
          title: pushTitleText,
          body: pushBodyText
        },
        data: baseData,
        android: {
          priority: 'high',
          notification: {
            channelId: 'high_importance_channel',
            priority: 'high',
            // Re-delivery of the same booking reminder replaces the existing
            // Android notification instead of creating another tray item.
            tag: notificationId,
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
              badge: 1
            }
          }
        }
      }) : { successCount: 0, failureCount: 0, responses: [] };

      // `tokens` is [...webTokens, ...mobileTokens] (a token present in both
      // lists is dropped from the mobile side), so responses line up by index.
      const response = {
        successCount: webResponse.successCount + mobileResponse.successCount,
        failureCount: webResponse.failureCount + mobileResponse.failureCount,
        responses: [...webResponse.responses, ...mobileResponse.responses]
      };

      console.log(`[PUSH-RESULT] User: ${userId}, Success: ${response.successCount}, Failure: ${response.failureCount}`);
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const platform = webTokenSet.has(tokens[idx]) ? 'web' : 'mobile';
            console.log(
              `[PUSH-ERROR] Platform: ${platform}, Token: ${tokens[idx].slice(-10)}, ` +
              `Code: ${resp.error?.code || 'unknown'}, Error: ${resp.error?.message}`
            );
          }
        });
      }

      // 📝 6. Log Transaction for Persistence
      await NotificationLog.updateOne(
        { notificationId },
        {
          $set: {
            userId,
            tokens,
            successCount: response.successCount,
            failureCount: response.failureCount,
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      // 🧹 7. Token Cleanup on failures
      const invalidTokens = [];
      (response.responses || []).forEach((result, index) => {
        if (result.success) return;
        const token = tokens[index];
        const code = result.error?.code;
        if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(token);
        }
      });

      if (invalidTokens.length) {
        await Promise.all(entities.map((entity) => entity.constructor.updateOne(
          { _id: entity._id },
          {
            $pull: {
              fcmTokens: { $in: invalidTokens },
              fcmTokenMobile: { $in: invalidTokens }
            }
          }
        )));
        console.log('[PUSH-CLEANUP] Removed ' + invalidTokens.length + ' invalid token(s) for user ' + userId);
      }

      console.log(`[PUSH-SENT] Delivered to ${response.successCount} devices for user ${userId}`);
      return {
        targetPlatform: normalizedTargetPlatform,
        tokenCount: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount
      };
    } catch (error) {
      console.error('[PUSH-ERROR]', error.message);
      return {
        targetPlatform,
        tokenCount: 0,
        successCount: 0,
        failureCount: 1,
        error: error.message
      };
    }
  }

  static sendTestPush(userId, targetPlatform) {
    const platform = ['web', 'mobile'].includes(targetPlatform) ? targetPlatform : 'web';
    return this._dispatchPush(userId, {
      title: 'ZeroOne Test Notification',
      message: 'Test ' + platform + ' push notification received successfully.',
      data: {
        type: 'TEST_NOTIFICATION',
        id: 'TEST_NOTIFICATION_' + platform + '_' + Date.now(),
        platform
      },
      role: 'vendor'
    }, platform);
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
    isSilent = false,
    vendorId = null,
    // Most notifications may retry push delivery when an in-app record exists.
    // Reminder jobs can disable that retry to guarantee one push per event.
    sendPushWhenExisting = true
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

    // Try to auto-resolve vendorId from data payload if not passed directly
    let finalVendorId = vendorId || data.vendorId || data.vendor?._id || data.vendor?.id || null;

    // Prepend shopName to title for vendor roles on push notifications
    let pushTitle = title;
    if (role === 'vendor' && finalVendorId) {
      try {
        const Vendor = require('../models/Vendor');
        const shop = await Vendor.findById(finalVendorId).select('shopName');
        if (shop && shop.shopName) {
          pushTitle = `${shop.shopName}: ${title}`;
        }
      } catch (err) {
        console.error('[NotificationService] Failed to resolve shop name:', err.message);
      }
    }

    const notifications = [];
    for (const recipient of resolvedRecipients) {
      try {
        // Keep both names for native clients that use either notification
        // field when routing booking events.
        const notificationType = data.notificationType || data.type || type;
        const payloadData = {
          ...data,
          type: notificationType,
          notificationType,
          id: data.id || referenceId || Date.now(),
          referenceId,
          title,
          body: message,
          vendorId: finalVendorId,
          ...(data.bookingId ? { bookingId: data.bookingId } : {})
        };

        // 🏠 1. Create In-App Notifications (MongoDB) - Use upsert for idempotency
        let notif;
        let notificationAlreadyExists = false;
        if (referenceId) {
          // If referenceId exists, try to find existing or create new (upsert)
          const result = await Notification.findOneAndUpdate(
            { userId: recipient.userId, type, referenceId },
            { 
              $setOnInsert: { 
                role: recipient.role,
                title,
                message,
                data: payloadData,
                vendorId: finalVendorId,
                isSilent,
                createdAt: new Date()
              } 
            },
            { upsert: true, returnDocument: 'after', rawResult: true }
          );
          
          // Keep in-app notifications idempotent, but still attempt push delivery
          // when an earlier attempt created the in-app record and then failed.
          if (result.lastErrorObject?.updatedExisting) {
            console.log(`[Notification-Skip] Duplicate suppressed for user ${recipient.userId} (Ref: ${referenceId})`);
            notificationAlreadyExists = true;
          }
          notif = result.value || result;
        } else {
          // Fallback for notifications without referenceId
          notif = await Notification.create({
            userId: recipient.userId,
            vendorId: finalVendorId,
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
        if (!notificationAlreadyExists) {
          emitNotification(recipient.userId, notif);
        }

        // 📲 3. Dispatch Push and await the result. The booking request must
        // not finish before FCM has read the current token list; otherwise a
        // short-lived/serverless process can drop the push silently.
        if (!isSilent && (!notificationAlreadyExists || sendPushWhenExisting)) {
          const pushResult = await this._dispatchPush(recipient.userId, {
            title: pushTitle,
            message,
            data: payloadData,
            role: recipient.role // Pass role to distinguish target app
          });
          if (!pushResult || pushResult.successCount < 1) {
            console.error('[PUSH-DELIVERY-FAILED]', {
              userId: String(recipient.userId),
              role: recipient.role,
              type,
              tokenCount: pushResult?.tokenCount || 0,
              error: pushResult?.error || 'FCM returned no successful delivery'
            });
          }
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
