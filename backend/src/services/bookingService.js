const Booking = require('../models/Booking');
const SlotLock = require('../models/SlotLock');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const moment = require('moment-timezone');
const { calculateAvailableSlots } = require('./slotService');
const NotificationService = require('./notificationService');
const { calculatePricingPreview } = require('./offerPricingService');
const {
  getActiveClosureWindows,
  hasClosureOverlap
} = require('./vendorClosureService');

const getStaffNotificationTarget = (staff) => staff?.userId || staff?._id || null;

const sendRoleNotifications = async (notifications = []) => {
  await Promise.all(
    notifications
      .filter((notification) => notification?.userIds)
      .map((notification) => NotificationService.sendNotification(notification))
  );
};

const HOME_ENABLED_SERVICE_TYPES = new Set(['home', 'both']);

const resolveBookingMode = (serviceDetails = [], serviceAddress = '') => {
  const supportsHomeVisit = serviceDetails.some((service) => HOME_ENABLED_SERVICE_TYPES.has(service.type));
  return {
    bookingType: supportsHomeVisit ? 'home' : 'shop',
    resolvedServiceAddress: supportsHomeVisit ? serviceAddress : undefined
  };
};

const resolveLockedStaff = async ({ userId, vendorId, start, preferredStaffId = null }) => {
  const lockQuery = {
    userId,
    vendorId,
    startTime: start.toDate()
  };

  if (preferredStaffId) {
    lockQuery.staffId = preferredStaffId;
  }

  let lock = await SlotLock.findOne(lockQuery);

  if (!lock && preferredStaffId) {
    lock = await SlotLock.findOne({
      userId,
      vendorId,
      startTime: start.toDate()
    });
  }

  return {
    lock,
    staffId: preferredStaffId || lock?.staffId || null
  };
};

