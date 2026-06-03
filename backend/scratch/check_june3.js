const mongoose = require('mongoose');
require('dotenv').config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const Booking = require('../src/models/Booking');
  const SlotLock = require('../src/models/SlotLock');
  const Staff = require('../src/models/Staff');

  const start = new Date('2026-06-03T00:00:00.000Z');
  const end = new Date('2026-06-03T23:59:59.000Z');

  const bookings = await Booking.find({
    startTime: { $gte: start, $lte: end }
  }).populate('staffId', 'name');

  const locks = await SlotLock.find({
    startTime: { $gte: start, $lte: end }
  }).populate('staffId', 'name');

  console.log('--- BOOKINGS FOR JUNE 3, 2026 ---');
  bookings.forEach(b => {
    console.log(`Booking ID: ${b._id} | Staff: ${b.staffId?.name} (${b.staffId?._id}) | Start: ${b.startTime.toISOString()} | End: ${b.endTime.toISOString()} | Status: ${b.status}`);
  });

  console.log('\n--- ACTIVE LOCKS FOR JUNE 3, 2026 ---');
  locks.forEach(l => {
    console.log(`Lock ID: ${l._id} | Staff: ${l.staffId?.name} (${l.staffId?._id}) | Start: ${l.startTime.toISOString()} | End: ${l.endTime.toISOString()} | Expires: ${l.expiresAt.toISOString()}`);
  });

  process.exit(0);
};

run();
