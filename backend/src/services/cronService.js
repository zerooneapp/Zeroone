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

  // 3. Auto-cancel expired confirmed bookings (Every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const Booking = require('../models/Booking');
      const indiaTime = moment().tz('Asia/Kolkata').toDate();

      const expiredBookings = await Booking.find({
        status: 'confirmed',
        endTime: { $lt: indiaTime }
      });

      for (const booking of expiredBookings) {
        booking.status = 'cancelled';
        booking.cancelReason = 'System auto-cancelled: Appointment time elapsed';
        booking.cancelledByRole = 'system';
        booking.cancelledAt = indiaTime;
        await booking.save();
        console.log(`[CRON-BOOKING-AUTO-CANCEL] Auto-cancelled past booking: ${booking._id}`);
      }
    } catch (error) {
      console.error('[CRON-BOOKING-AUTO-CANCEL-ERROR]', error.message);
    }
  });

  console.log('[CRON-SERVICE] All system tasks initialized.');
};

module.exports = { initCronJobs };
