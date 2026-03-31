const WalletTransaction = require('../models/WalletTransaction');
const moment = require('moment-timezone');
const NotificationService = require('./notificationService');

const MIN_WALLET_BALANCE = 100;

const getUpdatedStatus = (vendor) => {
  const now = new Date();
  
  // 1. Check Free Trial
  if (vendor.freeTrial && vendor.freeTrial.isActive && vendor.freeTrial.expiryDate > now) {
    return 'active';
  }

  // 2. Check Monthly Plan
  if (vendor.planType === 'monthly' && vendor.expiryDate > now) {
    return 'active';
  }

  // 3. Check Daily Plan (Balance Based)
  if (vendor.planType === 'daily') {
    return vendor.walletBalance >= MIN_WALLET_BALANCE ? 'active' : 'inactive';
  }

  return vendor.status || 'inactive';
};

const processDailyDeduction = async (vendor) => {
  const today = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
  if (vendor.lastDeductionDate && moment(vendor.lastDeductionDate).tz('Asia/Kolkata').format('YYYY-MM-DD') === today) return vendor;

  const now = new Date();
  if ((vendor.freeTrial && vendor.freeTrial.isActive && vendor.freeTrial.expiryDate > now) || (vendor.planType === 'monthly' && vendor.expiryDate > now)) {
    vendor.status = 'active'; return await vendor.save();
  }

  // 💰 DYNAMIC PRICING FETCH
  const SubscriptionPlan = require('../models/SubscriptionPlan');
  const plan = await SubscriptionPlan.findOne({ type: 'daily', level: vendor.serviceLevel || 'basic' });

  // 🛡️ FALLBACK SAFETY (MANDATORY)
  if (!plan) {
    console.error(`Subscription plan missing for type: daily, level: ${vendor.serviceLevel}`);
    throw new Error('Subscription plan not configured. Please contact support.');
  }

  const dailyPrice = plan.price;

  if (vendor.walletBalance < MIN_WALLET_BALANCE) {
    vendor.status = 'inactive';
    NotificationService.sendNotification({
      userIds: vendor.ownerId, role: 'vendor', type: 'LOW_BALANCE',
      title: 'Wallet Balance Low', message: `Your balance is below ₹100. Shop is now inactive. Please top up to resume service.`,
      referenceId: `LOW_BAL_${today}`
    });
    return await vendor.save();
  }

  vendor.walletBalance -= dailyPrice;
  vendor.lastDeductionDate = now;
  vendor.status = vendor.walletBalance >= MIN_WALLET_BALANCE ? 'active' : 'inactive';

  await WalletTransaction.create({ vendorId: vendor._id, amount: dailyPrice, type: 'debit', reason: 'daily_subscription' });

  // 🔔 DEDUCTION NOTIFICATION
  NotificationService.sendNotification({
    userIds: vendor.ownerId, role: 'vendor', type: 'WALLET_DEDUCTION',
    title: 'Daily Deduction', message: `₹${dailyPrice} deducted for your ${vendor.serviceLevel} plan. Remaining balance: ₹${vendor.walletBalance}.`,
    referenceId: `DEDUCT_${today}`
  });

  return await vendor.save();
};

const addFunds = async (vendor, amount, reason = 'admin_topup') => {
  vendor.walletBalance += amount;
  vendor.status = getUpdatedStatus(vendor);

  await WalletTransaction.create({ vendorId: vendor._id, amount, type: 'credit', reason });

  // 🔔 TOP UP NOTIFICATION
  NotificationService.sendNotification({
    userIds: vendor.ownerId, role: 'vendor', type: 'WALLET_TOPUP',
    title: 'Wallet Top-up', message: `₹${amount} has been credited to your wallet. Current balance: ₹${vendor.walletBalance}.`,
    referenceId: `TOPUP_${new Date().getTime()}`
  });

  return await vendor.save();
};

module.exports = { getUpdatedStatus, processDailyDeduction, addFunds };
