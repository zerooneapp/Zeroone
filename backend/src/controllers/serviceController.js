const { 
  createService, 
  getVendorServices, 
  updateService, 
  softDeleteService 
} = require('../services/serviceService');
const cloudinary = require('../config/cloudinary');

const addService = async (req, res) => {
  try {
    const { name, description, price, duration, bufferTime, type, category } = req.body;
    
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      // Parallel Cloudinary upload for multiple images
      imageUrls = await Promise.all(req.files.map(file => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'services' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          stream.end(file.buffer);
        });
      }));
    }

    const service = await createService(req.vendor._id, {
      name,
      description,
      price,
      duration,
      bufferTime,
      type,
      category,
      image: imageUrls[0] || '', // Primary image for legacy support
      images: imageUrls // Multi-image gallery for elite swapper
    });

    res.status(201).json(service);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Service name already exists for this vendor' });
    }
    res.status(500).json({ message: error.message });
  }
};

const listServices = async (req, res) => {
  try {
    const vendorId = req.query.vendorId || req.vendor?._id;
    if (!vendorId) return res.status(400).json({ message: 'VendorId required' });
    
    const services = await getVendorServices(vendorId, req.query.includeInactive === 'true');
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const patchService = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    if (req.files && req.files.length > 0) {
      const imageUrls = await Promise.all(req.files.map(file => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'services' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          stream.end(file.buffer);
        });
      }));
      updateData.images = imageUrls;
      updateData.image = imageUrls[0]; // Sync primary image
    }

    const service = await updateService(req.vendor._id, req.params.id, updateData);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteService = async (req, res) => {
  try {
    const service = await softDeleteService(req.vendor._id, req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.status(200).json({ message: 'Service deactivated successfully', service });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getServiceById = async (req, res) => {
  try {
    const Service = require('../models/Service');
    const service = await Service.findById(req.params.id);
    if (!service || (!service.isActive && req.user?.role !== 'vendor')) {
      return res.status(404).json({ message: 'Service not found or inactive' });
    }

    // 🚀 ENGAGEMENT TRACKING: Increment serviceClicks (Throttled)
    const ip = req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress;
    const cacheKey = `click:${ip}:${service._id}`;

    if (!global.clickThrottle) global.clickThrottle = new Map();
    const lastClicked = global.clickThrottle.get(cacheKey);
    const THIRTY_MINS = 30 * 60 * 1000;

    if (!lastClicked || (Date.now() - lastClicked > THIRTY_MINS)) {
      const Vendor = require('../models/Vendor');
      await Vendor.findByIdAndUpdate(service.vendorId, { $inc: { serviceClicks: 1 } });
      global.clickThrottle.set(cacheKey, Date.now());
    }

    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addService,
  listServices,
  patchService,
  deleteService,
  getServiceById,
};
