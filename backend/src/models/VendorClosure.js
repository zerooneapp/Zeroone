const mongoose = require('mongoose');

const vendorClosureSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  reason: { type: String, trim: true, maxlength: 300 },
  previousIsShopOpen: { type: Boolean },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active'
  },
  endedAt: { type: Date }
}, { timestamps: true });

vendorClosureSchema.index({ vendorId: 1, startTime: 1, endTime: 1, status: 1 });

module.exports = mongoose.model('VendorClosure', vendorClosureSchema);
