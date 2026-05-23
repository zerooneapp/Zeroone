const mongoose = require('mongoose');

const vendorPromotionSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromotionPlan',
    required: false
  },
  durationDays: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'rejected'],
    default: 'pending'
  },
  paymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpayOrderId: {
    type: String
  },
  approvalDate: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('VendorPromotion', vendorPromotionSchema);
