const mongoose = require('mongoose');
require('dotenv').config();
const NotificationLog = require('../src/models/NotificationLog');

async function debugDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    // Find logs from the last 10 minutes
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const logs = await NotificationLog.find({ createdAt: { $gt: tenMinsAgo } }).sort({ createdAt: -1 });
    
    console.log(`Found ${logs.length} logs in the last 10 minutes.`);
    
    const seen = new Map();
    logs.forEach(log => {
      const key = `${log.userId}_${log.notificationId}`;
      if (seen.has(key)) {
        console.log('!!! DUPLICATE DETECTED IN LOGS !!!');
        console.log(`User: ${log.userId}`);
        console.log(`Notification ID: ${log.notificationId}`);
        console.log(`Sent at: ${log.createdAt.toLocaleTimeString()} and ${seen.get(key).toLocaleTimeString()}`);
        console.log('-----------------------------------');
      }
      seen.set(key, log.createdAt);
    });

    if (logs.length > 0) {
      console.log('Latest Log Sample:');
      console.log(JSON.stringify(logs[0], null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugDuplicates();
