const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  isWalkIn: { type: Boolean, default: false },
  walkInCustomerName: { type: String },
  walkInCustomerPhone: { type: String },
  services: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    name: { type: String },
    price: { type: Number },
    duration: { type: Number }
  }],
  totalPrice: { type: Number, required: true },
  totalDuration: { type: Number, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  type: { type: String, enum: ['shop', 'home'], default: 'shop' },
  serviceAddress: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  completedAt: { type: Date },
  cancelledAt: { Date },
  rescheduledAt: { Date },
  isReviewed: { type: Boolean, default: false }
}, { timestamps: true });

bookingSchema.index({ staffId: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ vendorId: 1 });
bookingSchema.index({ userId: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
