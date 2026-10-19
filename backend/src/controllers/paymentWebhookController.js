const crypto = require('crypto');
const Vendor = require('../models/Vendor');
const WalletTransaction = require('../models/WalletTransaction');
const VendorPromotion = require('../models/VendorPromotion');
const UserMembership = require('../models/UserMembership');
const VendorMembershipPlan = require('../models/VendorMembershipPlan');
const NotificationService = require('../services/notificationService');
const {
  verifyGatewayWebhookSignature,
  verifyGatewayPayment
} = require('../services/paymentGatewayService');
const {
  addFunds,
  activateMonthlySubscription
} = require('../services/walletService');

const getWebhookOrderData = (payload = {}) => ({
  orderId: payload?.data?.order?.order_id || payload?.data?.order_id || payload?.order_id || '',
  paymentId: payload?.data?.payment?.cf_payment_id || payload?.data?.cf_payment_id || payload?.cf_payment_id || '',
  paymentStatus: String(
    payload?.data?.payment?.payment_status || payload?.data?.payment_status || payload?.payment_status || ''
  ).toUpperCase(),
  amount: Number(payload?.data?.payment?.payment_amount || payload?.data?.order?.order_amount || payload?.order_amount || 0)
});

const getRazorpayWebhookData = (payload = {}) => ({
  orderId: payload?.payload?.payment?.entity?.order_id || '',
  paymentId: payload?.payload?.payment?.entity?.id || '',
  paymentStatus: String(payload?.event || '').toUpperCase() === 'PAYMENT.CAPTURED' ? 'SUCCESS' : String(payload?.event || '').toUpperCase(),
  amount: Number(payload?.payload?.payment?.entity?.amount || 0) / 100
});

const settleMembership = async ({ membership, paymentId, signature }) => {
  if (!membership || membership.status === 'active') return;
  const plan = await VendorMembershipPlan.findById(membership.planId);
  if (!plan) throw new Error('Membership plan not found');

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + plan.durationDays);
  membership.status = 'active';
  membership.startDate = startDate;
  membership.endDate = endDate;
  membership.paymentExpiresAt = undefined;
  membership.gatewayPaymentId = paymentId;
  membership.gatewaySignature = signature || '';
  membership.razorpayPaymentId = membership.paymentGateway === 'razorpay' ? paymentId : undefined;
  membership.ticketId = 'ZO-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  await membership.save();

  const vendor = await Vendor.findById(membership.vendorId);
  if (!vendor) return;
  await WalletTransaction.findOneAndUpdate(
    { referenceId: `MEMB_BUY_${membership._id}` },
    {
      $setOnInsert: {
        vendorId: vendor._id,
        initiatedByUserId: membership.userId,
        amount: plan.price,
        type: 'credit',
        reason: 'membership_purchase',
        category: 'membership_revenue',
        status: 'completed',
        paymentGateway: membership.paymentGateway,
        paymentMethod: membership.paymentGateway,
        gatewayOrderId: membership.gatewayOrderId,
        gatewayPaymentId: paymentId,
        gatewaySignature: signature || '',
        description: `Membership purchase: "${plan.name}" (External Payment)`,
        referenceId: `MEMB_BUY_${membership._id}`
      }
    },
    { upsert: true, new: true }
  );
  await NotificationService.sendNotification({
    userIds: vendor.ownerId,
    role: 'vendor',
    type: 'MEMBERSHIP_PURCHASED',
    title: 'New Membership Purchased! 👑',
    message: `A customer has purchased your "${plan.name}" membership plan for ₹${plan.price}.`,
    data: { membershipId: membership._id },
    referenceId: `MEMB_NOTIFY_${membership._id}`
  });
};

const settlePromotion = async ({ promotion, paymentId, signature }) => {
  if (!promotion) return;
  if (promotion.paymentId) return;
  if (promotion.status !== 'pending') return;
  promotion.paymentId = paymentId;
  promotion.gatewayPaymentId = paymentId;
  promotion.gatewaySignature = signature || '';
  await promotion.save();

  const existingTransaction = await WalletTransaction.findOne({ referenceId: `PROMO_${promotion._id}` });
  if (!existingTransaction) {
    await WalletTransaction.create({
      vendorId: promotion.vendorId,
      amount: promotion.amountPaid,
      type: 'credit',
      reason: 'promotion_payment',
      category: 'promotion_payment',
      status: 'completed',
      paymentGateway: promotion.paymentGateway,
      paymentMethod: promotion.paymentGateway,
      gatewayOrderId: promotion.gatewayOrderId,
      gatewayPaymentId: paymentId,
      gatewaySignature: signature || '',
      description: `Profile Boost Promotion: ${promotion.durationDays} days`,
      referenceId: `PROMO_${promotion._id}`
    });
  }

  const vendor = await Vendor.findById(promotion.vendorId);
  if (vendor) {
    await NotificationService.notifyAdmins({
      type: 'PROMOTION_REQUEST',
      title: 'New Promotion Request',
      message: `${vendor.shopName} has requested a profile promotion for ${promotion.durationDays} days.`,
      data: { requestId: promotion._id }
    });
  }
};

