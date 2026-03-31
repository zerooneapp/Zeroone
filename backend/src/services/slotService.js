const Staff = require('../models/Staff');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const SlotLock = require('../models/SlotLock');
const Vendor = require('../models/Vendor');
const VendorAvailability = require('../models/VendorAvailability');
const moment = require('moment-timezone');

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

const calculateAvailableSlots = async (vendorId, serviceIds, date) => {
  const now = moment().tz('Asia/Kolkata');
  const targetDate = moment(date).tz('Asia/Kolkata').startOf('day');
  const dayName = targetDate.format('ddd');

  const vendor = await Vendor.findById(vendorId);
  if (!vendor || vendor.status !== 'active') return [];

  // 🛡️ BASIC CHECKS: System/Vendor Status
  if (!vendor.isShopOpen) return [];
  if (vendor.isClosedToday && targetDate.isSame(now, 'day')) return [];

  const isClosedDay = vendor.closedDates?.some(d => moment(d).tz('Asia/Kolkata').isSame(targetDate, 'day'));
  if (isClosedDay) return [];

  const mongoose = require('mongoose');

  // 💈 SERVICES: Validate and calculate total duration
  const objectServiceIds = serviceIds.map(id => new mongoose.Types.ObjectId(id.trim()));
  const services = await Service.find({ _id: { $in: objectServiceIds }, vendorId });
  
  if (services.length !== serviceIds.length) {
    console.error('SlotService Error: Some services not found for vendor', vendorId);
    return []; // Return empty instead of crashing
  }

  const totalDuration = services.reduce((acc, s) => acc + (s.duration || 0) + (s.bufferTime || 0), 0);
  
  // 👔 VENDOR AS STAFF LOGIC (Owner fallback)
  const User = require('../models/User');
  let ownerStaff = await Staff.findOne({ vendorId, isOwner: true });
  if (!ownerStaff) {
     const ownerUser = await User.findById(vendor.ownerId);
     if (ownerUser) {
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
     }
  }

  // 🔍 STAFF SEARCH: Look for matching regular professionals first
  let staffMembers = await Staff.find({ 
    vendorId, 
    isActive: true, 
    isOwner: false,
    services: { $all: serviceIds }
  });

  // 🔄 CONDITIONAL FALLBACK: Use owner ONLY if no regular staff found for these services
  if (staffMembers.length === 0) {
    staffMembers = await Staff.find({ 
      vendorId, 
      isActive: true, 
      isOwner: true 
    });
  }

  if (staffMembers.length === 0) return [];

  let availability = await VendorAvailability.findOne({ vendorId, day: dayName, isOpen: true });
  
  if (!availability && !vendor.workingHours) return []; // Truly no schedule

  const openTimeStr = availability?.openTime || vendor.workingHours.start || '09:00 AM';
  const closeTimeStr = availability?.closeTime || vendor.workingHours.end || '09:00 PM';

  const parseTime = (timeStr) => {
    const parts = timeStr.trim().split(' ');
    const [time, modifier] = parts;
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  };

  const { hours: openH, minutes: openM } = parseTime(openTimeStr);
  const { hours: closeH, minutes: closeM } = parseTime(closeTimeStr);
  
  const shopOpen = targetDate.clone().hour(openH).minute(openM);
  const shopClose = targetDate.clone().hour(closeH).minute(closeM);

  const staffIds = staffMembers.map(s => s._id);
  const bookings = await Booking.find({ staffId: { $in: staffIds }, status: { $ne: 'cancelled' }, startTime: { $gte: targetDate.toDate(), $lt: targetDate.clone().add(1, 'day').toDate() } });
  const slotLocks = await SlotLock.find({ staffId: { $in: staffIds }, expiresAt: { $gt: new Date() }, startTime: { $gte: targetDate.toDate(), $lt: targetDate.clone().add(1, 'day').toDate() } });

  const allBusyBlocks = [...bookings, ...slotLocks].map(block => ({ staffId: block.staffId.toString(), start: moment(block.startTime), end: moment(block.endTime) }));
  
  const availableSlotsWithStaff = [];
  let currentStart = shopOpen.clone();
  
  // 🕒 PAST SLOTS FILTER (For Today)
  if (targetDate.isSame(now, 'day')) {
    if (now.isAfter(shopOpen)) {
      currentStart = normalizeToGrid(now.clone().add(15, 'minutes'));
    }
  }

  while (currentStart.clone().add(totalDuration, 'minutes').isSameOrBefore(shopClose)) {
    const currentEnd = currentStart.clone().add(totalDuration, 'minutes');
    
    // Safety break
    if (targetDate.isSame(now, 'day') && currentStart.isBefore(now)) {
      currentStart.add(30, 'minutes');
      continue;
    }

    for (const staff of staffMembers) {
      const staffIdStr = staff._id.toString();
      const hasOverlap = allBusyBlocks.some(block => block.staffId === staffIdStr && currentStart.isBefore(block.end) && currentEnd.isAfter(block.start));
      if (!hasOverlap) {
        let slotObj = availableSlotsWithStaff.find(s => s.time === currentStart.format('HH:mm'));
        if (!slotObj) {
          slotObj = { time: currentStart.format('HH:mm'), availableStaff: [] };
          availableSlotsWithStaff.push(slotObj);
        }
        slotObj.availableStaff.push(staffIdStr);
      }
    }
    currentStart.add(30, 'minutes');
  }
  return availableSlotsWithStaff.sort((a, b) => a.time.localeCompare(b.time));
};

const findFirstAvailableStaff = async (vendorId, serviceIds, startTime, endTime, targetStaffId = null) => {
  let staffMembers = await Staff.find({ 
    vendorId, 
    isActive: true, 
    isOwner: false,
    services: { $all: serviceIds }
  });

  if (staffMembers.length === 0) {
    staffMembers = await Staff.find({ vendorId, isActive: true, isOwner: true });
  }

  const start = moment(startTime); const end = moment(endTime);
  const staffIds = staffMembers.map(s => s._id);
  const bookings = await Booking.find({ staffId: { $in: staffIds }, status: { $ne: 'cancelled' }, startTime: { $lt: end.toDate() }, endTime: { $gt: start.toDate() } });
  const slotLocks = await SlotLock.find({ staffId: { $in: staffIds }, expiresAt: { $gt: new Date() }, startTime: { $lt: end.toDate() }, endTime: { $gt: start.toDate() } });
  const busyStaffIds = new Set([...bookings.map(b => b.staffId.toString()), ...slotLocks.map(l => l.staffId.toString())]);
  
  if (targetStaffId) {
    const isTargetBusy = busyStaffIds.has(targetStaffId.toString());
    const isTargetQualified = staffMembers.some(s => s._id.toString() === targetStaffId.toString());
    return (!isTargetBusy && isTargetQualified) ? staffMembers.find(s => s._id.toString() === targetStaffId.toString()) : null;
  }

  return staffMembers.find(s => !busyStaffIds.has(s._id.toString()));
};

module.exports = { calculateAvailableSlots, normalizeToGrid, findFirstAvailableStaff };
