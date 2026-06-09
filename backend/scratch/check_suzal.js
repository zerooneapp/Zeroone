const mongoose = require('mongoose');
require('dotenv').config();

const checkSuzal = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Vendor = require('../src/models/Vendor');
    const vendors = await Vendor.find({}).lean();
    vendors.forEach((v) => {
      console.log(`shopName: ${v.shopName}`);
      console.log(`  workingHours:`, v.workingHours);
      console.log(`  isShopOpen:`, v.isShopOpen);
      console.log(`  isClosedToday:`, v.isClosedToday);
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkSuzal();
