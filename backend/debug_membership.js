const mongoose = require('mongoose');
require('dotenv').config();
const UserMembership = require('./src/models/UserMembership');
const Vendor = require('./src/models/Vendor');
const User = require('./src/models/User');
const VendorMembershipPlan = require('./src/models/VendorMembershipPlan');

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Find a vendor to test with
    const vendor = await Vendor.findOne();
    if (!vendor) {
      console.log('No vendor found');
      return;
    }
    console.log('Testing for vendor:', vendor.shopName, vendor._id);

    const requests = await UserMembership.find({ 
      vendorId: vendor._id
    })
    .populate('userId', 'name phone')
    .populate('planId', 'name price');
    
    console.log('Found requests:', requests.length);
    console.log('Sample request status:', requests[0]?.status);
    
    process.exit(0);
  } catch (err) {
    console.error('DEBUG ERROR:', err);
    process.exit(1);
  }
}

debug();
