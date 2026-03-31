const User = require('../models/User');

// @desc    Update user profile
// @route   PATCH /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, phone, address, location } = req.body;
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (location) user.location = location;

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
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

module.exports = { updateProfile, toggleFavorite, getFavorites };
