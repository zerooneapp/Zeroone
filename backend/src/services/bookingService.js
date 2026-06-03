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
    startTime: start.toDate()
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

  // 🛡️ SECURITY GUARD: Block bookings if vendor is not active
  const vendor = await Vendor.findById(vendorId);
  if (!vendor || vendor.status !== 'active' || vendor.isActive === false) {
    throw new Error('Partner is currently not accepting new bookings (Account Inactive)');
  }

  const serviceDetails = await Service.find({ _id: { $in: serviceIds }, vendorId });

  if (serviceDetails.length !== serviceIds.length) throw new Error('Services unavailable');

  const pricingPreview = await calculatePricingPreview(vendorId, serviceDetails, userId);
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
  if (!lock) throw new Error('Booking session timed out. Please select the slot again.');

  const booking = await Booking.create({
    userId,
    vendorId,
    staffId,
    type: bookingType,
    serviceAddress: resolvedServiceAddress,
    membershipId: pricingPreview.membershipApplied?.id,
    services: serviceDetails.map((service) => {
      const preview = pricingPreview.services.find(ps => ps.serviceId.toString() === service._id.toString());
      return {
        serviceId: service._id,
        name: service.name,
        price: preview ? preview.finalPrice : service.price,
        duration: service.duration,
        isFreeViaMembership: preview?.isFreeViaMembership || false
      };
    }),
    totalPrice,
    totalDuration,
    startTime: start.toDate(),
    endTime: end.toDate(),
    status: 'confirmed'
  });

  await SlotLock.deleteOne({ _id: lock._id });

  const staff = await Staff.findById(staffId);

  const notificationTargets = new Map();
  const addTarget = (uid, payload) => {
    const existing = notificationTargets.get(uid.toString());
    // Priority: Staff > Vendor > Customer
    if (!existing || payload.role === 'staff' || (payload.role === 'vendor' && existing.role === 'customer')) {
      notificationTargets.set(uid.toString(), payload);
    }
  };

  // 1. Customer Notification
  addTarget(userId, {
    userIds: userId,
    role: 'customer',
    type: 'BOOKING_CONFIRMED',
    title: 'Booking Confirmed!',
    message: `Your booking at ${vendor.shopName} is confirmed for ${start.format('D MMMM YYYY, h:mm A')}.`,
    data: { bookingId: booking._id },
    referenceId: `${booking._id}_BOOKING_EVENT`
  });

  // 2. Vendor Owner Notification
  addTarget(vendor.ownerId, {
    userIds: vendor.ownerId,
    role: 'vendor',
    type: 'NEW_BOOKING',
    title: 'New Booking!',
    message: `New booking received for ${start.format('D MMMM YYYY, h:mm A')}.`,
    data: { bookingId: booking._id },
    referenceId: `${booking._id}_BOOKING_EVENT`
  });

  // 3. Staff Notification
  const staffTargetId = getStaffNotificationTarget(staff);
  if (staffTargetId) {
    addTarget(staffTargetId, {
      userIds: staffTargetId,
      role: 'staff',
      type: 'STAFF_ASSIGNED',
      title: 'Booking Accepted',
      message: `You have been assigned a new booking for ${booking.isWalkIn ? 'Walk-in' : 'Customer'}: ${booking.walkInCustomerName || 'Client'}. Services: ${booking.services.map(s => s.name).join(', ')} at ${start.format('LT')}.`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_BOOKING_EVENT`
    });
  }

  await sendRoleNotifications(Array.from(notificationTargets.values()));

  // 4. Notify Admins for Dashboard Sync (Silent)
  NotificationService.notifyAdmins({
    type: 'NEW_BOOKING',
    title: 'New Booking on Platform',
    message: `A new booking has been confirmed at ${vendor.shopName}.`,
    data: { bookingId: booking._id }
  });

  return booking;
};

const markBookingComplete = async (userId, bookingId, actorStaffId = null) => {
  const booking = await Booking.findById(bookingId).populate('vendorId staffId');
  if (!booking) throw new Error('Booking not found');

  console.log(`[BOOKING-DEBUG] Complete Request - User: ${userId}, Booking: ${bookingId}, Staff: ${actorStaffId}`);
  const isOwner = booking.vendorId && booking.vendorId.ownerId && booking.vendorId.ownerId.toString() === userId.toString();
  const isStaff =
    booking.staffId && (
      (booking.staffId.userId && booking.staffId.userId.toString() === userId.toString()) ||
      (actorStaffId && booking.staffId._id.toString() === actorStaffId.toString())
    );

  console.log(`[BOOKING-DEBUG] Auth Check - isOwner: ${isOwner}, isStaff: ${isStaff}`);

  if (!isOwner && !isStaff) throw new Error('Unauthorized: You do not have permission to complete this booking');

  if (booking.status !== 'confirmed' && booking.status !== 'pending') {
    throw new Error(`Only confirmed or pending bookings can be completed (Current: ${booking.status})`);
  }

  // 1. Atomic Status Update
  const completionTime = new Date();
  booking.status = 'completed';
  booking.completedAt = completionTime;
  if (booking.endTime && completionTime < booking.endTime) {
    booking.endTime = completionTime;
  }
  await booking.save();

  // 📈 TRACK MEMBERSHIP USAGE ON COMPLETION: Increment counts only now
  if (booking.membershipId) {
    try {
      const UserMembership = require('../models/UserMembership');
      const membership = await UserMembership.findById(booking.membershipId);
      if (membership) {
        let updatedAny = false;
        booking.services.forEach(s => {
          if (s.isFreeViaMembership) {
            const usageIdx = membership.usage.findIndex(u => u.serviceId.toString() === s.serviceId.toString());
            if (usageIdx > -1) {
              membership.usage[usageIdx].usedCount += 1;
              updatedAny = true;
            }
          }
        });

        if (updatedAny) {
          await membership.save();
          console.log(`[MEMBERSHIP-TRACK] Counts incremented for completed booking ${booking._id}`);

          // 🔄 AUTO-EXPIRE CHECK:
          const fullMembership = await UserMembership.findById(membership._id).populate('planId');
          if (fullMembership && fullMembership.status === 'active') {
            const allUsed = fullMembership.planId.services.every(planService => {
              const usageRecord = fullMembership.usage.find(u => u.serviceId.toString() === planService.serviceId.toString());
              return (usageRecord?.usedCount || 0) >= planService.usageLimit;
            });

            if (allUsed) {
              fullMembership.status = 'expired';
              await fullMembership.save();
              
              NotificationService.sendNotification({
                userIds: booking.userId,
                role: 'customer',
                type: 'MEMBERSHIP_EXPIRED',
                title: 'Membership Completed! 🏁',
                message: `You have successfully used all services in your "${fullMembership.planId.name}" membership.`,
                data: { membershipId: fullMembership._id }
              });
            }
          }
        }
      }
    } catch (trackError) {
      console.error(`[MEMBERSHIP-TRACK-ERROR] Failed to update counts for booking ${booking._id}:`, trackError);
    }
  }

  // 2. Revenue Collection: No longer adding booking amount to vendor wallet balance. 
  // Partners are paid directly by consumers (offline). 
  // Digital wallet is strictly for platform subscription fees.

  // 🛡️ Safety check: Ensure vendor and staff details exist before notifying
  const vendorOwnerId = booking.vendorId?.ownerId;
  const staffName = booking.staffId?.name || 'Professional';
  const customerName = booking.userId?.name || booking.walkInCustomerName || 'Customer';

  const notificationPayloads = [];

  // 1. Customer Notification (Only if not a walk-in)
  if (booking.userId) {
    notificationPayloads.push({
      userIds: booking.userId,
      role: 'customer',
      type: 'BOOKING_COMPLETED',
      title: 'Booking Completed!',
      message: `We hope you enjoyed your service at ${booking.vendorId?.shopName || 'ZeroOne'}. Please leave a review!`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_COMPLETE`
    });
  }

  // 2. Vendor Owner Notification
  if (vendorOwnerId) {
    notificationPayloads.push({
      userIds: vendorOwnerId,
      role: 'vendor',
      type: 'BOOKING_COMPLETED_REPORT',
      title: 'Service Completed',
      message: `Staff ${staffName} has completed the service for ${customerName}.`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_COMPLETE_V`
    });
  }

  // 3. Staff Notification
  const staffTargetId = getStaffNotificationTarget(booking.staffId);
  if (staffTargetId) {
    notificationPayloads.push({
      userIds: staffTargetId,
      role: 'staff',
      type: 'BOOKING_COMPLETED',
      title: 'Job Completed!',
      message: `Great job! You have completed the service for ${customerName}.`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_COMPLETE_S`
    });
  }

  // Deduplicate and send
  if (notificationPayloads.length > 0) {
    const finalNotifications = new Map();
    notificationPayloads.forEach(notif => {
      const uid = notif.userIds.toString();
      if (!finalNotifications.has(uid) || notif.role === 'staff') {
        finalNotifications.set(uid, notif);
      }
    });
    await sendRoleNotifications(Array.from(finalNotifications.values()));
  }

  // Notify Admins for Dashboard Sync (Silent)
  NotificationService.notifyAdmins({
    type: 'BOOKING_COMPLETED',
    title: 'Service Completed',
    message: `A service has been completed at ${booking.vendorId?.shopName || 'ZeroOne'}.`,
    data: { bookingId: booking._id }
  });

  return booking;
};

