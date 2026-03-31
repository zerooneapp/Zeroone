const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Booking = require('../models/Booking');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Category = require('../models/Category');
const GlobalSettings = require('../models/GlobalSettings');
const NotificationService = require('../services/notificationService');
const moment = require('moment-timezone');
const { addFunds } = require('../services/walletService');

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
    const { title, message, targetRole } = req.body;
    const users = await User.find({ role: targetRole });
    await NotificationService.sendNotification({
      userIds: users.map(u => u._id),
      role: targetRole,
      type: 'BROADCAST',
      title,
      message
    });
    res.status(200).json({ message: 'Broadcast sent' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getSubscriptionPlans = async (req, res) => {
  try {
    let plans = await SubscriptionPlan.find();
    
    // Auto-seed if missing (6 Tiers)
    if (plans.length < 6) {
      const tiers = ['basic', 'standard', 'premium'];
      const types = ['daily', 'monthly'];
      const defaultPrices = {
        basic_daily: 10, basic_monthly: 250,
        standard_daily: 250, standard_monthly: 5000,
        premium_daily: 500, premium_monthly: 10000
      };

      for (const level of tiers) {
        for (const type of types) {
          const key = `${level}_${type}`;
          await SubscriptionPlan.findOneAndUpdate(
            { level, type },
            { $setOnInsert: { price: defaultPrices[key] } },
            { upsert: true, new: true }
          );
        }
      }
      plans = await SubscriptionPlan.find();
    }
    
    res.status(200).json(plans);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Get all pending vendors for approval
const getPendingVendors = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const vendors = await Vendor.find({ status: 'pending' }).populate('ownerId', 'name phone');
    res.status(200).json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a vendor
const approveVendor = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (!vendor.isProfileComplete) {
      const missing = [];
      if (!vendor.aadhaar) missing.push('aadhaar');
      if (!vendor.panCard) missing.push('panCard');
      if (!vendor.shopImage) missing.push('shopImage');
      if (!vendor.vendorPhoto) missing.push('vendorPhoto');
      console.log('[DEBUG] Approval FAILED. isProfileComplete is FALSE. Missing:', missing.join(', '));
      return res.status(400).json({ 
        message: 'Incomplete profile', 
        missingFields: missing 
      });
    }

    vendor.status = 'active';
    vendor.isActive = true;
    
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
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.status(200).json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add funds to vendor wallet
const addBalance = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
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
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
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
      { $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'userId',
          as: 'bookings'
      }},
      { $project: {
          name: 1,
          phone: 1,
          createdAt: 1,
          isBlocked: 1,
          bookingCount: { $size: '$bookings' }
      }},
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
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
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
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
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
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const { status, date, vendorId, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Base Match Stage
    const matchLine = {};
    const allowedStatus = ['confirmed', 'completed', 'cancelled'];
    if (status && allowedStatus.includes(status)) {
      matchLine.status = status;
    }
    if (vendorId) matchLine.vendorId = require('mongoose').Types.ObjectId(vendorId);
    if (date) {
      matchLine.createdAt = { 
        $gte: moment(date).startOf('day').toDate(), 
        $lt: moment(date).endOf('day').toDate() 
      };
    }

    const pipeline = [
      { $match: matchLine },
      { $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
      }},
      { $unwind: '$user' },
      { $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
      }},
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
      { $sort: { createdAt: -1 } },
      { $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: parseInt(limit) }]
      }}
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
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
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
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    booking.status = 'cancelled';
    booking.cancelledBy = 'admin';
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || 'Cancelled by Admin';
    
    await booking.save();
    
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
    
    const today = moment().tz('Asia/Kolkata').startOf('day');
    const yesterday = moment().tz('Asia/Kolkata').subtract(1, 'day').startOf('day');
    const rangeStart = moment().subtract(days, 'days').startOf('day').toDate();

    const [
      todayRevenue,
      yesterdayRevenue,
      newVendors,
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
        { $match: { type: 'debit', reason: 'daily_subscription', timestamp: { $gte: today.toDate() } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // 2. Yesterday Revenue
      require('../models/WalletTransaction').aggregate([
        { $match: { type: 'debit', reason: 'daily_subscription', timestamp: { $gte: yesterday.toDate(), $lt: today.toDate() } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // 3. New Vendors
      Vendor.countDocuments({ createdAt: { $gte: today.toDate() } }),
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
      Vendor.countDocuments({ walletBalance: { $lt: 100 } }),
      // 11. Inactive Vendors (Real Check)
      Vendor.countDocuments({ isActive: false }),
      // 12. Revenue Graph (Dynamic Range)
      require('../models/WalletTransaction').aggregate([
        { $match: { type: 'debit', reason: 'daily_subscription', timestamp: { $gte: rangeStart } } },
        { $group: { 
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, 
            total: { $sum: "$amount" } 
        }},
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
      newVendors,
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

    res.status(200).json({
      vendors: vendors.map(v => ({
        ...v._doc,
        subscription: {
          type: v.planType || 'trial',
          isActive: (v.planType === 'trial' && v.freeTrial?.isActive) || (v.planType !== 'trial')
        }
      })),
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
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, { 
       status: 'rejected', 
       rejectionReason 
    }, { new: true });
    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleBlockVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    
    vendor.status = vendor.status === 'blocked' ? 'active' : 'blocked';
    await vendor.save();
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
    res.status(200).json(vendor);
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
  broadcastNotification, getSubscriptionPlans
};
