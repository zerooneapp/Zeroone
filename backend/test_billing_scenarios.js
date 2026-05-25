const mongoose = require('mongoose');
require('dotenv').config();
const moment = require('moment-timezone');

const User = require('./src/models/User');
const Vendor = require('./src/models/Vendor');
const Category = require('./src/models/Category');
const WalletTransaction = require('./src/models/WalletTransaction');
const SubscriptionPlan = require('./src/models/SubscriptionPlan');
const { processDailyDeduction } = require('./src/services/walletService');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

// Simple mock for notification service to avoid spamming FCM
const NotificationService = require('./src/services/notificationService');
const originalSend = NotificationService.sendNotification;
NotificationService.sendNotification = async (payload) => {
  console.log(`[MOCK-NOTIFICATION] Sent: "${payload.title}" - "${payload.message}"`);
  return { success: true };
};

// Unit tests for the cron timing logic
function testCronTimingLogic() {
  console.log('\n--- TESTING CRON TIMING LOGIC ---');
  const now = moment.tz('2026-05-24 20:05:00', 'YYYY-MM-DD HH:mm:ss', 'Asia/Kolkata'); // 8:05 PM
  const todayStr = now.format('YYYY-MM-DD');

  // Case A: Day shift, 9 AM to 9 PM. Deduction target is 8 PM.
  // 8:05 PM is after 8 PM, should trigger.
  {
    const endTimeStr = '09:00 PM';
    const startTimeStr = '09:00 AM';
    const startTime = moment.tz(startTimeStr, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');
    const endTime = moment.tz(endTimeStr, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');
    startTime.year(now.year()).month(now.month()).date(now.date());
    endTime.year(now.year()).month(now.month()).date(now.date());

    const targetDeductionTime = endTime.clone().subtract(1, 'hour');
    assert(now.isSameOrAfter(targetDeductionTime), `Normal shift: 8:05 PM should be >= 8:00 PM deduction target`);
  }

  // Case B: Day shift, 9 AM to 9 PM. Deduction target is 8 PM.
  // Before 8 PM (e.g. 7:59 PM), should NOT trigger.
  {
    const earlyNow = moment.tz('2026-05-24 19:59:00', 'YYYY-MM-DD HH:mm:ss', 'Asia/Kolkata');
    const endTimeStr = '09:00 PM';
    const startTimeStr = '09:00 AM';
    const startTime = moment.tz(startTimeStr, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');
    const endTime = moment.tz(endTimeStr, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');
    startTime.year(earlyNow.year()).month(earlyNow.month()).date(earlyNow.date());
    endTime.year(earlyNow.year()).month(earlyNow.month()).date(earlyNow.date());

    const targetDeductionTime = endTime.clone().subtract(1, 'hour');
    assert(!earlyNow.isSameOrAfter(targetDeductionTime), `Normal shift: 7:59 PM should be < 8:00 PM deduction target`);
  }

  // Case C: Overnight shift, 10 PM to 2 AM. Target is 1 AM.
  // Current time is 1:15 AM (the next day/past midnight).
  {
    const overnightNow = moment.tz('2026-05-25 01:15:00', 'YYYY-MM-DD HH:mm:ss', 'Asia/Kolkata');
    const endTimeStr = '02:00 AM';
    const startTimeStr = '10:00 PM';
    const startTime = moment.tz(startTimeStr, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');
    const endTime = moment.tz(endTimeStr, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');
    startTime.year(overnightNow.year()).month(overnightNow.month()).date(overnightNow.date());
    endTime.year(overnightNow.year()).month(overnightNow.month()).date(overnightNow.date());

    if (endTime.isBefore(startTime)) {
      if (overnightNow.isAfter(startTime)) {
        endTime.add(1, 'day');
      }
    }
    const targetDeductionTime = endTime.clone().subtract(1, 'hour');
    assert(overnightNow.isSameOrAfter(targetDeductionTime), `Overnight shift: 1:15 AM should be >= 1:00 AM deduction target`);
  }

  // Case D: Overnight shift, 10 PM to 2 AM. Target is 1 AM.
  // Current time is 11:15 PM (same day as shift start). Should NOT trigger yet (target is 1 AM tomorrow).
  {
    const overnightNow = moment.tz('2026-05-24 23:15:00', 'YYYY-MM-DD HH:mm:ss', 'Asia/Kolkata');
    const endTimeStr = '02:00 AM';
    const startTimeStr = '10:00 PM';
    const startTime = moment.tz(startTimeStr, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');
    const endTime = moment.tz(endTimeStr, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');
    startTime.year(overnightNow.year()).month(overnightNow.month()).date(overnightNow.date());
    endTime.year(overnightNow.year()).month(overnightNow.month()).date(overnightNow.date());

    if (endTime.isBefore(startTime)) {
      if (overnightNow.isAfter(startTime)) {
        endTime.add(1, 'day');
      }
    }
    const targetDeductionTime = endTime.clone().subtract(1, 'hour');
    assert(!overnightNow.isSameOrAfter(targetDeductionTime), `Overnight shift: 11:15 PM Friday should be < 1:00 AM Saturday deduction target`);
  }
}

async function runDatabaseTests() {
  console.log('\n--- STARTING DATABASE SCENARIO TESTS ---');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  let testUser, testCategory, testVendor;

  try {
    // Clean up any stray test data first
    await Vendor.deleteMany({ shopName: 'Test Billing Shop' });
    await User.deleteMany({ phone: '9999999999' });

    // 1. Setup mock Category
    testCategory = await Category.create({ name: 'Test Category Billing' });

    // 2. Setup mock User
    testUser = await User.create({
      phone: '9999999999',
      name: 'Test Owner',
      role: 'vendor',
      password: 'password123'
    });

    // Ensure standard daily subscription plan exists for testing
    // In our system standard daily price defaults to 250 (unless overridden in database/SubscriptionPlan)
    let plan = await SubscriptionPlan.findOne({ type: 'daily', level: 'standard' });
    if (!plan) {
      plan = await SubscriptionPlan.create({ type: 'daily', level: 'standard', price: 10, gstPercent: 0 });
    }
    const dailyPrice = (plan.price || 0) + ((plan.price || 0) * (plan.gstPercent || 0)) / 100;
    console.log(`Standard Daily price used for tests: ₹${dailyPrice}`);

    // Create a base vendor
    testVendor = await Vendor.create({
      shopName: 'Test Billing Shop',
      ownerName: 'Test Owner',
      ownerId: testUser._id,
      category: testCategory._id,
      location: { type: 'Point', coordinates: [77.0, 28.0] },
      status: 'active',
      planType: 'daily',
      serviceLevel: 'standard',
      walletBalance: 500,
      isShopOpen: false,
      todayOpenDurationMs: 0
    });

    // SCENARIO 1: Shop open less than 3 hours (e.g. 1 hour)
    console.log('\n--- Scenario 1: Open < 3 Hours (1 hour) ---');
    testVendor.todayOpenDurationMs = 1 * 60 * 60 * 1000; // 1 hour in ms
    testVendor.walletBalance = 500;
    testVendor.lastDeductionDate = undefined;
    await testVendor.save();

    await processDailyDeduction(testVendor);
    
    // Fetch fresh copy from database
    let updatedVendor = await Vendor.findById(testVendor._id);
    assert(updatedVendor.walletBalance === 500, `Wallet balance should remain 500 (no deduction)`);
    assert(updatedVendor.todayOpenDurationMs === 0, `Cumulative open duration should be reset to 0`);
    assert(updatedVendor.status === 'active', `Status should remain active since balance is >= 20`);
    assert(
      updatedVendor.lastDeductionDate &&
      moment(updatedVendor.lastDeductionDate).tz('Asia/Kolkata').format('YYYY-MM-DD') === moment().tz('Asia/Kolkata').format('YYYY-MM-DD'),
      `lastDeductionDate should be set to today`
    );

    // SCENARIO 2: Shop open >= 3 hours (e.g. 4 hours)
    console.log('\n--- Scenario 2: Open >= 3 Hours (4 hours) ---');
    testVendor.todayOpenDurationMs = 4 * 60 * 60 * 1000; // 4 hours in ms
    testVendor.walletBalance = 500;
    testVendor.lastDeductionDate = undefined;
    await testVendor.save();

    await processDailyDeduction(testVendor);

    updatedVendor = await Vendor.findById(testVendor._id);
    const expectedBalance = 500 - dailyPrice;
    assert(updatedVendor.walletBalance === expectedBalance, `Wallet balance should be ${expectedBalance} after ₹${dailyPrice} deduction`);
    assert(updatedVendor.todayOpenDurationMs === 0, `Cumulative open duration should reset to 0`);
    assert(updatedVendor.status === 'active', `Status should remain active`);

    // Verify transaction record
    const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    const transaction = await WalletTransaction.findOne({
      vendorId: testVendor._id,
      referenceId: `TODAY_DAILY_${testVendor._id}_${todayStr}`
    });
    assert(transaction !== null, `A daily subscription transaction record should be created`);
    assert(transaction.amount === dailyPrice, `Transaction amount should match dailyPrice`);

    // SCENARIO 3: Balance threshold test (Remaining active when balance drops to threshold)
    // Threshold is 10. DailyPrice is e.g. 10 (or 250). Let's check with dynamic pricing:
    // If the plan price is 10, total required before deduction is 10 (threshold) + 10 (fee) = 20.
    // If the vendor has 25:
    // - Before deduction: 25 >= 20 -> OK
    // - Deducts 10. Balance becomes 15.
    // - Since deduction happened today, the required balance to stay active drops to just threshold (10).
    // - Since 15 >= 10, they should remain ACTIVE!
    console.log('\n--- Scenario 3: Remaining Active post-deduction with sufficient balance (15 >= 10) ---');
    testVendor.todayOpenDurationMs = 4 * 60 * 60 * 1000;
    // Set balance such that post-deduction it is above threshold (10) but below old required (Threshold + Price)
    // E.g., if daily price is 10: 25. Post-deduction: 15.
    // Let's calculate dynamically:
    const testBalance = 10 + dailyPrice + 5; // e.g. if dailyPrice is 250, then 10 + 250 + 5 = 265.
    testVendor.walletBalance = testBalance;
    testVendor.lastDeductionDate = undefined;
    await testVendor.save();

    // Clean up old transactions first
    await WalletTransaction.deleteMany({ vendorId: testVendor._id });

    await processDailyDeduction(testVendor);

    updatedVendor = await Vendor.findById(testVendor._id);
    const expectedPostBal = testBalance - dailyPrice; // e.g. 15
    assert(updatedVendor.walletBalance === expectedPostBal, `Balance should be ${expectedPostBal}`);
    assert(updatedVendor.status === 'active', `Vendor status should be ACTIVE post-deduction (since ${expectedPostBal} >= threshold 10)`);

    // SCENARIO 4: Balance threshold test (Becoming inactive when balance drops below threshold)
    // If vendor has 15 (if dailyPrice is 10):
    // - Deducts 10. Balance becomes 5.
    // - 5 < 10 (Threshold) -> should become INACTIVE.
    console.log('\n--- Scenario 4: Becoming Inactive post-deduction with low balance ---');
    testVendor.todayOpenDurationMs = 4 * 60 * 60 * 1000;
    const lowBalance = 10 + dailyPrice - 5; // e.g. if dailyPrice is 10, balance is 15. Post-deduction: 5.
    testVendor.walletBalance = lowBalance;
    testVendor.lastDeductionDate = undefined;
    await testVendor.save();

    await WalletTransaction.deleteMany({ vendorId: testVendor._id });

    await processDailyDeduction(testVendor);

    updatedVendor = await Vendor.findById(testVendor._id);
    const expectedPostBalLow = lowBalance - dailyPrice; // e.g. 5
    assert(updatedVendor.walletBalance === expectedPostBalLow, `Balance should be ${expectedPostBalLow}`);
    assert(updatedVendor.status === 'inactive', `Vendor status should be INACTIVE post-deduction (since ${expectedPostBalLow} < threshold 10)`);

  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---');
    // Restore notification service
    NotificationService.sendNotification = originalSend;

    if (testVendor) {
      await WalletTransaction.deleteMany({ vendorId: testVendor._id });
      await Vendor.findByIdAndDelete(testVendor._id);
      console.log('Deleted test vendor');
    }
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
      console.log('Deleted test user');
    }
    if (testCategory) {
      await Category.findByIdAndDelete(testCategory._id);
      console.log('Deleted test category');
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

async function main() {
  try {
    testCronTimingLogic();
    await runDatabaseTests();
    console.log('\n=======================================');
    console.log('ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
    console.log('=======================================');
  } catch (error) {
    console.error('\nTEST RUN FAILED:', error);
    process.exit(1);
  }
}

main();
