const Staff = require('../models/Staff');
// Placeholder for cache invalidation
const invalidateSlotCache = async (vendorId) => {
  // console.log(`Invalidating slot cache for vendor: ${vendorId}`);
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
    { new: true, runValidators: true }
  );
  if (staff) await invalidateSlotCache(vendorId);
  return staff;
};

const softDeleteStaff = async (vendorId, staffId) => {
  const staff = await Staff.findOneAndUpdate(
    { _id: staffId, vendorId },
    { isActive: false },
    { new: true }
  );
  if (staff) await invalidateSlotCache(vendorId);
  return staff;
};

const getStaffById = async (vendorId, staffId) => {
  return await Staff.findOne({ _id: staffId, vendorId }).populate('services');
};

module.exports = {
  onboardStaff,
  getVendorStaff,
  updateStaff,
  softDeleteStaff,
  getStaffById,
};
