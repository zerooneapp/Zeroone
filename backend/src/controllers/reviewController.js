const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');

const getApprovedReviewQuery = () => ({
  $or: [
    { status: 'approved' },
    { status: 'pending' },
    { status: { $exists: false } }
  ]
});

const recalculateVendorRating = async (vendorId, session = null) => {
  const aggregation = await Review.aggregate([
    {
      $match: {
        vendorId: new mongoose.Types.ObjectId(vendorId),
        ...getApprovedReviewQuery()
      }
    },
    {
      $group: {
        _id: '$vendorId',
        totalReviews: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]).session(session || null);

  const reviewStats = aggregation[0] || { totalReviews: 0, avgRating: 0 };

  await Vendor.findByIdAndUpdate(
    vendorId,
    {
      totalReviews: reviewStats.totalReviews,
      rating: Number((reviewStats.avgRating || 0).toFixed(1))
    },
    { session }
  );
};

const normalizeReviewForAdmin = (review) => ({
  _id: review._id,
  id: `RV-${String(review._id).slice(-6).toUpperCase()}`,
  user: review.userId?.name || 'Unknown User',
  vendor: review.vendorId?.shopName || 'Unknown Vendor',
  service: review.bookingId?.services?.map((service) => service.name).filter(Boolean).join(', ') || 'Service',
  rating: review.rating,
  comment: review.comment || 'No comment',
  date: review.createdAt,
  status: review.status || 'approved'
});

const getVendorReviews = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const reviews = await Review.find({
      vendorId,
      ...getApprovedReviewQuery()
    })
      .populate('userId', 'name image')
      .populate({
        path: 'bookingId',
        select: 'services createdAt staffId',
        populate: { path: 'staffId', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .lean();

    const normalizedReviews = reviews.map((review) => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment || '',
      date: review.createdAt,
      user: {
        name: review.userId?.name || 'Verified User',
        image: review.userId?.image || ''
      },
      services: (review.bookingId?.services || [])
        .map((service) => service?.name)
        .filter(Boolean),
      staffName: review.bookingId?.staffId?.name || null
    }));

    const avgRating = normalizedReviews.length
      ? Number((normalizedReviews.reduce((sum, review) => sum + review.rating, 0) / normalizedReviews.length).toFixed(1))
      : 0;

    res.status(200).json({
      summary: {
        totalReviews: normalizedReviews.length,
        avgRating
      },
      reviews: normalizedReviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUnreviewedBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      userId: req.user._id,
      status: 'completed',
      isReviewed: false
    })
      .sort({ completedAt: -1 })
      .populate('vendorId', 'shopName shopImage address')
      .populate('staffId', 'name image');

    if (!booking) return res.status(200).json(null);
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitReview = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating) throw new Error('Booking ID and rating are required');

    const booking = await Booking.findOne({ _id: bookingId, userId: req.user._id }).session(session);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'completed') throw new Error('Only completed bookings can be reviewed');
    if (booking.isReviewed) throw new Error('Already reviewed');

    const review = await Review.create([{
      userId: req.user._id,
      vendorId: booking.vendorId,
      bookingId: booking._id,
      rating,
      comment,
      status: 'approved'
    }], { session });

    booking.isReviewed = true;
    await booking.save({ session });

    await session.commitTransaction();

    // 🚀 Dynamic Update: Recalculate rating immediately (including this approved review)
    await recalculateVendorRating(booking.vendorId);

    const vendor = await Vendor.findById(booking.vendorId).select('ownerId shopName');

    const Staff = require('../models/Staff');
    const staff = await Staff.findById(booking.staffId);
    const staffUserId = staff?.userId || staff?._id;

    await Promise.all([
      vendor?.ownerId ? NotificationService.sendNotification({
        userIds: vendor.ownerId,
        role: 'vendor',
        type: 'NEW_REVIEW',
        title: 'New Review Submitted',
        message: `A new ${rating}-star review was submitted for ${vendor.shopName || 'your shop'} and is now live on your profile.`,
        data: { bookingId: booking._id, rating, vendorId: booking.vendorId },
        vendorId: booking.vendorId,
        referenceId: `REVIEW_SUBMITTED_VENDOR_${booking._id}`
      }) : null,
      staffUserId ? NotificationService.sendNotification({
        userIds: staffUserId,
        role: 'staff',
        type: 'NEW_REVIEW',
        title: 'New Review Received!',
        message: `You received a ${rating}-star review for your recent service.`,
        data: { bookingId: booking._id, rating },
        referenceId: `REVIEW_SUBMITTED_STAFF_${booking._id}`
      }) : null
    ].filter(Boolean));

    res.status(201).json({ message: 'Review submitted successfully.', review: review[0] });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

const getAdminReviews = async (req, res) => {
  try {
    const { search = '', status = 'all', rating = 'all' } = req.query;

    const reviews = await Review.find()
      .populate('userId', 'name')
      .populate('vendorId', 'shopName')
      .populate('bookingId', 'services')
      .sort({ createdAt: -1 })
      .lean();

    const normalizedReviews = reviews.map(normalizeReviewForAdmin);
    const query = search.trim().toLowerCase();

    const filteredReviews = normalizedReviews.filter((review) => {
      const matchesSearch = !query || [
        review.user,
        review.vendor,
        review.service,
        review.comment,
        review.id
      ].join(' ').toLowerCase().includes(query);

      const matchesStatus = status === 'all' || review.status === status;
      const matchesRating = rating === 'all'
        || (rating === '4+' && review.rating >= 4)
        || (rating === '3-' && review.rating <= 3)
        || (rating === '1' && review.rating === 1);

      return matchesSearch && matchesStatus && matchesRating;
    });

    const approvedReviews = normalizedReviews.filter((review) => review.status === 'approved');
    const avgRating = approvedReviews.length
      ? Number((approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length).toFixed(1))
      : 0;

    res.status(200).json({
      summary: {
        avgRating,
        totalReviews: normalizedReviews.length,
        pendingModeration: normalizedReviews.filter((review) => review.status === 'pending').length
      },
      reviews: filteredReviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate('userId', 'name');
    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.status = 'approved';
    review.moderatedBy = req.user._id;
    review.moderatedAt = new Date();
    await review.save();
    await recalculateVendorRating(review.vendorId);

    const vendor = await Vendor.findById(review.vendorId).select('ownerId shopName');

    const Booking = require('../models/Booking');
    const booking = await Booking.findById(review.bookingId);
    const Staff = require('../models/Staff');
    const staff = booking ? await Staff.findById(booking.staffId) : null;
    const staffUserId = staff?.userId || staff?._id;

    await Promise.all([
      review.userId ? NotificationService.sendNotification({
        userIds: review.userId._id || review.userId,
        role: 'customer',
        type: 'REVIEW_APPROVED',
        title: 'Review Published',
        message: `Your review for ${vendor?.shopName || 'the partner'} is now live.`,
        referenceId: `REVIEW_APPROVED_USER_${review._id}`
      }) : null,
      vendor?.ownerId ? NotificationService.sendNotification({
        userIds: vendor.ownerId,
        role: 'vendor',
        type: 'REVIEW_APPROVED',
        title: 'New Review Published',
        message: `A new customer review for ${vendor.shopName || 'your shop'} is now visible on your profile.`,
        referenceId: `REVIEW_APPROVED_VENDOR_${review._id}`
      }) : null,
      staffUserId ? NotificationService.sendNotification({
        userIds: staffUserId,
        role: 'staff',
        type: 'REVIEW_APPROVED',
        title: 'New Review Published',
        message: `A new customer review for your service is now visible on the profile.`,
        referenceId: `REVIEW_APPROVED_STAFF_${review._id}`
      }) : null
    ].filter(Boolean));

    res.status(200).json({ message: 'Review approved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveAllReviews = async (req, res) => {
  try {
    const pendingReviews = await Review.find({ status: 'pending' }).select('_id vendorId');
    if (pendingReviews.length === 0) {
      return res.status(200).json({ message: 'No pending reviews found' });
    }

    await Review.updateMany(
      { _id: { $in: pendingReviews.map((review) => review._id) } },
      {
        $set: {
          status: 'approved',
          moderatedBy: req.user._id,
          moderatedAt: new Date()
        }
      }
    );

    const vendorIds = [...new Set(pendingReviews.map((review) => String(review.vendorId)))];
    await Promise.all(vendorIds.map((vendorId) => recalculateVendorRating(vendorId)));

    res.status(200).json({ message: 'All pending reviews approved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const vendorId = review.vendorId;
    await Review.findByIdAndDelete(req.params.id);
    await recalculateVendorRating(vendorId);

    res.status(200).json({ message: 'Review removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyVendorReviews = async (req, res) => {
  try {
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    const reviews = await Review.find({
      vendorId: vendor._id,
      ...getApprovedReviewQuery()
    })
      .populate('userId', 'name image')
      .populate({
        path: 'bookingId',
        select: 'services createdAt staffId',
        populate: { path: 'staffId', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .lean();

    const normalizedReviews = reviews.map((review) => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment || '',
      date: review.createdAt,
      user: {
        name: review.userId?.name || 'Verified User',
        image: review.userId?.image || ''
      },
      services: (review.bookingId?.services || [])
        .map((service) => service?.name)
        .filter(Boolean),
      staffName: review.bookingId?.staffId?.name || null
    }));

    res.status(200).json({
      summary: {
        totalReviews: normalizedReviews.length,
        avgRating: vendor.rating || 0
      },
      reviews: normalizedReviews,
      vendor: {
        shopName: vendor.shopName
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyStaffReviews = async (req, res) => {
  try {
    const Staff = require('../models/Staff');
    const staff = await Staff.findById(req.staff._id).populate('vendorId');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    // Find bookings assigned to this staff
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ staffId: staff._id }).select('_id');
    const bookingIds = bookings.map(b => b._id);

    const reviews = await Review.find({
      bookingId: { $in: bookingIds },
      ...getApprovedReviewQuery()
    })
      .populate('userId', 'name image')
      .populate({
        path: 'bookingId',
        select: 'services createdAt staffId',
        populate: { path: 'staffId', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .lean();

    const normalizedReviews = reviews.map((review) => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment || '',
      date: review.createdAt,
      user: {
        name: review.userId?.name || 'Verified User',
        image: review.userId?.image || ''
      },
      services: (review.bookingId?.services || [])
        .map((service) => service?.name)
        .filter(Boolean),
      staffName: review.bookingId?.staffId?.name || staff.name
    }));

    const avgRating = normalizedReviews.length
      ? Number((normalizedReviews.reduce((sum, review) => sum + review.rating, 0) / normalizedReviews.length).toFixed(1))
      : 0;

    res.status(200).json({
      summary: {
        totalReviews: normalizedReviews.length,
        avgRating: avgRating
      },
      reviews: normalizedReviews,
      vendor: {
        shopName: staff.vendorId?.shopName
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getVendorReviews,
  getMyVendorReviews,
  getMyStaffReviews,
  getUnreviewedBooking,
  submitReview,
  getAdminReviews,
  approveReview,
  approveAllReviews,
  deleteReview,
  recalculateVendorRating
};
