const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
  duration: { 
    type: Number, 
    required: true, 
    min: 15, 
    max: 240,
    validate: {
      validator: (v) => v % 15 === 0,
      message: 'Duration must be a multiple of 15 minutes'
    }
  },
  bufferTime: { type: Number, default: 0 },
  image: { type: String },
  images: { type: [String], default: [] },
  type: { type: String, enum: ['shop', 'home'], default: 'shop' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Prevent duplicate service names per vendor
serviceSchema.index({ vendorId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Service', serviceSchema);
