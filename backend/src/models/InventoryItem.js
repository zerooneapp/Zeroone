const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  itemName: { type: String, required: true },
  sku: { type: String, default: '' },
  category: { type: String, default: '' },
  purchasePrice: { type: Number, default: 0, min: 0 },
  price: { type: Number, default: 0, min: 0 },
  stock: { type: Number, default: 0, required: true },
  minStockLevel: { type: Number, default: 0 },
  supplierName: { type: String, default: '' },
  supplierContact: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

// Indexing for faster queries per vendor
inventoryItemSchema.index({ vendorId: 1 });
inventoryItemSchema.index({ vendorId: 1, itemName: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
