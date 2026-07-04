const mongoose = require('mongoose');
const InventoryItem = require('../src/models/InventoryItem');

// Load environment variables
require('dotenv').config({ path: '../.env' });

async function verify() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/zeroone';
    console.log('Connecting to Mongo:', mongoUri);
    await mongoose.connect(mongoUri);

    console.log('Connected! Creating dummy inventory item...');
    const dummyVendorId = new mongoose.Types.ObjectId();

    // Create item
    const item = await InventoryItem.create({
      vendorId: dummyVendorId,
      itemName: 'Test Massage Oil',
      sku: 'MO-500',
      category: 'Consumables',
      purchasePrice: 150,
      price: 250,
      stock: 5,
      minStockLevel: 3,
      supplierName: 'Pure Oils Ltd',
      supplierContact: '+1234567890',
      notes: 'Store in cool place'
    });
    console.log('Created item:', item);

    // List items
    const items = await InventoryItem.find({ vendorId: dummyVendorId });
    console.log('List (count):', items.length);

    // Update item
    item.stock = 2; // triggers low stock warning
    await item.save();
    console.log('Updated stock to 2. Is low stock?', item.stock <= item.minStockLevel);

    // Delete item
    await InventoryItem.deleteOne({ _id: item._id });
    console.log('Cleaned up dummy item.');

    await mongoose.connection.close();
    console.log('Verification finished successfully!');
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

verify();
