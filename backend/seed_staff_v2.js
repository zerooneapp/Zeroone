const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Vendor = require('./src/models/Vendor');
const Service = require('./src/models/Service');
const Staff = require('./src/models/Staff');

const staffNames = [
  "Arjun Sharma", "Priya Malhotra", "Vikram Rathore", "Ananya Kapoor"
];

const seedStaff = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Staff.deleteMany({});
    console.log('Cleared existing staff.');

    const vendors = await Vendor.find();
    console.log(`Processing ${vendors.length} vendors...`);

    for (const vendor of vendors) {
      const services = await Service.find({ vendorId: vendor._id });
      if (services.length === 0) continue;

      const serviceIds = services.map(s => s._id);

      for (let i = 0; i < 3; i++) {
        try {
          await Staff.create({
            vendorId: vendor._id,
            name: staffNames[i],
            phone: `91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            password: 'password123',
            services: serviceIds,
            image: `https://i.pravatar.cc/150?u=${vendor._id}_${i}`,
            isActive: true
          });
        } catch (sErr) {
          console.error(`Failed to create staff for ${vendor.shopName}:`, sErr.message);
        }
      }
      console.log(`Seeded staff for ${vendor.shopName}`);
    }

    console.log('Successfully seeded staff for ALL vendors!');
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL SEED ERROR:', err);
    process.exit(1);
  }
};

seedStaff();
