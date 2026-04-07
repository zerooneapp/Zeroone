const Staff = require('../models/Staff');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const SlotLock = require('../models/SlotLock');
const Vendor = require('../models/Vendor');
const VendorAvailability = require('../models/VendorAvailability');
const StaffAvailability = require('../models/StaffAvailability');
const moment = require('moment-timezone');
const {
  getActiveClosureWindows,
  hasClosureOverlap
} = require('./vendorClosureService');

const TIME_FORMATS = ['HH:mm', 'H:mm', 'hh:mm A', 'h:mm A'];

const normalizeToGrid = (time) => {
  const m = moment(time).tz('Asia/Kolkata');
  const minutes = m.minutes();

  if (minutes === 0 || minutes === 30) {
    // Already on grid
  } else if (minutes < 30) {
    m.minutes(30);
  } else {
    m.add(1, 'hour').minutes(0);
  }

  m.seconds(0).milliseconds(0);
  return m;
};

const buildMomentFromTime = (date, timeStr) => {
  if (!timeStr) return null;

  const parsed = moment.tz(timeStr.trim(), TIME_FORMATS, false, 'Asia/Kolkata');
  if (!parsed.isValid()) return null;

  return date.clone()
    .hour(parsed.hour())
    .minute(parsed.minute())
    .second(0)
    .millisecond(0);
};

const buildAvailabilityWindows = (date, ranges = []) => (
  ranges
    .map((range) => {
      const start = buildMomentFromTime(date, range.startTime);
      const end = buildMomentFromTime(date, range.endTime);

      if (!start || !end || !end.isAfter(start)) return null;
      return { start, end };
    })
    .filter(Boolean)
    .sort((a, b) => a.start.valueOf() - b.start.valueOf())
);

const fitsWithinAnyWindow = (start, end, windows = []) => (
  windows.some((window) => !start.isBefore(window.start) && !end.isAfter(window.end))
);

const getVendorDayAvailability = async (vendorId, targetDate, existingVendor = null) => {
  const vendor = existingVendor || await Vendor.findById(vendorId);
  if (!vendor || vendor.status !== 'active') return null;
  if (!vendor.isShopOpen) return null;

  const now = moment().tz('Asia/Kolkata');
  if (vendor.isClosedToday && targetDate.isSame(now, 'day')) return null;

  const isClosedDay = vendor.closedDates?.some((d) => moment(d).tz('Asia/Kolkata').isSame(targetDate, 'day'));
  if (isClosedDay) return null;

  const availability = await VendorAvailability.findOne({
    vendorId,
    day: targetDate.format('ddd'),
    isOpen: true
  });

  if (!availability && !vendor.workingHours) return null;

  const openTimeStr = availability?.openTime || vendor.workingHours.start || '09:00 AM';
  const closeTimeStr = availability?.closeTime || vendor.workingHours.end || '09:00 PM';
  const open = buildMomentFromTime(targetDate, openTimeStr);
  const close = buildMomentFromTime(targetDate, closeTimeStr);

  if (!open || !close || !close.isAfter(open)) return null;

  return {
    vendor,
    windows: [{ start: open, end: close }],
    open,
    close
  };
};

const getStaffAvailabilityMap = async (staffIds, targetDate) => {
  if (staffIds.length === 0) return new Map();

  const startOfDay = targetDate.clone().startOf('day').toDate();
  const endOfDay = targetDate.clone().add(1, 'day').startOf('day').toDate();

  const records = await StaffAvailability.find({
    staffId: { $in: staffIds },
    date: { $gte: startOfDay, $lt: endOfDay }
  }).lean();

  return new Map(records.map((record) => [
    record.staffId.toString(),
    {
      workingHours: buildAvailabilityWindows(targetDate, record.workingHours),
      slots: buildAvailabilityWindows(
        targetDate,
        (record.slots || []).filter((slot) => !slot.isBooked)
      )
    }
  ]));
};

