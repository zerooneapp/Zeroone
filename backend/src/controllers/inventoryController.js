const InventoryItem = require('../models/InventoryItem');

// Get all inventory items for a vendor (with optional search, category, and low stock filters)
const getInventory = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { search, category, lowStock } = req.query;

    const query = { vendorId };

    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (lowStock === 'true') {
      // Find items where stock is less than or equal to minStockLevel
      query.$expr = { $lte: ['$stock', '$minStockLevel'] };
    }

    const items = await InventoryItem.find(query).sort({ itemName: 1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new inventory item
const createInventory = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const {
      itemName,
      sku,
      category,
      purchasePrice,
      price,
      stock,
      minStockLevel,
      supplierName,
      supplierContact,
      notes
    } = req.body;

    if (!itemName) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    const newItem = await InventoryItem.create({
      vendorId,
      itemName,
      sku,
      category,
      purchasePrice: purchasePrice || 0,
      price: price || 0,
      stock: stock || 0,
      minStockLevel: minStockLevel || 0,
      supplierName,
      supplierContact,
      notes
    });

    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an inventory item (details or stock)
const updateInventory = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;

    const item = await InventoryItem.findOne({ _id: id, vendorId });
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const fieldsToUpdate = [
      'itemName',
      'sku',
      'category',
      'purchasePrice',
      'price',
      'stock',
      'minStockLevel',
      'supplierName',
      'supplierContact',
      'notes'
    ];

    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        item[field] = req.body[field];
      }
    });

    const updatedItem = await item.save();
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete an inventory item
const deleteInventory = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;

    const deletedItem = await InventoryItem.findOneAndDelete({ _id: id, vendorId });
    if (!deletedItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.status(200).json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getInventory,
  createInventory,
  updateInventory,
  deleteInventory
};
