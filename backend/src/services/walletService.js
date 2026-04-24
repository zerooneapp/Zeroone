const WalletTransaction = require('../models/WalletTransaction');
const GlobalSettings = require('../models/GlobalSettings');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const moment = require('moment-timezone');
const NotificationService = require('./notificationService');

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
  let settings = await GlobalSettings.findOne();
  if (!settings) {
    settings = await GlobalSettings.create({});
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
          { upsert: true, new: true }
        )
      );
    }
  }

  await Promise.all(operations);
};

const getSubscriptionPlanForVendor = async (type, serviceLevel) => {
  await ensureSubscriptionPlans();
  const normalizedLevel = getNormalizedServiceLevel(serviceLevel);

  let plan = await SubscriptionPlan.findOne({ type, level: normalizedLevel });
  if (!plan && normalizedLevel === 'standard') {
    plan = await SubscriptionPlan.findOne({ type, level: 'basic' });
  }

  if (!plan) {
    throw new Error(`Subscription plan missing for type: ${type}, level: ${normalizedLevel}`);
  }

  return plan;
};

const getVendorSubscriptionState = async (vendor) => {
  const settings = await getBillingSettings();
  const minimumWalletThreshold = settings.minWalletThreshold ?? 100;
  const now = new Date();
  
  const effectivePlanType = getEffectivePlanType(vendor);
  
  const isTrialActive = effectivePlanType === 'trial';
  const isMonthlyActive = effectivePlanType === 'monthly';
  const isDailyActive = effectivePlanType === 'daily' && Number(vendor.walletBalance || 0) >= Number(minimumWalletThreshold);

  return {
    settings,
    minimumWalletThreshold,
    isTrialActive,
    isMonthlyActive,
    isDailyActive,
    isDailyBalanceSufficient: Number(vendor.walletBalance || 0) >= Number(minimumWalletThreshold),
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
  const yesterday = moment().tz('Asia/Kolkata').subtract(1, 'day').format('YYYY-MM-DD');

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

  // 2. Post-Paid Deduction: Take money for the day that just passed
  // We only deduct if the vendor was "Discoverable" (Active) during that period
  const dailyPlan = await getSubscriptionPlanForVendor('daily', vendor.serviceLevel);
  const basePrice = dailyPlan.price || 0;
  const gstAmount = dailyPlan.gstPercent ? (basePrice * dailyPlan.gstPercent) / 100 : 0;
  const dailyPrice = basePrice + gstAmount;

  const wasActiveYesterday = vendor.status === 'active';

  if (wasActiveYesterday) {
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
      referenceId: `POST_DAILY_${vendor._id}_${today}`,
      description: `${getNormalizedServiceLevel(vendor.serviceLevel)} Service Day: ${yesterday}. (Base: ₹${basePrice} + GST: ₹${gstAmount})`
    });
  }

  // 3. Status Update: Set status for the UPCOMING day based on new balance
  const isBalanceSufficient = vendor.walletBalance >= state.minimumWalletThreshold;
  vendor.status = isBalanceSufficient ? 'active' : 'inactive';
  vendor.lastDeductionDate = new Date();

  if (!isBalanceSufficient) {
    const shortfall = Math.max(state.minimumWalletThreshold - vendor.walletBalance, 0);
    await NotificationService.sendNotification({
      userIds: vendor.ownerId,
      role: 'vendor',
      type: 'LOW_BALANCE',
      title: 'Wallet Balance Low',
      message: `Keep at least ${formatInr(state.minimumWalletThreshold)} in your wallet to stay live. Current balance: ${formatInr(vendor.walletBalance)}. Add ${formatInr(shortfall)} to resume.`,
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

  if (vendor.planType === 'daily') {
    const didDeductToday = Boolean(
      vendor.lastDeductionDate &&
      moment(vendor.lastDeductionDate).tz('Asia/Kolkata').isSame(moment().tz('Asia/Kolkata'), 'day')
    );

    if (!didDeductToday) {
      await processDailyDeduction(vendor);
    } else {
      vendor.status = await getUpdatedStatus(vendor);
      await vendor.save();
    }
  } else {
    vendor.status = await getUpdatedStatus(vendor);
    await vendor.save();
  }

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
    message: `Your ${getNormalizedServiceLevel(vendor.serviceLevel)} monthly plan is active until ${moment(vendor.expiryDate).format('DD MMM YYYY')}. Daily wallet deductions are paused until then.`,
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
