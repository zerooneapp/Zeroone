const mongoose = require('mongoose');

const staffAvailabilitySchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  date: { type: Date, required: true },
  workingHours: [{
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  }],
  slots: [{
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isBooked: { type: Boolean, default: false }
  }]
}, { timestamps: true });

staffAvailabilitySchema.index({ staffId: 1, date: 1 });

module.exports = mongoose.model('StaffAvailability', staffAvailabilitySchema);
