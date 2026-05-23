const mongoose = require('mongoose');
require('dotenv').config();
const NotificationLog = require('../src/models/NotificationLog');

async function checkFailures() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const logs = await NotificationLog.find().sort({ createdAt: -1 }).limit(10);
    
    console.log('--- Last 10 Push Notification Attempts ---');
    logs.forEach(log => {
      console.log(`Time: ${log.createdAt.toLocaleTimeString()}`);
      console.log(`User ID: ${log.userId}`);
      console.log(`Tokens count: ${log.tokens?.length || 0}`);
      console.log(`Success: ${log.successCount}, Failure: ${log.failureCount}`);
      console.log(`ID: ${log.notificationId.slice(0, 50)}...`);
      console.log('-------------------------------------------');
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkFailures();