const isStaffAvailableForWindow = (staffId, start, end, availabilityMap, vendorWindows) => {
  const staffAvailability = availabilityMap.get(staffId.toString());

  if (!staffAvailability) {
    return fitsWithinAnyWindow(start, end, vendorWindows);
  }

  const hasWorkingHours = staffAvailability.workingHours.length > 0;
  const hasSlotWindows = staffAvailability.slots.length > 0;

  if (!hasWorkingHours && !hasSlotWindows) {
    return false;
  }

  if (hasWorkingHours && !fitsWithinAnyWindow(start, end, staffAvailability.workingHours)) {
    return false;
  }

  if (hasSlotWindows && !fitsWithinAnyWindow(start, end, staffAvailability.slots)) {
    return false;
  }

  return true;
};

const getEligibleStaffMembers = async (vendorId, serviceIds) => {
  const mongoose = require('mongoose');
  const objectServiceIds = serviceIds.map(id => new mongoose.Types.ObjectId(id.trim()));

  let staffMembers = await Staff.find({
    vendorId,
    isActive: true,
    isOwner: false,
    services: { $all: objectServiceIds }
  });

  if (staffMembers.length === 0) {
    staffMembers = await Staff.find({
      vendorId,
      isActive: true,
      isOwner: true
    });
  }

  return staffMembers;
};

const calculateAvailableSlots = async (vendorId, serviceIds, date) => {
  const now = moment().tz('Asia/Kolkata');
  const targetDate = moment(date).tz('Asia/Kolkata').startOf('day');
  const vendorAvailability = await getVendorDayAvailability(vendorId, targetDate);

  if (!vendorAvailability) return [];

  const { vendor, windows: vendorWindows, open: shopOpen, close: shopClose } = vendorAvailability;
  const mongoose = require('mongoose');

  const objectServiceIds = serviceIds.map((id) => new mongoose.Types.ObjectId(id.trim()));
  const services = await Service.find({ _id: { $in: objectServiceIds }, vendorId });

  if (services.length !== serviceIds.length) {
    console.error('SlotService Error: Some services not found for vendor', vendorId);
    return [];
  }

  const totalDuration = services.reduce((acc, s) => acc + (s.duration || 0) + (s.bufferTime || 0), 0);

  let ownerStaff = await Staff.findOne({ vendorId, isOwner: true });
  if (!ownerStaff) {
    const User = require('../models/User');
    const ownerUser = await User.findById(vendor.ownerId);
    if (ownerUser) {
      try {
        ownerStaff = await Staff.create({
          vendorId,
          userId: vendor.ownerId,
          name: ownerUser.name,
          phone: ownerUser.phone,
          password: 'dummy_vendor_staff',
          isOwner: true,
          isActive: true,
          services: serviceIds
        });
      } catch (err) {
        // If another request created it first, just fetch it
        ownerStaff = await Staff.findOne({ vendorId, isOwner: true });
      }
    }
  }

  const staffMembers = await getEligibleStaffMembers(vendorId, serviceIds);
  if (staffMembers.length === 0) return [];

  const staffIds = staffMembers.map((staff) => staff._id);
  const staffAvailabilityMap = await getStaffAvailabilityMap(staffIds, targetDate);
  const closureWindows = await getActiveClosureWindows(vendorId, shopOpen, shopClose);

  const bookings = await Booking.find({
    staffId: { $in: staffIds },
    status: { $ne: 'cancelled' },
    startTime: { $gte: targetDate.toDate(), $lt: targetDate.clone().add(1, 'day').toDate() }
  });

  const slotLocks = await SlotLock.find({
    staffId: { $in: staffIds },
    expiresAt: { $gt: new Date() },
    startTime: { $gte: targetDate.toDate(), $lt: targetDate.clone().add(1, 'day').toDate() }
  });

  const allBusyBlocks = [...bookings, ...slotLocks].map((block) => ({
    staffId: block.staffId.toString(),
    start: moment(block.startTime).tz('Asia/Kolkata'),
    end: moment(block.endTime).tz('Asia/Kolkata')
  }));

  const availableSlotsWithStaff = [];
  let currentStart = shopOpen.clone();

  if (targetDate.isSame(now, 'day') && now.isAfter(shopOpen)) {
    currentStart = normalizeToGrid(now.clone().add(15, 'minutes'));
  }

  while (currentStart.clone().add(totalDuration, 'minutes').isSameOrBefore(shopClose)) {
    const currentEnd = currentStart.clone().add(totalDuration, 'minutes');

    if (targetDate.isSame(now, 'day') && currentStart.isBefore(now)) {
      currentStart.add(30, 'minutes');
      continue;
    }

    if (hasClosureOverlap(currentStart, currentEnd, closureWindows)) {
      currentStart.add(30, 'minutes');
      continue;
    }

    for (const staff of staffMembers) {
      const staffIdStr = staff._id.toString();
      const isAvailableBySchedule = isStaffAvailableForWindow(
        staffIdStr,
        currentStart,
        currentEnd,
        staffAvailabilityMap,
        vendorWindows
      );

      const hasOverlap = allBusyBlocks.some((block) => (
        block.staffId === staffIdStr &&
        currentStart.isBefore(block.end) &&
        currentEnd.isAfter(block.start)
      ));

      if (!isAvailableBySchedule || hasOverlap) continue;

      let slotObj = availableSlotsWithStaff.find((slot) => slot.time === currentStart.format('HH:mm'));
      if (!slotObj) {
        slotObj = { time: currentStart.format('HH:mm'), availableStaff: [] };
        availableSlotsWithStaff.push(slotObj);
      }

      slotObj.availableStaff.push(staffIdStr);
    }

    currentStart.add(30, 'minutes');
  }

  return availableSlotsWithStaff.sort((a, b) => a.time.localeCompare(b.time));
};

