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
          title: 'Upcoming Appointment', message: `Reminder: Your appointment at ${booking.vendorId.shopName} starts in 30 minutes.`,
          data: { bookingId: booking._id }, referenceId: `REMIND_CUST_${booking._id}`
        });

        // Notify Staff
        const staff = await Staff.findById(booking.staffId);
        if (getStaffNotificationTarget(staff)) {
          NotificationService.sendNotification({
            userIds: getStaffNotificationTarget(staff), role: 'staff', type: 'REMINDER_30M',
            title: 'Upcoming Assignment', message: `Reminder: Your assignment at ${booking.vendorId.shopName} starts in 30 minutes.`,
            data: { bookingId: booking._id }, referenceId: `REMIND_STAFF_${booking._id}`
          });
        }
      }
    } catch (error) { console.error('Reminder Cron Error:', error); }
  }, { timezone: "Asia/Kolkata" });
};

module.exports = { initCronJobs };
