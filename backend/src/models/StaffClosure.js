const mongoose = require('mongoose');

const staffClosureSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  reason: { type: String, trim: true, maxlength: 300 },
  previousIsActive: { type: Boolean },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active'
  },
  endedAt: { type: Date }
}, { timestamps: true });

staffClosureSchema.index({ staffId: 1, startTime: 1, endTime: 1, status: 1 });
staffClosureSchema.index({ vendorId: 1 });

module.exports = mongoose.model('StaffClosure', staffClosureSchema);
