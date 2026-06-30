const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User'); // Register User Schema first
const Vendor = require('./src/models/Vendor');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected...');

    const vendors = await Vendor.find({ isDeleted: false }).populate('ownerId', 'name phone');
    
    console.log('\n📋 CURRENT ACTIVE VENDORS IN DB:');
    vendors.forEach((v, index) => {
      console.log(`\nShop #${index + 1}:`);
      console.log(`   _id      : ${v._id}`);
      console.log(`   shopName : "${v.shopName}"`);
      console.log(`   ownerName: "${v.ownerName}"`);
      console.log(`   ownerId  : ${v.ownerId?._id} (Name in User document: "${v.ownerId?.name}", Phone: ${v.ownerId?.phone})`);
      console.log(`   status   : ${v.status}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();
