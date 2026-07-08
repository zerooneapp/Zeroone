const InventoryItem = require('../models/InventoryItem');
const InventoryLog = require('../models/InventoryLog');

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
      query.$expr = { $lte: ['$stock', '$minStockLevel'] };
    }

    const items = await InventoryItem.find(query).sort({ itemName: 1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get inventory items for staff (read-only, no prices, scoped to their vendor)
const getInventoryForStaff = async (req, res) => {
  try {
    const vendorId = req.staff.vendorId;
    const { search, category } = req.query;

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

    // Staff only sees name, sku, category, stock, minStockLevel — no prices
    const items = await InventoryItem.find(query)
      .select('itemName sku category stock minStockLevel price')
      .sort({ itemName: 1 });

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
      'itemName', 'sku', 'category', 'purchasePrice', 'price',
      'stock', 'minStockLevel', 'supplierName', 'supplierContact', 'notes'
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

// Adjust stock — works for both vendor (req.vendor) and staff (req.staff)
const adjustStock = async (req, res) => {
  try {
    const isStaffAdjust = !!req.staff;
    const vendorId = isStaffAdjust ? req.staff.vendorId : req.vendor._id;

    const { id } = req.params;
    const { change, customerName, customerContact, staffName, isReturn } = req.body;

    if (change === undefined || typeof change !== 'number') {
      return res.status(400).json({ message: 'Stock change value is required' });
    }

    if (isStaffAdjust && change > 0 && !isReturn) {
      return res.status(403).json({ message: 'Staff is not authorized to increase stock quantity. Only the store owner can add stock.' });
    }

    const item = await InventoryItem.findOne({ _id: id, vendorId });
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const previousStock = item.stock;
    const newStock = Math.max(0, previousStock + change);
    item.stock = newStock;
    const updatedItem = await item.save();

    // Build log entry
    const logEntry = {
      vendorId,
      itemId: item._id,
      itemName: item.itemName,
      previousStock,
      newStock,
      change,
      customerName: customerName || '',
      customerContact: customerContact || '',
      adjustedBy: isStaffAdjust ? 'staff' : 'vendor',
      isReturn: !!isReturn
    };

    if (isStaffAdjust) {
      logEntry.staffId = req.staff._id;
      logEntry.staffName = req.staff.name || '';
    } else if (staffName) {
      logEntry.staffName = staffName;
    }

    await InventoryLog.create(logEntry);
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get adjustment history logs for a specific item with optional date filters and pagination
const getInventoryLogs = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;
    const { from, to, page = 1, limit = 10 } = req.query;

    const query = { vendorId, itemId: id };

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    const totalLogs = await InventoryLog.countDocuments(query);
    const logs = await InventoryLog.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      logs,
      totalPages: Math.ceil(totalLogs / Number(limit)),
      currentPage: Number(page),
      totalLogs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get adjustment history logs for a specific item — staff version (scoped to their vendor)
const getInventoryLogsForStaff = async (req, res) => {
  try {
    const vendorId = req.staff.vendorId;
    const { id } = req.params;
    const { from, to, page = 1, limit = 10 } = req.query;

    const query = { vendorId, itemId: id };

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    const totalLogs = await InventoryLog.countDocuments(query);
    const logs = await InventoryLog.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      logs,
      totalPages: Math.ceil(totalLogs / Number(limit)),
      currentPage: Number(page),
      totalLogs
    });
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
  getInventoryForStaff,
  createInventory,
  updateInventory,
  adjustStock,
  getInventoryLogs,
  getInventoryLogsForStaff,
  deleteInventory
};
