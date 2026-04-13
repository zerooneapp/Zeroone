const Staff = require('../models/Staff');
const Vendor = require('../models/Vendor');
// Placeholder for cache invalidation
const invalidateSlotCache = async (vendorId) => {
  // console.log(`Invalidating slot cache for vendor: ${vendorId}`);
};

const ensureOwnerStaff = async (vendorId) => {
  const User = require('../models/User');
  const Service = require('../models/Service');

  const vendor = await Vendor.findById(vendorId);
  if (!vendor?.ownerId) return null;

  const ownerUser = await User.findById(vendor.ownerId);
  if (!ownerUser) return null;

  const ownerCandidates = await Staff.find({
    vendorId,
    $or: [
      { isOwner: true },
      { userId: ownerUser._id },
      { phone: ownerUser.phone }
    ]
  }).sort({ createdAt: 1 });

  let canonicalOwner =
    ownerCandidates.find((staff) => staff.userId?.toString() === ownerUser._id.toString()) ||
    ownerCandidates.find((staff) => staff.phone === ownerUser.phone) ||
    ownerCandidates.find((staff) => staff.isOwner) ||
    null;

  if (!canonicalOwner) {
    const allServices = await Service.find({ vendorId }).select('_id');
    if (allServices.length === 0) return null;

    canonicalOwner = await Staff.create({
      vendorId,
      userId: ownerUser._id,
      name: ownerUser.name || `${vendor.shopName} Owner`,
      phone: ownerUser.phone,
      password: 'SELF_MANAGED',
      services: allServices.map((service) => service._id),
      designation: 'Owner',
      isOwner: true,
      isActive: true,
      isFirstLogin: false
    });

    await invalidateSlotCache(vendorId);
    return canonicalOwner;
  }

  const currentServices = canonicalOwner.services?.length
    ? canonicalOwner.services
    : (await Service.find({ vendorId }).select('_id')).map((service) => service._id);

  canonicalOwner.name = ownerUser.name || canonicalOwner.name;
  canonicalOwner.phone = ownerUser.phone;
  canonicalOwner.userId = ownerUser._id;
  canonicalOwner.designation = canonicalOwner.designation || 'Owner';
  canonicalOwner.isOwner = true;
  canonicalOwner.isActive = true;
  if ((!canonicalOwner.services || canonicalOwner.services.length === 0) && currentServices.length > 0) {
    canonicalOwner.services = currentServices;
  }
  await canonicalOwner.save();

  const duplicateIds = ownerCandidates
    .filter((staff) => staff._id.toString() !== canonicalOwner._id.toString())
    .map((staff) => staff._id);

  if (duplicateIds.length > 0) {
    await Staff.updateMany(
      { _id: { $in: duplicateIds } },
      {
        $set: {
          isOwner: false,
          isActive: false
        }
      }
    );
  }

  await invalidateSlotCache(vendorId);
  return canonicalOwner;
};

const onboardStaff = async (vendorId, staffData) => {
  const User = require('../models/User');
  const { name, phone, ...rest } = staffData;

  // 🛡️ AUTH LINKING: Ensure a User account exists for this staff member
  let user = await User.findOne({ phone });
  
  if (!user) {
    // Create new staff user if doesn't exist
    user = await User.create({
      name,
      phone,
      image: staffData.image, // 📸 SYNC IMAGE
      role: 'staff',
      isVerified: true
    });
  } else {
    // Sync image even if user existed (role updates too)
    user.image = staffData.image || user.image;
    if (user.role === 'customer') {
      user.role = 'staff';
    }
    await user.save();
  }

  const staff = await Staff.create({ 
    ...rest, 
    name, 
    phone, 
    userId: user._id,
    vendorId 
  });

  await invalidateSlotCache(vendorId);
  return staff;
};

const getVendorStaff = async (vendorId, includeInactive = false) => {
  const filter = { vendorId };
  if (!includeInactive) filter.isActive = true;
  return await Staff.find(filter).populate('services');
};

const updateStaff = async (vendorId, staffId, updateData) => {
  const staff = await Staff.findOneAndUpdate(
    { _id: staffId, vendorId },
    updateData,
    { returnDocument: 'after', runValidators: true }
  );

  // 🔄 Sync image to User account so staff app displays it
  if (staff && updateData.image) {
    const User = require('../models/User');
    if (staff.userId) {
      await User.findByIdAndUpdate(staff.userId, { image: updateData.image });
    } else {
      await User.findOneAndUpdate({ phone: staff.phone }, { image: updateData.image });
    }
  }

  if (staff) await invalidateSlotCache(vendorId);
  return staff;
};

const softDeleteStaff = async (vendorId, staffId) => {
  const staff = await Staff.findOneAndUpdate(
    { _id: staffId, vendorId },
    { isActive: false },
    { returnDocument: 'after' }
  );
  if (staff) await invalidateSlotCache(vendorId);
  return staff;
};

const getStaffById = async (vendorId, staffId) => {
  return await Staff.findOne({ _id: staffId, vendorId }).populate('services');
};

module.exports = {
  onboardStaff,
  ensureOwnerStaff,
  getVendorStaff,
  updateStaff,
  softDeleteStaff,
  getStaffById,
};
