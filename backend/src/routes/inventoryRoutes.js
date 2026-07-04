const express = require('express');
const {
  getInventory,
  getInventoryForStaff,
  createInventory,
  updateInventory,
  adjustStock,
  getInventoryLogs,
  getInventoryLogsForStaff,
  deleteInventory
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');
const { isApprovedVendor } = require('../middleware/vendorMiddleware');
const { isStaff } = require('../middleware/staffMiddleware');

const router = express.Router();

// ── Staff Routes (authenticated staff only, no vendor middleware) ──
router.get('/staff', protect, isStaff, getInventoryForStaff);
router.post('/staff/:id/adjust', protect, isStaff, adjustStock);
router.get('/staff/:id/logs', protect, isStaff, getInventoryLogsForStaff);

// ── Vendor Routes (authenticated + approved vendor) ──
router.use(protect);
router.use(isApprovedVendor);

router.get('/', getInventory);
router.post('/', createInventory);
router.put('/:id', updateInventory);
router.post('/:id/adjust', adjustStock);
router.get('/:id/logs', getInventoryLogs);
router.delete('/:id', deleteInventory);

module.exports = router;
