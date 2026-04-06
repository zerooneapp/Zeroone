const moment = require('moment-timezone');
const WalletTransaction = require('../models/WalletTransaction');
const {
  getBillingSettings,
  getNormalizedServiceLevel,
  getSubscriptionPlanForVendor,
  getVendorSubscriptionState,
  createWalletTransaction,
  addFunds,
  activateMonthlySubscription
} = require('../services/walletService');
const {
  getRazorpayConfig,
  createRazorpayOrder,
  verifyRazorpaySignature
} = require('../services/razorpayService');

const buildRazorpayReceipt = (prefix, vendorId) => {
  const compactTimestamp = Date.now().toString(36);
  const compactVendor = String(vendorId).slice(-8);
  return `${prefix}_${compactVendor}_${compactTimestamp}`.slice(0, 40);
};

const getOrderCreationStatusCode = (message = '') => {
  if (
    message.includes('Razorpay is not configured') ||
    message.includes('Failed to create Razorpay order') ||
    message.includes('receipt') ||
    message.includes('amount')
  ) {
    return 400;
  }

  return 500;
};

const getVendorWalletOverview = async (req, res) => {
  try {
    const vendor = req.vendor;
    const settings = await getBillingSettings();
    const subscriptionState = await getVendorSubscriptionState(vendor);
    const serviceLevel = getNormalizedServiceLevel(vendor.serviceLevel);
    const [dailyPlan, monthlyPlan] = await Promise.all([
      getSubscriptionPlanForVendor('daily', serviceLevel),
      getSubscriptionPlanForVendor('monthly', serviceLevel)
    ]);
    const razorpay = getRazorpayConfig();
    const requiredBalanceToday = (settings.minWalletThreshold || 100) + dailyPlan.price;
    const shortfallToResume = Math.max(requiredBalanceToday - (vendor.walletBalance || 0), 0);
    const recommendedTopup = shortfallToResume > 0 ? shortfallToResume : dailyPlan.price;

    res.status(200).json({
      walletBalance: vendor.walletBalance || 0,
      minimumWalletThreshold: settings.minWalletThreshold || 100,
      requiredBalanceToday,
      shortfallToResume,
      recommendedTopup,
      freeTrialDays: settings.freeTrialDays || 7,
      currency: 'INR',
      razorpay: {
        enabled: razorpay.enabled,
        keyId: razorpay.keyId || ''
      },
      subscription: {
        ...subscriptionState,
        serviceLevel,
        planExpiry: subscriptionState.isTrialActive
          ? vendor.freeTrial?.expiryDate || null
          : (subscriptionState.isMonthlyActive ? vendor.expiryDate || null : null),
        nextDeduction: vendor.planType === 'daily'
          ? moment().tz('Asia/Kolkata').add(1, 'day').startOf('day').toDate()
          : null
      },
      plans: {
        serviceLevel,
        daily: {
          _id: dailyPlan._id,
          type: dailyPlan.type,
          level: dailyPlan.level,
          price: dailyPlan.price
        },
        monthly: {
          _id: monthlyPlan._id,
          type: monthlyPlan.type,
          level: monthlyPlan.level,
          price: monthlyPlan.price
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createWalletTopupOrder = async (req, res) => {
  try {
    const vendor = req.vendor;
    const amount = Number(req.body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Enter a valid top-up amount' });
    }

    const receipt = buildRazorpayReceipt('topup', vendor._id);
    const order = await createRazorpayOrder({
      amount,
      receipt,
      notes: {
        vendorId: String(vendor._id),
        purpose: 'wallet_topup'
      }
    });

    const transaction = await createWalletTransaction({
      vendorId: vendor._id,
      initiatedByUserId: vendor.ownerId,
      amount,
      type: 'credit',
      reason: 'wallet_topup',
      category: 'wallet_topup',
      status: 'pending',
      paymentGateway: 'razorpay',
      paymentMethod: 'razorpay',
      gatewayOrderId: order.id,
      referenceId: receipt.toUpperCase(),
      description: 'Vendor wallet top-up initiated',
      metadata: {
        razorpayOrderId: order.id
      }
    });

    res.status(201).json({
      order,
      transactionId: transaction._id,
      keyId: getRazorpayConfig().keyId
    });
  } catch (error) {
    res.status(getOrderCreationStatusCode(error.message)).json({ message: error.message });
  }
};

const verifyWalletTopup = async (req, res) => {
  try {
    const vendor = req.vendor;
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    } = req.body || {};

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    const transaction = await WalletTransaction.findOne({
      vendorId: vendor._id,
      gatewayOrderId: orderId,
      category: 'wallet_topup'
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Pending top-up transaction not found' });
    }

    if (transaction.status === 'completed') {
      return res.status(200).json({
        message: 'Wallet top-up already verified',
        walletBalance: vendor.walletBalance,
        transaction
      });
    }

    const isValid = verifyRazorpaySignature({
      orderId,
      paymentId,
      signature
    });

    if (!isValid) {
      transaction.status = 'failed';
      transaction.gatewayPaymentId = paymentId;
      transaction.gatewaySignature = signature;
      await transaction.save();
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    await addFunds(vendor, transaction.amount, 'wallet_topup', {
      existingTransaction: transaction,
      initiatedByUserId: vendor.ownerId,
      category: 'wallet_topup',
      status: 'completed',
      paymentGateway: 'razorpay',
      paymentMethod: 'razorpay',
      gatewayOrderId: orderId,
      gatewayPaymentId: paymentId,
      gatewaySignature: signature,
      referenceId: transaction.referenceId,
      description: 'Vendor wallet top-up completed',
      metadata: {
        ...(transaction.metadata || {}),
        verifiedAt: new Date().toISOString()
      }
    });

    res.status(200).json({
      message: 'Wallet recharged successfully',
      walletBalance: vendor.walletBalance,
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createMonthlySubscriptionOrder = async (req, res) => {
  try {
    const vendor = req.vendor;
    const monthlyPlan = await getSubscriptionPlanForVendor('monthly', vendor.serviceLevel);
    const receipt = buildRazorpayReceipt('monthly', vendor._id);
    const order = await createRazorpayOrder({
      amount: monthlyPlan.price,
      receipt,
      notes: {
        vendorId: String(vendor._id),
        purpose: 'monthly_subscription',
        serviceLevel: getNormalizedServiceLevel(vendor.serviceLevel)
      }
    });

    const transaction = await createWalletTransaction({
      vendorId: vendor._id,
      initiatedByUserId: vendor.ownerId,
      amount: monthlyPlan.price,
      type: 'debit',
      reason: 'monthly_subscription',
      category: 'monthly_subscription',
      status: 'pending',
      paymentGateway: 'razorpay',
      paymentMethod: 'razorpay',
      gatewayOrderId: order.id,
      referenceId: receipt.toUpperCase(),
      description: `${getNormalizedServiceLevel(vendor.serviceLevel)} monthly subscription initiated`,
      metadata: {
        razorpayOrderId: order.id,
        serviceLevel: getNormalizedServiceLevel(vendor.serviceLevel)
      }
    });

    res.status(201).json({
      order,
      transactionId: transaction._id,
      keyId: getRazorpayConfig().keyId,
      amount: monthlyPlan.price,
      serviceLevel: getNormalizedServiceLevel(vendor.serviceLevel)
    });
  } catch (error) {
    res.status(getOrderCreationStatusCode(error.message)).json({ message: error.message });
  }
};

const verifyMonthlySubscription = async (req, res) => {
  try {
    const vendor = req.vendor;
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    } = req.body || {};

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    const transaction = await WalletTransaction.findOne({
      vendorId: vendor._id,
      gatewayOrderId: orderId,
      category: 'monthly_subscription'
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Pending subscription transaction not found' });
    }

    if (transaction.status === 'completed') {
      return res.status(200).json({
        message: 'Monthly subscription already activated',
        expiryDate: vendor.expiryDate,
        transaction
      });
    }

    const isValid = verifyRazorpaySignature({
      orderId,
      paymentId,
      signature
    });

    if (!isValid) {
      transaction.status = 'failed';
      transaction.gatewayPaymentId = paymentId;
      transaction.gatewaySignature = signature;
      await transaction.save();
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    await activateMonthlySubscription(vendor, {
      existingTransaction: transaction,
      initiatedByUserId: vendor.ownerId,
      status: 'completed',
      paymentGateway: 'razorpay',
      paymentMethod: 'razorpay',
      gatewayOrderId: orderId,
      gatewayPaymentId: paymentId,
      gatewaySignature: signature,
      referenceId: transaction.referenceId,
      metadata: {
        ...(transaction.metadata || {}),
        verifiedAt: new Date().toISOString()
      }
    });

    res.status(200).json({
      message: 'Monthly subscription activated successfully',
      expiryDate: vendor.expiryDate,
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getVendorWalletOverview,
  createWalletTopupOrder,
  verifyWalletTopup,
  createMonthlySubscriptionOrder,
  verifyMonthlySubscription
};
