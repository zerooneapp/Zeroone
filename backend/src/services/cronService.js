const cron = require('node-cron');
const Vendor = require('../models/Vendor');
const VendorClosure = require('../models/VendorClosure');
const { emitShopStatusUpdate } = require('./socketService');
const moment = require('moment-timezone');

/**
 * Centrally manages all recurring system tasks (Crons)
 */
const initCronJobs = () => {
  // 1. Shop Status Sync (Every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const indiaTime = moment().tz('Asia/Kolkata').toDate();

      // AUTO-CLOSE: Start closures that reached their startTime
      const pendingClosures = await VendorClosure.find({
        status: 'active',
        startTime: { $lte: indiaTime },
        endTime: { $gt: indiaTime }
      }).populate('vendorId');

      for (const closure of pendingClosures) {
        const vendor = closure.vendorId;
        if (vendor && vendor.isShopOpen) {
          vendor.isShopOpen = false;
          if (closure.previousIsShopOpen === undefined) {
            closure.previousIsShopOpen = true;
            await closure.save();
          }
          await vendor.save();
          emitShopStatusUpdate(vendor.ownerId, vendor._id, { isShopOpen: false, source: 'auto-closure' });
          console.log(`[CRON] Shop ${vendor.shopName} CLOSED (Closure Start)`);
        }
      }

      // AUTO-OPEN: Finish closures that reached their endTime
      const endedClosures = await VendorClosure.find({
        status: 'active',
        endTime: { $lte: indiaTime }
      }).populate('vendorId');

      for (const closure of endedClosures) {
        const vendor = closure.vendorId;
        if (vendor) {
          const otherActive = await VendorClosure.exists({
            vendorId: vendor._id,
            status: 'active',
            _id: { $ne: closure._id },
            startTime: { $lte: indiaTime },
            endTime: { $gt: indiaTime }
          });

          if (!otherActive) {
            if (closure.previousIsShopOpen === true || (closure.previousIsShopOpen === undefined && !vendor.isShopOpen)) {
              vendor.isShopOpen = true;
              await vendor.save();
              emitShopStatusUpdate(vendor.ownerId, vendor._id, { isShopOpen: true, source: 'auto-restore' });
              console.log(`[CRON] Shop ${vendor.shopName} OPENED (Closure End)`);
            }
          }
          
          closure.status = 'completed';
          closure.endedAt = indiaTime;
          await closure.save();
        }
      }
    } catch (error) {
      console.error('[CRON-ERROR]', error.message);
    }
  });

  console.log('[CRON-SERVICE] All system tasks initialized.');
};

module.exports = { initCronJobs };
