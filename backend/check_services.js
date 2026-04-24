const mongoose = require('mongoose');
const Service = require('./src/models/Service');
const Vendor = require('./src/models/Vendor');
require('dotenv').config({ path: '.env' });

async function checkServices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const services = await Service.find({}).populate('vendorId', 'shopName shopImage');
    console.log(`Found ${services.length} services`);

    services.slice(-10).forEach(s => {
      console.log(`Service: ${s.name}`);
      console.log(`  - Image Field: ${s.image || 'EMPTY'}`);
      console.log(`  - Images Array: ${JSON.stringify(s.images)}`);
      console.log(`  - Vendor: ${s.vendorId?.shopName}`);
      console.log(`  - Vendor Image: ${s.vendorId?.shopImage || 'EMPTY'}`);
      console.log('-------------------');
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkServices();
