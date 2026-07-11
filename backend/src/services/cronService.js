const cron = require('node-cron');
const Vendor = require('../models/Vendor');
const VendorClosure = require('../models/VendorClosure');
const StaffClosure = require('../models/StaffClosure');
const moment = require('moment-timezone');

/**
 * Centrally manages all recurring system tasks (Crons)
 */
const initCronJobs = () => {
  // 1. Complete elapsed emergency booking windows (Every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const indiaTime = moment().tz('Asia/Kolkata').toDate();

      const endedClosures = await VendorClosure.collection.find({
        status: 'active',
        endTime: { $lte: indiaTime }
      }).toArray();

      for (const closure of endedClosures) {
        if (closure.previousIsShopOpen === true) {
          await Vendor.updateOne(
            { _id: closure.vendorId, isShopOpen: false, isClosedToday: { $ne: true } },
            { $set: { isShopOpen: true } }
          );
        }

        await VendorClosure.updateOne(
          { _id: closure._id, status: 'active' },
          { $set: { status: 'completed', endedAt: indiaTime } }
        );
      }
    } catch (error) {
      console.error('[CRON-ERROR]', error.message);
    }
  });

  // 1.1 Complete elapsed staff closure windows (Every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const indiaTime = moment().tz('Asia/Kolkata').toDate();

      const endedClosures = await StaffClosure.collection.find({
        status: 'active',
        endTime: { $lte: indiaTime }
      }).toArray();

      for (const closure of endedClosures) {
        await StaffClosure.updateOne(
          { _id: closure._id, status: 'active' },
          { $set: { status: 'completed', endedAt: indiaTime } }
        );
      }
    } catch (error) {
      console.error('[CRON-STAFF-CLOSURE-ERROR]', error.message);
    }
  });

  // 2. Daily Plan Billing Deduction Scanner (Every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const now = moment().tz('Asia/Kolkata');
      const todayStr = now.format('YYYY-MM-DD');

      // Fetch all daily and trial plan vendors that are approved, active, or inactive
      const vendors = await Vendor.find({
        planType: { $in: ['daily', 'trial'] },
        status: { $in: ['active', 'inactive', 'approved'] }
      });

      for (const vendor of vendors) {
        // Normalize trial plans on the fly if their trial has expired
        if (vendor.planType === 'trial') {
          try {
            const { getUpdatedStatus } = require('./walletService');
            await getUpdatedStatus(vendor);
          } catch (err) {
            console.error(`[CRON-BILLING-ERROR] Failed to normalize status for trial vendor ${vendor.shopName}:`, err.message);
          }
        }

        // If the vendor is not on a daily plan (e.g. trial is still active), skip deduction
        if (vendor.planType !== 'daily') {
          continue;
        }

        // Skip if already processed today
        if (
          vendor.lastDeductionDate &&
          moment(vendor.lastDeductionDate).tz('Asia/Kolkata').format('YYYY-MM-DD') === todayStr
        ) {
          continue;
        }

        const endTimeStr = vendor.workingHours?.end || '09:00 PM';
        const startTimeStr = vendor.workingHours?.start || '09:00 AM';
        const startTime = moment.tz(startTimeStr, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');
        const endTime = moment.tz(endTimeStr, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');

        if (!endTime.isValid() || !startTime.isValid()) {
          continue;
        }

        startTime.year(now.year()).month(now.month()).date(now.date());
        endTime.year(now.year()).month(now.month()).date(now.date());

        // Handle overnight shifts
        if (endTime.isBefore(startTime)) {
          if (now.isAfter(startTime)) {
            endTime.add(1, 'day');
          }
        }

        // Target deduction is exactly 1 hour before the shop closing time
        const targetDeductionTime = endTime.clone().subtract(1, 'hour');

        if (now.isSameOrAfter(targetDeductionTime)) {
          console.log(`[CRON-BILLING] Triggering daily deduction for vendor ${vendor.shopName} (${vendor._id}). Closing at: ${endTimeStr}, target was: ${targetDeductionTime.format('hh:mm A')}`);
          try {
            const { processDailyDeduction } = require('./walletService');
            await processDailyDeduction(vendor);
          } catch (err) {
            console.error(`[CRON-BILLING-ERROR] Failed to process deduction for ${vendor.shopName}:`, err.message);
          }
        }
      }
    } catch (error) {
      console.error('[CRON-BILLING-SYSTEM-ERROR]', error.message);
    }
  });

  // 4. Pre-booking 30-min reminder (Every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const Booking = require('../models/Booking');
      const NotificationService = require('./notificationService');
      const NotificationLog = require('../models/NotificationLog');

      const now = moment().tz('Asia/Kolkata');
      const windowStart = now.clone().add(25, 'minutes').toDate();
      const windowEnd = now.clone().add(30, 'minutes').toDate();

      // Find confirmed bookings starting in the next 25-30 minutes
      const upcomingBookings = await Booking.find({
        status: 'confirmed',
        startTime: { $gte: windowStart, $lte: windowEnd },
        userId: { $ne: null }
      });

      for (const booking of upcomingBookings) {
        const referenceId = `${booking._id}_30MIN_REMINDER`;
        
        // Ensure reminder is not sent twice
        const alreadySent = await NotificationLog.exists({ referenceId });
        if (alreadySent) continue;

        await NotificationService.sendNotification({
          userIds: booking.userId,
          role: 'customer',
          type: 'BOOKING_REMINDER',
          title: 'Upcoming Service Reminder ⏰',
          message: `Reminder: Your service is scheduled in 30 minutes. See you soon!`,
          data: { bookingId: booking._id, isActionable: false },
          referenceId
        });
        console.log(`[CRON-REMINDER] Sent 30-min reminder for booking: ${booking._id}`);
      }
    } catch (error) {
      console.error('[CRON-REMINDER-ERROR]', error.message);
    }
  });

  // 5. Post-service 15-day inactivity re-engagement reminder (Every day at 10:00 AM)
  cron.schedule('0 10 * * *', async () => {
    try {
      const Booking = require('../models/Booking');
      const User = require('../models/User');
      const NotificationService = require('./notificationService');
      const NotificationLog = require('../models/NotificationLog');

      const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
      const fifteenDaysAgo = moment().tz('Asia/Kolkata').subtract(15, 'days').endOf('day').toDate();

      // Find all customer users
      const users = await User.find({ role: 'customer' });

      for (const user of users) {
        const referenceId = `${user._id}_15DAY_RE_ENGAGE_${todayStr}`;

        // Ensure we haven't already reminded this user today
        const alreadyRemindedToday = await NotificationLog.exists({ referenceId });
        if (alreadyRemindedToday) continue;

        // Get user's latest completed booking
        const latestBooking = await Booking.findOne({
          userId: user._id,
          status: 'completed'
        }).sort({ endTime: -1 });

        if (latestBooking) {
          const completedAt = latestBooking.completedAt || latestBooking.endTime;
          const diffDays = moment().tz('Asia/Kolkata').diff(moment(completedAt).tz('Asia/Kolkata'), 'days');

          // If the last service was 15 or more days ago
          if (diffDays >= 15) {
            // Check if there is any upcoming booking confirmed
            const hasUpcoming = await Booking.exists({
              userId: user._id,
              status: 'confirmed',
              startTime: { $gt: new Date() }
            });

            if (!hasUpcoming) {
              await NotificationService.sendNotification({
                userIds: user._id,
                role: 'customer',
                type: 'INACTIVITY_RE_ENGAGE',
                title: 'We miss you! 💖',
                message: `It has been ${diffDays} days since your last service. Book your next appointment now to stay fresh!`,
                data: { isActionable: false },
                referenceId
              });
              console.log(`[CRON-RE-ENGAGE] Dispatched 15-day follow-up reminder to user: ${user._id}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('[CRON-RE-ENGAGE-ERROR]', error.message);
    }
  });

  // 6. Expired Bookings to pending_completion (Runs every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const Booking = require('../models/Booking');
      const Vendor = require('../models/Vendor');
      const NotificationService = require('./notificationService');
      const now = moment().tz('Asia/Kolkata').toDate();

      // Find confirmed bookings whose endTime is in the past
      const expiredBookings = await Booking.find({
        status: 'confirmed',
        endTime: { $lte: now }
      });

      if (expiredBookings.length > 0) {
        const vendorIdsToNotify = new Set();

        for (const booking of expiredBookings) {
          booking.status = 'pending_completion';
          await booking.save();
          if (booking.vendorId) {
            vendorIdsToNotify.add(booking.vendorId.toString());
          }
        }

        // Notify vendors who have bookings pending completion
        for (const vendorId of vendorIdsToNotify) {
          const vendor = await Vendor.findById(vendorId);
          if (!vendor || !vendor.ownerId) continue;

          const pendingCount = await Booking.countDocuments({
            vendorId: vendor._id,
            status: 'pending_completion'
          });

          if (pendingCount > 0) {
            await NotificationService.sendNotification({
              userIds: vendor.ownerId,
              role: 'vendor',
              type: 'BOOKING_ATTENTION',
              title: 'Bookings Need Attention ⚠️',
              message: `${pendingCount} booking${pendingCount > 1 ? 's' : ''} need${pendingCount === 1 ? 's' : ''} your attention. Please complete or mark them.`,
              data: { isActionable: true }
            });
            console.log(`[CRON-EXPIRED] Notified vendor ${vendor.shopName} (${vendor._id}) about ${pendingCount} pending attention bookings`);
          }
        }
      }
    } catch (error) {
      console.error('[CRON-EXPIRED-ERROR]', error.message);
    }
  });

  // 7. Auto-cancel stale pending_completion bookings (Runs every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const Booking = require('../models/Booking');
      const cutoffTime = moment().tz('Asia/Kolkata').subtract(24, 'hours').toDate();

      // Find bookings pending completion that expired more than 24 hours ago
      const staleBookings = await Booking.find({
        status: 'pending_completion',
        endTime: { $lte: cutoffTime }
      });

      for (const booking of staleBookings) {
        console.log(`[CRON-AUTO-CANCEL] Auto-cancelling stale booking ${booking._id}`);
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = 'auto_cancel';
        await booking.save();
        console.log(`[CRON-AUTO-CANCEL] Booking ${booking._id} auto-cancelled.`);
      }
    } catch (error) {
      console.error('[CRON-AUTO-CANCEL-ERROR]', error.message);
    }
  });

  console.log('[CRON-SERVICE] All system tasks initialized.');
};

module.exports = { initCronJobs };
