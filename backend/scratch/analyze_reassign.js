const mongoose = require('mongoose');
require('dotenv').config();

const analyze = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Vendor = require('../src/models/Vendor');
    const Staff = require('../src/models/Staff');
    const Booking = require('../src/models/Booking');

    const vendor = await Vendor.findOne({ shopName: /suzal/i });
    if (!vendor) { console.log('Vendor not found'); process.exit(1); }
    console.log(`VENDOR: ${vendor.shopName} (${vendor._id})\n`);

    const allStaff = await Staff.find({ vendorId: vendor._id, isActive: true }).lean();
    console.log(`=== ALL ACTIVE STAFF (${allStaff.length}) ===`);
    allStaff.forEach(s => {
      console.log(`  ${s.name} | _id: ${s._id} | services: [${(s.services||[]).map(id=>id.toString()).join(', ')}]`);
    });

    const bookings = await Booking.find({ 
      vendorId: vendor._id, 
      status: { $in: ['confirmed', 'pending'] }
    }).populate('staffId', 'name').lean();

    console.log(`\n=== ACTIVE BOOKINGS (${bookings.length}) ===`);
    for (const b of bookings) {
      console.log(`\nBooking ${b._id}`);
      console.log(`  Current staff: ${b.staffId?.name || b.staffId}`);
      console.log(`  Start: ${new Date(b.startTime).toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})}`);
      
      // SIMULATE the exact code in autoReassignOrCancelImpactedBookings
      const currentStaffId = b.staffId?._id?.toString() || b.staffId?.toString();
      
      // This is the key line — serviceId is NOT populated, it's a raw ObjectId
      const requiredServiceIds = (b.services || []).map(s => {
        const id1 = s.serviceId?._id?.toString(); // Will be undefined (not populated)
        const id2 = s.serviceId?.toString();       // This should work
        console.log(`  Service check: serviceId raw=${s.serviceId}, _id=${id1}, toString=${id2}`);
        return (s.serviceId?._id || s.serviceId)?.toString();
      }).filter(Boolean);

      console.log(`  Required service IDs: [${requiredServiceIds.join(', ')}]`);

      if (requiredServiceIds.length === 0) {
        console.log(`  ⚠️  requiredServiceIds is EMPTY — this is why no staff match is possible!`);
      }

      for (const staff of allStaff) {
        if (staff._id.toString() === currentStaffId) {
          console.log(`  ${staff.name}: SKIP (current staff)`);
          continue;
        }
        const staffServiceIds = (staff.services || []).map(id => id.toString());
        const supportsAll = requiredServiceIds.every(sid => staffServiceIds.includes(sid));
        console.log(`  ${staff.name}: staffServices=[${staffServiceIds.join(', ')}] | supportsAll=${supportsAll}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

analyze();
