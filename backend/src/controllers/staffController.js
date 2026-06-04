const { 
  onboardStaff, 
  ensureOwnerStaff,
  getVendorStaff, 
  updateStaff, 
  softDeleteStaff 
} = require('../services/staffService');
const Staff = require('../models/Staff');
const Service = require('../models/Service');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const StaffAvailability = require('../models/StaffAvailability');
const Booking = require('../models/Booking');
const WalletTransaction = require('../models/WalletTransaction');
const moment = require('moment-timezone');
const NotificationService = require('../services/notificationService');

const getStaffNotificationTarget = (staff) => staff?.userId || staff?._id || null;

const rejectHomeServicePartnerStaffAccess = (req, res) => {
  if (req.vendor && (req.vendor.serviceMode || 'shop') === 'home') {
    res.status(403).json({ message: 'Only shop partners can manage staff' });
    return true;
  }
  return false;
};

const addStaff = async (req, res) => {
  try {
    if (rejectHomeServicePartnerStaffAccess(req, res)) return;
    const { name, phone, services, designation } = req.body;

    // Validate services is not empty (already in model but good for early 400)
    const serviceArray = typeof services === 'string' ? JSON.parse(services) : services;
    if (!serviceArray || serviceArray.length === 0) {
      return res.status(400).json({ message: 'Staff must have at least one assigned service' });
    }

    let imageUrl = '';
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'staff' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    const staff = await onboardStaff(req.vendor._id, {
      name,
      phone,
      services: serviceArray,
      image: imageUrl,
      designation: designation || 'Staff'
    });

    if (getStaffNotificationTarget(staff)) {
      await NotificationService.sendNotification({
        userIds: getStaffNotificationTarget(staff),
        role: 'staff',
        type: 'INFO',
        title: 'Staff Access Ready',
        message: `Your staff account for ${req.vendor.shopName} is ready. You can now log in and manage your assignments.`,
        data: { isActionable: false },
        referenceId: `STAFF_CREATED_${staff._id}_${Date.now()}`
      });
    }

    res.status(201).json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

const listStaff = async (req, res) => {
  try {
    if (rejectHomeServicePartnerStaffAccess(req, res)) return;
    const vendorId = req.vendor?._id || req.query.vendorId;
    if (!vendorId) return res.status(400).json({ message: 'VendorId required' });

    await ensureOwnerStaff(vendorId);
    const staff = await getVendorStaff(vendorId, req.query.includeInactive === 'true');
    
    if (staff.length === 0) {
      return res.status(200).json([]);
    }

    const staffIds = staff.map(s => s._id);

    // 1. Bulk fetch earnings stats for all staff
    const stats = await Booking.aggregate([
      { $match: { staffId: { $in: staffIds }, status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: '$staffId', total: { $sum: '$totalPrice' } } }
    ]);
    const statsMap = stats.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.total;
      return acc;
    }, {});

    // 2. Bulk fetch active closures for all staff
    const StaffClosure = require('../models/StaffClosure');
    const now = new Date();
    const activeClosures = await StaffClosure.find({
      staffId: { $in: staffIds },
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gt: now }
    }).lean();
    const closureMap = activeClosures.reduce((acc, curr) => {
      acc[curr.staffId.toString()] = curr;
      return acc;
    }, {});

    // 3. Bulk fetch availability if date is provided
    let availabilityMap = {};
    const { date } = req.query;
    if (date) {
      const moment = require('moment-timezone');
      const day = moment.tz(date, 'Asia/Kolkata').startOf('day');
      const start = day.toDate();
      const end = day.clone().add(1, 'day').toDate();
      
      const availabilities = await StaffAvailability.find({
        staffId: { $in: staffIds },
        date: { $gte: start, $lt: end }
      });
      
      availabilityMap = availabilities.reduce((acc, curr) => {
        if (!curr.workingHours || curr.workingHours.length === 0) {
          acc[curr.staffId.toString()] = true;
        }
        return acc;
      }, {});
    }

    const finalizedStaff = staff.map(s => {
      const sObj = s.toObject();
      const sId = s._id.toString();
      return {
        ...sObj,
        totalEarnings: statsMap[sId] || 0,
        isOffDay: !!availabilityMap[sId],
        activeClosure: closureMap[sId] || null
      };
    });

    res.status(200).json(finalizedStaff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const patchStaff = async (req, res) => {
  try {
    if (rejectHomeServicePartnerStaffAccess(req, res)) return;
    const updateData = { ...req.body };

    if (req.body.services) {
      updateData.services = typeof req.body.services === 'string' 
        ? JSON.parse(req.body.services) 
        : req.body.services;
    }

    if (updateData.image === '{}' || updateData.image === '[object Object]' || typeof updateData.image === 'object') {
      delete updateData.image;
    }
    // ensure image is a string if it exists
    if (updateData.image && typeof updateData.image !== 'string') {
      delete updateData.image;
    }

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'staff' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      updateData.image = result.secure_url;
    }

    const staff = await updateStaff(req.vendor._id, req.params.id, updateData);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    if (getStaffNotificationTarget(staff)) {
      await NotificationService.sendNotification({
        userIds: getStaffNotificationTarget(staff),
        role: 'staff',
        type: 'INFO',
        title: 'Staff Profile Updated',
        message: 'Your staff profile or assigned services were updated by the partner.',
        data: { isActionable: false },
        referenceId: `STAFF_UPDATED_${staff._id}_${Date.now()}`
      });
    }

    res.status(200).json(staff);
  } catch (error) {
    console.error('[patchStaff Error]', error);
    res.status(500).json({ message: error.message });
  }
};

const getStaffById = async (req, res) => {
  try {
    const Staff = require('../models/Staff');
    const Booking = require('../models/Booking');
    const staff = await Staff.findById(req.params.id).populate('services');
    if (!staff || (!staff.isActive && req.user?.role !== 'vendor')) {
      return res.status(404).json({ message: 'Staff member not found or inactive' });
    }

    // Calculate earnings for this staff member
    const matchQuery = { staffId: staff._id, status: { $in: ['confirmed', 'completed'] } };
    const { startDate, endDate } = req.query;
    if (startDate && endDate) {
      const moment = require('moment-timezone');
      const start = moment.tz(startDate, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day').toDate();
      const end = moment.tz(endDate, 'YYYY-MM-DD', 'Asia/Kolkata').endOf('day').toDate();
      matchQuery.startTime = { $gte: start, $lte: end };
    }

    const earningsResult = await Booking.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$staffId', total: { $sum: '$totalPrice' } } }
    ]);

    const StaffClosure = require('../models/StaffClosure');
    const now = new Date();
    const activeClosure = await StaffClosure.findOne({
      staffId: staff._id,
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gt: now }
    }).lean();

    const staffObj = staff.toObject();
    staffObj.totalEarnings = earningsResult[0]?.total || 0;
    staffObj.activeClosure = activeClosure || null;

    res.status(200).json(staffObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteStaff = async (req, res) => {
  try {
    if (rejectHomeServicePartnerStaffAccess(req, res)) return;

    const StaffClosure = require('../models/StaffClosure');
    const StaffAvailability = require('../models/StaffAvailability');

    const staff = await Staff.findOne({ _id: req.params.id, vendorId: req.vendor._id });
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });

    // 🛡️ Guard: Cannot delete the owner staff card
    if (staff.isOwner) {
      return res.status(400).json({ message: 'The shop owner card cannot be deleted.' });
    }

    // 🔄 Reassign upcoming confirmed or pending bookings to the canonical Owner staff
    const ownerStaff = await ensureOwnerStaff(req.vendor._id);
    if (ownerStaff) {
      await Booking.updateMany(
        { 
          staffId: staff._id, 
          status: { $in: ['pending', 'confirmed'] }, 
          startTime: { $gte: new Date() } 
        },
        { $set: { staffId: ownerStaff._id } }
      );
    }

    // 🧼 Cascading Deletions (Hard Delete)
    await Promise.all([
      // 1. Delete associated User document to prevent any future login
      staff.userId ? User.findByIdAndDelete(staff.userId) : Promise.resolve(),
      // 2. Delete availability tables
      StaffAvailability.deleteMany({ staffId: staff._id }),
      // 3. Delete closure history
      StaffClosure.deleteMany({ staffId: staff._id }),
      // 4. Delete the staff profile itself
      Staff.findByIdAndDelete(staff._id)
    ]);

    res.status(200).json({ message: 'Staff permanently deleted and account removed successfully.', staffId: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStaffProfile = async (req, res) => {
  try {
    const authUserId = req.user?._id || req.staff?.userId || null;
    const authStaffId = req.staff?._id || null;

    if (!authUserId && !authStaffId) {
       return res.status(401).json({ message: 'Authentication context missing' });
    }

    const staffQuery = authStaffId ? { _id: authStaffId } : { userId: authUserId };
    let staff = await Staff.findOne(staffQuery)
      .populate('userId', 'image name')
      .populate('services')
      .populate({
        path: 'vendorId',
        select: 'shopName ownerId address',
        populate: { path: 'ownerId', select: 'name phone' }
      });

    // 📸 IMAGE FALLBACK: Ensure the best image (Staff or User) is returned
    if (staff && !staff.image && staff.userId?.image) {
      staff.image = staff.userId.image;
    }

    // 🩹 Auto-Heal: If not found by userId, try phone (Handles seeded/detached staff test cases)
    if (!staff && req.user && req.user.phone) {
      const detachedStaff = await Staff.findOne({ phone: req.user.phone });
      if (detachedStaff) {
        detachedStaff.userId = req.user._id;
        await detachedStaff.save();
        
        // Re-fetch populated after healing
        staff = await Staff.findOne({ _id: detachedStaff._id })
          .populate('services')
          .populate({
            path: 'vendorId',
            select: 'shopName ownerId address',
            populate: { path: 'ownerId', select: 'name phone' }
          });
      }
    }

    console.log('[DEBUG] Staff record found:', staff ? 'Yes' : 'No');

    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not linked to this user account' });
    }

    res.status(200).json(staff);
  } catch (error) {
    console.error('[StaffProfile-Fatal-Error]', error);
    res.status(500).json({ 
      message: 'Staff profile lookup failed', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const resolveAuthenticatedStaff = async (req) => {
  const authUserId = req.user?._id || req.staff?.userId || null;
  const authStaffId = req.staff?._id || null;

  if (!authUserId && !authStaffId) return null;

  const staffQuery = authStaffId ? { _id: authStaffId } : { userId: authUserId };
  let staff = await Staff.findOne(staffQuery).populate('vendorId', 'shopName ownerId');

  if (!staff && req.user?.phone) {
    const detachedStaff = await Staff.findOne({ phone: req.user.phone });
    if (detachedStaff) {
      detachedStaff.userId = req.user._id;
      await detachedStaff.save();
      staff = await Staff.findById(detachedStaff._id).populate('vendorId', 'shopName ownerId');
    }
  }

  return staff;
};

const getStaffHistory = async (req, res) => {
  try {
    const staff = await resolveAuthenticatedStaff(req);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not linked to this user account' });
    }

    const period = String(req.query.period || 'week').toLowerCase();
    const dateValue = req.query.date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');

    let start = moment.tz('Asia/Kolkata');
    let end = moment.tz('Asia/Kolkata');

    if (period === 'month') {
      start = start.startOf('month');
      end = end.endOf('month');
    } else if (period === 'date') {
      start = moment.tz(dateValue, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day');
      end = start.clone().endOf('day');
    } else if (period === 'custom') {
      const sVal = req.query.startDate || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
      const eVal = req.query.endDate || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
      start = moment.tz(sVal, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day');
      end = moment.tz(eVal, 'YYYY-MM-DD', 'Asia/Kolkata').endOf('day');
    } else {
      start = start.startOf('week');
      end = end.endOf('week');
    }

    const [bookings, completedBookings] = await Promise.all([
      Booking.find({
        staffId: staff._id,
        startTime: { $gte: start.toDate(), $lte: end.toDate() }
      })
        .populate('vendorId', 'shopName')
        .sort({ startTime: -1 })
        .lean(),
      Booking.find({
        staffId: staff._id,
        status: 'completed',
        completedAt: { $gte: start.toDate(), $lte: end.toDate() }
      })
        .sort({ completedAt: -1 })
        .lean()
    ]);

    const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    res.status(200).json({
      period,
      date: dateValue,
      range: {
        from: start.toDate(),
        to: end.toDate()
      },
      summary: {
        totalBookings: bookings.length,
        completedBookings: completedBookings.length,
        totalEarnings
      },
      bookings: bookings.map((booking) => ({
        _id: booking._id,
        status: booking.status,
        startTime: booking.startTime,
        completedAt: booking.completedAt,
        totalPrice: booking.totalPrice,
        totalDuration: booking.totalDuration,
        serviceType: booking.type || 'shop',
        services: booking.services || [],
        shopName: booking.vendorId?.shopName || staff.vendorId?.shopName || 'Partner Shop'
      })),
      earnings: completedBookings.map((b) => ({
        _id: b._id,
        amount: b.totalPrice || 0,
        description: `Service: ${b.services?.map(s => s.name).join(', ') || 'Service Completed'}`,
        timestamp: b.completedAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const buildDayRange = (dateValue) => {
  const day = moment.tz(dateValue, 'Asia/Kolkata').startOf('day');
  return {
    start: day.toDate(),
    end: day.clone().add(1, 'day').toDate(),
    day
  };
};

const normalizeAvailabilityPayload = (body = {}) => {
  const useVendorHours = body.useVendorHours === true || body.useVendorHours === 'true';
  const isOffDay = body.isOffDay === true || body.isOffDay === 'true';
  const startTime = body.startTime || '';
  const endTime = body.endTime || '';
  const breakStart = body.breakStart || '';
  const breakEnd = body.breakEnd || '';

  if (useVendorHours) {
    return { useVendorHours: true, workingHours: [], slots: [] };
  }

  if (isOffDay) {
    return { useVendorHours: false, workingHours: [], slots: [] };
  }

  if (!startTime || !endTime) {
    throw new Error('Start and end time are required');
  }

  const workingHours = [];
  if (breakStart && breakEnd) {
    workingHours.push({ startTime, endTime: breakStart });
    workingHours.push({ startTime: breakEnd, endTime });
  } else {
    workingHours.push({ startTime, endTime });
  }

  return { useVendorHours: false, workingHours, slots: [] };
};

const getStaffAvailabilityForDate = async (req, res) => {
  try {
    if (rejectHomeServicePartnerStaffAccess(req, res)) return;
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const staff = await Staff.findOne({ _id: req.params.id, vendorId: req.vendor._id });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    const { start, end } = buildDayRange(date);
    const record = await StaffAvailability.findOne({
      staffId: staff._id,
      date: { $gte: start, $lt: end }
    }).lean();

    if (!record) {
      return res.status(200).json({
        date,
        useVendorHours: true,
        isOffDay: false,
        startTime: '',
        endTime: '',
        breakStart: '',
        breakEnd: ''
      });
    }

    const windows = record.workingHours || [];
    const isOffDay = windows.length === 0;
    const firstWindow = windows[0] || {};
    const secondWindow = windows[1] || {};

    res.status(200).json({
      date,
      useVendorHours: false,
      isOffDay,
      startTime: firstWindow.startTime || '',
      endTime: secondWindow.endTime || firstWindow.endTime || '',
      breakStart: windows.length > 1 ? firstWindow.endTime || '' : '',
      breakEnd: windows.length > 1 ? secondWindow.startTime || '' : ''
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const upsertStaffAvailabilityForDate = async (req, res) => {
  try {
    if (rejectHomeServicePartnerStaffAccess(req, res)) return;
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const staff = await Staff.findOne({ _id: req.params.id, vendorId: req.vendor._id });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    const { start, end, day } = buildDayRange(date);
    const normalized = normalizeAvailabilityPayload(req.body);

    if (normalized.useVendorHours) {
      await StaffAvailability.deleteMany({
        staffId: staff._id,
        date: { $gte: start, $lt: end }
      });
      return res.status(200).json({
        message: 'Staff availability reset to vendor working hours',
        date,
        useVendorHours: true,
        isOffDay: false
      });
    }

    const record = await StaffAvailability.findOneAndUpdate(
      {
        staffId: staff._id,
        date: { $gte: start, $lt: end }
      },
      {
        $set: {
          staffId: staff._id,
          date: day.toDate(),
          workingHours: normalized.workingHours,
          slots: normalized.slots
        }
      },
      {
        returnDocument: 'after',
        upsert: true,
        runValidators: true
      }
    );

    res.status(200).json({
      message: 'Staff availability updated',
      record
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const createStaffManualBooking = async (req, res) => {
  try {
    const staff = await resolveAuthenticatedStaff(req);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not linked to this user account' });
    }

    const { name, phone, serviceIds, startTime } = req.body;

    if (!name || !serviceIds || !serviceIds.length || !startTime) {
      return res.status(400).json({ message: 'Missing required fields: name, serviceIds, startTime' });
    }

    const vendorId = staff.vendorId?._id || staff.vendorId;
    if (!vendorId) {
      return res.status(400).json({ message: 'Staff is not linked to any vendor' });
    }

    // Only allow services that belong to this vendor AND are assigned to this staff
    const assignedServiceIds = (staff.services || []).map(s => String(s._id || s));
    const validIds = serviceIds.filter(id => assignedServiceIds.includes(String(id)));

    const services = await Service.find({ _id: { $in: validIds }, vendorId });
    if (services.length === 0) {
      return res.status(404).json({ message: 'No valid assigned services found' });
    }

    const totalDuration = services.reduce((acc, s) => acc + (s.duration || 0) + (s.bufferTime || 0), 0);
    const totalPrice = services.reduce((acc, s) => acc + (s.price || 0), 0);
    const endTime = moment(startTime).add(totalDuration, 'minutes').toDate();

    // Conflict check
    const existing = await Booking.findOne({
      staffId: staff._id,
      status: { $ne: 'cancelled' },
      startTime: { $lt: endTime },
      endTime: { $gt: new Date(startTime) }
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have a booking at this time' });
    }

    const booking = await Booking.create({
      vendorId,
      staffId: staff._id,
      isWalkIn: true,
      walkInCustomerName: name,
      walkInCustomerPhone: phone || '',
      services: services.map(s => ({ serviceId: s._id, name: s.name, price: s.price, duration: s.duration })),
      totalPrice,
      totalDuration,
      startTime: new Date(startTime),
      endTime,
      type: 'shop',
      status: 'confirmed'
    });

    // Notify vendor owner
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findById(vendorId).select('ownerId shopName');
    if (vendor?.ownerId) {
      await NotificationService.sendNotification({
        userIds: vendor.ownerId,
        role: 'vendor',
        type: 'NEW_BOOKING',
        title: 'New Appointment Booked',
        message: `${staff.name} scheduled a new appointment for ${name}. Services: ${services.map(s => s.name).join(', ')}.`,
        data: { bookingId: booking._id },
        referenceId: `${booking._id}_STAFF_MANUAL`
      });
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addStaff,
  listStaff,
  patchStaff,
  deleteStaff,
  getStaffById,
  getStaffProfile,
  getStaffHistory,
  getStaffAvailabilityForDate,
  upsertStaffAvailabilityForDate,
  createStaffManualBooking,
};
