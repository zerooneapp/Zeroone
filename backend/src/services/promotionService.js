const VendorPromotion = require('../models/VendorPromotion');
const Vendor = require('../models/Vendor');

/**
 * Expires every active profile boost whose endDate has passed.
 * - VendorPromotion.status -> 'expired'
 * - Vendor.isPromoted -> false (only if the vendor has no other running boost)
 *
 * Pass a vendorId to limit the work to one vendor (used on request paths so
 * the vendor never sees a stale "Activated" boost); omit it for the cron.
 * Safe to call repeatedly.
 */
const expireDuePromotions = async (vendorId = null) => {
  const now = new Date();
  const dueFilter = { status: 'active', endDate: { $lte: now } };
  if (vendorId) dueFilter.vendorId = vendorId;

  const due = await VendorPromotion.find(dueFilter).select('_id vendorId');
  if (!due.length) return 0;

  await VendorPromotion.updateMany(
    { _id: { $in: due.map((p) => p._id) }, status: 'active' },
    { $set: { status: 'expired' } }
  );

  const vendorIds = [...new Set(due.map((p) => String(p.vendorId)))];
  for (const id of vendorIds) {
    const stillRunning = await VendorPromotion.exists({
      vendorId: id,
      status: 'active',
      endDate: { $gt: now }
    });
    if (!stillRunning) {
      await Vendor.updateOne(
        { _id: id },
        { $set: { isPromoted: false }, $unset: { promotionExpiry: '' } }
      );
    }
  }

  return due.length;
};

module.exports = { expireDuePromotions };
