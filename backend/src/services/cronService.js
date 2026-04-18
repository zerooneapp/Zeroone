const cron = require('node-cron');
const moment = require('moment-timezone');
const Vendor = require('../models/Vendor');
const Booking = require('../models/Booking');
const Staff = require('../models/Staff');
const { processDailyDeduction } = require('./walletService');
const NotificationService = require('./notificationService');

const getStaffNotificationTarget = (staff) => staff?.userId || staff?._id || null;

const initCronJobs = () => {
  // 1. Subscription Deduction (Midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('--- Subscription Cron ---');
    try {
      const vendors = await Vendor.find({ status: { $in: ['active', 'inactive', 'approved'] } });
      for (const vendor of vendors) {
        await processDailyDeduction(vendor);
      }
    } catch (error) { console.error('Cron Error:', error); }
  }, { timezone: "Asia/Kolkata" });

  // 2. Booking Reminder (Every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const now = moment().tz('Asia/Kolkata');
      const reminderWindowStart = now.clone().add(30, 'minutes').startOf('minute');
      const reminderWindowEnd = now.clone().add(31, 'minutes').startOf('minute');

      const bookings = await Booking.find({
        status: 'confirmed',
        startTime: { $gte: reminderWindowStart.toDate(), $lt: reminderWindowEnd.toDate() }
      }).populate('vendorId');

      for (const booking of bookings) {
        // Notify Customer
        NotificationService.sendNotification({
          userIds: booking.userId, role: 'customer', type: 'REMINDER_30M',
          title: 'Upcoming Appointment',
          message: `Your appointment at ${booking.vendorId.shopName} starts in 30 minutes. Check booking details for directions!`,
          data: { bookingId: booking._id, type: 'REMINDER_30M' },
          referenceId: `REMIND_CUST_${booking._id}`
        });

        // Notify Staff
        const staff = await Staff.findById(booking.staffId);
        if (getStaffNotificationTarget(staff)) {
          NotificationService.sendNotification({
            userIds: getStaffNotificationTarget(staff), role: 'staff', type: 'REMINDER_30M',
            title: 'Upcoming Assignment',
            message: `Next Booking: You have an appointment for ${booking.walkInCustomerName || 'Client'} in 30 minutes. Be ready!`,
            data: { bookingId: booking._id, type: 'REMINDER_30M' },
            referenceId: `REMIND_STAFF_${booking._id}`
          });
        }
      }
    } catch (error) { console.error('Reminder Cron Error:', error); }
  }, { timezone: "Asia/Kolkata" });

  // 3. Auto-sync Shop Working Hours (Every minute precise check)
  cron.schedule('* * * * *', async () => {
    try {
      const now = moment().tz('Asia/Kolkata');
      const timeStrPad = now.format('hh:mm A'); // "09:00 AM"
      const timeStrNoPad = now.format('h:mm A'); // "9:00 AM"
      const timeStrMilitary = now.format('HH:mm'); // "21:00" or "09:00"

      // 🌅 AUTO-OPEN at workingHours.start
      const startMatchVendors = await Vendor.find({
        isShopOpen: false,
        'workingHours.start': { $in: [timeStrPad, timeStrNoPad, timeStrMilitary] }
      });

      for (const v of startMatchVendors) {
        v.isShopOpen = true;
        v.isClosedToday = false; // Fresh start for the day
        await v.save();
      }

      // 🌃 AUTO-CLOSE at workingHours.end
      const endMatchVendors = await Vendor.find({
        isShopOpen: true,
        'workingHours.end': { $in: [timeStrPad, timeStrNoPad, timeStrMilitary] }
      });

      for (const v of endMatchVendors) {
        v.isShopOpen = false;
        await v.save();
      }

    } catch (error) { console.error('Shop Status Cron Error:', error); }
  }, { timezone: "Asia/Kolkata" });

  // 4. Subscription Expiry Reminders (10:00 AM Daily)
  cron.schedule('0 10 * * *', async () => {
    console.log('--- Expiry Reminder Cron ---');
    try {
      const now = moment().tz('Asia/Kolkata');
      const monthlyVendors = await Vendor.find({
        planType: 'monthly',
        status: 'active',
        expiryDate: { $exists: true }
      });

      for (const vendor of monthlyVendors) {
        const expiry = moment(vendor.expiryDate).tz('Asia/Kolkata');
        const diffDays = Math.ceil(expiry.diff(now, 'hours') / 24);

        if (diffDays === 2) {
          await NotificationService.sendNotification({
            userIds: vendor.ownerId,
            role: 'vendor',
            type: 'SUBSCRIPTION_EXPIRY_WARNING',
            title: '48H Expiry Warning',
            message: `Your Monthly Subscription will expire in 48 hours. Maintain sufficient balance for the upcoming daily billing cycle to stay live.`,
            referenceId: `EXP_48H_${vendor._id}_${expiry.format('YYYYMMDD')}`
          });
        } else if (diffDays === 1) {
          await NotificationService.sendNotification({
            userIds: vendor.ownerId,
            role: 'vendor',
            type: 'SUBSCRIPTION_EXPIRY_FINAL',
            title: 'Final Reminder: Expiry Tomorrow',
            message: `Your subscription ends tomorrow. To avoid service interruptions, please recharge your wallet for daily mode or renew your monthly plan.`,
            referenceId: `EXP_24H_${vendor._id}_${expiry.format('YYYYMMDD')}`
          });
        }
      }
    } catch (error) { console.error('Expiry Cron Error:', error); }
  }, { timezone: "Asia/Kolkata" });

  // 5. Auto-Cancel "No-Show" or "Incomplete" Bookings (Raat 12:00 baje)
  cron.schedule('0 0 * * *', async () => {
    console.log('--- Midnight Auto-Cancel Cron ---');
    try {
      const yesterdayEnd = moment().tz('Asia/Kolkata').subtract(1, 'day').endOf('day').toDate();
      
      // Find all confirmed bookings that should have started/ended by now
      const pendingBookings = await Booking.find({
        status: 'confirmed',
        startTime: { $lt: yesterdayEnd }
      });

      console.log(`[Cron] Found ${pendingBookings.length} stale bookings to auto-cancel.`);

      for (const booking of pendingBookings) {
        booking.status = 'cancelled';
        booking.cancelReason = 'Auto-cancelled: Service not marked as completed by end of day.';
        booking.cancelledByRole = 'system';
        booking.cancelledAt = new Date();
        await booking.save();
        
        console.log(`[Cron] Auto-cancelled booking ${booking._id}`);
      }
    } catch (error) { console.error('Auto-Cancel Cron Error:', error); }
  }, { timezone: "Asia/Kolkata" });
};

module.exports = { initCronJobs };
