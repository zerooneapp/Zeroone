const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  initiatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  reason: { type: String },
  category: {
    type: String,
    enum: ['wallet_topup', 'daily_subscription', 'monthly_subscription', 'admin_topup'],
    default: 'wallet_topup'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  paymentGateway: { type: String, enum: ['razorpay', 'admin', 'system'], default: 'system' },
  paymentMethod: { type: String },
  gatewayOrderId: { type: String },
  gatewayPaymentId: { type: String },
  gatewaySignature: { type: String },
  referenceId: { type: String },
  description: { type: String },
  metadata: { type: Object },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

transactionSchema.index({ vendorId: 1 });
transactionSchema.index({ gatewayOrderId: 1 });
transactionSchema.index({ referenceId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('WalletTransaction', transactionSchema);
