
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const Vendor = require('../src/models/Vendor');
const Staff = require('../src/models/Staff');

async function check() {
  try {
    await mongoose.connect('mongodb+srv://zerooneappinfo_db_user:8xR09oSOETAW3pZh@cluster0.djq3ivp.mongodb.net/ZeroOne');
    // Search for vendor by phone or shop name
    const vendor = await Vendor.findOne({ shopName: /Glam/i });
    if (!vendor) { 
      console.log('Vendor Glam Studio not found'); 
      process.exit(); 
    }
    
    console.log('Vendor found:', vendor.shopName, 'ID:', vendor._id);

    const bookings = await Booking.find({ 
      vendorId: vendor._id, 
      status: { $in: ['confirmed', 'pending'] } 
    }).populate('staffId');
    
    console.log('--- ACTIVE BOOKINGS (' + bookings.length + ') ---');
    bookings.forEach(b => {
      console.log({
        id: b._id,
        status: b.status,
        staff: b.staffId?.name,
        staffId: b.staffId?._id,
        start: b.startTime,
        end: b.endTime
      });
    });

    const staffList = await Staff.find({ vendorId: vendor._id });
    console.log('--- STAFF LIST ---');
    staffList.forEach(s => {
      console.log({ name: s.name, id: s._id, isActive: s.isActive });
    });

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
