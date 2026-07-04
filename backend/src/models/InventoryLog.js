const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  itemName: { type: String, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  change: { type: Number, required: true }, // e.g. +1, -5
  customerName: { type: String, default: '' },
  customerContact: { type: String, default: '' },
  // Staff who made the adjustment (null if vendor did it directly)
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  staffName: { type: String, default: '' },
  adjustedBy: { type: String, enum: ['vendor', 'staff'], default: 'vendor' }
}, { timestamps: true });

inventoryLogSchema.index({ vendorId: 1 });
inventoryLogSchema.index({ itemId: 1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
