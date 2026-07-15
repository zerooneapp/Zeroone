const mongoose = require('mongoose');
const InventoryLog = require('../src/models/InventoryLog');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zeroone');
  
  const logs = await InventoryLog.find({}).lean();
  console.log('ALL LOGS:', JSON.stringify(logs, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