const cancelBooking = async (userId, bookingId, role, reason = '', actorStaffId = null) => {
  const query = { _id: bookingId };
  if (role === 'customer') query.userId = userId;

  const booking = await Booking.findOne(query).populate('vendorId staffId');
  if (!booking) throw new Error('Booking not found');

  if (booking.status !== 'confirmed' && booking.status !== 'pending') {
    throw new Error(`Only active bookings can be cancelled (Current: ${booking.status})`);
  }

  // 🛡️ CUSTOMER TIME GUARD: Cannot cancel after start time
  if (role === 'customer') {
    const now = moment().tz('Asia/Kolkata');
    const start = moment(booking.startTime).tz('Asia/Kolkata');
    if (now.isSameOrAfter(start)) {
      throw new Error('You cannot cancel a booking after the appointment time has started. Please contact the partner for assistance.');
    }
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

  booking.cancelledAt = new Date();
  await booking.save();

  const staff = await Staff.findById(booking.staffId?._id || booking.staffId);
  const reasonSuffix = trimmedReason ? ` Reason: ${trimmedReason}` : '';
  const formattedTime = moment(booking.startTime).tz('Asia/Kolkata').format('D MMMM YYYY, h:mm A');
  const customerMessage =
    role === 'vendor'
      ? `Your booking for ${formattedTime} was cancelled by ${booking.vendorId.shopName}.${reasonSuffix}`
      : `Booking for ${formattedTime} has been cancelled.${reasonSuffix}`;
  const internalMessage = `Booking for ${formattedTime} has been cancelled.${reasonSuffix}`;

  const notificationTargets = new Map();
  const addTarget = (uid, payload) => {
    if (!uid) return;
    const existing = notificationTargets.get(uid.toString());
    // Priority: Staff > Vendor > Customer
    if (!existing || payload.role === 'staff' || (payload.role === 'vendor' && existing.role === 'customer')) {
      notificationTargets.set(uid.toString(), payload);
    }
  };

  // 1. Customer Notification
  addTarget(booking.userId, {
    userIds: booking.userId,
    role: 'customer',
    type: 'BOOKING_CANCELLED_INFO',
    title: 'Booking Cancelled',
    message: customerMessage,
    data: { bookingId: booking._id, reason: booking.cancelReason, isActionable: false },
    referenceId: `${booking._id}_CANCEL_EVENT`
  });

  // 2. Vendor Owner Notification
  addTarget(booking.vendorId.ownerId, {
    userIds: booking.vendorId.ownerId,
    role: 'vendor',
    type: 'BOOKING_CANCELLED_INFO',
    title: 'Booking Cancelled',
    message: internalMessage,
    data: { bookingId: booking._id, reason: booking.cancelReason, isActionable: false },
    referenceId: `${booking._id}_CANCEL_EVENT`
  });

  // 3. Staff Notification
  const staffTargetId = getStaffNotificationTarget(staff);
  if (staffTargetId) {
    addTarget(staffTargetId, {
      userIds: staffTargetId,
      role: 'staff',
      type: 'BOOKING_CANCELLED_INFO',
      title: 'Booking Cancelled',
      message: `Your assignment for ${booking.walkInCustomerName || booking.userId?.name || 'Client'} at ${moment(booking.startTime).format('LT')} was cancelled.${reasonSuffix}`,
      data: { bookingId: booking._id, reason: booking.cancelReason, isActionable: false },
      referenceId: `${booking._id}_CANCEL_EVENT`
    });
  }

  await sendRoleNotifications(Array.from(notificationTargets.values()));

  // Notify Admins for Dashboard Sync (Silent)
  NotificationService.notifyAdmins({
    type: 'BOOKING_CANCELLED',
    title: 'Booking Cancelled',
    message: `A booking at ${booking.vendorId.shopName} has been cancelled.`,
    data: { bookingId: booking._id }
  });

  return booking;
};

const emergencyCancelBooking = async (vendorUserId, bookingId, reason = '', closureId = null) => {
  const booking = await Booking.findById(bookingId).populate('vendorId');
  if (!booking) throw new Error('Booking not found');
  if (!['confirmed', 'pending'].includes(booking.status)) throw new Error('Only active bookings can be cancelled');
  if (booking.vendorId.ownerId.toString() !== vendorUserId.toString()) throw new Error('Unauthorized');

  // 🔍 Check if it's a Vendor Closure or a Staff Closure
  let isValidClosure = false;
  
  const vClosures = await getActiveClosureWindows(
    booking.vendorId._id,
    booking.startTime,
    booking.endTime
  );
  if (vClosures.length > 0) isValidClosure = true;

  if (!isValidClosure && closureId) {
    const StaffClosure = require('../models/StaffClosure');
    const sClosure = await StaffClosure.findById(closureId);
    if (sClosure && 
        sClosure.staffId.toString() === booking.staffId.toString() &&
        booking.startTime < sClosure.endTime && 
        booking.endTime > sClosure.startTime) {
      isValidClosure = true;
    }
  }

  if (!isValidClosure) {
    throw new Error('This booking is not inside any active emergency closure (Shop or Staff)');
  }

  booking.status = 'cancelled';
  booking.cancelReason = reason?.trim() || 'Emergency temporary closure';
  booking.cancelledByRole = 'vendor';
  booking.cancelledAt = new Date();
  await booking.save();

  booking.cancelledAt = new Date();
  await booking.save();

  const staff = await Staff.findById(booking.staffId);
  const bookingTime = moment(booking.startTime).tz('Asia/Kolkata').format('D MMMM YYYY, h:mm A');

  const notificationPayloads = [
    {
      userId: booking.userId,
      role: 'customer',
      type: 'BOOKING_CANCELLED_INFO',
      title: 'Booking Cancelled',
      message: `Your booking for ${bookingTime} was cancelled because the shop is temporarily closed.`,
      data: { bookingId: booking._id, reason: booking.cancelReason, isActionable: false },
      referenceId: `${booking._id}_EMERGENCY_CANCEL_CUSTOMER`
    },
    {
      userId: booking.vendorId.ownerId,
      role: 'vendor',
      type: 'BOOKING_CANCELLED_INFO',
      title: 'Booking Cancelled',
      message: `Booking for ${bookingTime} was cancelled due to an emergency closure.`,
      data: { bookingId: booking._id, reason: booking.cancelReason, isActionable: false },
      referenceId: `${booking._id}_EMERGENCY_CANCEL_VENDOR`
    }
  ];

  const staffTargetId = getStaffNotificationTarget(staff);
  if (staffTargetId) {
    notificationPayloads.push({
      userId: staffTargetId,
      role: 'staff',
      type: 'BOOKING_CANCELLED_INFO',
      title: 'Booking Cancelled',
      message: `Assigned booking for ${bookingTime} was cancelled due to an emergency closure.`,
      data: { bookingId: booking._id, reason: booking.cancelReason, isActionable: false },
      referenceId: `${booking._id}_EMERGENCY_CANCEL_STAFF`
    });
  }

  // 🛡️ Deduplicate by userId: Priority Staff > Vendor > Customer
  const finalTargets = new Map();
  notificationPayloads.forEach(p => {
    if (!p.userId) return;
    const uid = p.userId.toString();
    // Role Priority: Staff (Partner App) > Vendor (Partner App) > Customer (Customer App)
    const existing = finalTargets.get(uid);
    if (!existing || p.role === 'staff' || (p.role === 'vendor' && existing.role === 'customer')) {
      finalTargets.set(uid, { ...p, userIds: p.userId });
    }
  });

  await sendRoleNotifications(Array.from(finalTargets.values()));

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

  // 🛡️ TIME GUARD: Cannot reschedule after start time
  const now = moment().tz('Asia/Kolkata');
  const originalStart = moment(booking.startTime).tz('Asia/Kolkata');
  if (now.isSameOrAfter(originalStart)) {
    throw new Error('This booking has already started and can no longer be rescheduled.');
  }

  // 🛡️ SECURITY GUARD: Block customer-initiated reschedule if vendor is not active
  if (actorRole === 'customer') {
    const vendor = await Vendor.findById(booking.vendorId);
    if (!vendor || vendor.status !== 'active' || vendor.isActive === false) {
      throw new Error('This partner is currently not accepting reschedule requests (Account Inactive)');
    }
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
    throw new Error('Booking session timed out. Please select the slot again.');
  }

  const existingAtNewTime = await Booking.findOne({
    staffId: resolvedStaffId,
    _id: { $ne: bookingId },
    status: { $ne: 'cancelled' },
    startTime: start.toDate()
  });

  if (existingAtNewTime) throw new Error('New slot occupied');

  const oldTime = moment(booking.startTime).tz('Asia/Kolkata').format('D MMMM YYYY, h:mm A');
  const originalStaffId = booking.staffId;
  const serviceIds = (booking.services || []).map((service) => service.serviceId).filter(Boolean);
  
  // 🔄 RECALCULATE PRICING: Ensure latest offers are applied during reschedule
  const { getPricingPreviewForServiceIds } = require('./offerPricingService');
  const pricingPreview = await getPricingPreviewForServiceIds(booking.vendorId._id, serviceIds, userId);

  const serviceDetails = await Service.find({
    _id: { $in: serviceIds },
    vendorId: booking.vendorId._id
  }).select('type');

  const { bookingType, resolvedServiceAddress } = resolveBookingMode(
    serviceDetails,
    newServiceAddress || booking.serviceAddress || ''
  );

  // Update Pricing & Services (Ensure offers persist)
  booking.totalPrice = pricingPreview.finalTotal;
  booking.services = booking.services.map(s => {
    const preview = (pricingPreview.services || []).find(ps => ps.serviceId.toString() === s.serviceId.toString());
    if (preview) {
      s.price = preview.finalPrice;
    }
    return s;
  });

  booking.startTime = start.toDate();
  booking.endTime = end.toDate();
  booking.staffId = resolvedStaffId;
  booking.type = bookingType;
  booking.serviceAddress = resolvedServiceAddress;
  booking.rescheduledAt = new Date();
  booking.rescheduledByRole = actorRole;
  await booking.save();

  await SlotLock.deleteOne({ _id: lock._id });

  const notificationTargets = new Map();
  const addTarget = (uid, payload) => {
    if (!uid) return;
    const existing = notificationTargets.get(uid.toString());
    // Priority: Staff > Vendor > Customer
    if (!existing || payload.role === 'staff' || (payload.role === 'vendor' && existing.role === 'customer')) {
      notificationTargets.set(uid.toString(), payload);
    }
  };

  const rescheduleMsg = `Appointment at ${booking.vendorId.shopName} moved from ${oldTime} to ${start.tz('Asia/Kolkata').format('D MMMM YYYY, h:mm A')}.`;

  // 1. Customer
  addTarget(booking.userId, {
    userIds: booking.userId,
    role: 'customer',
    type: 'BOOKING_RESCHEDULED',
    title: 'Booking Rescheduled',
    message: rescheduleMsg,
    data: { bookingId: booking._id },
    referenceId: `${booking._id}_RESCHED_EVENT`
  });

  // 2. Vendor Owner
  addTarget(booking.vendorId.ownerId, {
    userIds: booking.vendorId.ownerId,
    role: 'vendor',
    type: 'BOOKING_RESCHEDULED',
    title: 'Booking Rescheduled',
    message: rescheduleMsg,
    data: { bookingId: booking._id },
    referenceId: `${booking._id}_RESCHED_EVENT`
  });

  // 3. Staff (New/Current)
  const staff = await Staff.findById(resolvedStaffId);
  const staffTargetId = getStaffNotificationTarget(staff);
  if (staffTargetId) {
    addTarget(staffTargetId, {
      userIds: staffTargetId,
      role: 'staff',
      type: 'BOOKING_RESCHEDULED',
      title: 'Booking Accepted (Rescheduled)',
      message: `Your assignment for ${booking.walkInCustomerName || 'Client'} moved from ${oldTime} to ${start.format('D MMMM YYYY, h:mm A')}.`,
      data: { bookingId: booking._id },
      referenceId: `${booking._id}_RESCHED_EVENT`
    });
  }

  // 4. Old Staff (If changed, notify them they are unassigned)
  if (originalStaffId.toString() !== resolvedStaffId.toString()) {
    const oldStaff = await Staff.findById(originalStaffId);
    const oldStaffTargetId = getStaffNotificationTarget(oldStaff);
    if (oldStaffTargetId && oldStaffTargetId.toString() !== staffTargetId?.toString()) {
      const oldStaffIdStr = oldStaffTargetId.toString();
      if (!notificationTargets.has(oldStaffIdStr)) {
        notificationTargets.set(oldStaffIdStr, {
          userIds: oldStaffTargetId,
          role: 'staff',
          type: 'STAFF_UNASSIGNED',
          title: 'Assignment Removed',
          message: `Booking for ${oldTime} has been rescheduled and assigned to someone else.`,
          data: { bookingId: booking._id },
          referenceId: `${booking._id}_UNASSIGN`
        });
      }
    }
  }

  await sendRoleNotifications(Array.from(notificationTargets.values()));

  return booking;
};

module.exports = {
  finalizeBooking,
  cancelBooking,
  emergencyCancelBooking,
  markBookingComplete,
  rescheduleBooking
};
