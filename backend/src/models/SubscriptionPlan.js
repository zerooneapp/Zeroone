const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  type: { type: String, enum: ['daily', 'monthly'], required: true },
  level: { type: String, enum: ['basic', 'standard', 'premium', 'luxury'], required: true },
  price: { type: Number, required: true, min: 0 },
  gstPercent: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

subscriptionPlanSchema.index({ type: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
