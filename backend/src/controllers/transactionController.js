const WalletTransaction = require('../models/WalletTransaction');

const buildTransactionQuery = (query = {}) => {
  const filter = {};

  if (query.type && query.type !== 'all') {
    filter.type = query.type;
  }

  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }

  if (query.category && query.category !== 'all') {
    filter.category = query.category;
  }

  return filter;
};

// @desc    Get vendor transaction history
// @route   GET /api/vendor/transactions
// @access  Private (Vendor)
const getTransactions = async (req, res) => {
  try {
    const filter = {
      vendorId: req.vendor._id,
      ...buildTransactionQuery(req.query)
    };

    const transactions = await WalletTransaction.find(filter)
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get admin transaction history
// @route   GET /api/admin/transactions
// @access  Private (Admin)
const getAdminTransactions = async (req, res) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 20
    } = req.query;

    const filter = buildTransactionQuery(req.query);
    const normalizedLimit = Math.max(1, Number(limit) || 20);
    const normalizedPage = Math.max(1, Number(page) || 1);

    const allTransactions = await WalletTransaction.find(filter)
      .populate({
        path: 'vendorId',
        select: 'shopName serviceLevel ownerId',
        populate: {
          path: 'ownerId',
          select: 'name phone'
        }
      })
      .populate('initiatedByUserId', 'name phone role')
      .sort({ timestamp: -1 })
      .lean();

    const trimmedSearch = search.trim().toLowerCase();
    const searchedTransactions = trimmedSearch
      ? allTransactions.filter((transaction) => {
          const haystack = [
            transaction.referenceId,
            transaction.gatewayOrderId,
            transaction.gatewayPaymentId,
            transaction.description,
            transaction.reason,
            transaction.category,
            transaction.paymentGateway,
            transaction.paymentMethod,
            transaction.vendorId?.shopName,
            transaction.vendorId?.ownerId?.name,
            transaction.initiatedByUserId?.name,
            transaction.initiatedByUserId?.phone
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return haystack.includes(trimmedSearch);
        })
      : allTransactions;

    const totalTransactions = searchedTransactions.length;
    const paginatedTransactions = searchedTransactions.slice(
      (normalizedPage - 1) * normalizedLimit,
      normalizedPage * normalizedLimit
    );

    const summary = searchedTransactions.reduce((acc, transaction) => {
      if (transaction.status === 'completed') {
        if (transaction.type === 'credit') {
          acc.totalInflow += transaction.amount;
        }
        if (transaction.type === 'debit') {
          acc.totalOutflow += transaction.amount;
        }
      }

      if (transaction.status === 'pending') {
        acc.pendingAmount += transaction.amount;
        acc.pendingCount += 1;
      }

      if (transaction.status === 'failed') {
        acc.failedCount += 1;
      }

      return acc;
    }, {
      totalInflow: 0,
      totalOutflow: 0,
      pendingAmount: 0,
      pendingCount: 0,
      failedCount: 0
    });

    res.status(200).json({
      summary,
      transactions: paginatedTransactions.map((transaction) => ({
        ...transaction,
        entity: transaction.vendorId?.shopName || transaction.initiatedByUserId?.name || 'Unknown',
        vendor: transaction.vendorId ? {
          _id: transaction.vendorId._id,
          shopName: transaction.vendorId.shopName,
          serviceLevel: transaction.vendorId.serviceLevel,
          owner: transaction.vendorId.ownerId ? {
            _id: transaction.vendorId.ownerId._id,
            name: transaction.vendorId.ownerId.name,
            phone: transaction.vendorId.ownerId.phone
          } : null
        } : null,
        initiatedBy: transaction.initiatedByUserId ? {
          _id: transaction.initiatedByUserId._id,
          name: transaction.initiatedByUserId.name,
          phone: transaction.initiatedByUserId.phone,
          role: transaction.initiatedByUserId.role
        } : null
      })),
      totalTransactions,
      totalPages: Math.max(1, Math.ceil(totalTransactions / normalizedLimit)),
      currentPage: normalizedPage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTransactions,
  getAdminTransactions
};
