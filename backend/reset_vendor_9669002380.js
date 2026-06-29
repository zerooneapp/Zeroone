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

    const PERMANENT_OTP = '123456';
    const OTP_EXPIRY = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years

    if (user) {
      user.otp = PERMANENT_OTP;
      user.otpExpires = OTP_EXPIRY;
      user.role = 'vendor';
      await user.save();
      console.log(`✅ Set default OTP for existing user ${phone} to ${PERMANENT_OTP}`);
    } else {
      await User.create({
        phone,
        name: 'Test Partner',
        role: 'vendor',
        otp: PERMANENT_OTP,
        otpExpires: OTP_EXPIRY
      });
      console.log(`✅ Created user ${phone} with default OTP ${PERMANENT_OTP}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();
