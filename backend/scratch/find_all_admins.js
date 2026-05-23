const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');

async function findAdmins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } });
    console.log(`Found ${admins.length} admins:`);
    admins.forEach(a => {
      console.log(`- ${a.name} (${a.phone}) [${a.role}]`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findAdmins();