const findOverlappingBooking = ({ staffId, start, end, excludeBookingId = null }) => {
  const query = {
    staffId,
    status: { $ne: 'cancelled' },
    startTime: { $lt: end.toDate() },
    endTime: { $gt: start.toDate() }
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Booking.findOne(query);
};

const buildSlotConflictError = async (message, vendorId, serviceIds, start) => {
  const error = new Error(message);
  try {
    error.nextAvailableSlots = await calculateAvailableSlots(vendorId, serviceIds, start.toDate());
  } catch (slotError) {
    error.nextAvailableSlots = [];
  }
  return error;
};

const finalizeBooking = async (userId, vendorId, staffId, serviceIds, startTime, serviceAddress) => {
  const { normalizeToGrid } = require('./slotService');
  const start = normalizeToGrid(startTime);
  const serviceDetails = await Service.find({ _id: { $in: serviceIds }, vendorId });

  if (serviceDetails.length !== serviceIds.length) throw new Error('Services unavailable');

  const pricingPreview = await calculatePricingPreview(vendorId, serviceDetails);
  const { bookingType, resolvedServiceAddress } = resolveBookingMode(serviceDetails, serviceAddress);
  const totalPrice = pricingPreview.finalTotal;
  const totalDuration = serviceDetails.reduce((acc, s) => acc + (s.duration || 0) + (s.bufferTime || 0), 0);
  const end = start.clone().add(totalDuration, 'minutes');
  const closureWindows = await getActiveClosureWindows(vendorId, start, end);

  if (hasClosureOverlap(start, end, closureWindows)) {
    throw new Error('Shop is temporarily closed for the selected time');
  }

  const existingBooking = await findOverlappingBooking({ staffId, start, end });
  if (existingBooking) {
    throw await buildSlotConflictError('Slot occupied', vendorId, serviceIds, start);
  }

  const lock = await SlotLock.findOne({ userId, vendorId, staffId, startTime: start.toDate() });
  if (!lock) throw new Error('Session expired');

  const booking = await Booking.create({
    userId,
    vendorId,
    staffId,
    type: bookingType,
    serviceAddress: resolvedServiceAddress,
    services: serviceDetails.map((service) => ({
      serviceId: service._id,
      name: service.name,
      price: service.price,
      duration: service.duration
    })),
    totalPrice,
    totalDuration,
    startTime: start.toDate(),
    endTime: end.toDate(),
    status: 'confirmed'
  });

  await SlotLock.deleteOne({ _id: lock._id });

  const vendor = await Vendor.findById(vendorId);
  const staff = await Staff.findById(staffId);

  await sendRoleNotifications([
    {
      userIds: userId,
      role: 'customer',
      type: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed!',
      message: `Your booking at ${vendor.shopName} is confirmed for ${start.format('LLL')}.`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_CONFIRM`
    },
    {
      userIds: vendor.ownerId,
      role: 'vendor',
      type: 'NEW_BOOKING',
      title: 'New Booking!',
      message: `New booking received for ${start.format('LLL')}.`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_NEW`
    },
    getStaffNotificationTarget(staff) ? {
      userIds: getStaffNotificationTarget(staff),
      role: 'staff',
      type: 'STAFF_ASSIGNED',
      title: 'New Assignment',
      message: `You have been assigned a new booking for ${booking.isWalkIn ? 'Walk-in' : 'Customer'}: ${booking.walkInCustomerName || 'Client'}. Services: ${booking.services.map(s => s.name).join(', ')} at ${start.format('LT')}.`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_ASSIGN`
    } : null
  ]);

  return booking;
};

const markBookingComplete = async (userId, bookingId, actorStaffId = null) => {
  const booking = await Booking.findById(bookingId).populate('vendorId staffId');
  if (!booking) throw new Error('Booking not found');

  const isOwner = booking.vendorId.ownerId.toString() === userId.toString();
  const isStaff =
    booking.staffId && (
      (booking.staffId.userId && booking.staffId.userId.toString() === userId.toString()) ||
      (actorStaffId && booking.staffId._id.toString() === actorStaffId.toString())
    );

  if (!isOwner && !isStaff) throw new Error('Unauthorized');

  if (booking.status !== 'confirmed') {
    throw new Error(`Only confirmed bookings can be completed (Current: ${booking.status})`);
  }

  // 1. Atomic Status Update
  const completionTime = new Date();
  booking.status = 'completed';
  booking.completedAt = completionTime;
  if (booking.endTime && completionTime < booking.endTime) {
    booking.endTime = completionTime;
  }
  await booking.save();

  // 2. Revenue Collection: Credit Vendor's Wallet
  const amount = booking.totalPrice || 0;
  if (amount > 0) {
    const vendor = await Vendor.findById(booking.vendorId?._id || booking.vendorId);
    if (vendor) {
      vendor.walletBalance = (vendor.walletBalance || 0) + amount;
      await vendor.save();

      // Log Transaction
      await WalletTransaction.create({
        vendorId: vendor._id,
        initiatedByUserId: userId,
        amount: amount,
        type: 'credit',
        category: 'booking_revenue',
        reason: `Service completed: ${booking.services.map(s => s.name).join(', ')}`,
        status: 'completed',
        referenceId: `${booking._id}_REV`,
        description: `Revenue from booking #${booking._id.toString().slice(-6).toUpperCase()}`
      });
    }
  }

  await sendRoleNotifications([
    {
      userIds: booking.userId,
      role: 'customer',
      type: 'BOOKING_COMPLETED',
      title: 'Booking Completed!',
      message: `We hope you enjoyed your service at ${booking.vendorId.shopName}. Please leave a review!`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_COMPLETE`
    },
    {
      userIds: booking.vendorId.ownerId,
      role: 'vendor',
      type: 'BOOKING_COMPLETED_REPORT',
      title: 'Service Completed',
      message: `Staff ${booking.staffId?.name || 'Professional'} has completed the service for ${booking.userId?.name || 'Customer'}.`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_COMPLETE_V`
    },
    getStaffNotificationTarget(booking.staffId) ? {
      userIds: getStaffNotificationTarget(booking.staffId),
      role: 'staff',
      type: 'BOOKING_COMPLETED',
      title: 'Job Completed!',
      message: `Great job! You have completed the service for ${booking.walkInCustomerName || booking.userId?.name || 'Customer'}.`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_COMPLETE_S`
    } : null
  ]);

  return booking;
};

const cancelBooking = async (userId, bookingId, role, reason = '', actorStaffId = null) => {
  const query = { _id: bookingId };
  if (role === 'customer') query.userId = userId;

  const booking = await Booking.findOne(query).populate('vendorId staffId');
  if (!booking) throw new Error('Booking not found');

  if (booking.status !== 'confirmed') {
    throw new Error(`Only confirmed bookings can be cancelled (Current: ${booking.status})`);
  }

  if (role === 'vendor' && booking.vendorId?.ownerId?.toString() !== userId.toString()) {
    throw new Error('Unauthorized');
  }

  if (role === 'staff') {
    const isAssignedStaff =
      booking.staffId && (
        (booking.staffId.userId && booking.staffId.userId.toString() === userId.toString()) ||
        (actorStaffId && booking.staffId._id.toString() === actorStaffId.toString())
      );

    if (!isAssignedStaff) {
      throw new Error('Unauthorized');
    }
  }


  const trimmedReason = reason?.trim();
  if ((role === 'vendor' || role === 'staff') && !trimmedReason) {
    throw new Error('Cancellation reason is required');
  }

  booking.status = 'cancelled';
  booking.cancelReason =
    trimmedReason ||
    (role === 'customer' ? 'Customer cancelled booking' : 'Booking cancelled');
  booking.cancelledByRole = role;
  booking.cancelledAt = new Date();
  await booking.save();

  const staff = await Staff.findById(booking.staffId?._id || booking.staffId);
  const reasonSuffix = trimmedReason ? ` Reason: ${trimmedReason}` : '';
  const customerMessage =
    role === 'vendor'
      ? `Your booking for ${moment(booking.startTime).format('LLL')} was cancelled by the vendor.${reasonSuffix}`
      : `Booking for ${moment(booking.startTime).format('LLL')} has been cancelled.${reasonSuffix}`;
  const internalMessage = `Booking for ${moment(booking.startTime).format('LLL')} has been cancelled.${reasonSuffix}`;

  await sendRoleNotifications([
    {
      userIds: booking.userId,
      role: 'customer',
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      message: customerMessage,
      data: { bookingId: booking._id, reason: booking.cancelReason },
      referenceId: `${booking._id}_CANCEL_CUSTOMER`
    },
    {
      userIds: booking.vendorId.ownerId,
      role: 'vendor',
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      message: internalMessage,
      data: { bookingId: booking._id, reason: booking.cancelReason },
      referenceId: `${booking._id}_CANCEL_VENDOR`
    },
    getStaffNotificationTarget(staff) ? {
      userIds: getStaffNotificationTarget(staff),
      role: 'staff',
      type: 'BOOKING_CANCELLED',
      title: 'Assignment Cancelled',
      message: `Your assignment for ${booking.walkInCustomerName || booking.userId?.name || 'Client'} at ${moment(booking.startTime).format('LT')} was cancelled.${reasonSuffix}`,
      data: { bookingId: booking._id, reason: booking.cancelReason },
      referenceId: `${booking._id}_CANCEL_STAFF`
    } : null
  ]);

  return booking;
};

const emergencyCancelBooking = async (vendorUserId, bookingId, reason = '', closureId = null) => {
  const booking = await Booking.findById(bookingId).populate('vendorId');
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'confirmed') throw new Error('Only confirmed bookings can be cancelled');
  if (booking.vendorId.ownerId.toString() !== vendorUserId.toString()) throw new Error('Unauthorized');

  const closureWindows = await getActiveClosureWindows(
    booking.vendorId._id,
    booking.startTime,
    booking.endTime
  );

  if (closureWindows.length === 0) {
    throw new Error('This booking is not inside any active emergency closure');
  }

  if (closureId) {
    const matchingClosure = closureWindows.find((closure) => closure._id.toString() === closureId.toString());
    if (!matchingClosure) {
      throw new Error('This booking does not belong to the selected emergency closure');
    }
  }

  booking.status = 'cancelled';
  booking.cancelReason = reason?.trim() || 'Emergency temporary closure';
  booking.cancelledByRole = 'vendor';
  booking.cancelledAt = new Date();
  await booking.save();

  const staff = await Staff.findById(booking.staffId);
  const bookingTime = moment(booking.startTime).format('LLL');

  await sendRoleNotifications([
    {
      userIds: booking.userId,
      role: 'customer',
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      message: `Your booking for ${bookingTime} was cancelled because the shop is temporarily closed.`,
      data: { bookingId: booking._id, reason: booking.cancelReason },
      referenceId: `${booking._id}_EMERGENCY_CANCEL_CUSTOMER`
    },
    {
      userIds: booking.vendorId.ownerId,
      role: 'vendor',
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      message: `Booking for ${bookingTime} was cancelled due to an emergency closure.`,
      data: { bookingId: booking._id, reason: booking.cancelReason },
      referenceId: `${booking._id}_EMERGENCY_CANCEL_VENDOR`
    },
    getStaffNotificationTarget(staff) ? {
      userIds: getStaffNotificationTarget(staff),
      role: 'staff',
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      message: `Assigned booking for ${bookingTime} was cancelled due to an emergency closure.`,
      data: { bookingId: booking._id, reason: booking.cancelReason },
      referenceId: `${booking._id}_EMERGENCY_CANCEL_STAFF`
    } : null
  ]);

  return booking;
};

const rescheduleBooking = async (userId, actorRole, bookingId, newStartTime, newStaffId, newServiceAddress, actorStaffId = null) => {
  const { normalizeToGrid } = require('./slotService');
  const start = normalizeToGrid(newStartTime);

  const booking = await Booking.findById(bookingId).populate('vendorId');
  if (!booking) throw new Error('Booking not found');

  const isCustomer = actorRole === 'customer' && booking.userId?.toString() === userId.toString();
  const isVendor = actorRole === 'vendor' && booking.vendorId?.ownerId?.toString() === userId.toString();
  const isStaff = actorRole === 'staff' && Boolean(actorStaffId) && booking.staffId?.toString() === actorStaffId.toString();
  if (!isCustomer && !isVendor && !isStaff) throw new Error('Unauthorized');

  if (booking.status !== 'confirmed') {
    throw new Error(`Only confirmed bookings can be rescheduled (Current: ${booking.status})`);
  }

  if (actorRole === 'customer' && moment().isAfter(moment(booking.startTime).subtract(30, 'minutes'))) {
    throw new Error('Too late to reschedule (30m window)');
  }

  const end = start.clone().add(booking.totalDuration, 'minutes');
  const closureWindows = await getActiveClosureWindows(booking.vendorId._id, start, end);
  if (hasClosureOverlap(start, end, closureWindows)) {
    throw new Error('Shop is temporarily closed for the selected time');
  }

  const { lock, staffId: resolvedStaffId } = await resolveLockedStaff({
    userId,
    vendorId: booking.vendorId._id,
    start,
    preferredStaffId: newStaffId
  });

  if (!lock || !resolvedStaffId) {
    throw new Error('Session expired (New slot not locked)');
  }

  const existingAtNewTime = await Booking.findOne({
    staffId: resolvedStaffId,
    _id: { $ne: bookingId },
    status: { $ne: 'cancelled' },
    startTime: { $lt: end.toDate() },
    endTime: { $gt: start.toDate() }
  });

  if (existingAtNewTime) throw new Error('New slot occupied');

  const oldTime = moment(booking.startTime).format('LLL');
  const originalStaffId = booking.staffId;
  const serviceIds = (booking.services || []).map((service) => service.serviceId).filter(Boolean);
  const serviceDetails = await Service.find({
    _id: { $in: serviceIds },
    vendorId: booking.vendorId._id
  }).select('type');
  const { bookingType, resolvedServiceAddress } = resolveBookingMode(
    serviceDetails,
    newServiceAddress || booking.serviceAddress || ''
  );

  booking.startTime = start.toDate();
  booking.endTime = end.toDate();
  booking.staffId = resolvedStaffId;
  booking.type = bookingType;
  booking.serviceAddress = resolvedServiceAddress;
  booking.rescheduledAt = new Date();
  booking.rescheduledByRole = actorRole;
  await booking.save();

  await SlotLock.deleteOne({ _id: lock._id });

  await sendRoleNotifications([
    {
      userIds: booking.userId,
      role: 'customer',
      type: 'BOOKING_RESCHEDULED',
      title: 'Booking Rescheduled',
      message: `Appointment at ${booking.vendorId.shopName} moved from ${oldTime} to ${start.format('LLL')}.`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_RESCHED_CUSTOMER`
    },
    {
      userIds: booking.vendorId.ownerId,
      role: 'vendor',
      type: 'BOOKING_RESCHEDULED',
      title: 'Booking Rescheduled',
      message: `Appointment at ${booking.vendorId.shopName} moved from ${oldTime} to ${start.format('LLL')}.`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_RESCHED_VENDOR`
    }
  ]);

  if (originalStaffId.toString() === resolvedStaffId.toString()) {
    const staff = await Staff.findById(originalStaffId);
    if (getStaffNotificationTarget(staff)) {
      await NotificationService.sendNotification({
        userIds: getStaffNotificationTarget(staff),
        role: 'staff',
        type: 'BOOKING_RESCHEDULED',
        title: 'Assignment Rescheduled',
        message: `Your assignment for ${booking.walkInCustomerName || 'Client'} moved from ${oldTime} to ${start.format('LLL')}.`,
        data: { bookingId: booking._id },
        referenceId: `${booking._id}_STAFF_RESCHED`
      });
    }
  } else {
    const oldStaff = await Staff.findById(originalStaffId);
    if (getStaffNotificationTarget(oldStaff)) {
      await NotificationService.sendNotification({
        userIds: getStaffNotificationTarget(oldStaff),
        role: 'staff',
        type: 'STAFF_UNASSIGNED',
        title: 'Assignment Removed',
        message: `Booking for ${oldTime} has been rescheduled and assigned to someone else.`,
        data: { bookingId: booking._id },
        referenceId: `${booking._id}_UNASSIGN`
      });
    }

    const newStaff = await Staff.findById(resolvedStaffId);
    if (getStaffNotificationTarget(newStaff)) {
      await NotificationService.sendNotification({
        userIds: getStaffNotificationTarget(newStaff),
        role: 'staff',
        type: 'STAFF_ASSIGNED',
        title: 'New Assignment (Rescheduled)',
        message: `You have been assigned a rescheduled booking for ${booking.walkInCustomerName || 'Client'} at ${start.format('LLL')}.`,
        data: { bookingId: booking._id },
        referenceId: `${booking._id}_NEW_ASSIGN`
      });
    }
  }

  return booking;
};

module.exports = {
  finalizeBooking,
  cancelBooking,
  emergencyCancelBooking,
  markBookingComplete,
  rescheduleBooking
};
