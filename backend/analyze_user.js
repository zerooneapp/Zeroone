const mongoose = require('mongoose');
require('dotenv').config();

const analyze = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = require('./src/models/User');
    const phoneNumber = '8817921168';

    console.log('Searching for exact phone:', phoneNumber);
    const user = await User.findOne({ phone: phoneNumber });
    if (user) {
      console.log('User found:', JSON.stringify(user, null, 2));
    } else {
      console.log('User NOT found with exact phone.');
    }

    console.log('\nSearching for phone containing 8817921168:');
    const users = await User.find({ phone: new RegExp(phoneNumber) });
    console.log(`Found ${users.length} users with similar numbers.`);
    users.forEach(u => console.log(`- ${u.phone} (Name: ${u.name}, Role: ${u.role})`));

    console.log('\nLast 5 users created:');
    const lastUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    lastUsers.forEach(u => console.log(`- ${u.phone} (Name: ${u.name}, Role: ${u.role}, CreatedAt: ${u.createdAt})`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

analyze();
