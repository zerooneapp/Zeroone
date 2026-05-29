const mongoose = require('mongoose');
require('dotenv').config();

const checkBookings = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    require('../src/models/Staff');
    const Booking = require('../src/models/Booking');
    
    // Staff ID from the user screenshot URL
    const targetStaffId = '6a0aaace7c91b8f6791e38f2';
    
    const bookings = await Booking.find({}).populate('staffId', 'name isOwner');
    console.log(`Total Bookings: ${bookings.length}`);
    
    console.log(`\n--- Bookings assigned to staff: ${targetStaffId} ---`);
    const staffBookings = bookings.filter(b => b.staffId && b.staffId._id.toString() === targetStaffId);
    staffBookings.forEach((b, i) => {
      console.log(`[${i}] Date: ${b.startTime} | Status: ${b.status} | Staff: ${b.staffId.name} | Price: ₹${b.totalPrice}`);
    });
    
    console.log(`\n--- Other bookings (first 10) ---`);
    const otherBookings = bookings.filter(b => !b.staffId || b.staffId._id.toString() !== targetStaffId);
    otherBookings.slice(0, 10).forEach((b, i) => {
      console.log(`[${i}] Date: ${b.startTime} | Status: ${b.status} | Staff: ${b.staffId ? `${b.staffId.name} (${b.staffId._id})` : 'None'} | Price: ₹${b.totalPrice}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkBookings();