const findFirstAvailableStaff = async (vendorId, serviceIds, startTime, endTime, targetStaffId = null) => {
  const targetDate = moment(startTime).tz('Asia/Kolkata').startOf('day');
  const vendorAvailability = await getVendorDayAvailability(vendorId, targetDate);

  if (!vendorAvailability) return null;

  const start = moment(startTime).tz('Asia/Kolkata');
  const end = moment(endTime).tz('Asia/Kolkata');

  if (!fitsWithinAnyWindow(start, end, vendorAvailability.windows)) {
    return null;
  }

  const closureWindows = await getActiveClosureWindows(vendorId, start, end);
  if (hasClosureOverlap(start, end, closureWindows)) {
    return null;
  }

  const staffMembers = await getEligibleStaffMembers(vendorId, serviceIds);
  if (staffMembers.length === 0) return null;

  const staffIds = staffMembers.map((staff) => staff._id);
  const staffAvailabilityMap = await getStaffAvailabilityMap(staffIds, targetDate);

  const bookings = await Booking.find({
    staffId: { $in: staffIds },
    status: { $ne: 'cancelled' },
    startTime: { $lt: end.toDate() },
    endTime: { $gt: start.toDate() }
  });

  const slotLocks = await SlotLock.find({
    staffId: { $in: staffIds },
    expiresAt: { $gt: new Date() },
    startTime: { $lt: end.toDate() },
    endTime: { $gt: start.toDate() }
  });

  const busyStaffIds = new Set([
    ...bookings.map((booking) => booking.staffId.toString()),
    ...slotLocks.map((lock) => lock.staffId.toString())
  ]);

  if (targetStaffId) {
    const isTargetBusy = busyStaffIds.has(targetStaffId.toString());
    const isTargetQualified = staffMembers.some((staff) => staff._id.toString() === targetStaffId.toString());
    const isTargetAvailableBySchedule = isStaffAvailableForWindow(
      targetStaffId,
      start,
      end,
      staffAvailabilityMap,
      vendorAvailability.windows
    );

    return (!isTargetBusy && isTargetQualified && isTargetAvailableBySchedule)
      ? staffMembers.find((staff) => staff._id.toString() === targetStaffId.toString())
      : null;
  }

  return staffMembers.find((staff) => (
    !busyStaffIds.has(staff._id.toString()) &&
    isStaffAvailableForWindow(
      staff._id,
      start,
      end,
      staffAvailabilityMap,
      vendorAvailability.windows
    )
  ));
};

module.exports = { calculateAvailableSlots, normalizeToGrid, findFirstAvailableStaff };
