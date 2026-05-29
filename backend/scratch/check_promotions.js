const mongoose = require('mongoose');
require('dotenv').config();

const checkPromotions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const VendorPromotion = require('../src/models/VendorPromotion');
    
    const request = await VendorPromotion.findById('69fb35e01dedfe33d3aea80f').lean();
    console.log('Raw Request:', JSON.stringify(request, null, 2));
    
    if (request && request.vendorId) {
      const Vendor = require('../src/models/Vendor');
      const vendor = await Vendor.findById(request.vendorId).lean();
      console.log('Vendor:', JSON.stringify(vendor, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkPromotions();
