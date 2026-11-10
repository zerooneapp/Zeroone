/**
 * Finds vendors whose ownerId has no User document and recreates the owner User
 * from the owner Staff record (same _id, so all existing links stay valid).
 *
 * Usage:
 *   node repair_dangling_owners.js           # dry-run (read-only)
 *   node repair_dangling_owners.js --apply   # actually insert the missing Users
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Vendor = require('./src/models/Vendor');
const Staff = require('./src/models/Staff');

const APPLY = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(APPLY ? 'MODE: APPLY' : 'MODE: DRY-RUN (no writes)');

  const vendors = await Vendor.find({ ownerId: { $ne: null } }).select('shopName ownerId');
  let fixed = 0;
  for (const v of vendors) {
    if (await User.exists({ _id: v.ownerId })) continue;

    const staff = await Staff.findOne({ vendorId: v._id, isOwner: true });
    if (!staff || !staff.phone) {
      console.log(`SKIP  ${v.shopName} (${v._id}): dangling owner but no owner Staff with phone`);
      continue;
    }
    if (await User.exists({ phone: staff.phone })) {
      console.log(`SKIP  ${v.shopName} (${v._id}): a User with phone ${staff.phone} already exists, resolve manually`);
      continue;
    }

    console.log(`${APPLY ? 'FIX ' : 'WOULD FIX'} ${v.shopName}: create User ${v.ownerId} phone=${staff.phone} name=${staff.name} role=vendor`);
    if (APPLY) {
      await User.create({ _id: v.ownerId, phone: staff.phone, name: staff.name, image: staff.image, role: 'vendor' });
      fixed++;
    }
  }
  console.log(`Done. Restored: ${fixed}`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
