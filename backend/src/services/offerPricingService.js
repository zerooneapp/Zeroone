const Offer = require('../models/Offer');
const Service = require('../models/Service');

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

const calculatePricingPreview = async (vendorId, services) => {
  const normalizedServices = services.map((service) => ({
    ...(service.toObject ? service.toObject() : service),
    price: Number(service.price || 0)
  }));
  const offers = await getActiveOffers(vendorId);
  console.log(`[OFFER DEBUG] vendorId=${vendorId} offers found=${offers.length}`);
  offers.forEach(o => console.log(`  offer: ${o.title}, serviceIds=${JSON.stringify(o.serviceIds)}, isActive=${o.isActive}, expiry=${o.expiryDate}`));
  console.log(`[OFFER DEBUG] services being priced:`, normalizedServices.map(s => ({ id: String(s._id), name: s.name, price: s.price })));

  const originalTotal = roundCurrency(
    normalizedServices.reduce((sum, service) => sum + Number(service.price || 0), 0)
  );
  const bestOffer = getBestOfferForServices(normalizedServices, offers);
  console.log(`[OFFER DEBUG] bestOffer found:`, bestOffer ? { discount: bestOffer.discount, offer: bestOffer.offer?.title } : null);

  const serviceDiscountMap = bestOffer
    ? allocateDiscountAcrossServices(bestOffer.eligibleServices, bestOffer.discount)
    : {};

  const servicesPreview = normalizedServices.map((service) => {
    const serviceId = buildServiceKey(service);
    const discount = roundCurrency(serviceDiscountMap[serviceId] || 0);
    const finalPrice = roundCurrency(Math.max(service.price - discount, 0));

    return {
      serviceId,
      name: service.name,
      originalPrice: roundCurrency(service.price),
      discount,
      finalPrice,
      hasOffer: discount > 0
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
    services: servicesPreview
  };
};

const getPricingPreviewForServiceIds = async (vendorId, serviceIds = []) => {
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
      services: []
    };
  }

  return calculatePricingPreview(vendorId, services);
};

module.exports = {
  calculatePricingPreview,
  getPricingPreviewForServiceIds
};
