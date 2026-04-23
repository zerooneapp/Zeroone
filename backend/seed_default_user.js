const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

const seedDefaultUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected...');

    const phone = '1234567890';
    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      console.log('Default user already exists. Updating...');
      existingUser.name = 'Test User';
      existingUser.otp = '123456';
      existingUser.otpExpires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      await existingUser.save();
    } else {
      console.log('Creating default user...');
      await User.create({
        phone,
        name: 'Test User',
        role: 'customer',
        otp: '123456',
        otpExpires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
    }

    console.log('Default user seeded successfully');
    process.exit();
  } catch (error) {
    console.error('Error seeding default user:', error);
    process.exit(1);
  }
};

seedDefaultUser();
