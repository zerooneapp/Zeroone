const mongoose = require('mongoose');

const globalSettingsSchema = new mongoose.Schema({
  freeTrialDays: { type: Number, default: 7 },
  minWalletThreshold: { type: Number, default: 100 },
  discoveryRadius: { type: Number, default: 10 }, // Radius in KM
  notifications: {
    bookingAlerts: { type: Boolean, default: true },
    walletAlerts: { type: Boolean, default: true },
    reminderAlerts: { type: Boolean, default: true }
  },
  supportWhatsApp: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('GlobalSettings', globalSettingsSchema);
