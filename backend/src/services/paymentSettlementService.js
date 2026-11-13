const WalletTransaction = require('../models/WalletTransaction');
const Vendor = require('../models/Vendor');
const { verifyGatewayPayment } = require('./paymentGatewayService');
const { addFunds, activateMonthlySubscription } = require('./walletService');
const VendorPromotion = require('../models/VendorPromotion');
const { settlePromotionPayment } = require('./promotionService');

const SETTLE_LOCK_MS = 2 * 60 * 1000;
const RECONCILABLE_CATEGORIES = ['wallet_topup', 'monthly_subscription'];

/**
 * Atomically claim a pending transaction so that the verify endpoint, the
 * webhook and the reconcile job can never credit the same payment twice.
 * Returns the claimed transaction, or null if it is already settled / being
 * settled by someone else.
 */
const claimPendingTransaction = (transactionId) => {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - SETTLE_LOCK_MS);
  return WalletTransaction.findOneAndUpdate(
    {
      _id: transactionId,
      status: 'pending',
      $or: [
        { 'metadata.settlingAt': { $exists: false } },
        { 'metadata.settlingAt': null },
        { 'metadata.settlingAt': { $lt: staleBefore } }
      ]
    },
    { $set: { 'metadata.settlingAt': now } },
    { new: true }
  );
};

const releaseClaim = (transactionId) =>
  WalletTransaction.updateOne(
    { _id: transactionId, status: 'pending' },
    { $unset: { 'metadata.settlingAt': '' } }
  );

/**
 * Credit a verified payment. Idempotent: safe to call from verify, webhook
 * and reconcile for the same transaction.
 * Returns { settled: boolean, alreadySettled: boolean }.
 */
const settleVerifiedTransaction = async (transaction, { gateway, paymentId, signature, source }) => {
  if (transaction.status === 'completed') return { settled: false, alreadySettled: true };

  const claimed = await claimPendingTransaction(transaction._id);
  if (!claimed) return { settled: false, alreadySettled: false };

  try {
    const vendor = await Vendor.findById(claimed.vendorId);
    if (!vendor) throw new Error('Vendor not found for payment');

    const metadata = { ...(claimed.metadata || {}), verifiedAt: new Date().toISOString(), source };
    delete metadata.settlingAt;

    const options = {
      existingTransaction: claimed,
      initiatedByUserId: claimed.initiatedByUserId || vendor.ownerId,
      status: 'completed',
      paymentGateway: gateway,
      paymentMethod: gateway,
      gatewayOrderId: claimed.gatewayOrderId,
      gatewayPaymentId: paymentId || '',
      gatewaySignature: signature || '',
      referenceId: claimed.referenceId,
      metadata
    };

    if (claimed.category === 'wallet_topup') {
      await addFunds(vendor, claimed.amount, 'wallet_topup', {
        ...options,
        category: 'wallet_topup',
        description: 'Vendor wallet top-up completed'
      });
    } else if (claimed.category === 'monthly_subscription') {
      await activateMonthlySubscription(vendor, options);
    } else {
      throw new Error(`Unsupported payment category: ${claimed.category}`);
    }
    return { settled: true, alreadySettled: false };
  } catch (error) {
    await releaseClaim(claimed._id).catch(() => {});
    throw error;
  }
};

/**
 * Recover payments that succeeded at the gateway but were never credited
 * (webhook missed, app closed before verify, UPI app switch, etc.).
 * Only Cashfree can be confirmed server-side by order id. Razorpay needs a
 * signature from the client and is settled by its webhook.
 */
const reconcilePendingPayments = async ({ vendorId, minAgeMs = 15 * 1000, maxAgeMs = 24 * 60 * 60 * 1000, limit = 50 } = {}) => {
  const now = Date.now();
  const filter = {
    status: 'pending',
    category: { $in: RECONCILABLE_CATEGORIES },
    paymentGateway: 'cashfree',
    gatewayOrderId: { $exists: true, $ne: '' },
    createdAt: { $gte: new Date(now - maxAgeMs), $lte: new Date(now - minAgeMs) }
  };
  if (vendorId) filter.vendorId = vendorId;

  const pending = await WalletTransaction.find(filter).sort({ createdAt: 1 }).limit(limit);
  let settledCount = 0;

  for (const transaction of pending) {
    try {
      const verification = await verifyGatewayPayment({
        gateway: transaction.paymentGateway,
        orderId: transaction.gatewayOrderId,
        expectedAmount: transaction.amount
      });
      if (!verification.verified) continue;

      const result = await settleVerifiedTransaction(transaction, {
        gateway: transaction.paymentGateway,
        paymentId: verification.paymentId,
        signature: '',
        source: 'reconcile'
      });
      if (result.settled) {
        settledCount += 1;
        console.log(`[PAYMENT-RECONCILE] Credited ${transaction.category} ${transaction.gatewayOrderId} (vendor ${transaction.vendorId})`);
      }
    } catch (error) {
      // Gateway hiccups or "order does not exist" must never break the caller.
      console.warn(`[PAYMENT-RECONCILE] ${transaction.gatewayOrderId}: ${error.message}`);
    }
  }

  // Profile-boost payments: the promotion row exists from checkout start, so a
  // paid-but-unverified one (webhook missed, UPI app-switch) is still
  // 'pending' with no payment id. Confirm it with Cashfree and settle it.
  const promoFilter = {
    status: 'pending',
    paymentGateway: 'cashfree',
    gatewayOrderId: { $exists: true, $ne: '' },
    $or: [{ paymentId: { $exists: false } }, { paymentId: null }, { paymentId: '' }],
    createdAt: { $gte: new Date(now - maxAgeMs), $lte: new Date(now - minAgeMs) }
  };
  if (vendorId) promoFilter.vendorId = vendorId;

  const pendingPromotions = await VendorPromotion.find(promoFilter).sort({ createdAt: 1 }).limit(limit);
  for (const promotion of pendingPromotions) {
    try {
      const verification = await verifyGatewayPayment({
        gateway: promotion.paymentGateway,
        orderId: promotion.gatewayOrderId,
        expectedAmount: promotion.amountPaid
      });
      if (!verification.verified) continue;

      const result = await settlePromotionPayment({ promotion, paymentId: verification.paymentId });
      if (result.settled) {
        settledCount += 1;
        console.log(`[PAYMENT-RECONCILE] Settled promotion ${promotion.gatewayOrderId} (vendor ${promotion.vendorId})`);
      }
    } catch (error) {
      console.warn(`[PAYMENT-RECONCILE] promotion ${promotion.gatewayOrderId}: ${error.message}`);
    }
  }

  return { checked: pending.length + pendingPromotions.length, settled: settledCount };
};

module.exports = { settleVerifiedTransaction, reconcilePendingPayments };
