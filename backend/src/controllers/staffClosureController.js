const Staff = require('../models/Staff');
const Vendor = require('../models/Vendor');
const StaffClosure = require('../models/StaffClosure');
const SlotLock = require('../models/SlotLock');
const Booking = require('../models/Booking');
const moment = require('moment-timezone');
const {
  normalizeClosureWindow,
  getOverlappingClosures,
  getImpactedBookings
} = require('../services/staffClosureService');

const getVendorContext = async (userId) => {
  const vendor = await Vendor.findOne({ ownerId: userId });
  if (!vendor) {
    throw new Error('Vendor not found');
  }
  return vendor;
};

const mapClosureResponse = async (closure, vendor) => {
  const impactedBookings = await getImpactedBookings(
    closure.staffId,
    closure.startTime,
    closure.endTime
  );

  const staff = await Staff.findById(closure.staffId).select('name image phone');

  return {
    closure,
    vendor: {
      _id: vendor._id,
      shopName: vendor.shopName
    },
    staff,
    impactedBookings
  };
};

const previewStaffClosure = async (req, res) => {
  try {
    const vendor = await getVendorContext(req.user._id);
    const { staffId, startTime, endTime, reason } = req.body;
    
    const staff = await Staff.findOne({ _id: staffId, vendorId: vendor._id });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    const { start, end } = normalizeClosureWindow(startTime, endTime);
    const overlappingClosures = await getOverlappingClosures(staff._id, start, end);
    const impactedBookings = await getImpactedBookings(staff._id, start, end);

    res.status(200).json({
      closure: {
        staffId: staff._id,
        startTime: start.toDate(),
        endTime: end.toDate(),
        reason: reason?.trim() || ''
      },
      staff: {
        _id: staff._id,
        name: staff.name,
        image: staff.image
      },
      impactedBookings,
      conflicts: overlappingClosures
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * When a staff absence is confirmed:
 * 1. Try to reassign each impacted booking to another FREE regular staff
 * 2. If no regular staff is free → try the OWNER (if owner is free)
 * 3. If owner is also unavailable → cancel the booking
 * Notifications sent to customer + newly assigned staff in all cases.
 */
const autoReassignOrCancelStaffBookings = async (vendorId, absentStaffId, start, end, shopName, reason) => {
  const NotificationService = require('../services/notificationService');

  // 1. Get all impacted bookings of the absent staff in the closure window
  const impacted = await getImpactedBookings(absentStaffId, start, end);
  if (impacted.length === 0) {
    console.log('[STAFF-CLOSURE-REASSIGN] No impacted bookings in this closure window');
    return;
  }

  console.log(`[STAFF-CLOSURE-REASSIGN] ${impacted.length} booking(s) to process`);

  // 2. Get all OTHER active staff (excluding the absent one)
  const otherStaff = await Staff.find({
    vendorId,
    isActive: true,
    _id: { $ne: absentStaffId }
  }).lean();

  // Separate owner from regular staff
  const ownerStaff = otherStaff.find(s => s.isOwner === true);
  const regularStaff = otherStaff.filter(s => s.isOwner !== true);

  // Helper: check if staff can perform ALL services in the booking
  const isServiceCompatible = (staffDoc, booking) => {
    const bookingServiceIds = (booking.services || [])
      .map(s => s.serviceId?.toString())
      .filter(Boolean);

    if (bookingServiceIds.length === 0) return true; // No services to check — allow

    const staffServiceIds = (staffDoc.services || [])
      .map(s => s?.toString());

    // Staff must cover EVERY service in the booking
    return bookingServiceIds.every(bsId => staffServiceIds.includes(bsId));
  };

  // Helper: check if a staff has no conflicting booking and no active closure in the slot
  const isFree = async (staffDoc, bookingStart, bookingEnd) => {
    const conflict = await Booking.findOne({
      staffId: staffDoc._id,
      status: { $in: ['confirmed', 'pending'] },
      startTime: { $lt: bookingEnd.toDate() },
      endTime: { $gt: bookingStart.toDate() }
    }).lean();
    if (conflict) return false;

    const closureConflict = await StaffClosure.findOne({
      staffId: staffDoc._id,
      status: 'active',
      startTime: { $lt: bookingEnd.toDate() },
      endTime: { $gt: bookingStart.toDate() }
    }).lean();

    return !closureConflict;
  };

  // 3. Process each impacted booking
  for (const booking of impacted) {
    const customerId = booking.userId?._id || booking.userId;
    const formattedTime = moment(booking.startTime).tz('Asia/Kolkata').format('D MMMM YYYY, h:mm A');
    const bookingStart = moment(booking.startTime).tz('Asia/Kolkata');
    const bookingEnd = moment(booking.endTime).tz('Asia/Kolkata');

    // Step 1: Try regular active staff — must be service-compatible AND time-free
    let assignedStaff = null;
    for (const staff of regularStaff) {
      if (isServiceCompatible(staff, booking) && await isFree(staff, bookingStart, bookingEnd)) {
        assignedStaff = staff;
        break;
      }
    }

    // Step 2: No eligible regular staff → check owner (also must be service-compatible AND free)
    if (!assignedStaff && ownerStaff) {
      if (isServiceCompatible(ownerStaff, booking) && await isFree(ownerStaff, bookingStart, bookingEnd)) {
        assignedStaff = ownerStaff;
        console.log(`[STAFF-CLOSURE-REASSIGN] Using owner as fallback for booking ${booking._id}`);
      }
    }


    if (assignedStaff) {
      // ✅ Reassign to found staff (regular or owner)
      await Booking.findByIdAndUpdate(booking._id, { staffId: assignedStaff._id });

      // Notify customer
      if (customerId) {
        NotificationService.sendNotification({
          userIds: customerId,
          role: 'customer',
          type: 'BOOKING_REASSIGNED',
          title: 'Booking Reassigned',
          message: `Your booking at ${shopName} on ${formattedTime} has been reassigned to ${assignedStaff.name} due to staff unavailability.`,
          data: { bookingId: booking._id },
          referenceId: `${booking._id}_STAFF_REASSIGN_CUSTOMER`
        });
      }

      // Notify new staff (if linked user account exists)
      if (assignedStaff.userId) {
        NotificationService.sendNotification({
          userIds: assignedStaff.userId,
          role: 'staff',
          type: 'STAFF_ASSIGNED',
          title: 'New Booking Assigned',
          message: `You have been assigned a booking on ${formattedTime}. Services: ${(booking.services || []).map(s => s.name).join(', ')}.`,
          data: { bookingId: booking._id },
          referenceId: `${booking._id}_STAFF_REASSIGN_NEWSTAFF`
        });
      }

      console.log(`[STAFF-CLOSURE-REASSIGN] ✅ Booking ${booking._id} reassigned to ${assignedStaff.name} (${assignedStaff.isOwner ? 'owner' : 'staff'})`);
    } else {
      // ❌ No regular staff AND owner also unavailable → cancel
      await Booking.findByIdAndUpdate(booking._id, {
        status: 'cancelled',
        cancelReason: reason || 'Staff unavailable (Emergency Absence)',
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
          data: { bookingId: booking._id, reason: 'Staff Emergency Absence', isActionable: false },
          referenceId: `${booking._id}_STAFF_CLOSURE_CANCEL_CUSTOMER`
        });
      }

      console.log(`[STAFF-CLOSURE-CANCEL] ❌ Booking ${booking._id} cancelled — no staff or owner available for ${formattedTime}`);
    }
  }
};

const createStaffClosure = async (req, res) => {
  try {
    const vendor = await getVendorContext(req.user._id);
    const { staffId, startTime, endTime, reason } = req.body;
    
    const staff = await Staff.findOne({ _id: staffId, vendorId: vendor._id });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    const { start, end } = normalizeClosureWindow(startTime, endTime);
    const overlappingClosures = await getOverlappingClosures(staff._id, start, end);

    if (overlappingClosures.length > 0) {
      return res.status(409).json({
        message: 'An overlapping closure for this staff already exists',
        conflicts: overlappingClosures
      });
    }

    const closure = await StaffClosure.create({
      staffId: staff._id,
      vendorId: vendor._id,
      createdBy: req.user._id,
      startTime: start.toDate(),
      endTime: end.toDate(),
      reason: reason?.trim() || '',
      previousIsActive: staff.isActive
    });

    // 🔒 Clear SlotLocks for the duration of the closure
    await SlotLock.deleteMany({
      staffId: staff._id,
      startTime: { $lt: end.toDate() },
      endTime: { $gt: start.toDate() }
    });

    const response = await mapClosureResponse(closure, vendor);
    res.status(201).json(response);

    // 🔄 Auto-process impacted bookings (non-blocking, after response sent)
    autoReassignOrCancelStaffBookings(
      vendor._id,
      staff._id,
      start,
      end,
      vendor.shopName,
      reason?.trim() || ''
    ).catch(err => console.error('[STAFF-CLOSURE-AUTO-PROCESS-ERROR]', err.message));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const listStaffClosures = async (req, res) => {
  try {
    const vendor = await getVendorContext(req.user._id);
    const now = new Date();
    const closures = await StaffClosure.find({
      vendorId: vendor._id,
      status: 'active',
      endTime: { $gt: now }
    }).sort({ startTime: 1 });

    const payload = await Promise.all(
      closures.map((closure) => mapClosureResponse(closure, vendor))
    );

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const endStaffClosure = async (req, res) => {
  try {
    const vendor = await getVendorContext(req.user._id);
    const closure = await StaffClosure.findOne({
      _id: req.params.id,
      vendorId: vendor._id,
      status: 'active'
    });

    if (!closure) {
      return res.status(404).json({ message: 'Active staff closure not found' });
    }

    const now = new Date();
    closure.status = now < closure.endTime ? 'cancelled' : 'completed';
    closure.endedAt = now;
    if (now < closure.endTime) {
      closure.endTime = now;
    }
    await closure.save();

    // Note: Global isActive restoration is no longer needed as deactivation is handled at the slot level

    const staff = await Staff.findById(closure.staffId);

    res.status(200).json({
      message: 'Staff closure ended successfully',
      closure,
      staffStatus: {
        isActive: staff?.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  previewStaffClosure,
  createStaffClosure,
  listStaffClosures,
  endStaffClosure
};
