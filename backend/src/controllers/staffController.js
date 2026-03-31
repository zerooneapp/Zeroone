const { 
  onboardStaff, 
  getVendorStaff, 
  updateStaff, 
  softDeleteStaff 
} = require('../services/staffService');
const Staff = require('../models/Staff');
const Service = require('../models/Service');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

const addStaff = async (req, res) => {
  try {
    const { name, phone, services } = req.body;

    // Validate services is not empty (already in model but good for early 400)
    const serviceArray = typeof services === 'string' ? JSON.parse(services) : services;
    if (!serviceArray || serviceArray.length === 0) {
      return res.status(400).json({ message: 'Staff must have at least one assigned service' });
    }

    let imageUrl = '';
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'staff' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    const staff = await onboardStaff(req.vendor._id, {
      name,
      phone,
      services: serviceArray,
      image: imageUrl
    });

    res.status(201).json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

const listStaff = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.query.vendorId;
    if (!vendorId) return res.status(400).json({ message: 'VendorId required' });

    let staff = await getVendorStaff(vendorId, req.query.includeInactive === 'true');
    
    // 🛡️ FALLBACK: If vendor has 0 staff, auto-create a 'Self' record for the vendor
    if (staff.length === 0) {
      console.log(`[DEBUG] No staff found for vendor ${vendorId}, checking services.`);
      const Vendor = require('../models/Vendor');
      const Service = require('../models/Service');
      const vendor = await Vendor.findById(vendorId);
      const allServices = await Service.find({ vendorId });
      
      // We can only create a staff if at least one service exists (due to validator)
      if (allServices.length > 0) {
        const selfStaff = await onboardStaff(vendorId, {
          name: `${vendor.shopName} (Owner)`,
          phone: vendor?.phone || '0000000000',
          password: 'SELF_MANAGED', 
          services: allServices.map(s => s._id),
          isOwner: true
        });
        staff = [selfStaff];
      }
    }

    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const patchStaff = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.body.services) {
      updateData.services = typeof req.body.services === 'string' 
        ? JSON.parse(req.body.services) 
        : req.body.services;
    }

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'staff' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      updateData.image = result.secure_url;
    }

    const staff = await updateStaff(req.vendor._id, req.params.id, updateData);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStaffById = async (req, res) => {
  try {
    const Staff = require('../models/Staff');
    const staff = await Staff.findById(req.params.id).populate('services');
    if (!staff || (!staff.isActive && req.user?.role !== 'vendor')) {
      return res.status(404).json({ message: 'Staff member not found or inactive' });
    }
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const staff = await softDeleteStaff(req.vendor._id, req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.status(200).json({ message: 'Staff deactivated successfully', staff });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStaffProfile = async (req, res) => {
  try {
    console.log('[DEBUG] Fetching profile for User ID:', req.user?._id);

    if (!req.user || !req.user._id) {
       return res.status(401).json({ message: 'Authentication context missing' });
    }

    const staff = await Staff.findOne({ userId: req.user._id })
      .populate('services')
      .populate({
        path: 'vendorId',
        select: 'shopName ownerId address',
        populate: { path: 'ownerId', select: 'name phone' }
      });

    console.log('[DEBUG] Staff record found:', staff ? 'Yes' : 'No');

    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not linked to this user account' });
    }

    res.status(200).json(staff);
  } catch (error) {
    console.error('[StaffProfile-Fatal-Error]', error);
    res.status(500).json({ 
      message: 'Staff profile lookup failed', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  addStaff,
  listStaff,
  patchStaff,
  deleteStaff,
  getStaffById,
  getStaffProfile,
};
