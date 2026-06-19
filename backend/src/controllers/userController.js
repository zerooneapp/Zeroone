const User = require('../models/User');

// @desc    Update user profile
// @route   PATCH /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { 
      name, email, phone, address, location, dob, gender, image, 
      notificationSettings, preferences, currentPassword, newPassword,
      is2FAEnabled, isBiometricEnabled
    } = req.body;
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (location) user.location = location;
    if (dob) user.dob = dob;
    if (gender) user.gender = gender;
    if (image !== undefined) user.image = image;

    if (typeof is2FAEnabled === 'boolean') user.is2FAEnabled = is2FAEnabled;
    if (typeof isBiometricEnabled === 'boolean') user.isBiometricEnabled = isBiometricEnabled;

    // Direct object assignment for nested settings
    if (notificationSettings) user.notificationSettings = { ...user.notificationSettings, ...notificationSettings };
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    // Password Update Logic (Optional)
    if (currentPassword && newPassword) {
       const isMatch = await user.comparePassword(currentPassword);
       if (!isMatch) return res.status(401).json({ message: 'Current password incorrect' });
       user.password = newPassword;
    }

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 🧹 COMPREHENSIVE SMART SOFT DELETE
    const Vendor = require('../models/Vendor');
    const Staff = require('../models/Staff');
    const SlotLock = require('../models/SlotLock');
    const Service = require('../models/Service');
    const Offer = require('../models/Offer');
    const Booking = require('../models/Booking');
    const Review = require('../models/Review');
    const WalletTransaction = require('../models/WalletTransaction');
    const Notification = require('../models/Notification');
    const Ticket = require('../models/Ticket');
    const Cart = require('../models/Cart');
    const StaffAvailability = require('../models/StaffAvailability');
    const StaffClosure = require('../models/StaffClosure');
    const VendorAvailability = require('../models/VendorAvailability');
    const VendorClosure = require('../models/VendorClosure');
    const VendorMembershipPlan = require('../models/VendorMembershipPlan');
    const VendorPromotion = require('../models/VendorPromotion');
    const WithdrawalRequest = require('../models/WithdrawalRequest');
    const UserMembership = require('../models/UserMembership');

    const timestamp = Date.now();

    if (user.role === 'vendor') {
      const vendor = await Vendor.findOne({ ownerId: userId });
      if (vendor) {
        // Find all staff members for this vendor to update their User accounts and Staff profiles
        const staffMembers = await Staff.find({ vendorId: vendor._id });
        const staffIds = staffMembers.map(s => s._id);
        const staffUserIds = staffMembers.map(s => s.userId).filter(Boolean);

        // Emit FORCE_LOGOUT socket events to all deleted staff users and owner
        try {
          const { getIO } = require('../services/socketService');
          const io = getIO();
          if (io) {
            staffUserIds.forEach(id => {
              io.to(String(id)).emit('FORCE_LOGOUT');
            });
            if (userId) {
              io.to(String(userId)).emit('FORCE_LOGOUT');
            }
          }
        } catch (err) {
          console.error('[Socket emit error in deleteAccount]', err.message);
        }

        // 1. Soft delete Vendor profile
        vendor.status = 'deleted';
        vendor.isActive = false;
        vendor.isDeleted = true;
        vendor.shopName = `[Deleted] ${vendor.shopName}`;
        await vendor.save();

        // 2. Soft delete all Staff user accounts & profiles
        for (const staff of staffMembers) {
          staff.isActive = false;
          staff.phone = `DEL_${timestamp}_${staff.phone}`;
          staff.name = `[Deleted] ${staff.name}`;
          await staff.save();

          if (staff.userId) {
            const staffUser = await User.findById(staff.userId);
            if (staffUser) {
              staffUser.isDeleted = true;
              staffUser.phone = `DEL_${timestamp}_${staffUser.phone}`;
              staffUser.name = `[Deleted] ${staffUser.name || 'Staff'}`;
              await staffUser.save();
            }
          }
        }

        // 3. Clean up operational/scheduling collections only
        await Promise.all([
          StaffAvailability.deleteMany({ staffId: { $in: staffIds } }),
          StaffClosure.deleteMany({ staffId: { $in: staffIds } }),
          VendorAvailability.deleteMany({ vendorId: vendor._id }),
          VendorClosure.deleteMany({ vendorId: vendor._id }),
          SlotLock.deleteMany({ vendorId: vendor._id }),
          Cart.deleteMany({ vendorId: vendor._id })
        ]);
        console.log(`[Cleanup] Vendor and staff profiles soft-deleted. Schedulers cleared for user ${userId}`);
      }
    }

    // 4. Soft delete the user account
    user.isDeleted = true;
    user.phone = `DEL_${timestamp}_${user.phone}`;
    user.name = `[Deleted] ${user.name || 'User'}`;
    await user.save();

    // 5. Clean up customer operational data only
    await Promise.all([
      Cart.deleteMany({ userId }),
      SlotLock.deleteMany({ userId }),
      Notification.deleteMany({ userId })
    ]);

    console.log(`[Cleanup] User ${userId} successfully soft-deleted.`);
    res.status(200).json({ message: 'Account and all associated data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const { vendorId } = req.body;
    if (!vendorId) return res.status(400).json({ message: 'Vendor ID is required' });

    const user = await User.findById(req.user._id);
    const isFavorited = user.favoriteVendors.includes(vendorId);

    if (isFavorited) {
      user.favoriteVendors.pull(vendorId);
    } else {
      user.favoriteVendors.addToSet(vendorId);
    }

    await user.save();
    res.status(200).json({ isFavorited: !isFavorited, favoriteVendors: user.favoriteVendors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favoriteVendors',
      select: 'shopName address shopImage rating totalReviews isDeleted status'
    });
    if (!user) return res.status(200).json([]);
    const activeFavorites = (user.favoriteVendors || []).filter(
      vendor => vendor && !vendor.isDeleted && vendor.status !== 'deleted'
    );
    res.status(200).json(activeFavorites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { updateProfile, deleteAccount, toggleFavorite, getFavorites };
