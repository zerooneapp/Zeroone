const mongoose = require('mongoose');
const User = require('./src/models/User');

const seedAdmin = async () => {
  try {
    const mongoUri = 'mongodb+srv://zerooneappinfo_db_user:8xR09oSOETAW3pZh@cluster0.djq3ivp.mongodb.net/ZeroOne';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const adminData = {
      phone: '8519071469',
      name: 'Admin',
      password: '123456',
      role: 'admin'
    };

    // Check if user already exists
    const existingUser = await User.findOne({ phone: adminData.phone });
    if (existingUser) {
      console.log('Admin user with this phone already exists. Updating password...');
      existingUser.password = adminData.password;
      existingUser.role = 'admin';
      await existingUser.save();
      console.log('Admin user updated successfully');
    } else {
      const newUser = new User(adminData);
      await newUser.save();
      console.log('Admin user created successfully');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
