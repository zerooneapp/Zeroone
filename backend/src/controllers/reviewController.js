const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Vendor = require('../models/Vendor');
const mongoose = require('mongoose');

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
    if (booking.isReviewed) throw new Error('Already reviewed');

    // 1. Create Review
    const review = await Review.create([{
      userId: req.user._id,
      vendorId: booking.vendorId,
      bookingId: booking._id,
      rating,
      comment
    }], { session });

    // 2. Update Booking
    booking.isReviewed = true;
    await booking.save({ session });

    // 3. Update Vendor Aggregate Rating
    const vendor = await Vendor.findById(booking.vendorId).session(session);
    if (vendor) {
      const currentTotal = vendor.totalReviews || 0;
      const currentRating = vendor.rating || 0;
      
      const newTotal = currentTotal + 1;
      const newRating = ((currentRating * currentTotal) + rating) / newTotal;

      vendor.totalReviews = newTotal;
      vendor.rating = Number(newRating.toFixed(1));
      await vendor.save({ session });
    }

    await session.commitTransaction();
    res.status(201).json({ message: 'Review submitted! Thank you.', review: review[0] });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = { getUnreviewedBooking, submitReview };
