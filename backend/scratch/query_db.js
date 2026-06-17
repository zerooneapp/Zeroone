const mongoose = require('mongoose');
const UserMembership = require('../src/models/UserMembership');
const VendorMembershipPlan = require('../src/models/VendorMembershipPlan');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zeroone');
  console.log('Connected!');
  const memberships = await UserMembership.find({}).populate('planId').lean();
  console.log('Memberships:', JSON.stringify(memberships, null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
