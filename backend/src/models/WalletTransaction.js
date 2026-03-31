const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  reason: { type: String }, // e.g., "Manual Top-up", "Daily Subscription"
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

transactionSchema.index({ vendorId: 1 });

module.exports = mongoose.model('WalletTransaction', transactionSchema);
