const Offer = require('../models/Offer');

const createOffer = async (vendorId, offerData) => {
  return await Offer.create({ ...offerData, vendorId });
};

const getVendorOffers = async (vendorId) => {
  return await Offer.find({ vendorId }).populate('serviceIds').sort({ createdAt: -1 });
};

const getOfferById = async (vendorId, offerId) => {
  return await Offer.findOne({ _id: offerId, vendorId }).populate('serviceIds');
};

const updateOffer = async (vendorId, offerId, updateData) => {
  return await Offer.findOneAndUpdate(
    { _id: offerId, vendorId },
    updateData,
    { new: true, runValidators: true }
  );
};

const deleteOffer = async (vendorId, offerId) => {
  return await Offer.findOneAndDelete({ _id: offerId, vendorId });
};

module.exports = {
  createOffer,
  getVendorOffers,
  getOfferById,
  updateOffer,
  deleteOffer
};
