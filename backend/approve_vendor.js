const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('./src/models/Vendor');

const approveAllVendors = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await Vendor.updateMany(
      { status: 'pending' },
      { $set: { status: 'approved' } }
    );

    console.log(`Updated ${result.modifiedCount} vendors to "approved" status.`);
    
    // Also ensure they have a trial active for dashboard access
    await Vendor.updateMany(
      { status: 'approved' },
      { $set: { 'freeTrial.isActive': true, 'freeTrial.expiryDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
    );
    
    console.log('Active trial periods ensured for all approved vendors.');

    process.exit(0);
  } catch (error) {
    console.error('Error approving vendors:', error);
    process.exit(1);
  }
};

approveAllVendors();
