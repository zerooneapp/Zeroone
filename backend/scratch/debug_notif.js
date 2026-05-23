const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Staff = require('../src/models/Staff');
const Notification = require('../src/models/Notification');
const NotificationLog = require('../src/models/NotificationLog');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const users = await User.find().sort({ updatedAt: -1 }).limit(5);
    console.log('Latest Users:');
    users.forEach(u => {
      console.log(`User: ${u.name} (${u.phone}) - Tokens: Mobile(${u.fcmTokenMobile?.length || 0}), Web(${u.fcmTokens?.length || 0})`);
      if (u.fcmTokenMobile?.length > 0) {
        console.log(`  Latest Mobile Token: ${u.fcmTokenMobile[u.fcmTokenMobile.length - 1].slice(-10)}`);
      }
    });

    const logs = await NotificationLog.find().sort({ createdAt: -1 }).limit(5);
    console.log('\nLatest Notification Logs:');
    logs.forEach(l => {
      console.log(`Log: ${l.createdAt} - User: ${l.userId} - Success: ${l.successCount} - ID: ${l.notificationId}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
