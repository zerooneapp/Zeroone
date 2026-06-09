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
 * When an emergency closure is created, automatically:
 * 1. Try to reassign each impacted booking to another available staff
 * 2. If no staff is available → cancel the booking
 * Sends notifications to user and staff in both cases.
 */
const autoReassignOrCancelImpactedBookings = async (vendorId, closureStart, closureEnd, vendorOwnerId, shopName) => {
  // Lazy require to avoid circular dependency at module load time
  const Staff = require('../models/Staff');
  const NotificationService = require('./notificationService');

  // 1️⃣ Find the owner's Staff document (the person who created the closure = unavailable)
  const ownerStaff = await Staff.findOne({
    vendorId,
    $or: [
      { userId: vendorOwnerId },
      { isOwner: true }
    ]
  }).lean();

  if (!ownerStaff) {
    console.log('[CLOSURE-REASSIGN] Owner staff record not found, skipping auto-reassign');
    return;
  }

  const ownerStaffId = ownerStaff._id.toString();
  console.log(`[CLOSURE-REASSIGN] Owner staff: ${ownerStaff.name} (${ownerStaffId})`);

  // 2️⃣ Get ALL impacted bookings in the closure window for this vendor
  const allImpacted = await getImpactedBookings(vendorId, closureStart, closureEnd);

  // 3️⃣ Filter to ONLY owner's bookings — other staff's bookings are unaffected
  const ownerBookings = allImpacted.filter(b => {
    const bStaffId = b.staffId?._id?.toString() || b.staffId?.toString();
    return bStaffId === ownerStaffId;
  });

  if (ownerBookings.length === 0) {
    console.log('[CLOSURE-REASSIGN] Owner has no impacted bookings in this closure window');
    return;
  }

  console.log(`[CLOSURE-REASSIGN] Owner has ${ownerBookings.length} impacted booking(s) to reassign`);

  // 4️⃣ Fetch all active NON-OWNER staff as potential replacement candidates
  // Owner is excluded since they are the unavailable one (created the closure)
  const availableStaff = await Staff.find({
    vendorId,
    isActive: true,
    _id: { $ne: ownerStaff._id }
  }).lean();

  // 5️⃣ Process each owner booking
  for (const booking of ownerBookings) {
    const bookingStart = moment(booking.startTime).tz('Asia/Kolkata');
    const bookingEnd = moment(booking.endTime).tz('Asia/Kolkata');
    const formattedTime = bookingStart.format('D MMMM YYYY, h:mm A');
    const customerId = booking.userId?._id || booking.userId;

    // Find an available staff with no conflicting booking at this time slot
    let assignedStaff = null;
    for (const staff of availableStaff) {
      const conflict = await Booking.findOne({
        staffId: staff._id,
        status: { $in: ['confirmed', 'pending'] },
        startTime: { $lt: bookingEnd.toDate() },
        endTime: { $gt: bookingStart.toDate() }
      }).lean();

      if (!conflict) {
        assignedStaff = staff;
        break;
      }
    }

    if (assignedStaff) {
      // ✅ Reassign to available staff
      await Booking.findByIdAndUpdate(booking._id, { staffId: assignedStaff._id });

      // Notify customer
      if (customerId) {
        NotificationService.sendNotification({
          userIds: customerId,
          role: 'customer',
          type: 'BOOKING_REASSIGNED',
          title: 'Booking Reassigned',
          message: `Your booking at ${shopName} on ${formattedTime} has been reassigned to ${assignedStaff.name} due to the owner's temporary unavailability.`,
          data: { bookingId: booking._id },
          referenceId: `${booking._id}_REASSIGN_CUSTOMER`
        });
      }

      // Notify new staff (if linked user)
      if (assignedStaff.userId) {
        NotificationService.sendNotification({
          userIds: assignedStaff.userId,
          role: 'staff',
          type: 'STAFF_ASSIGNED',
          title: 'New Booking Assigned',
          message: `You have been assigned a booking on ${formattedTime}. Services: ${(booking.services || []).map(s => s.name).join(', ')}.`,
          data: { bookingId: booking._id },
          referenceId: `${booking._id}_REASSIGN_STAFF`
        });
      }

      console.log(`[CLOSURE-REASSIGN] ✅ Booking ${booking._id} reassigned from ${ownerStaff.name} → ${assignedStaff.name}`);
    } else {
      // ❌ No available staff — cancel the booking
      await Booking.findByIdAndUpdate(booking._id, {
        status: 'cancelled',
        cancelReason: 'Emergency closure — no available staff for this time slot',
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
          message: `Your booking at ${shopName} on ${formattedTime} has been cancelled as no staff was available for reassignment. We apologize for the inconvenience.`,
          data: { bookingId: booking._id, reason: 'Emergency closure — no available staff', isActionable: false },
          referenceId: `${booking._id}_CLOSURE_CANCEL_CUSTOMER`
        });
      }

      console.log(`[CLOSURE-CANCEL] ❌ Booking ${booking._id} cancelled — no available staff for ${formattedTime}`);
    }
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

