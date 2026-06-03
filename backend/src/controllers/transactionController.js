const moment = require('moment-timezone');
const WalletTransaction = require('../models/WalletTransaction');
const Staff = require('../models/Staff');

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
    const { from, to, source = 'all', staffId = '', category } = req.query;
    const normalizedSource = String(source || 'all').toLowerCase();
    const normalizedStaffId = String(staffId || '').trim();

    let finalTransactions = [];

    if (category === 'booking_revenue') {
      const Booking = require('../models/Booking');
      const bookingFilter = {
        vendorId: req.vendor._id,
        status: 'completed'
      };

      if (from && to) {
        bookingFilter.completedAt = {
          $gte: moment(from).startOf('day').toDate(),
          $lte: moment(to).endOf('day').toDate()
        };
      }

      if (normalizedSource === 'staff' && normalizedStaffId) {
        bookingFilter.staffId = normalizedStaffId;
      }

      const bookings = await Booking.find(bookingFilter)
        .populate('staffId', 'name isOwner')
        .sort({ completedAt: -1 })
        .limit(200)
        .lean();

      finalTransactions = bookings.map(b => ({
        _id: b._id,
        vendorId: b.vendorId,
        amount: b.totalPrice,
        type: 'credit',
        category: 'booking_revenue',
        status: 'completed',
        timestamp: b.completedAt || b.updatedAt,
        description: b.isWalkIn ? `Walk-in: ${b.walkInCustomerName || 'Guest'}` : `Booking: ${b.services?.map(s => s.name).join(', ') || 'Service'}`,
        sourceType: b.staffId?.isOwner ? 'partner' : 'staff',
        sourceLabel: b.staffId?.name || 'Shop',
        sourceStaffId: b.staffId?._id ? String(b.staffId._id) : null,
        metadata: { bookingId: b._id }
      }));

      // Add membership revenue wallet transactions
      if (normalizedSource !== 'staff') {
        const WalletTransaction = require('../models/WalletTransaction');
        const membershipFilter = {
          vendorId: req.vendor._id,
          category: 'membership_revenue',
          status: 'completed'
        };

        if (from && to) {
          membershipFilter.timestamp = {
            $gte: moment(from).startOf('day').toDate(),
            $lte: moment(to).endOf('day').toDate()
          };
        }

        const membershipTransactions = await WalletTransaction.find(membershipFilter).lean();
        const formattedMemberships = membershipTransactions.map(tx => ({
          _id: tx._id,
          vendorId: tx.vendorId,
          amount: tx.amount,
          type: 'credit',
          category: 'membership_revenue',
          status: 'completed',
          timestamp: tx.timestamp,
          description: tx.description || 'Membership Purchase',
          sourceType: 'partner',
          sourceLabel: 'Partner',
          sourceStaffId: null,
          metadata: { transactionId: tx._id }
        }));

        finalTransactions = [...finalTransactions, ...formattedMemberships];
      }

      // Filter by source if not already filtered by staffId
      if (normalizedSource === 'partner') {
        finalTransactions = finalTransactions.filter(t => t.sourceType === 'partner');
      } else if (normalizedSource === 'staff' && !normalizedStaffId) {
        finalTransactions = finalTransactions.filter(t => t.sourceType === 'staff');
      }

      // Sort by timestamp descending
      finalTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else {
      const filter = {
        vendorId: req.vendor._id,
        ...buildTransactionQuery(req.query)
      };

      if (from && to) {
        filter.timestamp = {
          $gte: moment(from).startOf('day').toDate(),
          $lte: moment(to).endOf('day').toDate()
        };
      }

      const staffMembers = await Staff.find({ vendorId: req.vendor._id }).select('name userId').lean();
      const staffByUserId = new Map(
        staffMembers
          .filter((staff) => staff.userId)
          .map((staff) => [String(staff.userId), staff])
      );

      const transactions = await WalletTransaction.find(filter)
        .populate('initiatedByUserId', 'name phone role')
        .sort({ timestamp: -1 })
        .limit(200)
        .lean();

      finalTransactions = transactions.map((transaction) => {
        const initiatorId = transaction.initiatedByUserId?._id
          ? String(transaction.initiatedByUserId._id)
          : transaction.initiatedByUserId
            ? String(transaction.initiatedByUserId)
            : '';

        const matchingStaff = initiatorId ? staffByUserId.get(initiatorId) : null;
        const sourceType = matchingStaff
          ? 'staff'
          : initiatorId && initiatorId === String(req.vendor.ownerId)
            ? 'partner'
            : 'total';

        return {
          ...transaction,
          sourceType,
          sourceLabel: matchingStaff?.name || transaction.initiatedByUserId?.name || (sourceType === 'partner' ? 'Partner' : 'Total'),
          sourceStaffId: matchingStaff?._id ? String(matchingStaff._id) : null
        };
      }).filter((transaction) => {
        if (normalizedSource === 'partner') {
          return transaction.sourceType === 'partner';
        }

        if (normalizedSource === 'staff') {
          if (transaction.sourceType !== 'staff') return false;
          if (!normalizedStaffId) return true;
          return String(transaction.sourceStaffId || '') === normalizedStaffId;
        }

        return true;
      });
    }

    res.status(200).json(finalTransactions);
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
    // 🛡️ Admin Filter: Exclude booking revenue and membership revenue from the general transaction list
    if (!req.query.category || req.query.category === 'all') {
      filter.category = { $nin: ['booking_revenue', 'membership_revenue'] };
    } else if (req.query.category === 'booking_revenue' || req.query.category === 'membership_revenue') {
      // If admin explicitly requests restricted categories, we block them per request
      filter.category = '__BLOCKED__'; 
    }
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
