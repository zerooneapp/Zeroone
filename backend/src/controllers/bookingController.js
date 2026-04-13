const {
  finalizeBooking,
  markBookingComplete,
  cancelBooking,
  emergencyCancelBooking
} = require('../services/bookingService');
const Booking = require('../models/Booking');
const Vendor = require('../models/Vendor');
const Staff = require('../models/Staff');
const moment = require('moment-timezone');

const getActorRole = (req) => req.user?.role || (req.staff ? 'staff' : null);

const getActorUserId = (req) => req.user?._id || req.staff?.userId || req.staff?._id || null;

const resolveActorStaffId = async (req) => {
  if (req.staff?._id) {
    return req.staff._id;
  }

  if (req.user?.role === 'staff') {
    let staff = await Staff.findOne({ userId: req.user._id });
    
    // Auto-Heal: If seeded or detached, find by verified phone and link
    if (!staff && req.user.phone) {
      staff = await Staff.findOne({ phone: req.user.phone });
      if (staff) {
        staff.userId = req.user._id;
        await staff.save();
      }
    }
    
    return staff?._id || null;
  }

  return null;
};

/**
 * Helper to add visibility flags and sanitize contact info
 */
const formatBookingResponse = (booking, role) => {
  const b = booking.toObject();
  const now = moment().tz('Asia/Kolkata');
  const startTime = moment(b.startTime).tz('Asia/Kolkata');
  const bufferTime = startTime.clone().subtract(30, 'minutes');

  // Logic: 30-minute window
  const isWithin30Mins = now.isSameOrAfter(bufferTime);
  const endTime = moment(b.endTime).tz('Asia/Kolkata');
  const isPastEnd = now.isAfter(endTime);

  if (role === 'vendor' || role === 'staff') {
    b.canCancel = b.status === 'confirmed';
    b.canReschedule = b.status === 'confirmed';
  } else {
    b.canCancel = !isWithin30Mins && b.status === 'confirmed';
    b.canReschedule = !isWithin30Mins && b.status === 'confirmed';
  }
  b.canContact = isWithin30Mins && b.status === 'confirmed' && !isPastEnd;

  // Sanitize Staff Phone based on contact rule
  if (role === 'customer' && !b.canContact) {
    if (b.staffId) b.staffId.phone = '**********'; // Hide until 30m before
  }

  if (role === 'staff' && !b.canContact) {
    if (b.userId) b.userId.phone = '**********';
  }

  if ((role === 'staff' || role === 'vendor') && b.type !== 'home') {
    b.serviceAddress = undefined;
  }

  return b;
};

const createBooking = async (req, res) => {
  try {
    let { vendorId, staffId, serviceIds, startTime, serviceAddress } = req.body;
    if (!vendorId || !serviceIds || !startTime) {
      return res.status(400).json({ message: 'Missing required booking fields' });
    }

    // If staffId not provided, recover it from the SlotLock (Atomic resource allocation)
    if (!staffId) {
      const SlotLock = require('../models/SlotLock');
      const { normalizeToGrid } = require('../services/slotService');
      const normalizedStart = normalizeToGrid(startTime);
      const lock = await SlotLock.findOne({ userId: req.user._id, vendorId, startTime: normalizedStart.toDate() });
      if (lock) staffId = lock.staffId;
    }

    if (!staffId) return res.status(400).json({ message: 'Staff selection required or slot timeout' });

    const booking = await finalizeBooking(req.user._id, vendorId, staffId, serviceIds, startTime, serviceAddress);
    // Reload to get populated staff for the response
    const populated = await Booking.findById(booking._id).populate('staffId', 'name phone');
    res.status(201).json(formatBookingResponse(populated, getActorRole(req)));
  } catch (error) {
    if (error.message === 'Slot occupied') {
      return res.status(409).json({ message: 'Slot occupied', nextAvailableSlots: error.nextAvailableSlots });
    }
    res.status(400).json({ message: error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const actorRole = getActorRole(req);
    const filter = {};
    if (actorRole === 'customer') {
      filter.userId = req.user._id;
    } else if (actorRole === 'vendor') {
      const vendor = await Vendor.findOne({ ownerId: req.user._id });
      if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
      filter.vendorId = vendor._id;
    } else if (actorRole === 'staff') {
      const actorStaffId = await resolveActorStaffId(req);
      if (!actorStaffId) {
        console.warn(`[Staff Warning] Could not resolve Staff document for user ${req.user?._id || 'unknown'}`);
        return res.status(200).json([]);
      }
      filter.staffId = actorStaffId;
    }

    const bookings = await Booking.find(filter)
      .populate('userId', 'name phone image')
      .populate('vendorId', 'shopName address')
      .populate('staffId', 'name phone isOwner')
      .sort({ startTime: -1 });

    const formatted = bookings.map(b => formatBookingResponse(b, actorRole));
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { action, reason } = req.body;
    const bookingId = req.params.id;
    const actorRole = getActorRole(req);
    const actorUserId = getActorUserId(req);
    const actorStaffId = await resolveActorStaffId(req);

    let result;
    if (action === 'complete') {
      result = await markBookingComplete(actorUserId, bookingId, actorStaffId);
    } else if (action === 'cancel') {
      result = await cancelBooking(actorUserId, bookingId, actorRole, reason, actorStaffId);
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    if (!result) return res.status(404).json({ message: 'Error updating status' });
    res.status(200).json(formatBookingResponse(result, actorRole));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const rescheduleBooking = async (req, res) => {
  try {
    const { startTime, staffId, serviceAddress } = req.body;
    const bookingId = req.params.id;
    const actorRole = getActorRole(req);
    const actorUserId = getActorUserId(req);
    const actorStaffId = await resolveActorStaffId(req);

    const result = await require('../services/bookingService').rescheduleBooking(
      actorUserId,
      actorRole,
      bookingId, 
      startTime, 
      staffId,
      serviceAddress,
      actorStaffId
    );

    res.status(200).json(formatBookingResponse(result, actorRole));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const vendorEmergencyCancel = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { reason, closureId } = req.body;
    const result = await emergencyCancelBooking(req.user._id, bookingId, reason, closureId);
    res.status(200).json(formatBookingResponse(result, getActorRole(req)));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  updateBookingStatus,
  rescheduleBooking,
  vendorEmergencyCancel
};
