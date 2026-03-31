const Service = require('../models/Service');
// Placeholder for cache invalidation (will implement in Slot module later)
const invalidateSlotCache = async (vendorId) => {
  // console.log(`Invalidating slot cache for vendor: ${vendorId}`);
};

const createService = async (vendorId, serviceData) => {
  const service = await Service.create({ ...serviceData, vendorId });
  await invalidateSlotCache(vendorId);
  return service;
};

const getVendorServices = async (vendorId, includeInactive = false) => {
  const filter = { vendorId };
  if (!includeInactive) filter.isActive = true;
  return await Service.find(filter);
};

const updateService = async (vendorId, serviceId, updateData) => {
  const service = await Service.findOneAndUpdate(
    { _id: serviceId, vendorId },
    updateData,
    { new: true, runValidators: true }
  );
  if (service) await invalidateSlotCache(vendorId);
  return service;
};

const softDeleteService = async (vendorId, serviceId) => {
  const service = await Service.findOneAndUpdate(
    { _id: serviceId, vendorId },
    { isActive: false },
    { new: true }
  );
  if (service) await invalidateSlotCache(vendorId);
  return service;
};

const getServiceById = async (vendorId, serviceId) => {
  return await Service.findOne({ _id: serviceId, vendorId });
};

module.exports = {
  createService,
  getVendorServices,
  updateService,
  softDeleteService,
  getServiceById,
};
