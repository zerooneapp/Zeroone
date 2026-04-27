const moment = require('moment-timezone');
const Booking = require('../models/Booking');
const StaffClosure = require('../models/StaffClosure');

const normalizeClosureWindow = (startTime, endTime) => {
  const start = moment.tz(startTime, 'Asia/Kolkata').seconds(0).milliseconds(0);
  const end = moment.tz(endTime, 'Asia/Kolkata').seconds(0).milliseconds(0);

  if (!start.isValid() || !end.isValid()) {
    throw new Error('Invalid closure time window');
  }

  if (!end.isAfter(start)) {
    throw new Error('Closure end time must be after start time');
  }

  return { start, end };
};

const getOverlappingClosures = async (staffId, start, end, excludeClosureId = null) => {
  const query = {
    staffId,
    status: 'active',
    startTime: { $lt: moment(end).toDate() },
    endTime: { $gt: moment(start).toDate() }
  };

  if (excludeClosureId) {
    query._id = { $ne: excludeClosureId };
  }

  return StaffClosure.find(query).sort({ startTime: 1 });
};

const getImpactedBookings = async (staffId, start, end) => (
  Booking.find({
    staffId,
    status: { $in: ['confirmed', 'pending'] },
    startTime: { $lt: moment(end).toDate() },
    endTime: { $gt: moment(start).toDate() }
  })
    .populate('userId', 'name phone image')
    .populate('staffId', 'name image phone')
    .populate('vendorId', 'shopName address')
    .sort({ startTime: 1 })
);

const getActiveClosureWindows = async (staffId, rangeStart, rangeEnd) => {
  const start = moment(rangeStart).tz('Asia/Kolkata');
  const end = moment(rangeEnd).tz('Asia/Kolkata');

  if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
    return [];
  }

  const closures = await StaffClosure.find({
    staffId,
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
