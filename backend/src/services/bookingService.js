const Booking = require('../models/Booking');
const SlotLock = require('../models/SlotLock');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const Vendor = require('../models/Vendor');
const Offer = require('../models/Offer');
const moment = require('moment-timezone');
const { calculateAvailableSlots } = require('./slotService');
const NotificationService = require('./notificationService');

const getAppliedDiscount = async (vendorId, serviceIds, basePrice) => {
  const now = new Date();
  const activeOffers = await Offer.find({ vendorId, isActive: true, $or: [{ expiryDate: { $exists: false } }, { expiryDate: { $gt: now } }] });
  if (activeOffers.length === 0) return 0;
  let maxDiscount = 0;
  for (const offer of activeOffers) {
    let currentDiscount = 0;
    const appliesToBooking = offer.serviceIds.length === 0 || serviceIds.some(id => offer.serviceIds.map(oid => oid.toString()).includes(id.toString()));
    if (appliesToBooking) {
      if (offer.discountType === 'percentage') currentDiscount = (basePrice * offer.value) / 100;
      else currentDiscount = offer.value;
    }
    if (currentDiscount > maxDiscount) maxDiscount = currentDiscount;
  }
  return Math.min(maxDiscount, basePrice);
};

const finalizeBooking = async (userId, vendorId, staffId, serviceIds, startTime, serviceAddress) => {
  const { normalizeToGrid } = require('./slotService');
  const start = normalizeToGrid(startTime);
  const serviceDetails = await Service.find({ _id: { $in: serviceIds }, vendorId });
  if (serviceDetails.length !== serviceIds.length) throw new Error('Services unavailable');

  const basePrice = serviceDetails.reduce((acc, s) => acc + s.price, 0);
  const discount = await getAppliedDiscount(vendorId, serviceIds, basePrice);
  const totalPrice = basePrice - discount;
  const totalDuration = serviceDetails.reduce((acc, s) => acc + (s.duration || 0) + (s.bufferTime || 0), 0);
  const end = start.clone().add(totalDuration, 'minutes');

  const existingBooking = await Booking.findOne({ staffId, status: { $ne: 'cancelled' }, $or: [{ startTime: { $lt: end.toDate() }, endTime: { $gt: start.toDate() } }] });
  if (existingBooking) throw new Error('Slot occupied');

  const lock = await SlotLock.findOne({ userId, vendorId, startTime: start.toDate() });
  if (!lock) throw new Error('Session expired');

  const booking = await Booking.create({
    userId, vendorId, staffId, serviceAddress,
    services: serviceDetails.map(s => ({ serviceId: s._id, name: s.name, price: s.price, duration: s.duration })),
    totalPrice, totalDuration, startTime: start.toDate(), endTime: end.toDate(), status: 'confirmed'
  });

  await SlotLock.deleteOne({ _id: lock._id });

  // 🔔 NOTIFICATIONS
  const vendor = await Vendor.findById(vendorId);
  const staff = await Staff.findById(staffId);
  
  // Customer
  NotificationService.sendNotification({
    userIds: userId, role: 'customer', type: 'BOOKING_CONFIRMED',
    title: 'Booking Confirmed!', message: `Your booking at ${vendor.shopName} is confirmed for ${start.format('LLL')}.`,
    data: { bookingId: booking._id }, referenceId: `${booking._id}_CONFIRM`
  });

  // Vendor
  NotificationService.sendNotification({
    userIds: vendor.ownerId, role: 'vendor', type: 'NEW_BOOKING',
    title: 'New Booking!', message: `New booking received for ${start.format('LLL')}.`,
    data: { bookingId: booking._id }, referenceId: `${booking._id}_NEW`
  });

  // Staff
  if (staff && staff.userId) {
    NotificationService.sendNotification({
      userIds: staff.userId, role: 'staff', type: 'STAFF_ASSIGNED',
      title: 'New Assignment', message: `You have been assigned a new booking for ${start.format('LLL')}.`,
      data: { bookingId: booking._id }, referenceId: `${booking._id}_ASSIGN`
    });
  }

  return booking;
};

const markBookingComplete = async (userId, bookingId) => {
  const booking = await Booking.findById(bookingId).populate('vendorId staffId');
  if (!booking) throw new Error('Booking not found');

  // Authorization: Only assigned staff OR the shop owner (vendor) can complete
  const isOwner = booking.vendorId.ownerId.toString() === userId.toString();
  const isStaff = booking.staffId && booking.staffId.userId && booking.staffId.userId.toString() === userId.toString();

  if (!isOwner && !isStaff) throw new Error('Unauthorized');

  booking.status = 'completed';
  booking.completedAt = new Date();
  await booking.save();

  // 🔔 NOTIFICATIONS
  // Notify Customer
  NotificationService.sendNotification({
    userIds: booking.userId, role: 'customer', type: 'BOOKING_COMPLETED',
    title: 'Booking Completed!', message: `We hope you enjoyed your service at ${booking.vendorId.shopName}. Please leave a review!`,
    data: { bookingId: booking._id }, referenceId: `${booking._id}_COMPLETE`
  });

  // Notify Vendor (Shop Owner)
  NotificationService.sendNotification({
    userIds: booking.vendorId.ownerId, role: 'vendor', type: 'BOOKING_COMPLETED_REPORT',
    title: 'Service Completed', message: `Staff ${booking.staffId?.name || 'Professional'} has completed the service for ${booking.userId?.name || 'Customer'}.`,
    data: { bookingId: booking._id }, referenceId: `${booking._id}_COMPLETE_V`
  });

  return booking;
};

