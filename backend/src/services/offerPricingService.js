const Offer = require('../models/Offer');
const Service = require('../models/Service');
const UserMembership = require('../models/UserMembership');
const GlobalSettings = require('../models/GlobalSettings');

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const getActiveOffers = async (vendorId, now = new Date()) => (
  Offer.find({
    vendorId,
    isActive: true,
    $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: now } }]
  }).lean()
);

const buildServiceKey = (service) => String(service._id || service.serviceId);

const calculateOfferDiscount = (offer, eligibleSubtotal) => {
  if (eligibleSubtotal <= 0) return 0;
  
  let discount = 0;
  if (offer.discountType === 'percentage') {
    discount = roundCurrency((eligibleSubtotal * offer.value) / 100);
  } else {
    discount = roundCurrency(Math.min(offer.value, eligibleSubtotal));
  }

  // 🛡️ Apply Max Discount Cap
  if (offer.maxDiscountLimit > 0 && discount > offer.maxDiscountLimit) {
    discount = offer.maxDiscountLimit;
  }

  return discount;
};

const allocateDiscountAcrossServices = (services, totalDiscount) => {
  if (!services.length || totalDiscount <= 0) return {};

  const totalPrice = services.reduce((sum, service) => sum + Number(service.price || 0), 0);
  if (totalPrice <= 0) return {};

  let allocated = 0;

  return services.reduce((acc, service, index) => {
    const serviceId = buildServiceKey(service);
    const servicePrice = Number(service.price || 0);
    const rawShare =
      index === services.length - 1
        ? totalDiscount - allocated
        : roundCurrency((servicePrice / totalPrice) * totalDiscount);
    const boundedShare = roundCurrency(Math.min(rawShare, servicePrice));

    allocated = roundCurrency(allocated + boundedShare);
    acc[serviceId] = boundedShare;
    return acc;
  }, {});
};

const getBestOfferForServices = (services, offers) => {
  if (!services.length || !offers.length) {
    return null;
  }

  let bestOffer = null;

  for (const offer of offers) {
    const eligibleServices = services.filter((service) => {
      if (!offer.serviceIds?.length) return true;
      return offer.serviceIds.some((id) => String(id) === buildServiceKey(service));
    });

    if (eligibleServices.length === 0) continue;

    const eligibleSubtotal = eligibleServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
    
    // 🛡️ ENFORCE MIN PURCHASE
    if (eligibleSubtotal < (offer.minPurchaseAmount || 0)) continue;

    const discount = calculateOfferDiscount(offer, eligibleSubtotal);

    if (!bestOffer || discount > bestOffer.discount) {
      bestOffer = {
        offer,
        discount,
        eligibleServices
      };
    }
  }

  return bestOffer;
};

