const mongoose = require('mongoose');
require('dotenv').config();

const checkVendor = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Vendor = require('./src/models/Vendor');
    const userId = '6a01850cca691174aff0e1d7';
    
    const vendor = await Vendor.findOne({ ownerId: userId });
    if (vendor) {
      console.log('Vendor entry FOUND:', JSON.stringify(vendor, null, 2));
    } else {
      console.log('Vendor entry NOT FOUND for ownerId:', userId);
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkVendor();
