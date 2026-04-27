const mongoose = require('mongoose');
const User = require('./backend/src/models/User');
const Vendor = require('./backend/src/models/Vendor');
const VendorAvailability = require('./backend/src/models/VendorAvailability');
const VendorClosure = require('./backend/src/models/VendorClosure');
const Booking = require('./backend/src/models/Booking');
const moment = require('moment-timezone');

async function checkVendorSlots() {
  try {
    await mongoose.connect('mongodb+srv://admin:Zeroone%21%40%23123@cluster0.djq3ivp.mongodb.net/zeroone');
    console.log('Connected to DB');

    const user = await User.findOne({ phone: '9926833280' });
    if (!user) {
      console.log('User not found');
      return;
    }
    console.log('User ID:', user._id);

    const vendor = await Vendor.findOne({ ownerId: user._id });
    if (!vendor) {
      console.log('Vendor not found');
      return;
    }
    const vendorId = vendor._id;
    console.log('Vendor ID:', vendorId);
    console.log('Vendor Status:', vendor.status, 'isActive:', vendor.isActive);

    const targetDate = moment('2026-04-27').tz('Asia/Kolkata').startOf('day');
    console.log('Target Date:', targetDate.format());

    // 1. Check Monday Availability
    const availability = await VendorAvailability.findOne({
      vendorId,
      day: 'Mon'
    });
    console.log('Monday Availability:', availability ? (availability.isOpen ? 'Open' : 'Closed') : 'Not Set (Defaults to workingHours)');

    // 2. Check Closures
    const closures = await VendorClosure.find({
      vendorId,
      status: 'active',
      startTime: { $lt: targetDate.clone().add(1, 'day').toDate() },
      endTime: { $gt: targetDate.toDate() }
    });
    console.log('Vendor Closures for 27th:', closures.length);
    closures.forEach(c => console.log(`- From ${c.startTime} to ${c.endTime}`));

    // 3. Check Bookings
    const bookings = await Booking.find({
      vendorId,
      status: { $ne: 'cancelled' },
      startTime: { $gte: targetDate.toDate(), $lt: targetDate.clone().add(1, 'day').toDate() }
    });
    console.log('Total Bookings for 27th:', bookings.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkVendorSlots();
