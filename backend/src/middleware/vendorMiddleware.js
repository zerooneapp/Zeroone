const Vendor = require('../models/Vendor');
const { getUpdatedStatus } = require('../services/walletService');

const isActiveVendor = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'Merchant access required. Staff are restricted from this module.' });
    }
    
    let activeVendorId = req.headers['x-vendor-id'];
    if (!activeVendorId) {
      activeVendorId = req.user.lastActiveVendorId;
    }
    
    // Fallback: If still not found, fetch the first shop owned by this user
    if (!activeVendorId) {
      const fallbackVendor = await Vendor.findOne({ ownerId: req.user._id, isDeleted: false });
      if (fallbackVendor) {
        activeVendorId = fallbackVendor._id;
        req.user.lastActiveVendorId = activeVendorId;
        await req.user.save();
      }
    }

    if (!activeVendorId) {
      return res.status(400).json({ message: 'x-vendor-id header is required for merchant context' });
    }

    const vendor = await Vendor.findOne({ _id: activeVendorId, ownerId: req.user._id });
    if (!vendor) {
      return res.status(403).json({ message: 'Vendor profile not found or access denied' });
    }

    // Real-time status re-evaluation (Fallbacks for mid-day expiry/balance drops)
    const currentStatus = await getUpdatedStatus(vendor);
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

    req.activeVendorId = vendor._id;
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
    
    let activeVendorId = req.headers['x-vendor-id'];
    if (!activeVendorId) {
      activeVendorId = req.user.lastActiveVendorId;
    }
    
    // Fallback: If still not found, fetch the first shop owned by this user
    if (!activeVendorId) {
      const fallbackVendor = await Vendor.findOne({ ownerId: req.user._id, isDeleted: false });
      if (fallbackVendor) {
        activeVendorId = fallbackVendor._id;
        req.user.lastActiveVendorId = activeVendorId;
        await req.user.save();
      }
    }

    if (!activeVendorId) {
      return res.status(400).json({ message: 'x-vendor-id header is required for merchant context' });
    }

    const vendor = await Vendor.findOne({ _id: activeVendorId, ownerId: req.user._id });
    if (!vendor) {
      return res.status(403).json({ message: 'Vendor profile not found or access denied' });
    }

    if (vendor.status === 'pending') {
      return res.status(403).json({ message: 'Vendor profile is pending admin approval' });
    }

    if (['blocked', 'rejected'].includes(vendor.status)) {
      return res.status(403).json({ message: `Vendor access restricted. Current status: ${vendor.status}` });
    }

    req.activeVendorId = vendor._id;
    req.vendor = vendor;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { isActiveVendor, isApprovedVendor };
