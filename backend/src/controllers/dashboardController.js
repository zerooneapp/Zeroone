const Booking = require('../models/Booking');
const Vendor = require('../models/Vendor');
const moment = require('moment-timezone');

// @desc    Get vendor dashboard analytics
// @route   GET /api/dashboard/vendor
// @access  Private (Vendor)
const getVendorDashboard = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const todayStart = moment().tz('Asia/Kolkata').startOf('day').toDate();
    const todayEnd = moment().tz('Asia/Kolkata').endOf('day').toDate();

    const [totalBookings, earningsData, todaySchedule] = await Promise.all([
      Booking.countDocuments({ vendorId }),
      Booking.aggregate([
        { $match: { vendorId, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Booking.find({ 
        vendorId, 
        startTime: { $gte: todayStart, $lt: todayEnd },
        status: { $ne: 'cancelled' }
      }).populate('userId', 'name').populate('staffId', 'name').sort({ startTime: 1 })
    ]);

    res.status(200).json({
      totalBookings,
      totalEarnings: earningsData[0]?.total || 0,
      todaySchedule,
      walletBalance: req.vendor.walletBalance,
      planType: req.vendor.planType
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get admin dashboard analytics
// @route   GET /api/dashboard/admin
// @access  Private (Admin)
const getAdminDashboard = async (req, res) => {
  try {
    const [totalRevenue, activeVendors, bookingTrends] = await Promise.all([
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Vendor.countDocuments({ status: 'active' }),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: moment().subtract(7, 'days').toDate() },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.status(200).json({
      totalRevenue: totalRevenue[0]?.total || 0,
      activeVendors,
      bookingTrends
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getVendorDashboard,
  getAdminDashboard
};
