const mongoose = require('mongoose');
require('dotenv').config();

const fixPromotion = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const VendorPromotion = require('../src/models/VendorPromotion');
    
    // Find our pending request
    const request = await VendorPromotion.findById('69fb35e01dedfe33d3aea80f');
    if (!request) {
      console.log('Request 69fb35e01dedfe33d3aea80f not found.');
      process.exit(1);
    }
    
    // Set to a valid vendor ID: Suzal Unisex Salon
    request.vendorId = '69ef3eae4e4c16d8ab011f41';
    request.durationDays = 50; // 50 days (₹500 / ₹10 daily rate)
    await request.save();
    
    console.log('Successfully updated legacy promotion request:');
    console.log(JSON.stringify(request.toObject(), null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

fixPromotion();
