const mongoose = require('mongoose');
const Vendor = require('../src/models/Vendor');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zeroone');
  console.log('Connected!');
  const vendors = await Vendor.find({ ownerId: "6a3a2580acbacbe115c7636c" }).lean();
  console.log('Vendors:', JSON.stringify(vendors, null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
