const moment = require('moment-timezone');
const Booking = require('../models/Booking');
const VendorClosure = require('../models/VendorClosure');

const normalizeClosureWindow = (startTime, endTime) => {
  const start = moment(startTime).tz('Asia/Kolkata').seconds(0).milliseconds(0);
  const end = moment(endTime).tz('Asia/Kolkata').seconds(0).milliseconds(0);

  if (!start.isValid() || !end.isValid()) {
    throw new Error('Invalid closure time window');
  }

  if (!end.isAfter(start)) {
    throw new Error('Closure end time must be after start time');
  }

  return { start, end };
};

const getOverlappingClosures = async (vendorId, start, end, excludeClosureId = null) => {
  const query = {
    vendorId,
    status: 'active',
    startTime: { $lt: end.toDate() },
    endTime: { $gt: start.toDate() }
  };

  if (excludeClosureId) {
    query._id = { $ne: excludeClosureId };
  }

  return VendorClosure.find(query).sort({ startTime: 1 });
};

const getImpactedBookings = async (vendorId, start, end) => (
  Booking.find({
    vendorId,
    status: 'confirmed',
    startTime: { $lt: end.toDate() },
    endTime: { $gt: start.toDate() }
  })
    .populate('userId', 'name phone image')
    .populate('staffId', 'name image phone')
    .populate('vendorId', 'shopName address')
    .sort({ startTime: 1 })
);

const getActiveClosureWindows = async (vendorId, rangeStart, rangeEnd) => {
  const start = moment(rangeStart).tz('Asia/Kolkata');
  const end = moment(rangeEnd).tz('Asia/Kolkata');

  if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
    return [];
  }

  const closures = await VendorClosure.find({
    vendorId,
    status: 'active',
    startTime: { $lt: end.toDate() },
    endTime: { $gt: start.toDate() }
  }).lean();

  return closures.map((closure) => ({
    ...closure,
    start: moment(closure.startTime).tz('Asia/Kolkata'),
    end: moment(closure.endTime).tz('Asia/Kolkata')
  }));
};

const hasClosureOverlap = (start, end, closureWindows = []) => (
  closureWindows.some((closure) => start.isBefore(closure.end) && end.isAfter(closure.start))
);

module.exports = {
  normalizeClosureWindow,
  getOverlappingClosures,
  getImpactedBookings,
  getActiveClosureWindows,
  hasClosureOverlap
};
