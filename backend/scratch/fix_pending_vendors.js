const mongoose = require('mongoose');
const Vendor = require('../src/models/Vendor');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zeroone');
  console.log('Connected to Database!');

  const vendors = await Vendor.find({ status: 'pending' });
  console.log(`Found ${vendors.length} pending vendors.`);

  let updatedCount = 0;
  for (const vendor of vendors) {
    const requiresShopImage = (vendor.serviceMode || 'shop') === 'shop';
    const hasRequiredMedia = 
      vendor.aadhaarFront && 
      vendor.aadhaarBack && 
      vendor.vendorPhoto && 
      (!requiresShopImage || vendor.shopImage);

    if (hasRequiredMedia && !vendor.isProfileComplete) {
      vendor.isProfileComplete = true;
      await vendor.save();
      console.log(`Updated vendor "${vendor.shopName}" (${vendor._id}) -> Profile Marked Complete`);
      updatedCount++;
    } else {
      console.log(`Vendor "${vendor.shopName}" (${vendor._id}) -> isProfileComplete: ${vendor.isProfileComplete}, hasRequiredMedia: ${!!hasRequiredMedia}`);
    }
  }

  console.log(`Updated ${updatedCount} vendors.`);
  await mongoose.disconnect();
  console.log('Disconnected!');
}

run().catch(console.error);
