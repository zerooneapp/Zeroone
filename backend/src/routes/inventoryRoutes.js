const express = require('express');
const {
  getInventory,
  createInventory,
  updateInventory,
  deleteInventory
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');
const { isApprovedVendor } = require('../middleware/vendorMiddleware');

const router = express.Router();

// Apply auth and vendor verification middlewares to all routes
router.use(protect);
router.use(isApprovedVendor);

router.get('/', getInventory);
router.post('/', createInventory);
router.put('/:id', updateInventory);
router.delete('/:id', deleteInventory);

module.exports = router;
