const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected...');

    const phone = '9669002380';
    const user = await User.findOne({ phone });

    if (user) {
      // Clear OTP so it can't be used as a bypass
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();
      console.log(`✅ Cleared seeded OTP credentials for ${phone}`);
    } else {
      console.log(`ℹ️  No user found for phone ${phone}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();
