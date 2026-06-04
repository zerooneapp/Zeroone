const mongoose = require('mongoose');
const User = require('./src/models/User');
const Vendor = require('./src/models/Vendor');
const Service = require('./src/models/Service');
const Staff = require('./src/models/Staff');
const VendorAvailability = require('./src/models/VendorAvailability');
const StaffAvailability = require('./src/models/StaffAvailability');
const { calculateAvailableSlots } = require('./src/services/slotService');
const moment = require('moment-timezone');

async function test() {
  try {
    await mongoose.connect('mongodb://zerooneappinfo_db_user:8xR09oSOETAW3pZh@ac-pitmbpp-shard-00-00.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-01.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-02.djq3ivp.mongodb.net:27017/ZeroOne?ssl=true&replicaSet=atlas-mvko1y-shard-0&authSource=admin&retryWrites=true&w=majority');
    console.log('Connected to DB');

    const service = await Service.findOne({ name: /Bdbdbf/i });
    if (!service) {
      console.log('Service Bdbdbf not found!');
      process.exit(0);
    }
    const vendorId = service.vendorId;
    console.log('Vendor ID:', vendorId);

    const vendor = await Vendor.findById(vendorId);
    console.log('Shop Name:', vendor.shopName);
    console.log('Is Shop Open:', vendor.isShopOpen);
    console.log('Is Closed Today:', vendor.isClosedToday);
    console.log('Working Hours:', vendor.workingHours);
    console.log('Closed Dates:', vendor.closedDates);

    const targetDate = moment('2026-06-05').tz('Asia/Kolkata').startOf('day');
    console.log('Target Date:', targetDate.format());
    console.log('Target Date Day of Week:', targetDate.format('ddd'));

    const allAvails = await VendorAvailability.find({ vendorId });
    console.log('Vendor Availabilities in DB:', allAvails.map(a => ({ day: a.day, isOpen: a.isOpen, openTime: a.openTime, closeTime: a.closeTime })));

    const availability = await VendorAvailability.findOne({
      vendorId,
      day: targetDate.format('ddd'),
      isOpen: true
    }).lean();
    console.log('Found Active Availability for target day:', availability);

    const staffMembers = await Staff.find({ vendorId });
    console.log('Total Staff Members for Vendor:', staffMembers.length);
    for (const staff of staffMembers) {
      console.log(`- Staff: ${staff.name}, ID: ${staff._id}, isActive: ${staff.isActive}, isOwner: ${staff.isOwner}, services: ${staff.services}`);
    }

    const eligibleStaff = await Staff.find({
      vendorId,
      isActive: true,
      services: { $all: [service._id] }
    });
    console.log('Eligible Staff (direct match):', eligibleStaff.length);

    const ownerStaff = await Staff.find({
      vendorId,
      isActive: true,
      isOwner: true
    }).lean();
    console.log('Owner Staff (fallback):', ownerStaff.length);

    const slots = await calculateAvailableSlots(vendorId.toString(), [service._id.toString()], '2026-06-05');
    console.log('Available Slots count:', slots.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