const settlePayment = async ({ gateway, orderId, paymentId, signature, amount }) => {
  const transaction = await WalletTransaction.findOne({ gatewayOrderId: orderId });
  if (transaction) {
    if (transaction.status === 'completed') return;
    if (amount > 0 && Math.abs(Number(transaction.amount) - amount) > 0.01) {
      throw new Error('Webhook amount does not match transaction amount');
    }

    if (transaction.category === 'wallet_topup') {
      const vendor = await Vendor.findById(transaction.vendorId);
      if (!vendor) throw new Error('Vendor not found for wallet payment');
      await addFunds(vendor, transaction.amount, 'wallet_topup', {
        existingTransaction: transaction,
        initiatedByUserId: transaction.initiatedByUserId || vendor.ownerId,
        category: 'wallet_topup',
        status: 'completed',
        paymentGateway: gateway,
        paymentMethod: gateway,
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        gatewaySignature: signature || '',
        referenceId: transaction.referenceId,
        description: 'Vendor wallet top-up completed',
        metadata: { ...(transaction.metadata || {}), verifiedAt: new Date().toISOString(), source: 'webhook' }
      });
      return;
    }

    if (transaction.category === 'monthly_subscription') {
      const vendor = await Vendor.findById(transaction.vendorId);
      if (!vendor) throw new Error('Vendor not found for subscription payment');
      await activateMonthlySubscription(vendor, {
        existingTransaction: transaction,
        initiatedByUserId: transaction.initiatedByUserId || vendor.ownerId,
        status: 'completed',
        paymentGateway: gateway,
        paymentMethod: gateway,
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        gatewaySignature: signature || '',
        referenceId: transaction.referenceId,
        metadata: { ...(transaction.metadata || {}), verifiedAt: new Date().toISOString(), source: 'webhook' }
      });
      return;
    }
  }

  const membership = await UserMembership.findOne({ gatewayOrderId: orderId });
  if (membership) {
    if (amount > 0) {
      const plan = await VendorMembershipPlan.findById(membership.planId);
      if (plan && Math.abs(Number(plan.price) - amount) > 0.01) throw new Error('Webhook amount does not match membership price');
    }
    await settleMembership({ membership, paymentId, signature });
    return;
  }

  const promotion = await VendorPromotion.findOne({ gatewayOrderId: orderId });
  if (promotion) {
    if (amount > 0 && Math.abs(Number(promotion.amountPaid) - amount) > 0.01) throw new Error('Webhook amount does not match promotion price');
    await settlePromotion({ promotion, paymentId, signature });
  }
};

const handleGatewayWebhook = (gateway) => async (req, res) => {
  try {
    const rawBody = req.rawBody;
    const signature = gateway === 'cashfree'
      ? req.headers['x-webhook-signature']
      : req.headers['x-razorpay-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    if (!rawBody || !verifyGatewayWebhookSignature({ gateway, signature, timestamp, rawBody })) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(rawBody);
    const details = gateway === 'cashfree'
      ? getWebhookOrderData(payload)
      : getRazorpayWebhookData(payload);

    if (!details.orderId) return res.status(200).json({ received: true });
    if (details.paymentStatus === 'FAILED' || details.paymentStatus === 'PAYMENT.FAILED') {
      await WalletTransaction.findOneAndUpdate(
        { gatewayOrderId: details.orderId, status: 'pending' },
        { $set: { status: 'failed', gatewayPaymentId: details.paymentId } }
      );
      return res.status(200).json({ received: true });
    }

    if (details.paymentStatus === 'SUCCESS' || details.paymentStatus === 'PAYMENT.CAPTURED') {
      if (gateway === 'cashfree') {
        const verification = await verifyGatewayPayment({
          gateway,
          orderId: details.orderId,
          paymentId: details.paymentId,
          expectedAmount: details.amount || undefined
        });
        if (!verification.verified) return res.status(400).json({ message: 'Payment status could not be verified' });
        await settlePayment({
          gateway,
          orderId: details.orderId,
          paymentId: verification.paymentId || details.paymentId,
          signature: signature || '',
          amount: details.amount
        });
      } else {
        await settlePayment({
          gateway,
          orderId: details.orderId,
          paymentId: details.paymentId,
          signature: signature || '',
          amount: details.amount
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(`[PAYMENT-WEBHOOK-${gateway.toUpperCase()}]`, error.message);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};

module.exports = {
  handleRazorpayWebhook: handleGatewayWebhook('razorpay'),
  handleCashfreeWebhook: handleGatewayWebhook('cashfree')
};