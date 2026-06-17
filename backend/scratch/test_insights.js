const mongoose = require('mongoose');
const Vendor = require('../src/models/Vendor');
const Booking = require('../src/models/Booking');
const UserMembership = require('../src/models/UserMembership');
const WalletTransaction = require('../src/models/WalletTransaction');
const VendorMembershipPlan = require('../src/models/VendorMembershipPlan');
const moment = require('moment-timezone');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zeroone');
  
  const vendorId = new mongoose.Types.ObjectId('6a3275ddc52470a407c98e6c');
  const now = moment().tz('Asia/Kolkata');
  const startDate = now.clone().startOf('month');
  const endDate = now.clone().endOf('day');

  const [bookings, completedBookingsData, allTimeBookings, membershipData, allTimeMembership] = await Promise.all([
    Booking.find({
      vendorId: vendorId,
      startTime: { $gte: startDate.toDate(), $lte: endDate.toDate() }
    }),
    Booking.find({
      vendorId: vendorId,
      status: 'completed',
      startTime: { $gte: startDate.toDate(), $lte: endDate.toDate() }
    }).select('totalPrice startTime'),
    Booking.aggregate([
      { $match: { vendorId: vendorId, status: 'completed' } },
      { $group: { _id: null, count: { $sum: 1 }, totalRevenue: { $sum: '$totalPrice' } } }
    ]),
    UserMembership.find({
      vendorId: vendorId,
      status: { $in: ['active', 'expired'] },
      startDate: { $gte: startDate.toDate(), $lte: endDate.toDate() }
    }).populate('planId'),
    WalletTransaction.aggregate([
      { $match: { vendorId: vendorId, category: 'membership_revenue', status: 'completed' } },
      { $group: { _id: null, totalMembershipRevenue: { $sum: '$amount' } } }
    ])
  ]);

  console.log('Bookings count:', bookings.length);
  console.log('Completed Bookings count:', completedBookingsData.length);
  console.log('All Time Bookings:', allTimeBookings);
  console.log('Membership Data length:', membershipData.length);
  console.log('Membership Data detail:', membershipData.map(m => ({ name: m.planId?.name, price: m.planId?.price, status: m.status })));
  console.log('All Time Membership:', allTimeMembership);
  
  const totalServiceRevenue = completedBookingsData.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const totalMembershipRevenue = membershipData.reduce((sum, item) => sum + (item.planId?.price || 0), 0);
  const totalRevenue = totalServiceRevenue + totalMembershipRevenue;
  console.log('Calculated totalRevenue:', totalRevenue);

  await mongoose.disconnect();
}

run().catch(console.error);
