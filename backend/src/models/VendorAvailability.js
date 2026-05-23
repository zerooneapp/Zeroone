const mongoose = require('mongoose');

const vendorAvailabilitySchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], required: true },
  openTime: { type: String, required: true },
  closeTime: { type: String, required: true },
  isOpen: { type: Boolean, default: true }
}, { timestamps: true });

vendorAvailabilitySchema.index({ vendorId: 1 });

module.exports = mongoose.model('VendorAvailability', vendorAvailabilitySchema);
