const Vendor = require('../models/Vendor');
const { getUpdatedStatus } = require('../services/walletService');

const isActiveVendor = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'Merchant access required. Staff are restricted from this module.' });
    }
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    // Real-time status re-evaluation (Fallbacks for mid-day expiry/balance drops)
    const currentStatus = getUpdatedStatus(vendor);
    if (vendor.status !== currentStatus) {
      vendor.status = currentStatus;
      await vendor.save();
    }

    if (vendor.status !== 'active') {
      return res.status(403).json({ 
        message: `Vendor access restricted. Current status: ${vendor.status}`,
        rejectionReason: vendor.rejectionReason 
      });
    }

    req.vendor = vendor;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const isApprovedVendor = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'Merchant access required.' });
    }
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    if (vendor.status === 'pending') {
      return res.status(403).json({ message: 'Vendor profile is pending admin approval' });
    }

    req.vendor = vendor;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { isActiveVendor, isApprovedVendor };
