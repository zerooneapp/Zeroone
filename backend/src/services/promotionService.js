const VendorPromotion = require('../models/VendorPromotion');
const Vendor = require('../models/Vendor');

/**
 * Expires every active profile boost whose endDate has passed.
 * - VendorPromotion.status -> 'expired'
 * - Vendor.isPromoted -> false (only if the vendor has no other running boost)
 *
 * Pass a vendorId to limit the work to one vendor (used on request paths so
 * the vendor never sees a stale "Activated" boost); omit it for the cron.
 * Safe to call repeatedly.
 */
const expireDuePromotions = async (vendorId = null) => {
  const now = new Date();
  const dueFilter = { status: 'active', endDate: { $lte: now } };
  if (vendorId) dueFilter.vendorId = vendorId;

  const due = await VendorPromotion.find(dueFilter).select('_id vendorId');
  if (!due.length) return 0;

  await VendorPromotion.updateMany(
    { _id: { $in: due.map((p) => p._id) }, status: 'active' },
    { $set: { status: 'expired' } }
  );

  const vendorIds = [...new Set(due.map((p) => String(p.vendorId)))];
  for (const id of vendorIds) {
    const stillRunning = await VendorPromotion.exists({
      vendorId: id,
      status: 'active',
      endDate: { $gt: now }
    });
    if (!stillRunning) {
      await Vendor.updateOne(
        { _id: id },
        { $set: { isPromoted: false }, $unset: { promotionExpiry: '' } }
      );
    }
  }

  return due.length;
};

/**
 * Deletes checkout rows that never got paid. A row is created when the vendor
 * starts checkout, so failed/closed payments leave 'pending' rows with no
 * payment id behind. They are kept for a grace period (the reconcile job can
 * still settle a late Cashfree payment within 24h) and removed afterwards.
 */
const ABANDONED_AFTER_MS = 26 * 60 * 60 * 1000;
const cleanupAbandonedPromotions = async () => {
  const result = await VendorPromotion.deleteMany({
    status: 'pending',
    $or: [{ paymentId: { $exists: false } }, { paymentId: null }, { paymentId: '' }],
    $and: [{ $or: [{ gatewayPaymentId: { $exists: false } }, { gatewayPaymentId: null }, { gatewayPaymentId: '' }] }],
    createdAt: { $lt: new Date(Date.now() - ABANDONED_AFTER_MS) }
  });
  return result.deletedCount || 0;
};

/**
 * Marks a gateway-verified promotion as paid (still 'pending' for admin
 * approval), records the wallet transaction and notifies admins.
 *
 * Single path used by the verify endpoint, the gateway webhook and the
 * reconcile job. The claim is atomic, so when two of them race only one wins
 * and admins are notified once.
 */
const settlePromotionPayment = async ({ promotion, paymentId, signature = '', initiatedByUserId }) => {
  if (!promotion) return { settled: false };

  // Never store an empty payment id: it is what marks the request as paid.
  const resolvedPaymentId = String(paymentId || '').trim() || `order_${promotion.gatewayOrderId}`;

  const claimed = await VendorPromotion.findOneAndUpdate(
    {
      _id: promotion._id,
      status: 'pending',
      $or: [{ paymentId: { $exists: false } }, { paymentId: null }, { paymentId: '' }]
    },
    {
      $set: {
        paymentId: resolvedPaymentId,
        gatewayPaymentId: resolvedPaymentId,
        gatewaySignature: signature || ''
      }
    },
    { new: true }
  );
  if (!claimed) return { settled: false, promotion };

  const WalletTransaction = require('../models/WalletTransaction');
  await WalletTransaction.findOneAndUpdate(
    { referenceId: `PROMO_${claimed._id}` },
    {
      $setOnInsert: {
        vendorId: claimed.vendorId,
        ...(initiatedByUserId ? { initiatedByUserId } : {}),
        amount: claimed.amountPaid,
        type: 'credit',
        reason: 'promotion_payment',
        category: 'promotion_payment',
        status: 'completed',
        paymentGateway: claimed.paymentGateway,
        paymentMethod: claimed.paymentGateway,
        gatewayOrderId: claimed.gatewayOrderId,
        gatewayPaymentId: resolvedPaymentId,
        gatewaySignature: signature || '',
        description: `Profile Boost Promotion: ${claimed.durationDays} days`,
        referenceId: `PROMO_${claimed._id}`
      }
    },
    { upsert: true }
  );

  try {
    const NotificationService = require('./notificationService');
    const vendor = await Vendor.findById(claimed.vendorId).select('shopName');
    await NotificationService.notifyAdmins({
      type: 'PROMOTION_REQUEST',
      title: 'New Promotion Request',
      message: `${vendor?.shopName || 'A vendor'} has requested a profile promotion for ${claimed.durationDays} days.`,
      data: { requestId: claimed._id }
    });
  } catch (error) {
    console.error('[PROMOTION-SETTLE-NOTIFY-ERROR]', error.message);
  }

  return { settled: true, promotion: claimed };
};

module.exports = { expireDuePromotions, settlePromotionPayment, cleanupAbandonedPromotions };
