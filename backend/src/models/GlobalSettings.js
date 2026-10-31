const mongoose = require('mongoose');

const globalSettingsSchema = new mongoose.Schema({
  freeTrialDays: { type: Number, default: 7 },
  minWalletThreshold: { type: Number, default: 100 },
  minWithdrawalAmount: { type: Number, default: 100 },
  discoveryRadius: { type: Number, default: 10 }, // Radius in KM
  notifications: {
    bookingAlerts: { type: Boolean, default: true },
    walletAlerts: { type: Boolean, default: true },
    reminderAlerts: { type: Boolean, default: true }
  },
  supportWhatsApp: { type: String, default: "" },
  supportPhone: { type: String, default: "" },
  promotionPricePerDay: { type: Number, default: 10 },
  features: {
    membershipActive: { type: Boolean, default: true },
    subscriptionActive: { type: Boolean, default: true }
  },
  paymentGateway: {
    active: {
      type: String,
      enum: ['razorpay', 'cashfree'],
      default: 'razorpay'
    }
  },
  // Vendors (and all their linked data) that Developer Settings clean-up never deletes
  protectedVendorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  // Admin dashboard revenue only counts transactions after this date
  revenueResetAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('GlobalSettings', globalSettingsSchema);
