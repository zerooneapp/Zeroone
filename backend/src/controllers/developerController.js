const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Cart = require('../models/Cart');
const GlobalSettings = require('../models/GlobalSettings');
const InventoryItem = require('../models/InventoryItem');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const NotificationLog = require('../models/NotificationLog');
const Offer = require('../models/Offer');
const Review = require('../models/Review');
const Service = require('../models/Service');
const SlotLock = require('../models/SlotLock');
const Staff = require('../models/Staff');
const StaffAvailability = require('../models/StaffAvailability');
const StaffClosure = require('../models/StaffClosure');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const UserMembership = require('../models/UserMembership');
const Vendor = require('../models/Vendor');
const VendorAvailability = require('../models/VendorAvailability');
const VendorClosure = require('../models/VendorClosure');
const VendorMembershipPlan = require('../models/VendorMembershipPlan');
const VendorPromotion = require('../models/VendorPromotion');
const WalletTransaction = require('../models/WalletTransaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const redis = require('../config/redis');

const CONFIRM_PHRASE = 'DELETE';

// Filters receive the protection context (see buildProtection) so records that belong
// to protected vendors, their owners/staff and their customers are never matched.
const notProtectedVendor = (ctx) => ({ vendorId: { $nin: ctx.vendorIds } });

const TARGETS = {
  vendor: { model: Vendor, filter: (ctx) => ({ _id: { $nin: ctx.vendorIds } }) },
  service: { model: Service, filter: notProtectedVendor },
  staff: { model: Staff, filter: notProtectedVendor },
  staffAvailability: { model: StaffAvailability, filter: (ctx) => ({ staffId: { $nin: ctx.staffIds } }) },
  staffClosure: { model: StaffClosure, filter: notProtectedVendor },
  vendorAvailability: { model: VendorAvailability, filter: notProtectedVendor },
  vendorClosure: { model: VendorClosure, filter: notProtectedVendor },
  offer: { model: Offer, filter: notProtectedVendor },
  inventoryItem: { model: InventoryItem, filter: notProtectedVendor },
  inventoryLog: { model: InventoryLog, filter: notProtectedVendor },
  booking: { model: Booking, filter: notProtectedVendor },
  slotLock: { model: SlotLock, filter: notProtectedVendor },
  review: { model: Review, filter: notProtectedVendor },
  cart: {
    model: Cart,
    filter: (ctx) => ({ $or: [{ vendorId: { $nin: ctx.vendorIds } }, { userId: { $nin: ctx.userIds } }] })
  },
  walletTransaction: { model: WalletTransaction, filter: notProtectedVendor },
  withdrawalRequest: { model: WithdrawalRequest, filter: notProtectedVendor },
  vendorMembershipPlan: { model: VendorMembershipPlan, filter: notProtectedVendor },
  userMembership: { model: UserMembership, filter: notProtectedVendor },
  vendorPromotion: { model: VendorPromotion, filter: notProtectedVendor },
  ticket: { model: Ticket, filter: (ctx) => ({ userId: { $nin: ctx.userIds } }) },
  notification: {
    model: Notification,
    filter: (ctx) => ({ vendorId: { $nin: ctx.vendorIds }, userId: { $nin: ctx.userIds } })
  },
  notificationLog: { model: NotificationLog, filter: () => ({}) },
  customerUser: { model: User, filter: (ctx) => ({ role: 'customer', _id: { $nin: ctx.userIds } }) },
  partnerUser: {
    model: User,
    filter: (ctx) => ({ role: { $in: ['vendor', 'staff'] }, _id: { $nin: ctx.userIds } })
  },
  staffUser: { model: User, filter: (ctx) => ({ role: 'staff', _id: { $nin: ctx.userIds } }) }
};

const DEV_SECTIONS = [
  {
    key: 'bookings',
    label: 'Bookings',
    description: 'Bookings and temporary slot locks',
    targets: [TARGETS.booking, TARGETS.slotLock]
  },
  {
    key: 'reviews',
    label: 'Reviews',
    description: 'Customer reviews and ratings',
    targets: [TARGETS.review]
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'Customer accounts and carts (customers of protected vendors are kept)',
    targets: [TARGETS.customerUser, TARGETS.cart]
  },
  {
    key: 'partners',
    label: 'Partners (Vendors)',
    description: 'Vendor shops and everything linked to them: services, staff, bookings, reviews, offers, inventory, wallet, withdrawals, memberships, promotions, closures, and vendor/staff logins',
    targets: [
      TARGETS.vendor,
      TARGETS.service,
      TARGETS.staff,
      TARGETS.staffAvailability,
      TARGETS.staffClosure,
      TARGETS.vendorAvailability,
      TARGETS.vendorClosure,
      TARGETS.offer,
      TARGETS.inventoryItem,
      TARGETS.inventoryLog,
      TARGETS.booking,
      TARGETS.slotLock,
      TARGETS.review,
      TARGETS.cart,
      TARGETS.walletTransaction,
      TARGETS.withdrawalRequest,
      TARGETS.vendorMembershipPlan,
      TARGETS.userMembership,
      TARGETS.vendorPromotion,
      TARGETS.partnerUser
    ]
  },
  {
    key: 'services',
    label: 'Services',
    description: 'Services listed by partners',
    targets: [TARGETS.service]
  },
  {
    key: 'staff',
    label: 'Staff',
    description: 'Staff members, their availability, closures and staff logins',
    targets: [TARGETS.staff, TARGETS.staffAvailability, TARGETS.staffClosure, TARGETS.staffUser]
  },
  {
    key: 'inventory',
    label: 'Inventory',
    description: 'Inventory items and stock logs',
    targets: [TARGETS.inventoryItem, TARGETS.inventoryLog]
  },
  {
    key: 'offers',
    label: 'Offers',
    description: 'Partner offers and discounts',
    targets: [TARGETS.offer]
  },
  {
    key: 'memberships',
    label: 'Memberships',
    description: 'Partner membership plans and customer memberships',
    targets: [TARGETS.vendorMembershipPlan, TARGETS.userMembership]
  },
  {
    key: 'promotions',
    label: 'Promotions',
    description: 'Partner promotion purchases (promotion plans are kept)',
    targets: [TARGETS.vendorPromotion]
  },
  {
    key: 'transactions',
    label: 'Wallet Transactions',
    description: 'Wallet transaction history',
    targets: [TARGETS.walletTransaction]
  },
  {
    key: 'withdrawals',
    label: 'Withdrawals',
    description: 'Withdrawal requests',
    targets: [TARGETS.withdrawalRequest]
  },
  {
    key: 'tickets',
    label: 'Support Tickets',
    description: 'Help desk tickets',
    targets: [TARGETS.ticket]
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'In-app notifications and broadcast logs',
    targets: [TARGETS.notification, TARGETS.notificationLog]
  },
  {
    key: 'closures',
    label: 'Closures',
    description: 'Shop and staff emergency closures',
    targets: [TARGETS.vendorClosure, TARGETS.staffClosure]
  }
];

// Master data the platform needs to run. These collections are never touched here.
const PROTECTED_DATA = ['Categories', 'Subscription Plans', 'Promotion Plans', 'Platform Settings', 'Admin Accounts'];

const ALL_SECTION = {
  key: 'all',
  label: 'All Data',
  description: 'Every section above. Protected vendors, protected master data and admin accounts are kept.',
  targets: [
    ...new Set(DEV_SECTIONS.flatMap((section) => section.targets))
  ].filter((t) => t.model !== User).concat({
    model: User,
    filter: (ctx) => ({ role: { $in: ['customer', 'vendor', 'staff'] }, _id: { $nin: ctx.userIds } })
  })
};

const findSection = (key) => (key === 'all' ? ALL_SECTION : DEV_SECTIONS.find((s) => s.key === key));

const getProtectedVendorIds = async () => {
  const settings = await GlobalSettings.findOne().select('protectedVendorIds').lean();
  return settings?.protectedVendorIds || [];
};

// Collects every id linked to the protected vendors: their staff, the owner/staff
// logins and customers who booked, reviewed or hold a membership with them.
const buildProtection = async () => {
  const vendorIds = await getProtectedVendorIds();
  const inVendors = { vendorId: { $in: vendorIds } };

  const [vendors, staff, bookingUsers, reviewUsers, memberUsers] = await Promise.all([
    Vendor.find({ _id: { $in: vendorIds } }).select('ownerId').lean(),
    Staff.find(inVendors).select('_id userId').lean(),
    Booking.distinct('userId', inVendors),
    Review.distinct('userId', inVendors),
    UserMembership.distinct('userId', inVendors)
  ]);

  const userIds = [
    ...vendors.map((v) => v.ownerId),
    ...staff.map((s) => s.userId),
    ...bookingUsers,
    ...reviewUsers,
    ...memberUsers
  ].filter(Boolean);

  return { vendorIds, staffIds: staff.map((s) => s._id), userIds };
};

const countSection = async (section, ctx) => {
  const counts = await Promise.all(
    section.targets.map((t) => t.model.countDocuments(t.filter(ctx)))
  );
  return counts.reduce((sum, n) => sum + n, 0);
};

// @desc    List developer clean-up sections with record counts
// @route   GET /api/admin/developer/sections
const getDeveloperSections = async (req, res) => {
  try {
    const ctx = await buildProtection();
    const sections = await Promise.all(
      DEV_SECTIONS.map(async (section) => ({
        key: section.key,
        label: section.label,
        description: section.description,
        collections: [...new Set(section.targets.map((t) => t.model.collection.collectionName))],
        count: await countSection(section, ctx)
      }))
    );
    const total = await countSection(ALL_SECTION, ctx);
    const settings = await GlobalSettings.findOne().select('revenueResetAt').lean();
    res.status(200).json({
      sections,
      total,
      protectedData: PROTECTED_DATA,
      confirmPhrase: CONFIRM_PHRASE,
      revenueResetAt: settings?.revenueResetAt || null
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Delete all records belonging to a section (or `all`), skipping protected vendors
// @route   DELETE /api/admin/developer/sections/:key
const clearDeveloperSection = async (req, res) => {
  try {
    const section = findSection(req.params.key);
    if (!section) return res.status(404).json({ message: 'Unknown section' });

    if (req.body?.confirm !== CONFIRM_PHRASE) {
      return res.status(400).json({ message: `Type ${CONFIRM_PHRASE} to confirm` });
    }

    // Built once up front so deleting e.g. bookings cannot un-protect their customers mid-run
    const ctx = await buildProtection();

    const results = [];
    for (const target of section.targets) {
      const { deletedCount } = await target.model.deleteMany(target.filter(ctx));
      results.push({ collection: target.model.collection.collectionName, deleted: deletedCount });
    }

    // Remaining users may still point at vendors that were just removed
    if (section.targets.includes(TARGETS.vendor)) {
      await User.updateMany({}, { $pull: { favoriteVendors: { $nin: ctx.vendorIds } } });
      await User.updateMany(
        { lastActiveVendorId: { $nin: [...ctx.vendorIds, null] } },
        { $set: { lastActiveVendorId: null } }
      );
    }

    if (redis.isReady) await redis.flushDb();

    const deleted = results.reduce((sum, r) => sum + r.deleted, 0);
    console.warn(`[DEV-TOOLS] ${req.user.phone} cleared section "${section.key}" (${deleted} records)`);
    res.status(200).json({ message: `${section.label} cleared`, deleted, results });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    All vendors with their protection flag
// @route   GET /api/admin/developer/protected-vendors
const getProtectedVendors = async (req, res) => {
  try {
    const protectedIds = (await getProtectedVendorIds()).map(String);
    const vendors = await Vendor.find().select('shopName ownerId status').populate('ownerId', 'phone').sort({ shopName: 1 }).lean();
    res.status(200).json(vendors.map((v) => ({
      _id: v._id,
      shopName: v.shopName,
      ownerPhone: v.ownerId?.phone || null,
      status: v.status,
      isProtected: protectedIds.includes(String(v._id))
    })));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Replace the protected vendor list
// @route   PUT /api/admin/developer/protected-vendors
const updateProtectedVendors = async (req, res) => {
  try {
    const { vendorIds } = req.body;
    if (!Array.isArray(vendorIds) || !vendorIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: 'vendorIds must be an array of vendor ids' });
    }
    await GlobalSettings.findOneAndUpdate({}, { $set: { protectedVendorIds: vendorIds } }, { upsert: true });
    if (redis.isReady) await redis.del('global_settings');
    res.status(200).json({ message: 'Protected vendors updated', count: vendorIds.length });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const clearDashboardCache = async () => {
  if (!redis.isReady) return;
  const keys = await redis.keys('admin_dashboard_stats:*');
  if (keys.length > 0) await redis.del(keys);
};

// @desc    Start dashboard revenue from zero without deleting wallet history
// @route   POST /api/admin/developer/reset-revenue
const resetDashboardRevenue = async (req, res) => {
  try {
    const revenueResetAt = new Date();
    await GlobalSettings.findOneAndUpdate({}, { $set: { revenueResetAt } }, { upsert: true });
    await clearDashboardCache();
    console.warn(`[DEV-TOOLS] ${req.user.phone} reset dashboard revenue`);
    res.status(200).json({ message: 'Dashboard revenue reset to zero', revenueResetAt });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
  getDeveloperSections, clearDeveloperSection, getProtectedVendors, updateProtectedVendors,
  resetDashboardRevenue
};
