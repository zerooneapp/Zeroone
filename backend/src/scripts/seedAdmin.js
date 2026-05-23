require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const getArgValue = (flag) => {
  const matched = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return matched ? matched.slice(flag.length + 1) : '';
};

const seedAdmin = async () => {
  const phone = process.env.ADMIN_PHONE || getArgValue('--phone');
  const password = process.env.ADMIN_PASSWORD || getArgValue('--password');
  const name = process.env.ADMIN_NAME || getArgValue('--name') || 'Platform Admin';
  const email = process.env.ADMIN_EMAIL || getArgValue('--email') || '';
  const role = process.env.ADMIN_ROLE || getArgValue('--role') || 'super_admin';

  if (!phone || !password) {
    throw new Error('ADMIN_PHONE and ADMIN_PASSWORD are required. You can pass them via env or --phone= / --password=');
  }

  if (!['admin', 'super_admin'].includes(role)) {
    throw new Error('ADMIN_ROLE must be either admin or super_admin');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existingAdmin = await User.findOne({ phone });
  if (existingAdmin) {
    existingAdmin.name = name;
    existingAdmin.email = email || existingAdmin.email;
    existingAdmin.password = password;
    existingAdmin.role = role;
    existingAdmin.isBlocked = false;
    await existingAdmin.save();
    console.log(`${role} updated successfully for ${phone}`);
  } else {
    await User.create({
      phone,
      name,
      email,
      password,
      role,
      isBlocked: false
    });
    console.log(`${role} created successfully for ${phone}`);
  }

  await mongoose.disconnect();
};

seedAdmin()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Failed to seed admin:', error.message);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
