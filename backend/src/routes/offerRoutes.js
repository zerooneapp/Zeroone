const express = require('express');
const { 
  addOffer, 
  listOffers, 
  getOfferDetails, 
  patchOffer, 
  removeOffer 
} = require('../controllers/offerController');
const { protect } = require('../middleware/authMiddleware');
const { isApprovedVendor } = require('../middleware/vendorMiddleware');

const router = express.Router();

router.use(protect, isApprovedVendor);

router.post('/', addOffer);
router.get('/', listOffers);
router.get('/:id', getOfferDetails);
router.patch('/:id', patchOffer);
router.delete('/:id', removeOffer);

module.exports = router;
