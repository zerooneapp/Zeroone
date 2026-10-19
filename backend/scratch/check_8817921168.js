const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');
const Staff = require('../src/models/Staff');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const phone = '8817921168';
    const users = await User.find({ phone });
    console.log('USERS count:', users.length);
    console.log('USERS:', JSON.stringify(users, null, 2));

    const staff = await Staff.find({ phone });
    console.log('STAFF count:', staff.length);
    console.log('STAFF:', JSON.stringify(staff, null, 2));

    if (users.length > 0) {
      const userIds = users.map(u => u._id);
      const vendors = await Vendor.find({ ownerId: { $in: userIds } });
      console.log('VENDORS by ownerId count:', vendors.length);
      console.log('VENDORS by ownerId:', JSON.stringify(vendors, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
