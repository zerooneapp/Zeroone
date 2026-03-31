const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  services: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    name: { type: String },
    price: { type: Number },
    duration: { type: Number }
  }],
  totalPrice: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 }
}, { timestamps: true });

// Auto clear cart if inactive for 24 hours
cartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Cart', cartSchema);
