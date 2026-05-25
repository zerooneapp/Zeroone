const WalletTransaction = require('../models/WalletTransaction');
const GlobalSettings = require('../models/GlobalSettings');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const moment = require('moment-timezone');
const NotificationService = require('./notificationService');
const redis = require('../config/redis');

const CACHE_KEYS = {
  GLOBAL_SETTINGS: 'global_settings',
  SUBSCRIPTION_PLANS: 'subscription_plans'
};

const PLAN_LEVELS = ['standard', 'premium', 'luxury'];
const DEFAULT_PLAN_PRICES = {
  standard: { daily: 250, monthly: 5000 },
  premium: { daily: 500, monthly: 10000 },
  luxury: { daily: 1000, monthly: 20000 }
};

const getNormalizedServiceLevel = (serviceLevel = 'standard') => (
  PLAN_LEVELS.includes(serviceLevel) ? serviceLevel : 'standard'
);

const getEffectivePlanType = (vendor) => {
  const now = new Date();
  
  // 1. Explicit Trial Check (Even if expiry is missing, if it's a trial plan, treat it as such)
  const isTrialCurrentlyActive = Boolean(
    vendor.planType === 'trial' &&
    vendor.freeTrial?.isActive &&
    (!vendor.freeTrial?.expiryDate || new Date(vendor.freeTrial.expiryDate) > now)
  );

  // 2. Monthly Check
  const isMonthlyCurrentlyActive = Boolean(
    vendor.planType === 'monthly' &&
    vendor.expiryDate &&
    new Date(vendor.expiryDate) > now
  );

  if (isTrialCurrentlyActive) {
    return 'trial';
  }

  if (isMonthlyCurrentlyActive) {
    return 'monthly';
  }

  return 'daily';
};

const normalizeVendorPlanState = (vendor) => {
  const effectivePlanType = getEffectivePlanType(vendor);
  let didChange = false;

  if (vendor.planType !== effectivePlanType) {
    vendor.planType = effectivePlanType;
    didChange = true;
  }

  if (effectivePlanType === 'daily') {
    if (vendor.freeTrial?.isActive) {
      vendor.freeTrial = {
        ...(vendor.freeTrial || {}),
        isActive: false
      };
      didChange = true;
    }

    if (vendor.expiryDate && new Date(vendor.expiryDate) <= new Date()) {
      vendor.expiryDate = undefined;
      didChange = true;
    }
  }

  return { effectivePlanType, didChange };
};

const upsertWalletTransactionRecord = async (existingTransaction, payload) => {
  if (existingTransaction) {
    Object.assign(existingTransaction, payload);
    return existingTransaction.save();
  }

  return createWalletTransaction(payload);
};

const getBillingSettings = async () => {
  try {
    const cached = await redis.get(CACHE_KEYS.GLOBAL_SETTINGS);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn('Redis read error for global settings:', err.message);
  }

  let settings = await GlobalSettings.findOne().lean();
  if (!settings) {
    settings = await GlobalSettings.create({}).then(s => s.toObject());
  }

  try {
    await redis.setEx(CACHE_KEYS.GLOBAL_SETTINGS, 3600, JSON.stringify(settings)); // 1 hour cache
  } catch (err) {
    console.warn('Redis write error for global settings:', err.message);
  }

  return settings;
};

const ensureSubscriptionPlans = async () => {
  const operations = [];

  for (const level of PLAN_LEVELS) {
    for (const type of ['daily', 'monthly']) {
      operations.push(
        SubscriptionPlan.findOneAndUpdate(
          { level, type },
          { $setOnInsert: { price: DEFAULT_PLAN_PRICES[level][type] } },
          { upsert: true, returnDocument: 'after' }
        )
      );
    }
  }

  await Promise.all(operations);
};

