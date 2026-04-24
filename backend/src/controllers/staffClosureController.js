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
const { emergencyCancelBooking } = require('../services/bookingService');

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

const createStaffClosure = async (req, res) => {
  try {
    const vendor = await getVendorContext(req.user._id);
    const { staffId, startTime, endTime, reason, autoCancel = true } = req.body;
    
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

    // 🔒 Clear SlotLocks
    await SlotLock.deleteMany({
      staffId: staff._id,
      startTime: { $lt: end.toDate() },
      endTime: { $gt: start.toDate() }
    });

    // 🛑 Deactivate if live now
    const now = new Date();
    const isLiveNow = start.toDate() <= now && end.toDate() > now;
    if (isLiveNow) {
      staff.isActive = false;
      await staff.save();
    }

    // ⚡ Auto-Cancel Impacted Bookings
    let cancelledCount = 0;
    if (autoCancel) {
      const impacted = await getImpactedBookings(staff._id, start, end);
      for (const booking of impacted) {
        try {
          await emergencyCancelBooking(req.user._id, booking._id, reason || 'Staff unavailable (Emergency Absence)', closure._id);
          cancelledCount++;
        } catch (err) {
          console.error(`[StaffClosure] Failed to auto-cancel booking ${booking._id}:`, err.message);
        }
      }
    }

    const response = await mapClosureResponse(closure, vendor);
    res.status(201).json({ ...response, cancelledCount });
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

    // Restore staff isActive if needed
    const staff = await Staff.findById(closure.staffId);
    if (staff && closure.previousIsActive === true) {
      // Check if there are other live closures for this staff
      const hasOtherLive = await StaffClosure.exists({
        staffId: staff._id,
        status: 'active',
        startTime: { $lte: now },
        endTime: { $gt: now }
      });
      
      if (!hasOtherLive) {
        staff.isActive = true;
        await staff.save();
      }
    }

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
