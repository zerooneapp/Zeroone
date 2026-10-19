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
  getPaymentGatewaySettings,
  createGatewayOrder,
  verifyGatewayPayment
} = require('../services/paymentGatewayService');

const buildRazorpayReceipt = (prefix, vendorId) => {
  const compactTimestamp = Date.now().toString(36);
  const compactVendor = String(vendorId).slice(-8);
  return `${prefix}_${compactVendor}_${compactTimestamp}`.slice(0, 40);
};

const getOrderCreationStatusCode = (message = '') => {
  if (
    message.includes('Razorpay is not configured') ||
    message.includes('Cashfree is not configured') ||
    message.includes('Failed to create Razorpay order') ||
    message.includes('Failed to create Cashfree order') ||
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
    const paymentGateway = await getPaymentGatewaySettings();
    const dailyBase = dailyPlan.price || 0;
    const dailyGstAmount = dailyPlan.gstPercent ? (dailyBase * dailyPlan.gstPercent) / 100 : 0;
    const dailyTotal = dailyBase + dailyGstAmount;

    const monthlyBase = monthlyPlan.price || 0;
    const monthlyGstAmount = monthlyPlan.gstPercent ? (monthlyBase * monthlyPlan.gstPercent) / 100 : 0;
    const monthlyTotal = monthlyBase + monthlyGstAmount;

    const requiredBalanceToday = (settings.minWalletThreshold || 100) + dailyTotal;
    const shortfallToResume = Math.max(requiredBalanceToday - (vendor.walletBalance || 0), 0);
    const recommendedTopup = shortfallToResume > 0 ? shortfallToResume : dailyTotal;
    const isLowBalanceWarning = vendor.walletBalance < requiredBalanceToday && subscriptionState.currentPlan === 'daily';

    res.status(200).json({
      walletBalance: vendor.walletBalance || 0,
      minimumWalletThreshold: settings.minWalletThreshold || 100,
      requiredBalanceToday,
      shortfallToResume,
      recommendedTopup,
      isLowBalanceWarning,
      freeTrialDays: settings.freeTrialDays || 7,
      minWithdrawalAmount: settings.minWithdrawalAmount || 100,
      currency: 'INR',
      paymentGateway,
      razorpay: paymentGateway.razorpay,
      cashfree: paymentGateway.cashfree,
      subscription: {
        ...subscriptionState,
        serviceLevel,
        planExpiry: subscriptionState.isTrialActive
          ? vendor.freeTrial?.expiryDate || null
          : (subscriptionState.isMonthlyActive ? vendor.expiryDate || null : null),
        nextDeduction: (() => {
          if (vendor.planType !== 'daily') return null;

          const today = moment().tz('Asia/Kolkata');
          const didDeductToday = vendor.lastDeductionDate && 
            moment(vendor.lastDeductionDate).tz('Asia/Kolkata').format('YYYY-MM-DD') === today.format('YYYY-MM-DD');

          const deductionDay = didDeductToday ? today.clone().add(1, 'day') : today.clone();

          const endTimeStr = vendor.workingHours?.end || '09:00 PM';
          const endTime = moment.tz(endTimeStr, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');
          if (!endTime.isValid()) {
            return deductionDay.startOf('day').toDate();
          }

          return deductionDay.hour(endTime.hour()).minute(endTime.minute()).second(0).millisecond(0).subtract(1, 'hour').toDate();
        })()
      },
      plans: {
        serviceLevel,
        daily: {
          _id: dailyPlan._id,
          type: dailyPlan.type,
          level: dailyPlan.level,
          price: dailyTotal,
          basePrice: dailyBase,
          gstPercent: dailyPlan.gstPercent || 0,
          gstAmount: dailyGstAmount
        },
        monthly: {
          _id: monthlyPlan._id,
          type: monthlyPlan.type,
          level: monthlyPlan.level,
          price: monthlyTotal,
          basePrice: monthlyBase,
          gstPercent: monthlyPlan.gstPercent || 0,
          gstAmount: monthlyGstAmount
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
    const order = await createGatewayOrder({
      amount,
      receipt,
      notes: {
        vendorId: String(vendor._id),
        purpose: 'wallet_topup'
      },
      customer: {
        customerId: vendor.ownerId,
        name: req.user?.name,
        phone: req.user?.phone,
        email: req.user?.email
      },
      orderNote: 'ZeroOne vendor wallet top-up',
      notifyUrl: process.env.CASHFREE_WEBHOOK_URL
    });

    const transaction = await createWalletTransaction({
      vendorId: vendor._id,
      initiatedByUserId: vendor.ownerId,
      amount,
      type: 'credit',
      reason: 'wallet_topup',
      category: 'wallet_topup',
      status: 'pending',
      paymentGateway: order.gateway,
      paymentMethod: order.gateway,
      gatewayOrderId: order.orderId,
      referenceId: receipt.toUpperCase(),
      description: 'Vendor wallet top-up initiated',
      metadata: {
        gateway: order.gateway,
        paymentSessionId: order.paymentSessionId || '',
        razorpayOrderId: order.gateway === 'razorpay' ? order.orderId : ''
      }
    });

    res.status(201).json({
      ...order,
      transactionId: transaction._id
    });
  } catch (error) {
    res.status(getOrderCreationStatusCode(error.message)).json({ message: error.message });
  }
};

const verifyWalletTopup = async (req, res) => {
  try {
    const vendor = req.vendor;
    const body = req.body || {};
    const requestedGateway = String(body.gateway || '').toLowerCase();
    const submittedOrderId = body.razorpay_order_id || body.order_id || body.orderId;
    const submittedPaymentId = body.razorpay_payment_id || body.cf_payment_id || body.paymentId;

    if (!submittedOrderId) {
      return res.status(400).json({ message: 'Missing payment order id' });
    }

    const transaction = await WalletTransaction.findOne({
      vendorId: vendor._id,
      gatewayOrderId: submittedOrderId,
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

    const gateway = transaction.paymentGateway || requestedGateway || 'razorpay';
    const verification = await verifyGatewayPayment({
      gateway,
      orderId: submittedOrderId,
      paymentId: submittedPaymentId,
      signature: body.razorpay_signature || body.signature,
      expectedAmount: transaction.amount
    });

    if (!verification.verified) {
      transaction.status = 'failed';
      transaction.gatewayPaymentId = verification.paymentId || submittedPaymentId || '';
      transaction.gatewaySignature = body.razorpay_signature || body.signature || '';
      await transaction.save();
      return res.status(400).json({ message: verification.message || 'Payment verification failed' });
    }

    await addFunds(vendor, transaction.amount, 'wallet_topup', {
      existingTransaction: transaction,
      initiatedByUserId: vendor.ownerId,
      category: 'wallet_topup',
      status: 'completed',
      paymentGateway: gateway,
      paymentMethod: gateway,
      gatewayOrderId: submittedOrderId,
      gatewayPaymentId: verification.paymentId || submittedPaymentId || '',
      gatewaySignature: body.razorpay_signature || body.signature || '',
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
    const order = await createGatewayOrder({
      amount: monthlyPlan.price,
      receipt,
      notes: {
        vendorId: String(vendor._id),
        purpose: 'monthly_subscription',
        serviceLevel: getNormalizedServiceLevel(vendor.serviceLevel)
      },
      customer: {
        customerId: vendor.ownerId,
        name: req.user?.name,
        phone: req.user?.phone,
        email: req.user?.email
      },
      orderNote: `${getNormalizedServiceLevel(vendor.serviceLevel)} monthly subscription`,
      notifyUrl: process.env.CASHFREE_WEBHOOK_URL
    });

    const transaction = await createWalletTransaction({
      vendorId: vendor._id,
      initiatedByUserId: vendor.ownerId,
      amount: monthlyPlan.price,
      type: 'debit',
      reason: 'monthly_subscription',
      category: 'monthly_subscription',
      status: 'pending',
      paymentGateway: order.gateway,
      paymentMethod: order.gateway,
      gatewayOrderId: order.orderId,
      referenceId: receipt.toUpperCase(),
      description: `${getNormalizedServiceLevel(vendor.serviceLevel)} monthly subscription initiated`,
      metadata: {
        gateway: order.gateway,
        paymentSessionId: order.paymentSessionId || '',
        serviceLevel: getNormalizedServiceLevel(vendor.serviceLevel)
      }
    });

    res.status(201).json({
      ...order,
      transactionId: transaction._id,
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
    const body = req.body || {};
    const submittedOrderId = body.razorpay_order_id || body.order_id || body.orderId;
    const submittedPaymentId = body.razorpay_payment_id || body.cf_payment_id || body.paymentId;

    if (!submittedOrderId) {
      return res.status(400).json({ message: 'Missing payment order id' });
    }

    const transaction = await WalletTransaction.findOne({
      vendorId: vendor._id,
      gatewayOrderId: submittedOrderId,
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

    const gateway = transaction.paymentGateway || String(body.gateway || 'razorpay').toLowerCase();
    const verification = await verifyGatewayPayment({
      gateway,
      orderId: submittedOrderId,
      paymentId: submittedPaymentId,
      signature: body.razorpay_signature || body.signature,
      expectedAmount: transaction.amount
    });

    if (!verification.verified) {
      transaction.status = 'failed';
      transaction.gatewayPaymentId = verification.paymentId || submittedPaymentId || '';
      transaction.gatewaySignature = body.razorpay_signature || body.signature || '';
      await transaction.save();
      return res.status(400).json({ message: verification.message || 'Payment verification failed' });
    }

    await activateMonthlySubscription(vendor, {
      existingTransaction: transaction,
      initiatedByUserId: vendor.ownerId,
      status: 'completed',
      paymentGateway: gateway,
      paymentMethod: gateway,
      gatewayOrderId: submittedOrderId,
      gatewayPaymentId: verification.paymentId || submittedPaymentId || '',
      gatewaySignature: body.razorpay_signature || body.signature || '',
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

const requestWithdrawal = async (req, res) => {
  try {
    const vendor = req.vendor;
    const { amount, method, bankDetails, upiDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Enter a valid amount' });
    }

    const settings = await getBillingSettings();
    const minWithdrawal = settings.minWithdrawalAmount || 100;

    if (amount < minWithdrawal) {
      return res.status(400).json({ message: `Minimum withdrawal amount is ₹${minWithdrawal}` });
    }

    if (vendor.walletBalance < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    // Check if there is already a pending request
    const WithdrawalRequest = require('../models/WithdrawalRequest');
    const existing = await WithdrawalRequest.findOne({ vendorId: vendor._id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending withdrawal request' });
    }

    const request = await WithdrawalRequest.create({
      vendorId: vendor._id,
      amount,
      method,
      bankDetails,
      upiDetails,
      referenceId: `WITHDRAW_${vendor._id}_${Date.now()}`
    });

    res.status(201).json({ message: 'Withdrawal request submitted successfully', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyWithdrawalRequests = async (req, res) => {
  try {
    const WithdrawalRequest = require('../models/WithdrawalRequest');
    const requests = await WithdrawalRequest.find({ vendorId: req.vendor._id }).sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getVendorWalletOverview,
  createWalletTopupOrder,
  verifyWalletTopup,
  createMonthlySubscriptionOrder,
  verifyMonthlySubscription,
  requestWithdrawal,
  getMyWithdrawalRequests
};
