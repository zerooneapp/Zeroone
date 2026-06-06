const VendorMembershipPlan = require('../models/VendorMembershipPlan');
const UserMembership = require('../models/UserMembership');
const Vendor = require('../models/Vendor');
const Service = require('../models/Service');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const NotificationService = require('../services/notificationService');
const GlobalSettings = require('../models/GlobalSettings');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- Vendor Actions ---

exports.createPlan = async (req, res) => {
  try {
    const { name, description, price, durationDays, services } = req.body;
    const vendorId = req.vendor._id;

    // Validation: Ensure services have limits >= 1
    if (services && Array.isArray(services)) {
      const invalidService = services.find(s => !s.usageLimit || s.usageLimit < 1);
      if (invalidService) {
        return res.status(400).json({ message: 'All services must have a usage limit of at least 1' });
      }
    }

    const plan = await VendorMembershipPlan.create({
      vendorId,
      name,
      description,
      price,
      durationDays,
      services
    });

    res.status(201).json({ message: 'Membership plan created successfully', plan });
  } catch (error) {
    console.error('[CREATE-PLAN-ERROR]', error);
    res.status(500).json({ 
      message: error.message,
      error: 'Failed to create membership plan',
      details: error.errors
    });
  }
};

exports.getVendorPlans = async (req, res) => {
  try {
    const { vendorId } = req.params;
    // For listing, we show only active plans. 
    // But for the vendor managing their OWN plans, they should see all (including paused).
    const isVendorFetchingOwn = req.vendor && String(req.vendor._id) === String(vendorId);
    
    // Check if membership system is globally active
    const settings = await GlobalSettings.findOne();
    if (!isVendorFetchingOwn && settings?.features?.membershipActive === false) {
      return res.status(200).json([]);
    }

    const filter = { vendorId };
    if (!isVendorFetchingOwn) filter.isActive = true;

    const plans = await VendorMembershipPlan.find(filter)
      .populate('services.serviceId', 'name price');
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await VendorMembershipPlan.findById(id).populate('services.serviceId', 'name price');
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.vendor._id;
    
    const { services } = req.body;
    if (services && Array.isArray(services)) {
      const invalidService = services.find(s => !s.usageLimit || s.usageLimit < 1);
      if (invalidService) {
        return res.status(400).json({ message: 'All services must have a usage limit of at least 1' });
      }
    }

    const plan = await VendorMembershipPlan.findOneAndUpdate(
      { _id: id, vendorId },
      req.body,
      { returnDocument: 'after', runValidators: true }
    );

    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.status(200).json({ message: 'Plan updated successfully', plan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.vendor._id;

    // 🛡️ SAFE DELETE: Check if any user has an active membership under this plan
    const activeMemberCount = await UserMembership.countDocuments({
      planId: id,
      status: 'active'
    });

    if (activeMemberCount > 0) {
      return res.status(400).json({
        message: `This plan cannot be deleted as it has ${activeMemberCount} active member(s). Please wait for all memberships to expire before deleting.`,
        hasActiveMembers: true,
        activeMemberCount
      });
    }

    const plan = await VendorMembershipPlan.findOneAndDelete({ _id: id, vendorId });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    res.status(200).json({ message: 'Membership plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVendorMembers = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Show all statuses so vendor can see and clean up expired/past records
    const query = { vendorId };

    const [memberships, total] = await Promise.all([
      UserMembership.find(query)
        .populate('userId', 'name phone image')
        .populate('planId', 'name price durationDays')
        .populate('usage.serviceId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserMembership.countDocuments(query)
    ]);
    
    res.status(200).json({
      memberships,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUserMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.vendor._id;

    const membership = await UserMembership.findOne({ _id: id, vendorId });
    if (!membership) return res.status(404).json({ message: 'Membership record not found' });

    // 🛡️ Block deletion of currently active memberships
    if (membership.status === 'active') {
      const now = new Date();
      const isStillValid = membership.endDate > now;
      if (isStillValid) {
        return res.status(400).json({
          message: 'Cannot delete an active membership. Wait for it to expire first.',
          isActive: true
        });
      }
    }

    await UserMembership.findByIdAndDelete(id);
    res.status(200).json({ message: 'Membership record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- User Actions ---

exports.createPurchaseOrder = async (req, res) => {
  try {
    const settings = await GlobalSettings.findOne();
    if (settings?.features?.membershipActive === false) {
      return res.status(403).json({ message: 'Membership system is currently disabled by Admin' });
    }

    const { planId } = req.body;
    const plan = await VendorMembershipPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    // 🛡️ RESTRICTION: Check if user already has ANY membership (active/pending) with this VENDOR
    const existing = await UserMembership.findOne({
      userId: req.user._id,
      vendorId: plan.vendorId,
      status: { $in: ['pending', 'active'] }
    });

    if (existing) {
      return res.status(400).json({ 
        message: existing.status === 'pending' 
          ? 'You already have a pending membership request with this partner.' 
          : 'You already have an active membership with this partner. Please wait for it to expire.' 
      });
    }

    const options = {
      amount: Math.round(plan.price * 100), // amount in paise
      currency: 'INR',
      receipt: `membership_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ order, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyPurchase = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      planId 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing required payment fields" });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    console.log('[PAYMENT VERIFY] Received:', { razorpay_order_id, razorpay_payment_id, razorpay_signature });
    console.log('[PAYMENT VERIFY] Expected:', expectedSign);

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid payment signature. Verification failed." });
    }

    const plan = await VendorMembershipPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    // Calculate end date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const membership = await UserMembership.create({
      userId: req.user._id,
      vendorId: plan.vendorId,
      planId: plan._id,
      startDate: new Date(),
      endDate,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: 'active',
      usage: plan.services.map(s => ({
        serviceId: s.serviceId,
        usedCount: 0,
        usageLimit: s.usageLimit
      }))
    });

    // Notify Vendor and Record Transaction (Without adding to wallet balance)
    const vendor = await Vendor.findById(plan.vendorId);
    if (vendor) {
      const { createWalletTransaction } = require('../services/walletService');
      await createWalletTransaction({
        vendorId: vendor._id,
        initiatedByUserId: req.user._id,
        amount: plan.price,
        type: 'credit',
        reason: 'membership_purchase',
        category: 'membership_revenue',
        paymentGateway: 'razorpay',
        paymentMethod: 'razorpay',
        gatewayOrderId: razorpay_order_id,
        gatewayPaymentId: razorpay_payment_id,
        gatewaySignature: razorpay_signature,
        description: `Membership purchase: "${plan.name}" by ${req.user.name || 'customer'} (External Payment)`,
        referenceId: `MEMB_BUY_${membership._id}`
      });

      NotificationService.sendNotification({
        userIds: vendor.ownerId,
        role: 'vendor',
        type: 'MEMBERSHIP_PURCHASED',
        title: 'New Membership Purchased! 👑',
        message: `${req.user.name || 'A customer'} has purchased your "${plan.name}" membership plan for ₹${plan.price}.`,
        data: { membershipId: membership._id }
      });
    }

    res.status(200).json({ message: 'Membership activated successfully', membership });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request Manual Membership Purchase (Vendor Approval Flow)
// @route   POST /api/memberships/request
// @access  Private
exports.requestManualPurchase = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await VendorMembershipPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    // 🛡️ RESTRICTION: Check if user already has ANY membership (active/pending) with this VENDOR
    const existing = await UserMembership.findOne({
      userId: req.user._id,
      vendorId: plan.vendorId,
      status: { $in: ['pending', 'active'] }
    });

    if (existing) {
      return res.status(400).json({ 
        message: existing.status === 'pending' 
          ? 'You already have a pending membership request with this partner.' 
          : 'You already have an active membership with this partner.' 
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    
    // 🛡️ DATE SAFETY: JavaScript Max Date is approx 273,790 years from 1970. 
    // We cap duration at 100 years (36500 days) to prevent overflow errors.
    if (plan.durationDays > 36500) {
      return res.status(400).json({ message: 'Plan duration is too long. Please contact support or select another plan.' });
    }

    endDate.setDate(startDate.getDate() + plan.durationDays);

    const membership = await UserMembership.create({
      userId: req.user._id,
      vendorId: plan.vendorId,
      planId,
      startDate,
      endDate,
      status: 'pending',
      usage: plan.services.map(s => ({
        serviceId: s.serviceId,
        usedCount: 0,
        usageLimit: s.usageLimit
      }))
    });
    
    // Notify Vendor of the pending request
    const vendor = await Vendor.findById(plan.vendorId);
    if (vendor) {
      NotificationService.sendNotification({
        userIds: vendor.ownerId,
        role: 'vendor',
        type: 'MEMBERSHIP_REQUESTED',
        title: 'New Membership Request 👑',
        message: `${req.user.name || 'A customer'} has requested to buy your "${plan.name}" membership plan for ₹${plan.price}.`,
        data: { membershipId: membership._id }
      });
    }

    res.status(201).json({ 
      message: 'Purchase request sent to vendor. Please wait for approval.',
      membership 
    });
  } catch (error) {
    console.error('[MEMBERSHIP-REQUEST-ERROR]', error);
    res.status(500).json({ 
      message: error.message,
      error: 'Failed to create membership request',
      details: error.errors // Validation errors if any
    });
  }
};

// @desc    Update Membership Status (Approve/Reject by Vendor)
// @route   PATCH /api/memberships/status/:id
// @access  Private (Vendor)
exports.updateMembershipStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['active', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status update' });
    }

    const membership = await UserMembership.findById(req.params.id).populate('userId', 'name');
    if (!membership) return res.status(404).json({ message: 'Request not found' });

    // Verify vendor ownership
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    if (!vendor || membership.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to manage this request' });
    }

    membership.status = status;
    if (status === 'active') {
      const ticketId = 'ZO-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      membership.ticketId = ticketId;
      membership.startDate = new Date();
      const plan = await VendorMembershipPlan.findById(membership.planId);
      const endDate = new Date();
      endDate.setDate(membership.startDate.getDate() + plan.durationDays);
      membership.endDate = endDate;

      // Record Transaction (Without adding to wallet balance - Offline collection)
      if (vendor && plan) {
        const { createWalletTransaction } = require('../services/walletService');
        await createWalletTransaction({
          vendorId: vendor._id,
          initiatedByUserId: req.user._id, // Approved by vendor
          amount: plan.price,
          type: 'credit',
          reason: 'membership_purchase',
          category: 'membership_revenue',
          paymentGateway: 'system',
          paymentMethod: 'offline',
          description: `Manual approval of "${plan.name}" membership for ${membership.userId?.name || 'customer'} (Offline Payment)`,
          referenceId: `MEMB_MANUAL_${membership._id}`
        });
      }
    }
    
    await membership.save();

    res.status(200).json({ 
      message: `Membership request ${status === 'active' ? 'approved' : 'rejected'}`,
      membership 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get All Membership Requests for Vendor
// @route   GET /api/memberships/vendor/requests
// @access  Private (Vendor)
exports.getVendorMembershipRequests = async (req, res) => {
  try {
    const vendorId = req.vendor?._id;
    if (!vendorId) {
      console.log('[DEBUG] No vendor context in request');
      return res.status(404).json({ message: 'Vendor context not found' });
    }

    console.log('[DEBUG] Querying UserMembership for Vendor:', vendorId);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { 
      vendorId: vendorId,
      status: { $in: ['pending', 'rejected'] }
    };

    const [requests, total] = await Promise.all([
      UserMembership.find(query)
        .populate('userId', 'name phone')
        .populate('planId', 'name price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserMembership.countDocuments(query)
    ]);

    console.log('[DEBUG] Found requests count:', requests.length);
    res.status(200).json({
      requests,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('[MEMBERSHIP ERROR] Full Error Details:', error);
    res.status(500).json({ 
      message: error.message, 
      code: error.code,
      error: 'Failed to fetch membership requests'
    });
  }
};

exports.getUserMemberships = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(200).json([]);
    const memberships = await UserMembership.find({ userId: req.user._id, isDeletedByUser: { $ne: true } })
      .populate('vendorId', 'shopName')
      .populate('planId', 'name price')
      .populate('usage.serviceId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(memberships || []);
  } catch (error) {
    console.error('[MEMBERSHIP ERROR] getUserMemberships:', error);
    res.status(200).json([]);
  }
};

exports.deleteUserMembershipByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const membership = await UserMembership.findOne({ _id: id, userId: req.user._id });
    if (!membership) {
      return res.status(404).json({ message: 'Membership not found' });
    }

    const now = new Date();
    const isExpired = membership.endDate < now || ['expired', 'rejected', 'cancelled'].includes(membership.status);
    if (!isExpired) {
      return res.status(400).json({ message: 'Cannot delete an active membership plan' });
    }

    membership.isDeletedByUser = true;
    await membership.save();

    res.status(200).json({ message: 'Membership deleted successfully from history' });
  } catch (error) {
    console.error('[MEMBERSHIP ERROR] deleteUserMembershipByUser:', error);
    res.status(500).json({ message: error.message });
  }
};
