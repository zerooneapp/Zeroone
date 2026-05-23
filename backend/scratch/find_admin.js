const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');

async function findAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    if (admin) {
      console.log('Admin User Found:');
      console.log(`Name: ${admin.name}`);
      console.log(`Phone: ${admin.phone}`);
      console.log(`Role: ${admin.role}`);
    } else {
      console.log('No Admin User found in DB.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findAdmin();
