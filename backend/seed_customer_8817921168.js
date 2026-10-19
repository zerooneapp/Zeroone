const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const Vendor = require('./src/models/Vendor');
const Staff = require('./src/models/Staff');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const phone = '8817921168';

    // 1. Check existing staff with this phone
    const staffList = await Staff.find({ phone });
    if (staffList.length > 0) {
      console.log(`Found ${staffList.length} staff records. Deleting...`);
      await Staff.deleteMany({ phone });
      console.log('✅ Deleted staff records for', phone);
    } else {
      console.log('ℹ️ No staff record found for', phone);
    }

    // 2. Check existing user
    let user = await User.findOne({ phone });

    if (user) {
      // Check if user owns any vendors
      const vendors = await Vendor.find({ ownerId: user._id });
      if (vendors.length > 0) {
        console.log(`Found ${vendors.length} vendor(s) owned by this user. Deleting...`);
        for (const v of vendors) {
          // Also delete staff for this vendor
          await Staff.deleteMany({ vendorId: v._id });
          await Vendor.deleteOne({ _id: v._id });
          console.log(`Deleted vendor: ${v.shopName} (${v._id})`);
        }
      }

      console.log(`Updating existing user (${phone}) to customer role...`);
      user.role = 'customer';
      user.isBlocked = false;
      user.isDeleted = false;
      user.lastActiveVendorId = null;
      user.otp = '123456';
      user.otpExpires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await user.save();
      console.log('✅ User updated successfully:');
      console.log({
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        otp: user.otp
      });
    } else {
      console.log(`User ${phone} does not exist. Creating new customer user...`);
      user = await User.create({
        phone,
        name: 'Harsh',
        role: 'customer',
        otp: '123456',
        otpExpires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
      console.log('✅ Created customer user successfully:');
      console.log({
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        otp: user.otp
      });
    }

    // Also double check if any staff references this userId
    if (user && user._id) {
      await Staff.deleteMany({ userId: user._id });
    }

    console.log('\n🎉 Finished! Phone', phone, 'is now ready to login as Customer with OTP 123456.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

run();
