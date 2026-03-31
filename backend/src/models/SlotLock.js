const mongoose = require('mongoose');

const slotLockSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// TTL index to automatically release slot lock
slotLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
slotLockSchema.index({ staffId: 1 });

module.exports = mongoose.model('SlotLock', slotLockSchema);
