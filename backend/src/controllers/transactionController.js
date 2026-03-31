const WalletTransaction = require('../models/WalletTransaction');

// @desc    Get vendor transaction history
// @route   GET /api/vendor/transactions
// @access  Private (Vendor)
const getTransactions = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ vendorId: req.vendor._id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTransactions,
};
