const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Staff = require('../models/Staff');
const Booking = require('../models/Booking');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Category = require('../models/Category');
const GlobalSettings = require('../models/GlobalSettings');
const NotificationService = require('../services/notificationService');
const moment = require('moment-timezone');
const {
  PLAN_LEVELS,
  addFunds,
  ensureSubscriptionPlans,
  getBillingSettings,
  getVendorSubscriptionState
} = require('../services/walletService');

const BROADCAST_TARGETS = new Set(['all', 'customer', 'vendor', 'staff', 'admin']);
const getStaffNotificationTarget = (staff) => staff?.userId || staff?._id || null;
const ADMIN_ROLES = new Set(['admin', 'super_admin']);

const safeSendNotification = (payload) => {
  try {
    return NotificationService.sendNotification(payload);
  } catch (error) {
    console.error('[AdminNotificationError]', error.message);
    return null;
  }
};

const hasAdminAccess = (req) => ADMIN_ROLES.has(req.user?.role);
const isSuperAdmin = (req) => req.user?.role === 'super_admin';
const sanitizeAdminAccount = (admin) => ({
  _id: admin._id,
  name: admin.name,
  phone: admin.phone,
  email: admin.email,
  image: admin.image,
  role: admin.role,
  isBlocked: admin.isBlocked,
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt
});

