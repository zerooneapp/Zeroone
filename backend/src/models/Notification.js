const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['customer', 'vendor', 'staff', 'admin'], required: true },
  type: { type: String, required: true }, // e.g., 'BOOKING_CONFIRMED', 'LOW_BALANCE'
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Object }, // Metadata like bookingId, vendorId
  referenceId: { type: String }, // Used for duplicate protection (e.g., booking._id + type)
  isRead: { type: Boolean, default: false },
  isSilent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Duplicate protection index: userId + type + referenceId
notificationSchema.index({ userId: 1, type: 1, referenceId: 1 }, { unique: true });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
