const mongoose = require('mongoose');
require('dotenv').config();

const checkStaff = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Staff = require('./src/models/Staff');
    const phoneNumber = '8817921168';
    
    const staff = await Staff.findOne({ phone: phoneNumber });
    if (staff) {
      console.log('Staff entry FOUND:', JSON.stringify(staff, null, 2));
    } else {
      console.log('Staff entry NOT FOUND for phone:', phoneNumber);
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkStaff();
