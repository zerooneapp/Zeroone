const mongoose = require('mongoose');
require('dotenv').config();

const checkVendors = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Vendor = require('../src/models/Vendor');
    const vendors = await Vendor.find({}).lean();
    console.log(`Total Vendors: ${vendors.length}`);
    vendors.forEach((v, idx) => {
      console.log(`[${idx}] ID: ${v._id} | shopName: ${v.shopName} | ownerName: ${v.ownerName}`);
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkVendors();
