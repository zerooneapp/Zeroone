/**
 * 🔍 VENDOR STATUS DIAGNOSTIC SCRIPT
 * Run: node check_vendor_status.js
 * 
 * Checks: isShopOpen, active closures, subscription state for all vendors
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Vendor = require('./src/models/Vendor');
const VendorClosure = require('./src/models/VendorClosure');
const moment = require('moment-timezone');

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const now = new Date();

    // ─── 1. Vendors jinka isShopOpen = false hai ─────────────────────────────
    const closedVendors = await Vendor.find({ isShopOpen: false, status: 'active' })
      .select('shopName isShopOpen isClosedToday status workingHours walletBalance planType freeTrial expiryDate')
      .lean();

    console.log(`🔴 Vendors with isShopOpen = false (status: active): ${closedVendors.length}`);
    closedVendors.forEach(v => {
      console.log(`  ▸ ${v.shopName} | plan: ${v.planType} | wallet: ₹${v.walletBalance} | isClosedToday: ${v.isClosedToday}`);
      console.log(`    workingHours: ${v.workingHours?.start} - ${v.workingHours?.end}`);
    });

    console.log('\n');

    // ─── 2. Active VendorClosures (status: 'active' and endTime in future) ────
    const activeClosures = await VendorClosure.find({
      status: 'active',
      endTime: { $gt: now }
    }).populate('vendorId', 'shopName isShopOpen').lean();

    console.log(`🟡 Active VendorClosures (endTime > now): ${activeClosures.length}`);
    activeClosures.forEach(c => {
      const start = moment(c.startTime).tz('Asia/Kolkata').format('DD MMM HH:mm');
      const end = moment(c.endTime).tz('Asia/Kolkata').format('DD MMM HH:mm');
      console.log(`  ▸ Vendor: ${c.vendorId?.shopName || c.vendorId}`);
      console.log(`    Closure: ${start} → ${end} | reason: ${c.reason || 'N/A'}`);
      console.log(`    Shop isShopOpen in DB: ${c.vendorId?.isShopOpen}`);
    });

    console.log('\n');

    // ─── 3. Stale Closures (status: 'active' but endTime PAST) ───────────────
    const staleClosures = await VendorClosure.find({
      status: 'active',
      endTime: { $lte: now }
    }).populate('vendorId', 'shopName isShopOpen').lean();

    console.log(`🔴 STALE Closures (status=active but endTime PAST — cron nahi chala!): ${staleClosures.length}`);
    staleClosures.forEach(c => {
      const end = moment(c.endTime).tz('Asia/Kolkata').format('DD MMM HH:mm');
      console.log(`  ▸ Vendor: ${c.vendorId?.shopName || c.vendorId} | ended at: ${end}`);
      console.log(`    Shop isShopOpen in DB: ${c.vendorId?.isShopOpen} | closureId: ${c._id}`);
    });

    console.log('\n');

    // ─── 4. Fix option: Show all vendors needing repair ──────────────────────
    console.log('━━━ SUMMARY ━━━');
    console.log(`Total closed vendors (active status, isShopOpen=false): ${closedVendors.length}`);
    console.log(`Total active closures (ongoing):                        ${activeClosures.length}`);
    console.log(`Total stale closures (past endTime, not cleaned):       ${staleClosures.length}`);

    if (staleClosures.length > 0) {
      console.log('\n⚠️  Stale closures found! Run fix? (manually update below)');
      console.log('   These vendors need isShopOpen restored to true:\n');
      staleClosures.forEach(c => {
        console.log(`   db.vendors.updateOne({ _id: ObjectId("${c.vendorId?._id || c.vendorId}") }, { $set: { isShopOpen: true } })`);
        console.log(`   db.vendorclosures.updateOne({ _id: ObjectId("${c._id}") }, { $set: { status: "completed", endedAt: new Date() } })`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Done.');
  }
}

diagnose();
