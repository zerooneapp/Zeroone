const Staff = require('../models/Staff');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const SlotLock = require('../models/SlotLock');
const Vendor = require('../models/Vendor');
const VendorAvailability = require('../models/VendorAvailability');
const StaffAvailability = require('../models/StaffAvailability');
const moment = require('moment-timezone');
const { ensureOwnerStaff } = require('./staffService');
const {
  getActiveClosureWindows: getVendorClosureWindows,
  hasClosureOverlap: hasVendorClosureOverlap
} = require('./vendorClosureService');
const {
  getActiveClosureWindows: getStaffClosureWindows
} = require('./staffClosureService');

const TIME_FORMATS = ['HH:mm', 'H:mm', 'hh:mm A', 'h:mm A'];

const normalizeToGrid = (time) => {
  const m = moment.tz(time, 'Asia/Kolkata');
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
  if (!vendor || vendor.status !== 'active' || vendor.isActive === false) return null;

  const now = moment().tz('Asia/Kolkata');
  if (targetDate.isBefore(now, 'day')) return null;
  if (!vendor.isShopOpen && targetDate.isSame(now, 'day')) return null;
  if (vendor.isClosedToday && targetDate.isSame(now, 'day')) return null;

  const isClosedDay = vendor.closedDates?.some((d) => moment(d).tz('Asia/Kolkata').isSame(targetDate, 'day'));
  if (isClosedDay) return null;

  const availability = await VendorAvailability.findOne({
    vendorId,
    day: targetDate.format('ddd'),
    isOpen: true
  }).lean();

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

  // 1. Find ALL qualified professionals (Staff + Owner) who have these specific services
  let staffMembers = await Staff.find({
    vendorId,
    isActive: true,
    services: { $all: objectServiceIds }
  });

  // 2. FALLBACK: If NO ONE is found with these specific skills, show the Owner (as they are the ultimate backup)
  if (staffMembers.length === 0) {
    staffMembers = await Staff.find({
      vendorId,
      isActive: true,
      isOwner: true
    }).lean();
  }

  return staffMembers;
};

const calculateAvailableSlots = async (vendorId, serviceIds, date, excludeBookingId = null) => {
  const now = moment().tz('Asia/Kolkata');
  const targetDate = moment.tz(date, 'Asia/Kolkata').startOf('day');
  const vendorAvailability = await getVendorDayAvailability(vendorId, targetDate);

  if (!vendorAvailability) return [];

  const { vendor, windows: vendorWindows, open: shopOpen, close: shopClose } = vendorAvailability;
  const mongoose = require('mongoose');

  const objectServiceIds = serviceIds.map((id) => new mongoose.Types.ObjectId(id.trim()));
  const services = await Service.find({ _id: { $in: objectServiceIds }, vendorId }).lean();

  if (services.length !== serviceIds.length) {
    console.error('SlotService Error: Some services not found for vendor', vendorId);
    return [];
  }

  const totalDuration = services.reduce((acc, s) => acc + (s.duration || 0) + (s.bufferTime || 0), 0);

  await ensureOwnerStaff(vendorId);

  const staffMembers = await getEligibleStaffMembers(vendorId, serviceIds);
  if (staffMembers.length === 0) return [];

  const staffIds = staffMembers.map((staff) => staff._id);
  const staffAvailabilityMap = await getStaffAvailabilityMap(staffIds, targetDate);
  const vendorClosureWindows = await getVendorClosureWindows(vendorId, shopOpen, shopClose);
  
  // 🛡️ Fetch all active staff closures for the day
  const StaffClosure = require('../models/StaffClosure');
  const staffClosureRecords = await StaffClosure.find({
    staffId: { $in: staffIds },
    status: 'active',
    startTime: { $lt: targetDate.clone().add(1, 'day').toDate() },
    endTime: { $gt: targetDate.toDate() }
  }).lean();

  const bookings = await Booking.find({
    staffId: { $in: staffIds },
    status: { $ne: 'cancelled' },
    _id: { $ne: excludeBookingId },
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
    currentStart = normalizeToGrid(now.clone().add(0, 'minutes'));
  }

  while (currentStart.clone().add(totalDuration, 'minutes').isSameOrBefore(shopClose)) {
    const currentEnd = currentStart.clone().add(totalDuration, 'minutes');

    if (targetDate.isSame(now, 'day') && currentStart.isBefore(now)) {
      currentStart.add(30, 'minutes');
      continue;
    }

    if (hasVendorClosureOverlap(currentStart, currentEnd, vendorClosureWindows)) {
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

      const isStaffOnClosure = staffClosureRecords.some(c => 
        c.staffId.toString() === staffIdStr &&
        currentStart.isBefore(moment(c.endTime)) && 
        currentEnd.isAfter(moment(c.startTime))
      );

      if (!isAvailableBySchedule || hasOverlap || isStaffOnClosure) continue;

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

const findFirstAvailableStaff = async (vendorId, serviceIds, startTime, endTime, targetStaffId = null, excludeBookingId = null) => {
  const targetDate = moment(startTime).tz('Asia/Kolkata').startOf('day');
  const vendorAvailability = await getVendorDayAvailability(vendorId, targetDate);

  if (!vendorAvailability) return null;

  const start = moment(startTime).tz('Asia/Kolkata');
  const end = moment(endTime).tz('Asia/Kolkata');

  if (!fitsWithinAnyWindow(start, end, vendorAvailability.windows)) {
    return null;
  }

  const vendorClosureWindows = await getVendorClosureWindows(vendorId, start, end);
  if (hasVendorClosureOverlap(start, end, vendorClosureWindows)) {
    return null;
  }

  const staffMembers = await getEligibleStaffMembers(vendorId, serviceIds);
  if (staffMembers.length === 0) return null;

  const staffIds = staffMembers.map((staff) => staff._id);
  
  // 🛡️ Staff Closure Check
  const StaffClosure = require('../models/StaffClosure');
  const staffClosureRecords = await StaffClosure.find({
    staffId: { $in: staffIds },
    status: 'active',
    startTime: { $lt: end.toDate() },
    endTime: { $gt: start.toDate() }
  }).lean();

  const staffAvailabilityMap = await getStaffAvailabilityMap(staffIds, targetDate);

  const bookings = await Booking.find({
    staffId: { $in: staffIds },
    status: { $ne: 'cancelled' },
    _id: { $ne: excludeBookingId },
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
    const staff = staffMembers.find((s) => s._id.toString() === targetStaffId.toString());
    if (!staff) return null;

    const isBusy = busyStaffIds.has(staff._id.toString());
    const isOnClosure = staffClosureRecords.some(c => c.staffId.toString() === staff._id.toString());
    const isAvailable = isStaffAvailableForWindow(
      staff._id,
      start,
      end,
      staffAvailabilityMap,
      vendorAvailability.windows
    );

    return (!isBusy && !isOnClosure && isAvailable) ? staff : null;
  }

  return staffMembers.find((staff) => (
    !busyStaffIds.has(staff._id.toString()) &&
    !staffClosureRecords.some(c => c.staffId.toString() === staff._id.toString()) &&
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
