const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String }
}, { timestamps: true });

// Prevent duplicate reviews for same booking
reviewSchema.index({ userId: 1, bookingId: 1 }, { unique: true });
reviewSchema.index({ vendorId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
