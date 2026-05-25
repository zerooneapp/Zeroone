const cron = require('node-cron');
const Vendor = require('../models/Vendor');
const VendorClosure = require('../models/VendorClosure');
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

  // 2. Daily Plan Billing Deduction Scanner (Every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const now = moment().tz('Asia/Kolkata');
      const todayStr = now.format('YYYY-MM-DD');

      // Fetch all daily plan vendors that are approved, active, or inactive
      const vendors = await Vendor.find({
        planType: 'daily',
        status: { $in: ['active', 'inactive', 'approved'] }
      });

      for (const vendor of vendors) {
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

  console.log('[CRON-SERVICE] All system tasks initialized.');
};

module.exports = { initCronJobs };
