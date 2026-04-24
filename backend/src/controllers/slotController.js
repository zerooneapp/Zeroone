const { 
  calculateAvailableSlots, 
  normalizeToGrid, 
  findFirstAvailableStaff 
} = require('../services/slotService');
const SlotLock = require('../models/SlotLock');
const moment = require('moment-timezone');

// Simple In-memory Cache (Should use Redis for production scaling)
const slotCache = new Map();

const getAvailableSlots = async (req, res) => {
  try {
    const { vendorId, serviceIds, date, excludeBookingId } = req.query;
    if (!vendorId || !serviceIds || !date) {
      return res.status(400).json({ message: 'vendorId, serviceIds, and date are required' });
    }

    const services = Array.isArray(serviceIds) 
      ? serviceIds 
      : (typeof serviceIds === 'string' ? serviceIds.split(',').map(id => id.trim()) : [serviceIds]);
    
    // Cache Key: vendorId:date:serviceIds_hash
    const cacheKey = `${vendorId}:${date}:${services.sort().join(',')}`;
    
    // Clear cache if needed (for development/new format)
    // slotCache.delete(cacheKey); 
    // CACHE DISABLED TEMPORARILY FOR LOGIC UPDATES
    /*
    if (slotCache.has(cacheKey)) {
      const cached = slotCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5-minute TTL
        return res.status(200).json(cached.data);
      }
    }
    */

    const slots = await calculateAvailableSlots(vendorId, services, date, excludeBookingId);
    
    // Store in Cache
    slotCache.set(cacheKey, { data: slots, timestamp: Date.now() });

    res.status(200).json({ availableSlots: slots });
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

    const normalizedStart = normalizeToGrid(startTime);
    const end = normalizedStart.clone().add(realDuration, 'minutes');

    // 1. Identify a free staff member for this specific slot
    const staff = await findFirstAvailableStaff(
      vendorId, 
      services, 
      normalizedStart.toDate(), 
      end.toDate(),
      staffId,
      excludeBookingId
    );

    if (!staff) {
      return res.status(400).json({ message: 'Slot is no longer available' });
    }

    // 2. User Restriction: One active lock per user per vendor
    await SlotLock.deleteMany({ userId: req.user._id, vendorId });

    // 3. Create Lock
    try {
      const lock = await SlotLock.create({
        userId: req.user._id,
        vendorId,
        staffId: staff._id,
        startTime: normalizedStart.toDate(),
        endTime: end.toDate(),
        expiresAt: moment().add(5, 'minutes').toDate(),
      });

      res.status(200).json({ message: 'Slot locked for 5 minutes', lock });
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
