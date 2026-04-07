const { 
  onboardStaff, 
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
const moment = require('moment-timezone');

const addStaff = async (req, res) => {
  try {
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

    res.status(201).json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

const listStaff = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.query.vendorId;
    if (!vendorId) return res.status(400).json({ message: 'VendorId required' });

    let staff = await getVendorStaff(vendorId, req.query.includeInactive === 'true');
    
    // 🛡️ FALLBACK: If vendor has 0 staff, auto-create a 'Self' record for the vendor
    if (staff.length === 0) {
      console.log(`[DEBUG] No staff found for vendor ${vendorId}, checking services.`);
      const Vendor = require('../models/Vendor');
      const Service = require('../models/Service');
      const vendor = await Vendor.findById(vendorId);
      const allServices = await Service.find({ vendorId });
      
      // We can only create a staff if at least one service exists (due to validator)
      if (allServices.length > 0) {
        const selfStaff = await onboardStaff(vendorId, {
          name: `${vendor.shopName} (Owner)`,
          phone: vendor?.phone || '0000000000',
          password: 'SELF_MANAGED', 
          services: allServices.map(s => s._id),
          isOwner: true
        });
        staff = [selfStaff];
      }
    }

    // 💰 ENRICHMENT: Calculate Total Earnings for each staff
    const Booking = require('../models/Booking');
    const enrichedStaff = await Promise.all(staff.map(async (s) => {
      const stats = await Booking.aggregate([
        { $match: { staffId: s._id, status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]);
      return {
        ...s.toObject(),
        totalEarnings: stats[0]?.total || 0
      };
    }));

    res.status(200).json(enrichedStaff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const patchStaff = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.body.services) {
      updateData.services = typeof req.body.services === 'string' 
        ? JSON.parse(req.body.services) 
        : req.body.services;
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
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStaffById = async (req, res) => {
  try {
    const Staff = require('../models/Staff');
    const staff = await Staff.findById(req.params.id).populate('services');
    if (!staff || (!staff.isActive && req.user?.role !== 'vendor')) {
      return res.status(404).json({ message: 'Staff member not found or inactive' });
    }
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const staff = await softDeleteStaff(req.vendor._id, req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.status(200).json({ message: 'Staff deactivated successfully', staff });
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
        new: true,
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

module.exports = {
  addStaff,
  listStaff,
  patchStaff,
  deleteStaff,
  getStaffById,
  getStaffProfile,
  getStaffAvailabilityForDate,
  upsertStaffAvailabilityForDate,
};
