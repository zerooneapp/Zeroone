const express = require('express');
const { 
  addService, 
  listServices, 
  patchService, 
  deleteService,
  getServiceById
} = require('../controllers/serviceController');
const { protect } = require('../middleware/authMiddleware');
const { isApprovedVendor } = require('../middleware/vendorMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Removed public routes if they require req.vendor to function. 
// They can be re-added later if/when they support non-vendor context.

// Public/Customer access routes
router.get('/', listServices);
router.get('/:id', getServiceById);

// Protected routes (Vendor management)
router.use(protect, isApprovedVendor);
router.get('/manage/all', listServices); // Dedicated for vendor panel
router.post('/', upload.array('images', 4), addService);
router.patch('/:id', upload.array('images', 4), patchService);
router.delete('/:id', deleteService);

module.exports = router;
