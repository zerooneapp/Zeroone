const PromotionPlan = require('../models/PromotionPlan');
const VendorPromotion = require('../models/VendorPromotion');
const Vendor = require('../models/Vendor');
const WalletTransaction = require('../models/WalletTransaction');
const NotificationService = require('../services/notificationService');
const WalletService = require('../services/walletService');
const { createGatewayOrder, verifyGatewayPayment } = require('../services/paymentGatewayService');

const GlobalSettings = require('../models/GlobalSettings');

// --- ADMIN CONTROLLERS ---

exports.createPlan = async (req, res) => {
  try {
    const { name, amount, durationDays, description } = req.body;
    const plan = await PromotionPlan.create({ name, amount, durationDays, description });
    res.status(201).json({ message: 'Promotion plan created successfully', plan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPlansAdmin = async (req, res) => {
  try {
    const plans = await PromotionPlan.find().sort({ createdAt: -1 });
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPromotionRequests = async (req, res) => {
  try {
    const requests = await VendorPromotion.find()
      .populate('vendorId', 'shopName ownerName')
      .populate('planId')
      .sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approvePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await VendorPromotion.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const duration = request.durationDays || 30; // Fallback for legacy
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + duration);

    request.status = 'active';
    request.startDate = startDate;
    request.endDate = endDate;
    request.approvalDate = new Date();
    await request.save();

    // Update Vendor
    const vendor = await Vendor.findByIdAndUpdate(request.vendorId, {
      isPromoted: true,
      promotionExpiry: endDate
    }, { returnDocument: 'after' });

    if (vendor) {
       // Notify Vendor
       await NotificationService.sendNotification({
         userIds: vendor.ownerId,
         role: 'vendor',
         type: 'PROMOTION_APPROVED',
         title: 'Profile Boost Activated!',
         message: `Your profile promotion for ${duration} days has been approved and is now live.`,
         data: { vendorId: vendor._id },
         referenceId: `PROMO_APPROVE_${request._id}`
       });
    }

    res.status(200).json({ message: 'Promotion approved successfully', request });
  } catch (error) {
    console.error('Approve Promotion Error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.rejectPromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const request = await VendorPromotion.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'rejected';
    request.rejectionReason = reason;
    await request.save();

    // Notify Vendor & Refund
    const vendor = await Vendor.findById(request.vendorId);
    if (vendor) {
       // Refund to wallet
        await WalletService.addFunds(
          vendor,
          request.amountPaid,
          'refund',
          {
            category: 'promotion_refund',
            description: `Refund: Promotion request rejected: ${reason || 'N/A'}`
          }
        );

       await NotificationService.sendNotification({
         userIds: vendor.ownerId,
         role: 'vendor',
         type: 'PROMOTION_REJECTED',
         title: 'Promotion Request Update',
         message: `Your promotion request was rejected. Amount ₹${request.amountPaid} has been refunded to your wallet. Reason: ${reason || 'Not specified'}`,
         data: { vendorId: vendor._id },
         referenceId: `PROMO_REJECT_${request._id}`
       });
    }

    res.status(200).json({ message: 'Promotion rejected and refunded' });
  } catch (error) {
    console.error('Reject Promotion Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// --- VENDOR CONTROLLERS ---

exports.getAvailablePlans = async (req, res) => {
  try {
    const plans = await PromotionPlan.find({ isActive: true });
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || days < 1) return res.status(400).json({ message: 'Minimum 1 day required' });

    let settings = await GlobalSettings.findOne();
    if (!settings) settings = await GlobalSettings.create({});
    const pricePerDay = settings.promotionPricePerDay || 10;
    const totalAmount = days * pricePerDay;

    const activeVendorId = req.headers['x-vendor-id'] || req.user?.lastActiveVendorId;
    const vendor = await Vendor.findOne({ _id: activeVendorId, ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const existingPromo = await VendorPromotion.findOne({
      vendorId: vendor._id,
      $or: [
        { status: 'active' },
        {
          status: 'pending',
          $or: [
            { paymentId: { $exists: true, $nin: [null, ''] } },
            { gatewayPaymentId: { $exists: true, $nin: [null, ''] } }
          ]
        }
      ]
    });

    if (existingPromo) {
      return res.status(400).json({
        message: 'You already have an active or pending promotion plan.'
      });
    }

    const receipt = `promo_${String(vendor._id).slice(-8)}_${Date.now().toString(36)}`.slice(0, 45);
    const order = await createGatewayOrder({
      amount: totalAmount,
      receipt,
      notes: {
        vendorId: vendor._id,
        purpose: 'promotion_payment',
        days
      },
      customer: {
        customerId: vendor.ownerId,
        name: req.user?.name,
        phone: req.user?.phone,
        email: req.user?.email
      },
      orderNote: `ZeroOne profile promotion for ${days} days`,
      notifyUrl: process.env.CASHFREE_WEBHOOK_URL
    });

    const promotion = await VendorPromotion.create({
      vendorId: vendor._id,
      durationDays: days,
      amountPaid: totalAmount,
      paymentGateway: order.gateway,
      gatewayOrderId: order.orderId,
      razorpayOrderId: order.gateway === 'razorpay' ? order.orderId : undefined,
      status: 'pending'
    });

    res.status(200).json({
      ...order,
      promotionId: promotion._id,
      pricePerDay,
      totalAmount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const body = req.body || {};
    const submittedOrderId = body.razorpay_order_id || body.order_id || body.orderId;
    const submittedPaymentId = body.razorpay_payment_id || body.cf_payment_id || body.paymentId;

    if (!submittedOrderId) {
      return res.status(400).json({ message: 'Missing payment order id' });
    }

    const activeVendorId = req.headers['x-vendor-id'] || req.user?.lastActiveVendorId;
    const vendor = await Vendor.findOne({ _id: activeVendorId, ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const promotion = await VendorPromotion.findOne({
      vendorId: vendor._id,
      gatewayOrderId: submittedOrderId
    });

    if (!promotion) {
      return res.status(404).json({ message: 'Pending promotion payment not found' });
    }

    if (promotion.paymentId || promotion.status !== 'pending') {
      return res.status(200).json({
        message: 'Promotion payment already processed',
        promotion
      });
    }

    const verification = await verifyGatewayPayment({
      gateway: promotion.paymentGateway || String(body.gateway || 'razorpay').toLowerCase(),
      orderId: submittedOrderId,
      paymentId: submittedPaymentId,
      signature: body.razorpay_signature || body.signature,
      expectedAmount: promotion.amountPaid
    });

    if (!verification.verified) {
      return res.status(400).json({ message: verification.message || 'Payment verification failed' });
    }

    const gateway = promotion.paymentGateway || String(body.gateway || 'razorpay').toLowerCase();
    promotion.paymentId = verification.paymentId || submittedPaymentId || '';
    promotion.gatewayPaymentId = verification.paymentId || submittedPaymentId || '';
    promotion.gatewaySignature = body.razorpay_signature || body.signature || '';
    promotion.status = 'pending';
    await promotion.save();

    await WalletTransaction.findOneAndUpdate(
      { referenceId: `PROMO_${promotion._id}` },
      {
        $setOnInsert: {
          vendorId: vendor._id,
          initiatedByUserId: req.user._id,
          amount: promotion.amountPaid,
          type: 'credit',
          reason: 'promotion_payment',
          category: 'promotion_payment',
          status: 'completed',
          paymentGateway: gateway,
          paymentMethod: gateway,
          gatewayOrderId: submittedOrderId,
          gatewayPaymentId: verification.paymentId || submittedPaymentId || '',
          gatewaySignature: body.razorpay_signature || body.signature || '',
          description: `Profile Boost Promotion: ${promotion.durationDays} days`,
          referenceId: `PROMO_${promotion._id}`
        }
      },
      { upsert: true, new: true }
    );

    NotificationService.notifyAdmins({
      type: 'PROMOTION_REQUEST',
      title: 'New Promotion Request',
      message: `${vendor.shopName} has requested a profile promotion for ${promotion.durationDays} days.`,
      data: { requestId: promotion._id }
    });

    res.status(201).json({
      message: 'Payment verified and promotion requested successfully.',
      promotion
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVendorPromotions = async (req, res) => {
  try {
    const activeVendorId = req.headers['x-vendor-id'] || req.user?.lastActiveVendorId;
    const vendor = await Vendor.findOne({ _id: activeVendorId, ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const promotions = await VendorPromotion.find({ vendorId: vendor._id })
      .populate('planId')
      .sort({ createdAt: -1 });
    res.status(200).json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.purchasePromotion = async (req, res) => {
  // Legacy or simplified flow - could be deprecated
  try {
    const { planId, paymentId } = req.body;
    const activeVendorId = req.headers['x-vendor-id'] || req.user?.lastActiveVendorId;
    const vendor = await Vendor.findOne({ _id: activeVendorId, ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const plan = await PromotionPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const promotion = await VendorPromotion.create({
      vendorId: vendor._id,
      planId,
      amountPaid: plan.amount,
      paymentId,
      status: 'pending'
    });

    // Notify Admin (Silent/Dashboard)
    NotificationService.notifyAdmins({
      type: 'PROMOTION_REQUEST',
      title: 'New Promotion Request',
      message: `${vendor.shopName} has requested a profile promotion.`,
      data: { requestId: promotion._id }
    });

    res.status(201).json({ 
      message: 'Promotion requested successfully. Waiting for admin approval.', 
      promotion 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPromotionTransactions = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({
      category: { $in: ['promotion_payment', 'promotion_refund'] }
    })
      .populate('vendorId', 'shopName')
      .sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVendorPromotionTransactions = async (req, res) => {
  try {
    const activeVendorId = req.headers['x-vendor-id'] || req.user?.lastActiveVendorId;
    const vendor = await Vendor.findOne({ _id: activeVendorId, ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const transactions = await WalletTransaction.find({
      vendorId: vendor._id,
      category: { $in: ['promotion_payment', 'promotion_refund'] }
    }).sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

