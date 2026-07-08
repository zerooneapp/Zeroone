const { 
  calculateAvailableSlots, 
  normalizeToGrid, 
  findFirstAvailableStaff 
} = require('../services/slotService');
const SlotLock = require('../models/SlotLock');
const Vendor = require('../models/Vendor');
const moment = require('moment-timezone');

// Simple In-memory Cache (Should use Redis for production scaling)
const slotCache = new Map();

const getAvailableSlots = async (req, res) => {
  try {
    const { vendorId, serviceIds, date, excludeBookingId, includeUnavailable } = req.query;
    if (!vendorId || !serviceIds || !date) {
      return res.status(400).json({ message: 'vendorId, serviceIds, and date are required' });
    }

    const services = Array.isArray(serviceIds) 
      ? serviceIds 
      : (typeof serviceIds === 'string' ? serviceIds.split(',').map(id => id.trim()) : [serviceIds]);
    
    // Cache Key: vendorId:date:serviceIds_hash
    const cacheKey = `${vendorId}:${date}:${services.sort().join(',')}`;
    
    // Check if the selected date is a weekly off day
    const vendor = await Vendor.findById(vendorId).select('weeklyOff').lean();
    const dayOfWeek = moment.tz(date, 'Asia/Kolkata').format('ddd'); // e.g. 'Sun', 'Sat'
    const isWeeklyOff = Array.isArray(vendor?.weeklyOff) && vendor.weeklyOff.includes(dayOfWeek);

    if (isWeeklyOff) {
      return res.status(200).json({ availableSlots: [], isWeeklyOff: true });
    }

    const slots = await calculateAvailableSlots(
      vendorId, 
      services, 
      date, 
      excludeBookingId, 
      includeUnavailable === 'true'
    );
    
    // Store in Cache
    slotCache.set(cacheKey, { data: slots, timestamp: Date.now() });

    res.status(200).json({ availableSlots: slots, isWeeklyOff: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const lockSlot = async (req, res) => {
  try {
    const { vendorId, startTime, duration, serviceIds, staffId, excludeBookingId } = req.body;
    if (!vendorId || !startTime || !duration || !serviceIds) {
      return res.status(400).json({ message: 'vendorId, startTime, duration, and serviceIds are required' });
    }

    const services = Array.isArray(serviceIds) 
      ? serviceIds 
      : (typeof serviceIds === 'string' ? serviceIds.split(',').map(id => id.trim()) : [serviceIds]);

    const Service = require('../models/Service');
    const serviceDetails = await Service.find({ _id: { $in: services }, vendorId });
    if (serviceDetails.length === 0) {
       return res.status(400).json({ message: 'Selected services are invalid' });
    }
    const realDuration = serviceDetails.reduce((acc, s) => acc + (s.duration || 0) + (s.bufferTime || 0), 0);

    const normalizedStart = moment(startTime).tz('Asia/Kolkata').seconds(0).milliseconds(0);
    const end = normalizedStart.clone().add(realDuration, 'minutes');

    const actorId = req.user?._id || req.staff?.userId || req.staff?._id;
    if (!actorId) {
      return res.status(401).json({ message: 'User or Staff identity is required to lock a slot' });
    }

    // 1. User Restriction: One active lock per user per vendor (CLEAR BEFORE CHECKING)
    await SlotLock.deleteMany({ userId: actorId, vendorId });

    // 2. Identify a free staff member for this specific slot
    const staff = await findFirstAvailableStaff(
      vendorId, 
      services, 
      normalizedStart.toDate(), 
      end.toDate(),
      staffId,
      excludeBookingId,
      actorId // Pass current user to exclude their own locks
    );

    if (!staff) {
      return res.status(400).json({ message: 'Slot is no longer available' });
    }

    // 3. Create Lock
    try {
      const lock = await SlotLock.create({
        userId: actorId,
        vendorId,
        staffId: staff._id,

        startTime: normalizedStart.toDate(),
        endTime: end.toDate(),
        expiresAt: moment().add(15, 'minutes').toDate(),
      });

      res.status(200).json({ message: 'Slot reserved for 15 minutes', lock });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: 'Slot was just taken by another user. Please choose a different time.' });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAvailableSlots,
  lockSlot,
};