const getSubscriptionPlanForVendor = async (type, serviceLevel) => {
  const normalizedLevel = getNormalizedServiceLevel(serviceLevel);
  const cacheKey = `${CACHE_KEYS.SUBSCRIPTION_PLANS}:${type}:${normalizedLevel}`;

  // TEMPORARILY BYPASS CACHE TO VERIFY DATABASE UPDATES
  /*
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn('Redis read error for plan:', err.message);
  }
  */

  let plan = await SubscriptionPlan.findOne({ type, level: normalizedLevel }).lean();
  if (!plan) {
    await ensureSubscriptionPlans();
    plan = await SubscriptionPlan.findOne({ type, level: normalizedLevel }).lean();
  }

  if (!plan && normalizedLevel === 'standard') {
    plan = await SubscriptionPlan.findOne({ type, level: 'basic' }).lean();
  }

  if (!plan) {
    throw new Error(`Subscription plan missing for type: ${type}, level: ${normalizedLevel}`);
  }

  try {
    await redis.setEx(cacheKey, 3600, JSON.stringify(plan)); // 1 hour cache
  } catch (err) {
    console.warn('Redis write error for plan:', err.message);
  }

  return plan;
};

const getVendorSubscriptionState = async (vendor, options = {}) => {
  const settings = options.settings || await getBillingSettings();
  const minimumWalletThreshold = settings.minWalletThreshold ?? 100;
  
  const effectivePlanType = getEffectivePlanType(vendor);
  
  const isTrialActive = effectivePlanType === 'trial';
  const isMonthlyActive = effectivePlanType === 'monthly';
  
  const dailyPlan = options.dailyPlan || await getSubscriptionPlanForVendor('daily', vendor.serviceLevel);
  const basePrice = dailyPlan.price || 0;
  const gstAmount = dailyPlan.gstPercent ? (basePrice * dailyPlan.gstPercent) / 100 : 0;
  const dailyPrice = basePrice + gstAmount;
  
  // Rule: Balance must be >= (Threshold + Daily Fees) to stay active
  // But if today's daily fee has already been deducted, totalRequired is just the threshold!
  const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
  const didDeductToday = Boolean(
    vendor.lastDeductionDate &&
    moment(vendor.lastDeductionDate).tz('Asia/Kolkata').format('YYYY-MM-DD') === todayStr
  );

  const totalRequired = didDeductToday
    ? Number(minimumWalletThreshold)
    : Number(minimumWalletThreshold) + dailyPrice;

  const isDailyActive = effectivePlanType === 'daily' && Number(vendor.walletBalance || 0) >= totalRequired;

  return {
    settings,
    minimumWalletThreshold,
    dailyPrice,
    totalRequired,
    isTrialActive,
    isMonthlyActive,
    isDailyActive,
    isDailyBalanceSufficient: Number(vendor.walletBalance || 0) >= totalRequired,
    currentPlan: effectivePlanType,
    isActive: isTrialActive || isMonthlyActive || isDailyActive
  };
};

const getUpdatedStatus = async (vendor) => {
  // 1. Blocked/Rejected vendors stay blocked/rejected regardless of balance
  if (['pending', 'blocked', 'rejected'].includes(vendor.status)) {
    return vendor.status;
  }

  // 2. Normalize Plan Type (e.g. daily to trial if trial was just added)
  const { didChange } = normalizeVendorPlanState(vendor);
  
  // 3. Evaluate Active Status based on Trial/Monthly/Wallet
  const { isActive } = await getVendorSubscriptionState(vendor);
  
  const nextStatus = isActive ? 'active' : 'inactive';

  // 4. Persistence
  if (didChange || vendor.status !== nextStatus) {
    vendor.status = nextStatus;
    await vendor.save();
  }

  return nextStatus;
};

const createWalletTransaction = async ({
  vendorId,
  initiatedByUserId = null,
  amount,
  type,
  reason,
  category,
  status = 'completed',
  paymentGateway = 'system',
  paymentMethod = '',
  gatewayOrderId = '',
  gatewayPaymentId = '',
  gatewaySignature = '',
  referenceId = '',
  description = '',
  metadata = {}
}) => WalletTransaction.create({
  vendorId,
  initiatedByUserId,
  amount,
  type,
  reason,
  category,
  status,
  paymentGateway,
  paymentMethod,
  gatewayOrderId,
  gatewayPaymentId,
  gatewaySignature,
  referenceId,
  description,
  metadata
});

