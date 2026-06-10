const moment = require('moment-timezone');
const Booking = require('../models/Booking');
const VendorClosure = require('../models/VendorClosure');


const normalizeClosureWindow = (startTime, endTime) => {
  const start = moment.tz(startTime, 'Asia/Kolkata').seconds(0).milliseconds(0);
  const end = moment.tz(endTime, 'Asia/Kolkata').seconds(0).milliseconds(0);

  if (!start.isValid() || !end.isValid()) {
    throw new Error('Invalid closure time window');
  }

  if (!end.isAfter(start)) {
    throw new Error('Closure end time must be after start time');
  }

  return { start, end };
};

const getOverlappingClosures = async (vendorId, start, end, excludeClosureId = null) => {
  const query = {
    vendorId,
    status: 'active',
    startTime: { $lt: moment(end).toDate() },
    endTime: { $gt: moment(start).toDate() }
  };

  if (excludeClosureId) {
    query._id = { $ne: excludeClosureId };
  }

  return VendorClosure.find(query).sort({ startTime: 1 });
};

const getImpactedBookings = async (vendorId, start, end) => (
  Booking.find({
    vendorId,
    status: { $in: ['confirmed', 'pending'] },
    startTime: { $lt: moment(end).toDate() },
    endTime: { $gt: moment(start).toDate() }
  })
    .populate('userId', 'name phone image')
    .populate('staffId', 'name image phone')
    .sort({ startTime: 1 })
);

const getActiveClosureWindows = async (vendorId, rangeStart, rangeEnd) => {
  const start = moment(rangeStart).tz('Asia/Kolkata');
  const end = moment(rangeEnd).tz('Asia/Kolkata');

  if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
    return [];
  }

  const closures = await VendorClosure.find({
    vendorId,
    status: 'active',
    startTime: { $lt: end.toDate() },
    endTime: { $gt: start.toDate() }
  }).lean();

  return closures.map((closure) => ({
    ...closure,
    start: moment(closure.startTime).tz('Asia/Kolkata'),
    end: moment(closure.endTime).tz('Asia/Kolkata')
  }));
};

const hasClosureOverlap = (start, end, closureWindows = []) => (
  closureWindows.some((closure) => start.isBefore(closure.end) && end.isAfter(closure.start))
);

// Legacy closures could persist an offline shop flag; only bypass that marked state.
const hasLegacyShopOfflineClosure = async (vendorId, referenceTime = new Date()) => {
  const now = moment(referenceTime).tz('Asia/Kolkata');
  if (!now.isValid()) return false;

  const closure = await VendorClosure.collection.findOne({
    vendorId,
    status: 'active',
    previousIsShopOpen: true,
    startTime: { $lte: now.toDate() },
    endTime: { $gt: now.toDate() }
  }, { projection: { _id: 1 } });

  return Boolean(closure);
};

/**
 * When an emergency closure is created:
 * → Directly cancel ALL impacted bookings in the closure window
 * → Notify each affected customer
 * No reassignment logic — vendor closure means shop is closed for that window.
 */
const autoReassignOrCancelImpactedBookings = async (vendorId, closureStart, closureEnd, vendorOwnerId, shopName) => {
  const NotificationService = require('./notificationService');

  // 1️⃣ Get ALL impacted bookings in the closure window (confirmed + pending)
  const allImpacted = await getImpactedBookings(vendorId, closureStart, closureEnd);

  if (allImpacted.length === 0) {
    console.log('[CLOSURE-CANCEL] No impacted bookings in this closure window');
    return;
  }

  console.log(`[CLOSURE-CANCEL] ${allImpacted.length} booking(s) will be cancelled due to emergency closure`);

  // 2️⃣ Cancel ALL impacted bookings and notify each customer
  for (const booking of allImpacted) {
    const customerId = booking.userId?._id || booking.userId;
    const formattedTime = moment(booking.startTime).tz('Asia/Kolkata').format('D MMMM YYYY, h:mm A');

    await Booking.findByIdAndUpdate(booking._id, {
      status: 'cancelled',
      cancelReason: 'Emergency closure by vendor',
      cancelledByRole: 'vendor',
      cancelledAt: new Date()
    });

    // Notify customer
    if (customerId) {
      NotificationService.sendNotification({
        userIds: customerId,
        role: 'customer',
        type: 'BOOKING_CANCELLED_INFO',
        title: 'Booking Cancelled',
        message: `Your booking at ${shopName} on ${formattedTime} has been cancelled due to an emergency closure. We apologize for the inconvenience.`,
        data: { bookingId: booking._id, reason: 'Emergency closure', isActionable: false },
        referenceId: `${booking._id}_CLOSURE_CANCEL_CUSTOMER`
      });
    }

    console.log(`[CLOSURE-CANCEL] ❌ Booking ${booking._id} cancelled for ${formattedTime}`);
  }
};


module.exports = {
  normalizeClosureWindow,
  getOverlappingClosures,
  getImpactedBookings,
  getActiveClosureWindows,
  hasClosureOverlap,
  hasLegacyShopOfflineClosure,
  autoReassignOrCancelImpactedBookings
};

