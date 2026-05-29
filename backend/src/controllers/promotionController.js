const PromotionPlan = require('../models/PromotionPlan');
const VendorPromotion = require('../models/VendorPromotion');
const Vendor = require('../models/Vendor');
const WalletTransaction = require('../models/WalletTransaction');
const NotificationService = require('../services/notificationService');
const WalletService = require('../services/walletService');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const GlobalSettings = require('../models/GlobalSettings');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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

    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    // Check if any promotion is active or pending
    const existingPromo = await VendorPromotion.findOne({
      vendorId: vendor._id,
      status: { $in: ['active', 'pending'] }
    });

    if (existingPromo) {
      return res.status(400).json({ 
        message: 'You already have an active or pending promotion plan.' 
      });
    }

    const options = {
      amount: totalAmount * 100, // razorpay works in paise
      currency: "INR",
      receipt: `promo_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      pricePerDay,
      totalAmount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      days,
      amountPaid
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      const vendor = await Vendor.findOne({ ownerId: req.user._id });
      if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

      // Check again to prevent race conditions
      const existingPromo = await VendorPromotion.findOne({
        vendorId: vendor._id,
        status: { $in: ['active', 'pending'] }
      });

      if (existingPromo) {
        return res.status(400).json({ 
          message: 'You already have an active or pending promotion plan.' 
        });
      }

      const promotion = await VendorPromotion.create({
        vendorId: vendor._id,
        durationDays: days,
        amountPaid: amountPaid,
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        status: 'pending'
      });

      // Create transaction record for Platform Revenue
      await WalletTransaction.create({
        vendorId: vendor._id,
        initiatedByUserId: req.user._id,
        amount: amountPaid,
        type: 'credit',
        reason: 'promotion_payment',
        category: 'promotion_payment',
        status: 'completed',
        paymentGateway: 'razorpay',
        gatewayOrderId: razorpay_order_id,
        gatewayPaymentId: razorpay_payment_id,
        gatewaySignature: razorpay_signature,
        description: `Profile Boost Promotion: ${days} days`,
        referenceId: `PROMO_${promotion._id}`
      });

      // Notify Admin
      NotificationService.notifyAdmins({
        type: 'PROMOTION_REQUEST',
        title: 'New Promotion Request',
        message: `${vendor.shopName} has requested a profile promotion for ${days} days.`,
        data: { requestId: promotion._id }
      });

      res.status(201).json({ 
        message: 'Payment verified and promotion requested successfully.', 
        promotion 
      });
    } else {
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVendorPromotions = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
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
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
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
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
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

