const mongoose = require('mongoose');
require('dotenv').config();

const checkVendors = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Vendor = require('../src/models/Vendor');
    const vendors = await Vendor.find({}).lean();
    console.log(`Total Vendors: ${vendors.length}`);
    vendors.forEach((v, idx) => {
      console.log(`[${idx}] shopName: ${v.shopName} | AadhaarFront: ${v.aadhaarFront ? "Yes" : "No"} | AadhaarBack: ${v.aadhaarBack ? "Yes" : "No"} | PAN: ${v.panCard ? "Yes" : "No"} | shopImage: ${v.shopImage ? "Yes" : "No"}`);
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkVendors();