const formatInr = (amount = 0) => `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const processDailyDeduction = async (vendor) => {
  normalizeVendorPlanState(vendor);
  const today = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');

  if (
    vendor.lastDeductionDate &&
    moment(vendor.lastDeductionDate).tz('Asia/Kolkata').format('YYYY-MM-DD') === today
  ) {
    vendor.status = await getUpdatedStatus(vendor);
    return vendor.save();
  }

  const state = await getVendorSubscriptionState(vendor);
  
  // 1. Trial/Monthly are exempt from daily deductions
  if (state.isTrialActive || state.isMonthlyActive) {
    vendor.status = 'active';
    vendor.lastDeductionDate = new Date();
    return vendor.save();
  }

  // 2. Today-Paid Deduction: Take money for the current day (today)
  // We only deduct if the vendor was open for at least 3 hours today
  const dailyPlan = await getSubscriptionPlanForVendor('daily', vendor.serviceLevel);
  const basePrice = dailyPlan.price || 0;
  const gstAmount = dailyPlan.gstPercent ? (basePrice * dailyPlan.gstPercent) / 100 : 0;
  const dailyPrice = basePrice + gstAmount;

  // Calculate cumulative open duration today
  let totalOpenDurationMs = vendor.todayOpenDurationMs || 0;
  if (vendor.isShopOpen && vendor.lastOpenedAt) {
    const currentSession = Date.now() - new Date(vendor.lastOpenedAt).getTime();
    totalOpenDurationMs += currentSession;
  }

  const minOpenDurationMs = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
  const wasOpenAtLeast3Hours = totalOpenDurationMs >= minOpenDurationMs;

  if (wasOpenAtLeast3Hours) {
    const referenceId = `TODAY_DAILY_${vendor._id}_${today}`;
    
    // 🛡️ IDEMPOTENCY CHECK: Ensure we haven't already deducted for this day
    const existing = await WalletTransaction.findOne({ referenceId });
    if (!existing) {
      vendor.walletBalance -= dailyPrice;
      await createWalletTransaction({
        vendorId: vendor._id,
        initiatedByUserId: vendor.ownerId,
        amount: dailyPrice,
        type: 'debit',
        reason: 'daily_subscription',
        category: 'daily_subscription',
        paymentGateway: 'system',
        paymentMethod: 'wallet',
        referenceId,
        description: `${getNormalizedServiceLevel(vendor.serviceLevel)} Service Day: ${today}. (Base: ₹${basePrice} + GST: ₹${gstAmount})`
      });
    }
  }

  // Reset open duration tracking fields for the next billing cycle
  vendor.todayOpenDurationMs = 0;
  vendor.lastOpenedAt = vendor.isShopOpen ? new Date() : null;

  // 3. Status Update: Set status based on new balance
  // Since we updated lastDeductionDate to today, the threshold check will dynamically
  // drop to just minimumWalletThreshold (e.g. ₹10) for the rest of today.
  vendor.lastDeductionDate = new Date();
  const updatedState = await getVendorSubscriptionState(vendor);
  vendor.status = updatedState.isActive ? 'active' : 'inactive';

  if (!updatedState.isActive) {
    const shortfall = Math.max(updatedState.totalRequired - vendor.walletBalance, 0);
    await NotificationService.sendNotification({
      userIds: vendor.ownerId,
      role: 'vendor',
      type: 'LOW_BALANCE',
      title: 'Wallet Balance Low',
      message: `Keep at least ${formatInr(state.totalRequired)} (Threshold + Daily Fees) in your wallet to stay live. Current balance: ${formatInr(vendor.walletBalance)}. Add ${formatInr(shortfall)} to resume.`,
      referenceId: `LOW_BAL_${vendor._id}_${today}`
    });
  }

  return vendor.save();
};

const addFunds = async (vendor, amount, reason = 'admin_topup', options = {}) => {
  normalizeVendorPlanState(vendor);
  vendor.walletBalance += amount;

  await upsertWalletTransactionRecord(options.existingTransaction, {
    vendorId: vendor._id,
    initiatedByUserId: options.initiatedByUserId || vendor.ownerId,
    amount,
    type: 'credit',
    reason,
    category: options.category || 'admin_topup',
    status: options.status || 'completed',
    paymentGateway: options.paymentGateway || 'admin',
    paymentMethod: options.paymentMethod || 'admin_manual',
    gatewayOrderId: options.gatewayOrderId || '',
    gatewayPaymentId: options.gatewayPaymentId || '',
    gatewaySignature: options.gatewaySignature || '',
    referenceId: options.referenceId || `TOPUP_${vendor._id}_${Date.now()}`,
    description: options.description || 'Wallet balance credited',
    metadata: options.metadata || {}
  });

  vendor.status = await getUpdatedStatus(vendor);
  await vendor.save();

  await NotificationService.sendNotification({
    userIds: vendor.ownerId,
    role: 'vendor',
    type: 'WALLET_TOPUP',
    title: 'Wallet Top-up',
    message: `${formatInr(amount)} has been credited to your wallet. Current balance: ${formatInr(vendor.walletBalance)}.`,
    referenceId: options.notificationReferenceId || `TOPUP_NOTIFY_${vendor._id}_${Date.now()}`
  });

  return vendor;
};

const activateMonthlySubscription = async (vendor, options = {}) => {
  normalizeVendorPlanState(vendor);
  const monthlyPlan = await getSubscriptionPlanForVendor('monthly', vendor.serviceLevel);
  const basePrice = monthlyPlan.price || 0;
  const gstAmount = monthlyPlan.gstPercent ? (basePrice * monthlyPlan.gstPercent) / 100 : 0;
  const totalPrice = basePrice + gstAmount;

  const baseDate =
    vendor.planType === 'monthly' && vendor.expiryDate && new Date(vendor.expiryDate) > new Date()
      ? moment(vendor.expiryDate)
      : moment();

  vendor.planType = 'monthly';
  vendor.expiryDate = baseDate.add(30, 'days').toDate();
  vendor.freeTrial = {
    ...(vendor.freeTrial || {}),
    isActive: false
  };
  vendor.status = 'active';
  await vendor.save();

  await upsertWalletTransactionRecord(options.existingTransaction, {
    vendorId: vendor._id,
    initiatedByUserId: options.initiatedByUserId || vendor.ownerId,
    amount: totalPrice,
    type: 'debit',
    reason: 'monthly_subscription',
    category: 'monthly_subscription',
    status: options.status || 'completed',
    paymentGateway: options.paymentGateway || 'razorpay',
    paymentMethod: options.paymentMethod || 'razorpay',
    gatewayOrderId: options.gatewayOrderId || '',
    gatewayPaymentId: options.gatewayPaymentId || '',
    gatewaySignature: options.gatewaySignature || '',
    referenceId: options.referenceId || `MONTHLY_${vendor._id}_${Date.now()}`,
    description: `${getNormalizedServiceLevel(vendor.serviceLevel)} monthly subscription purchase`,
    metadata: options.metadata || {}
  });

  await NotificationService.sendNotification({
    userIds: vendor.ownerId,
    role: 'vendor',
    type: 'SUBSCRIPTION_ACTIVE',
    title: 'Monthly Subscription Activated',
    message: `Your ${getNormalizedServiceLevel(vendor.serviceLevel)} monthly plan is active until ${moment(vendor.expiryDate).format('D MMMM YYYY')}. Daily wallet deductions are paused until then.`,
    referenceId: options.notificationReferenceId || `MONTHLY_NOTIFY_${vendor._id}_${Date.now()}`
  });

  return {
    vendor,
    monthlyPlan
  };
};

module.exports = {
  PLAN_LEVELS,
  DEFAULT_PLAN_PRICES,
  getNormalizedServiceLevel,
  getEffectivePlanType,
  getBillingSettings,
  ensureSubscriptionPlans,
  getSubscriptionPlanForVendor,
  getVendorSubscriptionState,
  getUpdatedStatus,
  createWalletTransaction,
  processDailyDeduction,
  addFunds,
  activateMonthlySubscription
};
