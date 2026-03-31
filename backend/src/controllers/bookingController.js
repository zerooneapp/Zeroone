const { finalizeBooking, markBookingComplete, cancelBooking } = require('../services/bookingService');
const Booking = require('../models/Booking');
const Vendor = require('../models/Vendor');
const Staff = require('../models/Staff');
const moment = require('moment-timezone');

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
  const isPastStart = now.isAfter(startTime);

  b.canCancel = !isWithin30Mins && b.status === 'confirmed';
  b.canReschedule = !isWithin30Mins && b.status === 'confirmed';
  b.canContact = isWithin30Mins && b.status === 'confirmed' && !isPastStart;

  // Sanitize Staff Phone based on contact rule
  if (role === 'customer' && !b.canContact) {
    if (b.staffId) b.staffId.phone = '**********'; // Hide until 30m before
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
    res.status(201).json(formatBookingResponse(populated, req.user.role));
  } catch (error) {
    if (error.message === 'Slot occupied') {
      return res.status(409).json({ message: 'Slot occupied', nextAvailableSlots: error.nextAvailableSlots });
    }
    res.status(400).json({ message: error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'customer') {
      filter.userId = req.user._id;
    } else if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ ownerId: req.user._id });
      if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
      filter.vendorId = vendor._id;
    } else if (req.user.role === 'staff') {
      const staff = await Staff.findOne({ userId: req.user._id });
      if (!staff) return res.status(404).json({ message: 'Staff not found' });
      filter.staffId = staff._id;
    }

    const bookings = await Booking.find(filter)
      .populate('userId', 'name phone')
      .populate('vendorId', 'shopName address')
      .populate('staffId', 'name phone')
      .sort({ startTime: -1 });

    const formatted = bookings.map(b => formatBookingResponse(b, req.user.role));
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { action } = req.body;
    const bookingId = req.params.id;

    let result;
    if (action === 'complete') {
      result = await markBookingComplete(req.user._id, bookingId); 
    } else if (action === 'cancel') {
      result = await cancelBooking(req.user._id, bookingId, req.user.role);
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    if (!result) return res.status(404).json({ message: 'Error updating status' });
    res.status(200).json(formatBookingResponse(result, req.user.role));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const rescheduleBooking = async (req, res) => {
  try {
    const { startTime, staffId, serviceAddress } = req.body;
    const bookingId = req.params.id;

    const result = await require('../services/bookingService').rescheduleBooking(
      req.user._id, 
      bookingId, 
      startTime, 
      staffId,
      serviceAddress
    );

    res.status(200).json(formatBookingResponse(result, req.user.role));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createBooking, getMyBookings, updateBookingStatus, rescheduleBooking };
