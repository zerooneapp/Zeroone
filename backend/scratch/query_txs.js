const mongoose = require('mongoose');
const WalletTransaction = require('../src/models/WalletTransaction');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zeroone');
  const txs = await WalletTransaction.find({ vendorId: '6a3275ddc52470a407c98e6c' }).lean();
  console.log('Transactions:', JSON.stringify(txs, null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
