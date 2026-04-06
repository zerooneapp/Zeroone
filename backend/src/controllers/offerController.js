const { 
  createOffer, 
  getVendorOffers, 
  getOfferById, 
  updateOffer, 
  deleteOffer 
} = require('../services/offerService');
const { getPricingPreviewForServiceIds } = require('../services/offerPricingService');

const addOffer = async (req, res) => {
  try {
    const { title, discountType, value, serviceIds, expiryDate } = req.body;
    
    // Server-side validation
    if (discountType === 'percentage' && value > 100) {
      return res.status(400).json({ message: 'Percentage discount cannot exceed 100%' });
    }
    if (new Date(expiryDate) < new Date()) {
      return res.status(400).json({ message: 'Expiry date must be in the future' });
    }

    const offer = await createOffer(req.vendor._id, {
      title,
      discountType,
      value,
      serviceIds,
      expiryDate
    });

    res.status(201).json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const listOffers = async (req, res) => {
  try {
    const offers = await getVendorOffers(req.vendor._id);
    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOfferDetails = async (req, res) => {
  try {
    const offer = await getOfferById(req.vendor._id, req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const patchOffer = async (req, res) => {
  try {
    const offer = await updateOffer(req.vendor._id, req.params.id, req.body);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeOffer = async (req, res) => {
  try {
    const offer = await deleteOffer(req.vendor._id, req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.status(200).json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const previewPublicPricing = async (req, res) => {
  try {
    const { vendorId, serviceIds } = req.query;
    if (!vendorId || !serviceIds) {
      return res.status(400).json({ message: 'vendorId and serviceIds are required' });
    }

    const normalizedServiceIds = Array.isArray(serviceIds)
      ? serviceIds
      : String(serviceIds)
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);

    if (normalizedServiceIds.length === 0) {
      return res.status(400).json({ message: 'At least one serviceId is required' });
    }

    const preview = await getPricingPreviewForServiceIds(vendorId, normalizedServiceIds);
    res.status(200).json(preview);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  addOffer,
  listOffers,
  getOfferDetails,
  patchOffer,
  removeOffer,
  previewPublicPricing
};