const cancelBooking = async (userId, bookingId, role) => {
  const query = { _id: bookingId };
  if (role === 'customer') query.userId = userId;
  const booking = await Booking.findOne(query).populate('vendorId');
  if (!booking) throw new Error('Booking not found');

  if (moment().isAfter(moment(booking.startTime).subtract(30, 'minutes'))) throw new Error('Too late to cancel');

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  await booking.save();

  // 🔔 NOTIFICATIONS
  const parties = [booking.userId, booking.vendorId.ownerId];
  const staff = await Staff.findById(booking.staffId);
  if (staff && staff.userId) parties.push(staff.userId.toString());

  NotificationService.sendNotification({
    userIds: parties, role: 'multi', type: 'BOOKING_CANCELLED',
    title: 'Booking Cancelled', message: `Booking for ${moment(booking.startTime).format('LLL')} has been cancelled.`,
    data: { bookingId: booking._id }, referenceId: `${booking._id}_CANCEL`
  });

  return booking;
};

const rescheduleBooking = async (userId, bookingId, newStartTime, newStaffId, newServiceAddress) => {
  const { normalizeToGrid } = require('./slotService');
  const start = normalizeToGrid(newStartTime);
  
  const booking = await Booking.findById(bookingId).populate('vendorId');
  if (!booking) throw new Error('Booking not found');
  if (booking.userId.toString() !== userId.toString()) throw new Error('Unauthorized');

  // 1. 30-Minute Security Check (SOP)
  if (moment().isAfter(moment(booking.startTime).subtract(30, 'minutes'))) {
    throw new Error('Too late to reschedule (30m window)');
  }

  // 2. Validate New Slot Availability
  const end = start.clone().add(booking.totalDuration, 'minutes');
  const existingAtNewTime = await Booking.findOne({ 
    staffId: newStaffId, 
    _id: { $ne: bookingId },
    status: { $ne: 'cancelled' }, 
    $or: [{ startTime: { $lt: end.toDate() }, endTime: { $gt: start.toDate() } }] 
  });
  if (existingAtNewTime) throw new Error('New slot occupied');

  // 3. Verify SlotLock for the new time
  const lock = await SlotLock.findOne({ userId, vendorId: booking.vendorId._id, startTime: start.toDate() });
  if (!lock) throw new Error('Session expired (New slot not locked)');

  const oldTime = moment(booking.startTime).format('LLL');
  const originalStaffId = booking.staffId;
  
  // 4. Update Booking
  booking.startTime = start.toDate();
  booking.endTime = end.toDate();
  booking.staffId = newStaffId;
  if (newServiceAddress) booking.serviceAddress = newServiceAddress;
  booking.rescheduledAt = new Date();
  await booking.save();

  await SlotLock.deleteOne({ _id: lock._id });

  // 🔔 NOTIFICATIONS
  // 1. Notify Customer & Vendor
  NotificationService.sendNotification({
    userIds: [booking.userId, booking.vendorId.ownerId], role: 'multi', type: 'BOOKING_RESCHEDULED',
    title: 'Booking Rescheduled', 
    message: `Appointment at ${booking.vendorId.shopName} moved from ${oldTime} to ${start.format('LLL')}.`,
    data: { bookingId: booking._id }, referenceId: `${booking._id}_RESCHED`
  });

  // 2. Handle Staff Notifications
  if (originalStaffId.toString() === newStaffId.toString()) {
    // Same staff, just time changed
    const staff = await Staff.findById(originalStaffId);
    if (staff && staff.userId) {
      NotificationService.sendNotification({
        userIds: staff.userId, role: 'staff', type: 'BOOKING_RESCHEDULED',
        title: 'Assignment Rescheduled', message: `Your assignment has been moved from ${oldTime} to ${start.format('LLL')}.`,
        data: { bookingId: booking._id }, referenceId: `${booking._id}_STAFF_RESCHED`
      });
    }
  } else {
    // Staff changed! Notify both
    const oldStaff = await Staff.findById(originalStaffId);
    if (oldStaff && oldStaff.userId) {
      NotificationService.sendNotification({
        userIds: oldStaff.userId, role: 'staff', type: 'STAFF_UNASSIGNED',
        title: 'Assignment Removed', message: `Booking for ${oldTime} has been rescheduled and assigned to someone else.`,
        data: { bookingId: booking._id }, referenceId: `${booking._id}_UNASSIGN`
      });
    }

    const newStaff = await Staff.findById(newStaffId);
    if (newStaff && newStaff.userId) {
      NotificationService.sendNotification({
        userIds: newStaff.userId, role: 'staff', type: 'STAFF_ASSIGNED',
        title: 'New Assignment (Rescheduled)', message: `You have a new assignment for ${start.format('LLL')}.`,
        data: { bookingId: booking._id }, referenceId: `${booking._id}_NEW_ASSIGN`
      });
    }
  }

  return booking;
};

module.exports = { finalizeBooking, cancelBooking, markBookingComplete, rescheduleBooking };
