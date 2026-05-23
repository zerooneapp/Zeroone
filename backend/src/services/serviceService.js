const Service = require('../models/Service');
// Placeholder for cache invalidation (will implement in Slot module later)
const invalidateSlotCache = async (vendorId) => {
  // console.log(`Invalidating slot cache for vendor: ${vendorId}`);
};

const normalizeShowOnHome = (value) => {
  if (value === true || value === false) return value;
  if (typeof value === 'string') return value === 'true';
  return undefined;
};

const toCategoryKey = (value = '') =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const toCategoryLabel = (value = '') =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const normalizeImageList = (value) => {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item) => typeof item === 'string' && item.trim()).slice(0, 4);
};

const resolveVendorCategory = async (vendorId, category, excludeServiceId) => {
  if (typeof category !== 'string') return category;

  const key = toCategoryKey(category);
  if (!key) return '';

  const existingServices = await Service.find({
    vendorId,
    ...(excludeServiceId ? { _id: { $ne: excludeServiceId } } : {}),
    category: { $exists: true, $ne: '' }
  }).select('category');

  const matchingCategory = existingServices.find(
    (service) => toCategoryKey(service.category) === key
  );

  return matchingCategory?.category || toCategoryLabel(category);
};

const ensureVendorHomeService = async (vendorId) => {
  const selectedActiveService = await Service.findOne({
    vendorId,
    isActive: true,
    showOnHome: true
  });

  if (selectedActiveService) {
    await Service.updateMany(
      { vendorId, _id: { $ne: selectedActiveService._id }, showOnHome: true },
      { $set: { showOnHome: false } }
    );
    return selectedActiveService;
  }

  const fallbackService = await Service.findOne({ vendorId, isActive: true }).sort({ createdAt: 1 });
  if (fallbackService) {
    fallbackService.showOnHome = true;
    await fallbackService.save();
  }

  return fallbackService;
};

const createService = async (vendorId, serviceData) => {
  const showOnHome = normalizeShowOnHome(serviceData.showOnHome);
  const hasExistingServices = await Service.exists({ vendorId });
  const category = await resolveVendorCategory(vendorId, serviceData.category);

  if (showOnHome === true) {
    await Service.updateMany({ vendorId }, { $set: { showOnHome: false } });
  }

  const service = await Service.create({
    ...serviceData,
    vendorId,
    category,
    showOnHome: showOnHome === true || !hasExistingServices
  });

  await ensureVendorHomeService(vendorId);
  await invalidateSlotCache(vendorId);
  return service;
};

const getVendorServices = async (vendorId, includeInactive = false) => {
  const filter = { vendorId };
  if (!includeInactive) filter.isActive = true;
  return await Service.find(filter).sort({ showOnHome: -1, isActive: -1, createdAt: 1 });
};

const updateService = async (vendorId, serviceId, updateData) => {
  const showOnHome = normalizeShowOnHome(updateData.showOnHome);
  if (showOnHome !== undefined) {
    updateData.showOnHome = showOnHome;
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'category')) {
    updateData.category = await resolveVendorCategory(vendorId, updateData.category, serviceId);
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'images')) {
    updateData.images = normalizeImageList(updateData.images);
    updateData.image = updateData.images?.[0] || '';
  }

  if (showOnHome === true) {
    await Service.updateMany(
      { vendorId, _id: { $ne: serviceId } },
      { $set: { showOnHome: false } }
    );
  }

  const service = await Service.findOneAndUpdate(
    { _id: serviceId, vendorId },
    updateData,
    { new: true, runValidators: true }
  );

  if (service) {
    await ensureVendorHomeService(vendorId);
    await invalidateSlotCache(vendorId);
  }
  return service;
};

const softDeleteService = async (vendorId, serviceId) => {
  const service = await Service.findOneAndUpdate(
    { _id: serviceId, vendorId },
    { isActive: false, showOnHome: false },
    { new: true }
  );
  if (service) {
    await ensureVendorHomeService(vendorId);
    await invalidateSlotCache(vendorId);
  }
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
