const Vendor = require('../models/Vendor');
const VendorClosure = require('../models/VendorClosure');
const SlotLock = require('../models/SlotLock');
const moment = require('moment-timezone');
const {
  normalizeClosureWindow,
  getOverlappingClosures,
  getImpactedBookings
} = require('../services/vendorClosureService');

const getVendorContext = async (userId) => {
  const vendor = await Vendor.findOne({ ownerId: userId });
  if (!vendor) {
    throw new Error('Vendor not found');
  }
  return vendor;
};

const hasLiveClosureAtTime = async (vendorId, referenceTime, excludeClosureId = null) => {
  const query = {
    vendorId,
    status: 'active',
    startTime: { $lte: referenceTime },
    endTime: { $gt: referenceTime }
  };

  if (excludeClosureId) {
    query._id = { $ne: excludeClosureId };
  }

  return VendorClosure.exists(query);
};

const mapClosureResponse = async (closure, vendor) => {
  const impactedBookings = await getImpactedBookings(
    vendor._id,
    closure.startTime,
    closure.endTime
  );

  return {
    closure,
    vendor: {
      _id: vendor._id,
      shopName: vendor.shopName,
      address: vendor.address
    },
    impactedBookings
  };
};

const previewClosure = async (req, res) => {
  try {
    const vendor = await getVendorContext(req.user._id);
    const { startTime, endTime, reason } = req.body;
    const { start, end } = normalizeClosureWindow(startTime, endTime);
    const overlappingClosures = await getOverlappingClosures(vendor._id, start, end);
    const impactedBookings = await getImpactedBookings(vendor._id, start, end);

    res.status(200).json({
      closure: {
        startTime: start.toDate(),
        endTime: end.toDate(),
        reason: reason?.trim() || ''
      },
      vendor: {
        _id: vendor._id,
        shopName: vendor.shopName,
        address: vendor.address
      },
      impactedBookings,
      conflicts: overlappingClosures
    });
  } catch (error) {
    const status = error.message === 'Vendor not found' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

const createClosure = async (req, res) => {
  try {
    const vendor = await getVendorContext(req.user._id);
    const { startTime, endTime, reason } = req.body;
    const { start, end } = normalizeClosureWindow(startTime, endTime);
    const overlappingClosures = await getOverlappingClosures(vendor._id, start, end);

    if (overlappingClosures.length > 0) {
      return res.status(409).json({
        message: 'An overlapping emergency closure already exists',
        conflicts: overlappingClosures
      });
    }

    const closure = await VendorClosure.create({
      vendorId: vendor._id,
      createdBy: req.user._id,
      startTime: start.toDate(),
      endTime: end.toDate(),
      reason: reason?.trim() || '',
      previousIsShopOpen: vendor.isShopOpen
    });

    // 🔒 Clear SlotLocks in range
    await SlotLock.deleteMany({
      vendorId: vendor._id,
      startTime: { $lt: end.toDate() },
      endTime: { $gt: start.toDate() }
    });

    // ⚡ Auto-Cancel Impacted Bookings for the whole shop
    const { emergencyCancelBooking } = require('../services/bookingService');
    const impacted = await getImpactedBookings(vendor._id, start, end);
    let cancelledCount = 0;

    for (const booking of impacted) {
      try {
        await emergencyCancelBooking(req.user._id, booking._id, reason || 'Shop temporarily closed (Emergency)', closure._id);
        cancelledCount++;
      } catch (err) {
        console.error(`[VendorClosure] Failed to auto-cancel booking ${booking._id}:`, err.message);
      }
    }

    const now = new Date();
    const isLiveNow = start.toDate() <= now && end.toDate() > now;
    if (isLiveNow) {
      vendor.isShopOpen = false;
      await vendor.save();
    }

    const response = await mapClosureResponse(closure, vendor);
    res.status(201).json({ ...response, cancelledCount });
  } catch (error) {
    const status = error.message === 'Vendor not found' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

const listActiveClosures = async (req, res) => {
  try {
    const vendor = await getVendorContext(req.user._id);
    const now = new Date();
    const closures = await VendorClosure.find({
      vendorId: vendor._id,
      status: 'active',
      endTime: { $gt: now }
    }).sort({ startTime: 1 });

    const payload = await Promise.all(
      closures.map((closure) => mapClosureResponse(closure, vendor))
    );

    res.status(200).json(payload);
  } catch (error) {
    const status = error.message === 'Vendor not found' ? 404 : 500;
    res.status(status).json({ message: error.message });
  }
};

const endClosure = async (req, res) => {
  try {
    const vendor = await getVendorContext(req.user._id);
    const closure = await VendorClosure.findOne({
      _id: req.params.id,
      vendorId: vendor._id,
      status: 'active'
    });

    if (!closure) {
      return res.status(404).json({ message: 'Active closure not found' });
    }

    const now = new Date();
    closure.status = now < closure.endTime ? 'cancelled' : 'completed';
    closure.endedAt = now;
    if (now < closure.endTime) {
      closure.endTime = now;
    }
    await closure.save();

    const hasAnotherLiveClosure = await hasLiveClosureAtTime(vendor._id, now, closure._id);
    const nowInIndia = moment(now).tz('Asia/Kolkata');
    const isClosedDateToday = vendor.closedDates?.some((date) =>
      moment(date).tz('Asia/Kolkata').isSame(nowInIndia, 'day')
    );
    const shouldRestoreShopOpen =
      !hasAnotherLiveClosure &&
      !vendor.isClosedToday &&
      !isClosedDateToday &&
      (
        closure.previousIsShopOpen === true ||
        (closure.previousIsShopOpen === undefined && vendor.isShopOpen === false)
      );

    if (shouldRestoreShopOpen) {
      vendor.isShopOpen = true;
      await vendor.save();
    }

    res.status(200).json({
      message: 'Emergency closure ended successfully',
      closure,
      shopStatus: {
        isShopOpen: vendor.isShopOpen
      }
    });
  } catch (error) {
    const status = error.message === 'Vendor not found' ? 404 : 500;
    res.status(status).json({ message: error.message });
  }
};

module.exports = {
  previewClosure,
  createClosure,
  listActiveClosures,
  endClosure
};
