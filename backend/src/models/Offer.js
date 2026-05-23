const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  title: { type: String, required: true },
  discountType: { type: String, enum: ['flat', 'percentage'], required: true },
  value: { type: Number, required: true },
  serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }], // Empty means applicable to all
  expiryDate: { type: Date },
  minPurchaseAmount: { type: Number, default: 0 },
  maxDiscountLimit: { type: Number, default: 0 }, // 0 means no limit
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

offerSchema.index({ vendorId: 1, isActive: 1 });

module.exports = mongoose.model('Offer', offerSchema);
