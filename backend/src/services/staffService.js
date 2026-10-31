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
  // REMOVED: canonicalOwner.isActive = true; // Let the owner decide their own activity status manually
  if ((!canonicalOwner.services || canonicalOwner.services.length === 0) && currentServices.length > 0) {
    canonicalOwner.services = currentServices;
  }
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

  await canonicalOwner.save();

  await invalidateSlotCache(vendorId);
  return canonicalOwner;
};

const onboardStaff = async (vendorId, staffData) => {
  const User = require('../models/User');
  const { name, phone, ...rest } = staffData;

  // Phone is optional. A staff member without a phone has no login account and
  // cannot sign in to the staff panel until a phone is added later.
  const normalizedPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';

  if (!normalizedPhone) {
    const staff = await Staff.create({ ...rest, name, vendorId });
    await invalidateSlotCache(vendorId);
    return staff;
  }

  if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
    throw new Error('Enter a valid 10-digit Indian phone number');
  }

  // 🛡️ PREVENT DUPLICATE STAFF: Check if this phone is already a staff member for ANY vendor
  const existingStaff = await Staff.findOne({ phone: normalizedPhone });
  if (existingStaff) {
    const Vendor = require('../models/Vendor');
    const v = await Vendor.findById(existingStaff.vendorId);
    throw new Error(`This phone number is already registered as staff for another vendor (${v?.shopName || 'Unknown Shop'}). One staff member can only work for one vendor.`);
  }

  // 🛡️ AUTH LINKING: Ensure a User account exists for this staff member
  let user = await User.findOne({ phone: normalizedPhone });

  if (!user) {
    // Create new staff user if doesn't exist
    user = await User.create({
      name,
      phone: normalizedPhone,
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
    phone: normalizedPhone,
    userId: user._id,
    vendorId
  });

  await invalidateSlotCache(vendorId);
  return staff;
};

const getVendorStaff = async (vendorId, includeInactive = false) => {
  const filter = { vendorId, isDeleted: { $ne: true } };
  if (!includeInactive) filter.isActive = true;
  return await Staff.find(filter).populate('services');
};

const updateStaff = async (vendorId, staffId, updateData) => {
  const existingStaff = await Staff.findOne({ _id: staffId, vendorId });
  if (!existingStaff) return null;

  let linkedUser = null;
  const nextUpdate = { ...updateData };

  // Staff phone numbers are also used for staff login. Keep the Staff and
  // User records synchronized so an edit is not overwritten on the next
  // owner reconciliation and the staff can still log in with the new number.
  let userToCreate = null; // set when a phone is added to a staff that had none
  let clearPhone = false;  // set when an existing phone is being removed
  if (nextUpdate.phone !== undefined) {
    const User = require('../models/User');
    const rawPhone = nextUpdate.phone === null ? '' : String(nextUpdate.phone);
    const normalizedPhone = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : '';

    // Clearing the phone disables the staff login but keeps the staff record.
    if (!normalizedPhone) {
      delete nextUpdate.phone;
      clearPhone = true;
    } else {
      if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
        throw new Error('Enter a valid 10-digit Indian phone number');
      }
      nextUpdate.phone = normalizedPhone;

      if (normalizedPhone !== existingStaff.phone) {
        const duplicateStaff = await Staff.findOne({
          _id: { $ne: staffId },
          vendorId,
          phone: normalizedPhone,
          isDeleted: { $ne: true }
        }).select('_id name');
        if (duplicateStaff) {
          throw new Error('This phone number is already used by another staff member');
        }

        linkedUser = existingStaff.userId
          ? await User.findById(existingStaff.userId)
          : (existingStaff.phone ? await User.findOne({ phone: existingStaff.phone }) : null);

        // Older owner records may not have userId linked. Resolve the owner
        // through the vendor so their login phone is updated as well.
        if (!linkedUser && existingStaff.isOwner) {
          const vendor = await Vendor.findById(vendorId).select('ownerId');
          if (vendor?.ownerId) linkedUser = await User.findById(vendor.ownerId);
        }

        if (linkedUser) {
          const duplicateUser = await User.findOne({
            _id: { $ne: linkedUser._id },
            phone: normalizedPhone
          }).select('_id');
          if (duplicateUser) {
            throw new Error('This phone number is already registered to another account');
          }
        } else {
          // Staff had no login account yet. Link an existing user with this
          // phone (promoting a customer) or create a fresh staff login, so the
          // staff can now sign in to the staff panel.
          const existingUser = await User.findOne({ phone: normalizedPhone });
          if (existingUser) {
            if (existingUser.role === 'customer') existingUser.role = 'staff';
            linkedUser = existingUser;
            nextUpdate.userId = existingUser._id;
          } else {
            userToCreate = {
              name: nextUpdate.name || existingStaff.name,
              phone: normalizedPhone,
              image: nextUpdate.image || existingStaff.image,
              role: 'staff',
              isVerified: true
            };
          }
        }
      }
    }
  }

  if (userToCreate) {
    const User = require('../models/User');
    const created = await User.create(userToCreate);
    nextUpdate.userId = created._id;
  }

  // 🛡️ If staff is being re-enabled, end any active closures
  if (nextUpdate.isActive === true) {
    const StaffClosure = require('../models/StaffClosure');
    const now = new Date();
    const activeClosures = await StaffClosure.find({
      staffId,
      vendorId,
      status: 'active',
      endTime: { $gt: now }
    });

    for (const closure of activeClosures) {
      closure.status = now < closure.startTime ? 'cancelled' : 'completed';
      closure.endedAt = now;
      if (now < closure.endTime) closure.endTime = now;
      await closure.save();
    }
  }

  const updateOp = clearPhone ? { ...nextUpdate, $unset: { phone: '' } } : nextUpdate;
  const staff = await Staff.findOneAndUpdate(
    { _id: staffId, vendorId },
    updateOp,
    { new: true, runValidators: true }
  );

  if (staff && linkedUser && !clearPhone && nextUpdate.phone && nextUpdate.phone !== existingStaff.phone) {
    linkedUser.phone = nextUpdate.phone;
    if (linkedUser.role === 'customer') linkedUser.role = 'staff';
    await linkedUser.save();
  }

  // 🔄 Sync image to User account so staff app displays it
  if (staff && nextUpdate.image) {
    const User = require('../models/User');
    if (staff.userId) {
      await User.findByIdAndUpdate(staff.userId, { image: nextUpdate.image });
    } else {
      await User.findOneAndUpdate({ phone: staff.phone }, { image: nextUpdate.image });
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
