const mongoose = require('mongoose');
const WalletTransaction = require('../src/models/WalletTransaction');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zeroone');
  
  const vendorId = new mongoose.Types.ObjectId('6a3275ddc52470a407c98e6c');

  const stats = await WalletTransaction.aggregate([
    { $match: { vendorId: vendorId, category: 'membership_revenue', status: 'completed' } },
    { $group: { _id: null, totalMembershipEarnings: { $sum: '$amount' } } }
  ]);

  console.log('Stats:', stats);
  await mongoose.disconnect();
}

run().catch(console.error);
