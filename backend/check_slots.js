const mongoose = require('mongoose');
const User = require('./src/models/User');
const Vendor = require('./src/models/Vendor');
const VendorAvailability = require('./src/models/VendorAvailability');
const VendorClosure = require('./src/models/VendorClosure');
const Booking = require('./src/models/Booking');
const moment = require('moment-timezone');

async function checkVendorSlots() {
  try {
    // Using the same URI as in logs
    await mongoose.connect('mongodb+srv://zerooneappinfo_db_user:8xR09oSOETAW3pZh@cluster0.djq3ivp.mongodb.net/ZeroOne');
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
    console.log('Shop Name:', vendor.shopName);
    console.log('Vendor Status:', vendor.status, 'isActive:', vendor.isActive);
    console.log('Expiry Date:', vendor.expiryDate);
    console.log('Free Trial:', vendor.freeTrial);
    console.log('Vendor Closed Dates:', vendor.closedDates);
    console.log('Vendor Holidays:', vendor.holidays);
    console.log('Is Shop Open:', vendor.isShopOpen, 'Is Closed Today:', vendor.isClosedToday);

    const targetDate = moment('2026-04-27').tz('Asia/Kolkata').startOf('day');
    console.log('Target Date:', targetDate.format());

    // 1. Check Availability
    const allAvailabilities = await VendorAvailability.find({ vendorId });
    console.log('Total Availability Records:', allAvailabilities.length);
    allAvailabilities.forEach(a => console.log(`- Day: ${a.day}, Open: ${a.isOpen}`));
    
    const availability = allAvailabilities.find(a => a.day === 'Mon');
    console.log('Monday Availability (VendorAvailability):', availability ? (availability.isOpen ? 'Open' : 'Closed') : 'Not Set');
    
    if (vendor.workingHours) {
        console.log('Vendor Working Hours:', vendor.workingHours);
    }

    // 2. Check Closures
    const closures = await VendorClosure.find({
      vendorId,
      status: 'active',
      startTime: { $lt: targetDate.clone().add(1, 'day').toDate() },
      endTime: { $gt: targetDate.toDate() }
    });
    console.log('Vendor Closures for 27th:', closures.length);
    closures.forEach(c => console.log(`- From ${c.startTime} to ${c.endTime}`));

    // 3. Check Staff
    const Staff = require('./src/models/Staff');
    const StaffClosure = require('./src/models/StaffClosure');
    const allStaff = await Staff.find({ vendorId });
    console.log('Total Staff in DB:', allStaff.length);
    for (const s of allStaff) {
        console.log(`Staff: ${s.name}, isActive: ${s.isActive}, services: ${s.services}`);
    }
    const staffMembers = allStaff.filter(s => s.isActive);
    console.log('Total Active Staff:', staffMembers.length);
    for (const s of staffMembers) {
        const sClosures = await StaffClosure.find({
            staffId: s._id,
            status: 'active',
            startTime: { $lt: targetDate.clone().add(1, 'day').toDate() },
            endTime: { $gt: targetDate.toDate() }
        });
        console.log(`Staff: ${s.name} (${s.isOwner ? 'Owner' : 'Staff'}), Closures: ${sClosures.length}, Services: ${s.services}`);
    }

    // 4. Check Services
    const Service = require('./src/models/Service');
    const services = await Service.find({ vendorId });
    console.log('Total Services:', services.length);
    services.forEach(s => console.log(`- Service: ${s.name} (${s._id}), Duration: ${s.duration} min, IsActive: ${s.isActive}`));

    // 5. Check Slot Locks
    const SlotLock = require('./src/models/SlotLock');
    const locks = await SlotLock.find({
      vendorId,
      expiresAt: { $gt: new Date() }
    });
    console.log('Active Slot Locks:', locks.length);
    locks.forEach(l => console.log(`- Lock from ${l.startTime} to ${l.endTime}, Expires: ${l.expiresAt}`));

    // 6. Run Slot Calculation
    const { calculateAvailableSlots } = require('./src/services/slotService');
    const availableSlots = await calculateAvailableSlots(vendorId, [services[0]._id.toString()], '2026-04-27');
    console.log('Available Slots for 27th:', availableSlots.length);
    if (availableSlots.length > 0) {
        console.log('First 3 slots:', availableSlots.slice(0, 3));
    } else {
        console.log('NO SLOTS RETURNED');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkVendorSlots();
