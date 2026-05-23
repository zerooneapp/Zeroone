const mongoose = require('mongoose');

const userMembershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorMembershipPlan',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  razorpayOrderId: {
    type: String,
    required: false
  },
  razorpayPaymentId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected', 'expired', 'cancelled'],
    default: 'pending'
  },
  ticketId: {
    type: String,
    sparse: true
  },
  usage: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    usedCount: {
      type: Number,
      default: 0
    },
    usageLimit: {
      type: Number,
      required: true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for quick lookup of active memberships for a user at a specific vendor
userMembershipSchema.index({ userId: 1, vendorId: 1, status: 1 });

module.exports = mongoose.model('UserMembership', userMembershipSchema);