const calculatePricingPreview = async (vendorId, services, userId = null, selectedMembershipId = null, mode = null) => {
  const normalizedServices = services.map((service) => ({
    ...(service.toObject ? service.toObject() : service),
    price: Number(service.price || 0)
  }));

  // 1. Check for Active Memberships
  let activeMembership = null;
  const settings = await GlobalSettings.findOne();
  const isMembActive = settings?.features?.membershipActive !== false;

  const entitlements = new Map();

  if (userId && isMembActive) {
    if (selectedMembershipId) {
      if (selectedMembershipId !== 'none' && selectedMembershipId !== 'none_applied') {
        activeMembership = await UserMembership.findOne({
          _id: selectedMembershipId,
          userId,
          vendorId,
          status: 'active',
          endDate: { $gt: new Date() }
        }).populate('planId');
      }
    } else if (mode === 'browse') {
      // Fetch all active memberships to build aggregated browse entitlements
      const activeMemberships = await UserMembership.find({
        userId,
        vendorId,
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('planId');

      const Booking = require('../models/Booking');
      for (const memb of activeMemberships) {
        const activeBookings = await Booking.find({
          membershipId: memb._id,
          status: { $in: ['pending', 'confirmed'] }
        }).lean();

        memb.planId?.services?.forEach(s => {
          const sId = String(s.serviceId?._id || s.serviceId);
          const usageRecord = memb.usage?.find(u => String(u.serviceId) === sId);
          const completedCount = usageRecord ? usageRecord.usedCount : 0;

          let activeReservationCount = 0;
          activeBookings.forEach(b => {
            const serviceInBooking = b.services.find(bs => String(bs.serviceId) === sId && bs.isFreeViaMembership);
            if (serviceInBooking) activeReservationCount++;
          });

          const totalEffectiveUsed = completedCount + activeReservationCount;
          const remaining = Math.max(0, s.usageLimit - totalEffectiveUsed);

          if (remaining > 0) {
            const existing = entitlements.get(sId);
            if (existing) {
              existing.remaining += remaining;
              existing.limit += s.usageLimit;
              existing.used += totalEffectiveUsed;
            } else {
              entitlements.set(sId, {
                limit: s.usageLimit,
                used: totalEffectiveUsed,
                remaining: remaining
              });
            }
          }
        });

        memb.planId?.freeServiceIds?.forEach(id => {
          const sId = String(id);
          if (!entitlements.has(sId)) {
            entitlements.set(sId, { limit: Infinity, used: 0, remaining: Infinity });
          }
        });
      }
    } else {
      // Find all active memberships sorted by expiry date (FIFO)
      const activeMemberships = await UserMembership.find({
        userId,
        vendorId,
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('planId').sort({ endDate: 1 });

      const Booking = require('../models/Booking');
      // Find the first membership that has remaining limits for any service in the cart
      for (const memb of activeMemberships) {
        const activeBookings = await Booking.find({
          membershipId: memb._id,
          status: { $in: ['pending', 'confirmed'] }
        }).lean();

        const hasEntitlement = normalizedServices.some(service => {
          const sId = String(service._id || service.serviceId);
          const planService = memb.planId?.services?.find(s => String(s.serviceId?._id || s.serviceId) === sId);
          if (planService) {
            const usageRecord = memb.usage?.find(u => String(u.serviceId) === sId);
            const completedCount = usageRecord ? usageRecord.usedCount : 0;

            let activeReservationCount = 0;
            activeBookings.forEach(b => {
              const serviceInBooking = b.services.find(bs => String(bs.serviceId) === sId && bs.isFreeViaMembership);
              if (serviceInBooking) activeReservationCount++;
            });
            const totalEffectiveUsed = completedCount + activeReservationCount;
            const remaining = Math.max(0, planService.usageLimit - totalEffectiveUsed);
            if (remaining > 0) return true;
          }
          const isFree = memb.planId?.freeServiceIds?.some(id => String(id) === sId);
          if (isFree) return true;

          return false;
        });

        if (hasEntitlement) {
          activeMembership = memb;
          break;
        }
      }
    }
  }

  if (activeMembership) {
    // 🔍 Fetch all active (confirmed/pending) bookings that use this membership
    const Booking = require('../models/Booking');
    const activeBookings = await Booking.find({
      membershipId: activeMembership._id,
      status: { $in: ['pending', 'confirmed'] }
    }).lean();

    // Calculate effective usage (Completed counts in DB + Active reservations)
    activeMembership.planId?.services?.forEach(s => {
      const sId = String(s.serviceId?._id || s.serviceId);
      
      // 1. Get counts already completed and saved in membership record
      const usageRecord = activeMembership.usage?.find(u => String(u.serviceId) === sId);
      const completedCount = usageRecord ? usageRecord.usedCount : 0;
      
      // 2. Count how many times this service appears in active (pending/confirmed) bookings
      let activeReservationCount = 0;
      activeBookings.forEach(b => {
        const serviceInBooking = b.services.find(bs => String(bs.serviceId) === sId && bs.isFreeViaMembership);
        if (serviceInBooking) activeReservationCount++;
      });

      const totalEffectiveUsed = completedCount + activeReservationCount;
      
      entitlements.set(sId, {
        limit: s.usageLimit,
        used: totalEffectiveUsed,
        remaining: Math.max(0, s.usageLimit - totalEffectiveUsed)
      });
    });

    // 2. Handle Old Unlimited Services (Fallback for existing plans)
    activeMembership.planId?.freeServiceIds?.forEach(id => {
      const sId = String(id);
      if (!entitlements.has(sId)) {
        entitlements.set(sId, { limit: Infinity, used: 0, remaining: Infinity });
      }
    });
  }

  const offers = await getActiveOffers(vendorId);
  const originalTotal = roundCurrency(
    normalizedServices.reduce((sum, service) => sum + Number(service.price || 0), 0)
  );

  const bestOffer = getBestOfferForServices(normalizedServices, offers);
  const serviceDiscountMap = bestOffer
    ? allocateDiscountAcrossServices(bestOffer.eligibleServices, bestOffer.discount)
    : {};

  const servicesPreview = normalizedServices.map((service) => {
    const serviceId = String(service._id || service.serviceId);
    
    let discount = 0;
    let isFreeViaMembership = false;

    // Membership takes priority (100% discount) if usage remains
    const entitlement = entitlements.get(serviceId);
    if (entitlement && entitlement.remaining > 0) {
      discount = roundCurrency(service.price);
      isFreeViaMembership = true;
      entitlement.remaining -= 1; // Decrement for current session calculation
    } else {
      // Otherwise apply best offer for this service individually
      const bestOfferForOne = getBestOfferForServices([service], offers);
      discount = bestOfferForOne ? roundCurrency(bestOfferForOne.discount) : 0;
    }

    const finalPrice = roundCurrency(Math.max(service.price - discount, 0));

    return {
      serviceId,
      name: service.name,
      originalPrice: roundCurrency(service.price),
      discount,
      finalPrice,
      hasOffer: discount > 0,
      isFreeViaMembership
    };
  });

  const totalDiscount = roundCurrency(
    servicesPreview.reduce((sum, service) => sum + Number(service.discount || 0), 0)
  );

  return {
    offer: bestOffer
      ? {
          _id: bestOffer.offer._id,
          title: bestOffer.offer.title,
          discountType: bestOffer.offer.discountType,
          value: bestOffer.offer.value,
          serviceIds: bestOffer.offer.serviceIds,
          expiryDate: bestOffer.offer.expiryDate,
          minPurchaseAmount: bestOffer.offer.minPurchaseAmount,
          maxDiscountLimit: bestOffer.offer.maxDiscountLimit
        }
      : null,
    originalTotal,
    totalDiscount,
    finalTotal: roundCurrency(Math.max(originalTotal - totalDiscount, 0)),
    services: servicesPreview,
    membershipApplied: (activeMembership && activeMembership.planId) ? {
      name: activeMembership.planId.name,
      id: activeMembership._id
    } : null
  };
};

const getPricingPreviewForServiceIds = async (vendorId, serviceIds = [], userId = null, selectedMembershipId = null, mode = null) => {
  const services = await Service.find({
    vendorId,
    _id: { $in: serviceIds }
  }).select('_id name price').lean();

  if (services.length === 0) {
    return {
      offer: null,
      originalTotal: 0,
      totalDiscount: 0,
      finalTotal: 0,
      services: [],
      membershipApplied: null
    };
  }

  return calculatePricingPreview(vendorId, services, userId, selectedMembershipId, mode);
};

module.exports = {
  calculatePricingPreview,
  getPricingPreviewForServiceIds
};
