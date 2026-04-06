const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Vendor = require('../models/Vendor');

const getApprovedReviewQuery = () => ({
  $or: [
    { status: 'approved' },
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
      status: 'pending'
    }], { session });

    booking.isReviewed = true;
    await booking.save({ session });

    await session.commitTransaction();
    res.status(201).json({ message: 'Review submitted and sent for moderation.', review: review[0] });
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
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.status = 'approved';
    review.moderatedBy = req.user._id;
    review.moderatedAt = new Date();
    await review.save();
    await recalculateVendorRating(review.vendorId);

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

module.exports = {
  getUnreviewedBooking,
  submitReview,
  getAdminReviews,
  approveReview,
  approveAllReviews,
  deleteReview,
  recalculateVendorRating
};
