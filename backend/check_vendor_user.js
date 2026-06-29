const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const Vendor = require('./src/models/Vendor');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected...');

    const phone = '9669002380';
    const user = await User.findOne({ phone });

    if (!user) {
      console.log(`ℹ️  No user found for phone ${phone}`);
      return process.exit(0);
    }

    console.log(`\n📋 User found:`);
    console.log(`   _id  : ${user._id}`);
    console.log(`   phone: ${user.phone}`);
    console.log(`   name : ${user.name}`);
    console.log(`   role : ${user.role}`);

    // Check linked vendor doc
    const vendor = await Vendor.findOne({ ownerId: user._id });
    if (vendor) {
      console.log(`\n🏪 Linked Vendor doc found:`);
      console.log(`   shopName: ${vendor.shopName}`);
      console.log(`   status  : ${vendor.status}`);
    } else {
      console.log(`\n⚠️  No Vendor document linked — but user role is '${user.role}'`);
      console.log(`   THIS is why vendor-pending shows: role=vendor but no shop exists yet.`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();