// ... (existing functions)

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(category);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Category deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getGlobalSettings = async (req, res) => {
  try {
    let settings = await GlobalSettings.findOne();
    if (!settings) settings = await GlobalSettings.create({});
    res.status(200).json(settings);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateGlobalSettings = async (req, res) => {
  try {
    const settings = await GlobalSettings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.status(200).json(settings);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const broadcastNotification = async (req, res) => {
  try {
    const { title, message } = req.body;
    const targetRole = req.body.targetRole || req.body.targetAudience;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    if (!BROADCAST_TARGETS.has(targetRole)) {
      return res.status(400).json({ message: 'Invalid broadcast target' });
    }

    const recipients = [];

    if (targetRole === 'all' || ['customer', 'vendor', 'admin'].includes(targetRole)) {
      const userRoles = targetRole === 'all' ? ['customer', 'vendor', 'admin'] : [targetRole];
      const users = await User.find({ role: { $in: userRoles } }).select('_id role');
      recipients.push(...users.map((user) => ({
        userId: user._id,
        role: user.role
      })));
    }

    if (targetRole === 'all' || targetRole === 'staff') {
      const staffMembers = await Staff.find({ isActive: true }).select('_id userId');
      recipients.push(
        ...staffMembers
          .map((staff) => ({
            userId: getStaffNotificationTarget(staff),
            role: 'staff'
          }))
          .filter((recipient) => recipient.userId)
      );
    }

    if (recipients.length === 0) {
      return res.status(404).json({ message: 'No recipients found for this broadcast' });
    }

    const uniqueRecipients = Array.from(
      new Map(
        recipients.map((recipient) => [`${recipient.role}:${recipient.userId}`, recipient])
      ).values()
    );

    await NotificationService.sendNotification({
      recipients: uniqueRecipients,
      type: 'BROADCAST',
      title: title.trim(),
      message: message.trim(),
      referenceId: `BROADCAST_${Date.now()}`
    });

    res.status(200).json({
      message: `Broadcast sent to ${uniqueRecipients.length} recipients`,
      count: uniqueRecipients.length
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getSubscriptionPlans = async (req, res) => {
  try {
    await ensureSubscriptionPlans();
    const plans = await SubscriptionPlan.find({ level: { $in: PLAN_LEVELS } }).sort({ level: 1, type: 1 });
    res.status(200).json(plans);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Get all pending vendors for approval
const getPendingVendors = async (req, res) => {
  try {
    if (!hasAdminAccess(req)) return res.status(403).json({ message: 'Unauthorized' });
    const vendors = await Vendor.find({ status: 'pending' }).populate('ownerId', 'name phone');
    res.status(200).json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a vendor
const approveVendor = async (req, res) => {
  try {
    if (!hasAdminAccess(req)) return res.status(403).json({ message: 'Unauthorized' });
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (!vendor.isProfileComplete) {
      const missing = [];
      if (!vendor.aadhaarFront) missing.push('aadhaarFront');
      if (!vendor.aadhaarBack) missing.push('aadhaarBack');
      if (!vendor.panCard) missing.push('panCard');
      if ((vendor.serviceMode || 'shop') === 'shop' && !vendor.shopImage) missing.push('shopImage');
      if (!vendor.vendorPhoto) missing.push('vendorPhoto');
      console.log('[DEBUG] Approval FAILED. isProfileComplete is FALSE. Missing:', missing.join(', '));
      return res.status(400).json({
        message: 'Incomplete profile',
        missingFields: missing
      });
    }

    vendor.status = 'active';
    vendor.isActive = true;
    vendor.rejectionReason = undefined;

    const { freeTrialDays = 7 } = req.body || {};
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + freeTrialDays);
    vendor.freeTrial = { isActive: true, expiryDate };

    await vendor.save();

    console.log('[DEBUG] Calling NotificationService. Is undefined?', !NotificationService);
    NotificationService.sendNotification({
      userIds: [vendor.ownerId],
      role: 'vendor',
      type: 'VENDOR_APPROVED',
      title: 'Congratulations! 🎉',
      message: 'Your shop has been verified and is now live on ZerOne.',
      data: { vendorId: vendor._id },
      referenceId: `APPROVE_${vendor._id}`
    });

    res.status(200).json(vendor);
  } catch (error) {
    console.error('[ERROR] approveVendor Failure:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Block/Unblock user
const toggleBlockUser = async (req, res) => {
  try {
    if (!hasAdminAccess(req)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isBlocked = !user.isBlocked;
    await user.save();

    safeSendNotification({
      userIds: user._id,
      role: user.role,
      type: user.isBlocked ? 'ACCOUNT_BLOCKED' : 'ACCOUNT_UNBLOCKED',
      title: user.isBlocked ? 'Account Restricted' : 'Account Restored',
      message: user.isBlocked
        ? 'Your account has been restricted by the admin team. Please contact support for help.'
        : 'Your account access has been restored. You can continue using ZerOne.',
      referenceId: `ACCOUNT_${user.isBlocked ? 'BLOCK' : 'UNBLOCK'}_${user._id}_${Date.now()}`
    });

    res.status(200).json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add funds to vendor wallet
const addBalance = async (req, res) => {
  try {
    if (!hasAdminAccess(req)) return res.status(403).json({ message: 'Unauthorized' });
    const { amount, reason } = req.body || {};
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    await addFunds(vendor, amount, reason || 'admin_topup');
    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- SOP EXTENSIONS ---

// 1. Subscription Plans
const createPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.create(req.body);
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updatePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(plan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 2. Advanced Revenue Dashboard
const getRevenueReport = async (req, res) => {
  try {
    if (!hasAdminAccess(req)) return res.status(403).json({ message: 'Unauthorized' });
    const { date, from, to } = req.query;
    let start, end;
    if (date) {
      start = moment(date).tz('Asia/Kolkata').startOf('day').toDate();
      end = moment(date).tz('Asia/Kolkata').endOf('day').toDate();
    } else if (from && to) {
      start = moment(from).tz('Asia/Kolkata').startOf('day').toDate();
      end = moment(to).tz('Asia/Kolkata').endOf('day').toDate();
    } else {
      start = moment().subtract(30, 'days').toDate();
      end = new Date();
    }

    const [revenue, newVendors, totalBookings] = await Promise.all([
      Booking.aggregate([{ $match: { status: 'completed', createdAt: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      Vendor.countDocuments({ createdAt: { $gte: start, $lt: end } }),
      Booking.countDocuments({ createdAt: { $gte: start, $lt: end } })
    ]);

    res.status(200).json({ totalRevenue: revenue[0]?.total || 0, newVendors, totalBookings, period: { start, end } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. User & Booking Management
const getAllUsers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { role: 'customer' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'blocked') filter.isBlocked = true;
    if (status === 'active') filter.isBlocked = false;

    // Aggregate with total bookings count
    const users = await User.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'userId',
          as: 'bookings'
        }
      },
      {
        $project: {
          name: 1,
          phone: 1,
          createdAt: 1,
          isBlocked: 1,
          bookingCount: { $size: '$bookings' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    const totalUsers = await User.countDocuments(filter);

    res.status(200).json({
      users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserDetail = async (req, res) => {
  try {
    if (!hasAdminAccess(req)) return res.status(403).json({ message: 'Unauthorized' });
    const user = await User.findById(req.params.id).select('-otp -otpExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const bookingCount = await Booking.countDocuments({ userId: user._id });

    res.status(200).json({
      ...user._doc,
      bookingCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
    if (!hasAdminAccess(req)) return res.status(403).json({ message: 'Unauthorized' });
    const bookings = await Booking.find({ userId: req.params.userId })
      .populate('vendorId', 'shopName')
      .sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFilteredBookings = async (req, res) => {
  try {
    if (!hasAdminAccess(req)) return res.status(403).json({ message: 'Unauthorized' });
    const { status, date, startDate, endDate, vendorId, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Base Match Stage
    const matchLine = {};
    const allowedStatus = ['confirmed', 'completed', 'cancelled'];
    if (status && allowedStatus.includes(status)) {
      matchLine.status = status;
    }
    if (vendorId) matchLine.vendorId = require('mongoose').Types.ObjectId(vendorId);
    if (startDate || endDate) {
      const rangeStart = startDate
        ? moment(startDate).startOf('day').toDate()
        : moment(endDate).startOf('day').toDate();
      const rangeEnd = endDate
        ? moment(endDate).endOf('day').toDate()
        : moment(startDate).endOf('day').toDate();

      matchLine.startTime = {
        $gte: rangeStart,
        $lte: rangeEnd
      };
    } else if (date) {
      matchLine.startTime = {
        $gte: moment(date).startOf('day').toDate(),
        $lt: moment(date).endOf('day').toDate()
      };
    }

    const pipeline = [
      { $match: matchLine },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' }
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'vendor.shopName': { $regex: search, $options: 'i' } },
            { bookingId: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    pipeline.push(
      { $sort: { startTime: -1, createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: parseInt(limit) }]
        }
      }
    );

    const result = await Booking.aggregate(pipeline);
    const bookings = result[0].data;
    const total = result[0].metadata[0]?.total || 0;

    res.status(200).json({
      bookings,
      totalBookings: total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBookingDetail = async (req, res) => {
  try {
    if (!hasAdminAccess(req)) return res.status(403).json({ message: 'Unauthorized' });
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name phone email')
      .populate({
        path: 'vendorId',
        select: 'shopName location contact',
        populate: { path: 'ownerId', select: 'name phone' }
      })
      .populate('staffId', 'name phone');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adminCancelBooking = async (req, res) => {
  try {
    if (!hasAdminAccess(req)) return res.status(403).json({ message: 'Unauthorized' });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = 'cancelled';
    booking.cancelledBy = 'admin';
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || 'Cancelled by Admin';

    await booking.save();

    const hydratedBooking = await Booking.findById(booking._id)
      .populate('vendorId', 'shopName ownerId')
      .populate('staffId', 'name userId')
      .populate('userId', 'name');

    const cancellationReason = booking.cancellationReason || 'Cancelled by Admin';
    const bookingTime = moment(booking.startTime).tz('Asia/Kolkata').format('LLL');

    await Promise.all([
      safeSendNotification({
        userIds: hydratedBooking.userId?._id || booking.userId,
        role: 'customer',
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled',
        message: `Your booking for ${bookingTime} was cancelled by the admin team. Reason: ${cancellationReason}.`,
        data: { bookingId: booking._id, reason: cancellationReason },
        referenceId: `${booking._id}_ADMIN_CANCEL_CUSTOMER`
      }),
      safeSendNotification({
        userIds: hydratedBooking.vendorId?.ownerId,
        role: 'vendor',
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled by Admin',
        message: `Booking scheduled for ${bookingTime} was cancelled by the admin team. Reason: ${cancellationReason}.`,
        data: { bookingId: booking._id, reason: cancellationReason },
        referenceId: `${booking._id}_ADMIN_CANCEL_VENDOR`
      }),
      hydratedBooking.staffId ? safeSendNotification({
        userIds: getStaffNotificationTarget(hydratedBooking.staffId),
        role: 'staff',
        type: 'BOOKING_CANCELLED',
        title: 'Assignment Cancelled',
        message: `Your assigned booking for ${bookingTime} was cancelled by the admin team.`,
        data: { bookingId: booking._id, reason: cancellationReason },
        referenceId: `${booking._id}_ADMIN_CANCEL_STAFF`
      }) : null
    ].filter(Boolean));

    // Logic for refund/wallet could be added here if needed

    res.status(200).json({ message: 'Booking forced cancelled by Admin', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Category Management
const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const days = parseInt(range) || 7;
    const settings = await getBillingSettings();
    const minimumWalletThreshold = settings.minWalletThreshold || 100;

    const today = moment().tz('Asia/Kolkata').startOf('day');
    const yesterday = moment().tz('Asia/Kolkata').subtract(1, 'day').startOf('day');
    const rangeStart = moment().subtract(days, 'days').startOf('day').toDate();

    const [
      todayRevenue,
      yesterdayRevenue,
      totalRevenue,
      newVendors,
      totalPartners,
      activeBookings,
      totalUsers,
      bookingStats,
      recentVendors,
      recentUsers,
      recentReviews,
      lowBalanceCount,
      inactiveVendorsCount,
      revenueGraph
    ] = await Promise.all([
      // 1. Today Revenue
      require('../models/WalletTransaction').aggregate([
        {
          $match: {
            type: 'debit',
            status: 'completed',
            reason: { $in: ['daily_subscription', 'monthly_subscription'] },
            timestamp: { $gte: today.toDate() }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // 2. Yesterday Revenue
      require('../models/WalletTransaction').aggregate([
        {
          $match: {
            type: 'debit',
            status: 'completed',
            reason: { $in: ['daily_subscription', 'monthly_subscription'] },
            timestamp: { $gte: yesterday.toDate(), $lt: today.toDate() }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // 3. Total Revenue
      require('../models/WalletTransaction').aggregate([
        {
          $match: {
            category: 'booking_revenue',
            status: 'completed'
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // 3. New Vendors
      Vendor.countDocuments({ createdAt: { $gte: today.toDate() } }),
      // 4. Total Partners
      Vendor.countDocuments(),
      // 4. Active Bookings
      Booking.countDocuments({ status: { $in: ['confirmed', 'ongoing'] } }),
      // 5. Total Users
      User.countDocuments({ role: 'customer' }),
      // 6. Booking Stats
      Booking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // 7. Recent Vendors
      Vendor.find().sort({ createdAt: -1 }).limit(5).populate('ownerId', 'name'),
      // 8. Recent Users
      User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(5),
      // 9. Recent Reviews
      require('../models/Review').find().sort({ createdAt: -1 }).limit(5).populate('userId', 'name').populate('vendorId', 'shopName'),
      // 10. Low Balance Alert
      Vendor.countDocuments({ walletBalance: { $lt: minimumWalletThreshold } }),
      // 11. Inactive Vendors (Real Check)
      Vendor.countDocuments({
        $or: [
          { isActive: false },
          { status: { $in: ['inactive', 'blocked', 'rejected'] } }
        ]
      }),
      // 12. Revenue Graph (Dynamic Range)
      require('../models/WalletTransaction').aggregate([
        {
          $match: {
            type: 'debit',
            status: 'completed',
            reason: { $in: ['daily_subscription', 'monthly_subscription'] },
            timestamp: { $gte: rangeStart }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            total: { $sum: "$amount" }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Format Booking Stats
    const stats = { active: 0, completed: 0, cancelled: 0 };
    bookingStats.forEach(s => {
      if (['confirmed', 'ongoing'].includes(s._id)) stats.active += s.count;
      if (s._id === 'completed') stats.completed = s.count;
      if (s._id === 'cancelled') stats.cancelled = s.count;
    });

    res.status(200).json({
      todayRevenue: todayRevenue[0]?.total || 0,
      yesterdayRevenue: yesterdayRevenue[0]?.total || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      newVendors,
      totalPartners,
      activeBookings,
      totalUsers,
      bookingStats: stats,
      recentVendors,
      recentUsers,
      recentReviews,
      alerts: {
        lowBalanceVendors: lowBalanceCount,
        inactiveVendors: inactiveVendorsCount
      },
      revenueGraph: revenueGraph.map(g => ({ date: moment(g._id).format('DD MMM'), amount: g.total }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🏪 VENDOR MANAGEMENT SYSTEM (STEP 3 - REFINED)
const getVendors = async (req, res) => {
  try {
    const { search, status, serviceLevel, planType, isActive, page = 1, limit = 10 } = req.query;
    const filter = {};
    const settings = await getBillingSettings();

    if (search) {
      filter.shopName = { $regex: search, $options: 'i' };
    }
    if (status) filter.status = status;
    if (serviceLevel) filter.serviceLevel = serviceLevel;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (planType) filter.planType = planType;

    const vendors = await Vendor.find(filter)
      .populate('ownerId', 'name phone')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Vendor.countDocuments(filter);
    const hydratedVendors = await Promise.all(vendors.map(async (v) => {
      const subscriptionState = await getVendorSubscriptionState(v);
      return {
        ...v._doc,
        subscription: {
          type: subscriptionState.currentPlan,
          isActive: subscriptionState.isActive
        }
      };
    }));

    res.status(200).json({
      vendors: hydratedVendors,
      minimumWalletThreshold: settings.minWalletThreshold || 100,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalVendors: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectVendor = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) return res.status(400).json({ message: 'Reason required' });
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    vendor.status = 'rejected';
    vendor.isActive = false;
    vendor.rejectionReason = rejectionReason;
    await vendor.save();

    NotificationService.sendNotification({
      userIds: [vendor.ownerId],
      role: 'vendor',
      type: 'VENDOR_REJECTED',
      title: 'Profile Verification Failed',
      message: `Your shop profile could not be approved. Reason: ${rejectionReason}. Please update your documents and try again.`,
      data: { vendorId: vendor._id, reason: rejectionReason },
      referenceId: `REJECT_${vendor._id}`
    });

    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleBlockVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    if (vendor.status === 'blocked') {
      const subscriptionState = await getVendorSubscriptionState(vendor);
      vendor.status = subscriptionState.isActive ? 'active' : 'inactive';
    } else {
      vendor.status = 'blocked';
    }

    await vendor.save();

    safeSendNotification({
      userIds: vendor.ownerId,
      role: 'vendor',
      type: vendor.status === 'blocked' ? 'ACCOUNT_BLOCKED' : 'ACCOUNT_UNBLOCKED',
      title: vendor.status === 'blocked' ? 'Partner Account Restricted' : 'Partner Account Restored',
      message: vendor.status === 'blocked'
        ? 'Your partner account has been restricted by the admin team. Please contact support for details.'
        : 'Your partner account has been restored and is available again.',
      referenceId: `VENDOR_${vendor.status === 'blocked' ? 'BLOCK' : 'UNBLOCK'}_${vendor._id}_${Date.now()}`
    });

    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleVendorActive = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    vendor.isActive = !vendor.isActive;
    await vendor.save();

    safeSendNotification({
      userIds: vendor.ownerId,
      role: 'vendor',
      type: vendor.isActive ? 'PARTNER_ACTIVATED' : 'PARTNER_DEACTIVATED',
      title: vendor.isActive ? 'Partner Profile Activated' : 'Partner Profile Deactivated',
      message: vendor.isActive
        ? 'Your partner profile is active again and visible on ZerOne.'
        : 'Your partner profile has been deactivated by the admin team.',
      referenceId: `VENDOR_ACTIVE_${vendor._id}_${Date.now()}`
    });

    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const extendVendorFreeTrial = async (req, res) => {
  try {
    if (!hasAdminAccess(req)) return res.status(403).json({ message: 'Unauthorized' });

    const vendor = await Vendor.findById(req.params.id).populate('ownerId', 'name');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const extensionDays = Number(req.body?.days);
    if (!Number.isFinite(extensionDays) || extensionDays <= 0) {
      return res.status(400).json({ message: 'A valid trial extension in days is required' });
    }

    const subscriptionState = await getVendorSubscriptionState(vendor);
    if (subscriptionState.isMonthlyActive) {
      return res.status(400).json({ message: 'Monthly subscription is already active for this vendor' });
    }

    const now = new Date();
    const currentExpiry =
      vendor.freeTrial?.isActive && vendor.freeTrial?.expiryDate && new Date(vendor.freeTrial.expiryDate) > now
        ? new Date(vendor.freeTrial.expiryDate)
        : now;

    const nextExpiry = new Date(currentExpiry);
    nextExpiry.setDate(nextExpiry.getDate() + extensionDays);

    vendor.freeTrial = {
      ...(vendor.freeTrial || {}),
      isActive: true,
      expiryDate: nextExpiry
    };

    vendor.planType = 'trial';
    if (!['pending', 'blocked', 'rejected'].includes(vendor.status)) {
      vendor.status = 'active';
      vendor.isActive = true;
    }

    await vendor.save();

    await NotificationService.sendNotification({
      userIds: vendor.ownerId?._id || vendor.ownerId,
      role: 'vendor',
      type: 'TRIAL_EXTENDED',
      title: 'Free Trial Extended',
      message: `Your free trial has been extended by ${extensionDays} day${extensionDays > 1 ? 's' : ''} and is now active until ${moment(nextExpiry).format('DD MMM YYYY')}.`,
      referenceId: `TRIAL_EXTEND_${vendor._id}_${Date.now()}`
    });

    res.status(200).json({
      message: `Free trial extended until ${moment(nextExpiry).format('DD MMM YYYY')}`,
      vendor
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getVendorInsights = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate('ownerId', 'name phone');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const { from, to } = req.query;
    const now = moment().tz('Asia/Kolkata');
    const startDate = from
      ? moment.tz(from, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day')
      : now.clone().startOf('month');
    const endDate = to
      ? moment.tz(to, 'YYYY-MM-DD', 'Asia/Kolkata').endOf('day')
      : now.clone().endOf('day');

    const [bookings, revenueTransactions] = await Promise.all([
      Booking.find({
        vendorId: vendor._id,
        startTime: { $gte: startDate.toDate(), $lte: endDate.toDate() }
      })
        .populate('userId', 'name')
        .populate('staffId', 'name')
        .sort({ startTime: -1 })
        .limit(20)
        .lean(),
      WalletTransaction.find({
        vendorId: vendor._id,
        category: 'booking_revenue',
        status: 'completed',
        timestamp: { $gte: startDate.toDate(), $lte: endDate.toDate() }
      })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean()
    ]);

    const totalRevenue = revenueTransactions.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((booking) => booking.status === 'completed').length;
    const cancelledBookings = bookings.filter((booking) => booking.status === 'cancelled').length;

    res.status(200).json({
      vendor: {
        _id: vendor._id,
        shopName: vendor.shopName,
        ownerName: vendor.ownerId?.name || ''
      },
      range: {
        from: startDate.format('YYYY-MM-DD'),
        to: endDate.format('YYYY-MM-DD')
      },
      summary: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue
      },
      bookings: bookings.map((booking) => ({
        _id: booking._id,
        customerName: booking.walkInCustomerName || booking.userId?.name || 'Customer',
        staffName: booking.staffId?.name || 'Owner',
        status: booking.status,
        totalPrice: booking.totalPrice,
        startTime: booking.startTime,
        services: booking.services || []
      })),
      revenue: revenueTransactions.map((item) => ({
        _id: item._id,
        amount: item.amount || 0,
        description: item.description || item.reason || 'Booking revenue',
        timestamp: item.timestamp
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminAccounts = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ message: 'Only super admins can manage admin access' });

    const { search = '', status = 'all' } = req.query;
    const filter = { role: { $in: ['admin', 'super_admin'] } };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'blocked') filter.isBlocked = true;
    if (status === 'active') filter.isBlocked = false;

    const admins = await User.find(filter)
      .select('-password -otp -otpExpires')
      .sort({ role: 1, createdAt: -1 });

    res.status(200).json(admins.map(sanitizeAdminAccount));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAdminAccount = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ message: 'Only super admins can create admins' });

    const { name, phone, password, email } = req.body || {};
    if (!name?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({ message: 'Name, phone and password are required' });
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({ message: 'Admin phone must be a valid 10-digit number' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const existingUser = await User.findOne({ phone: phone.trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this phone number already exists' });
    }

    const admin = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || undefined,
      password,
      role: 'admin',
      isBlocked: false
    });

    res.status(201).json(sanitizeAdminAccount(admin));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleAdminAccountBlock = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ message: 'Only super admins can update admin access' });

    const admin = await User.findById(req.params.id);
    if (!admin || !ADMIN_ROLES.has(admin.role)) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    if (String(admin._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot block your own account' });
    }

    if (admin.role === 'super_admin') {
      return res.status(400).json({ message: 'Super admin accounts cannot be blocked here' });
    }

    admin.isBlocked = !admin.isBlocked;
    await admin.save();

    res.status(200).json({
      message: `Admin ${admin.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      admin: sanitizeAdminAccount(admin)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminAccount = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ message: 'Only super admins can delete admin accounts' });

    const admin = await User.findById(req.params.id);
    if (!admin || !ADMIN_ROLES.has(admin.role)) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    if (String(admin._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    if (admin.role === 'super_admin') {
      return res.status(400).json({ message: 'Super admin accounts cannot be deleted here' });
    }

    await admin.deleteOne();

    res.status(200).json({ message: 'Admin account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPendingVendors, approveVendor, rejectVendor, toggleBlockUser, addBalance,
  createPlan, updatePlan, getRevenueReport, getAllUsers, getUserBookings,
  getFilteredBookings, createCategory, getCategories, getAdminDashboard,
  getVendors, toggleBlockVendor, toggleVendorActive, getUserDetail,
  getBookingDetail, adminCancelBooking,
  updateCategory, deleteCategory, getGlobalSettings, updateGlobalSettings,
  broadcastNotification, getSubscriptionPlans,
  getAdminAccounts, createAdminAccount, toggleAdminAccountBlock, deleteAdminAccount,
  extendVendorFreeTrial, getVendorInsights
};
