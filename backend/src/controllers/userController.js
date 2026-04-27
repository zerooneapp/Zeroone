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
    if (image) user.image = image;

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

    // 🧹 COMPREHENSIVE CLEANUP
    const Vendor = require('../models/Vendor');
    const Staff = require('../models/Staff');
    const SlotLock = require('../models/SlotLock');
    const Service = require('../models/Service');
    const Offer = require('../models/Offer');
    const Booking = require('../models/Booking');
    const Review = require('../models/Review');
    const WalletTransaction = require('../models/WalletTransaction');
    const Notification = require('../models/Notification');

    if (user.role === 'vendor') {
      const vendor = await Vendor.findOne({ ownerId: userId });
      if (vendor) {
        // 1. Remove all vendor-specific data
        await Promise.all([
          Vendor.deleteOne({ _id: vendor._id }),
          Staff.deleteMany({ vendorId: vendor._id }),
          SlotLock.deleteMany({ vendorId: vendor._id }),
          Service.deleteMany({ vendorId: vendor._id }),
          Offer.deleteMany({ vendorId: vendor._id }),
          Booking.deleteMany({ vendorId: vendor._id }),
          Review.deleteMany({ vendorId: vendor._id }),
          WalletTransaction.deleteMany({ vendorId: vendor._id })
        ]);
        console.log(`[Cleanup] Full vendor data purged for user ${userId}`);
      }
    }

    // 2. Remove user-specific data (regardless of role)
    await Promise.all([
      Booking.deleteMany({ userId: userId }),
      Review.deleteMany({ userId: userId }),
      Notification.deleteMany({ userId: userId }),
      User.findByIdAndDelete(userId)
    ]);
    
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
    const user = await User.findById(req.user._id).populate('favoriteVendors', 'shopName address shopImage rating totalReviews');
    res.status(200).json(user.favoriteVendors || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { updateProfile, deleteAccount, toggleFavorite, getFavorites };
