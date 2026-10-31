// Makes the staff phone index optional so staff can be created without a phone.
//
// Drops the old non-partial unique indexes on (phone, vendorId) and recreates a
// single unique index that only applies when a phone string is present.
//
// Usage:  node src/scripts/migrateStaffPhoneOptional.js
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('staffs');

  const existing = await col.indexes();
  const names = existing.map((i) => i.name);

  for (const name of ['phone_1_vendorId_1', 'vendorId_1_phone_1']) {
    if (names.includes(name)) {
      await col.dropIndex(name);
      console.log('dropped index:', name);
    }
  }

  await col.createIndex(
    { phone: 1, vendorId: 1 },
    { unique: true, partialFilterExpression: { phone: { $type: 'string' } }, name: 'phone_1_vendorId_1' }
  );
  console.log('created partial unique index: phone_1_vendorId_1');

  console.log('\nFinal indexes:');
  console.log((await col.indexes()).map((i) => i.name).join(', '));
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
