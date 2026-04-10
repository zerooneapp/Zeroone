const express = require('express');
const {
  addStaff,
  listStaff,
  getStaffById,
  patchStaff,
  deleteStaff,
  getStaffProfile,
  getStaffHistory,
  getStaffAvailabilityForDate,
  upsertStaffAvailabilityForDate
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { isApprovedVendor } = require('../middleware/vendorMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Removed public routes if they require req.vendor to function. 
// They can be re-added later if/when they support non-vendor context.

// Public/Customer access routes
router.get('/profile', protect, authorize('staff'), getStaffProfile);
router.get('/history', protect, authorize('staff'), getStaffHistory);
router.get('/', listStaff);
router.get('/:id', getStaffById);

// Protected routes (Vendor management)
router.use(protect, isApprovedVendor);
router.get('/manage/all', listStaff);
router.get('/:id/availability', getStaffAvailabilityForDate);
router.put('/:id/availability', upsertStaffAvailabilityForDate);
router.post('/', upload.single('image'), addStaff);
router.patch('/:id', upload.single('image'), patchStaff);
router.delete('/:id', deleteStaff);

module.exports = router;
