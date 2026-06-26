const mongoose = require('mongoose');
const Vendor = require('../src/models/Vendor');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zeroone');
  console.log('Connected!');

  const abhishek = await Vendor.findById("6a3e3d8f87b02b1a75867b42");
  const glam = await Vendor.findById("6a3a263dacbacbe115c763ab");

  if (abhishek && glam) {
    abhishek.aadhaarBack = glam.aadhaarBack;
    abhishek.aadhaarFront = glam.aadhaarFront;
    abhishek.panCard = glam.panCard;
    abhishek.shopImage = glam.shopImage;
    abhishek.vendorPhoto = glam.vendorPhoto;
    abhishek.isProfileComplete = true;

    await abhishek.save();
    console.log('Abhishek Salon fixed successfully!');
  } else {
    console.log('Could not find both vendors.');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
