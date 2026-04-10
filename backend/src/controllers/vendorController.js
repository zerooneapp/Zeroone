const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const Service = require('../models/Service');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Offer = require('../models/Offer');
const cloudinary = require('../config/cloudinary');
const moment = require('moment-timezone');
const NotificationService = require('../services/notificationService');
const {
  getBillingSettings,
  getSubscriptionPlanForVendor,
  getVendorSubscriptionState
} = require('../services/walletService');

const buildPublicVendorResponse = (vendor, extra = {}) => ({
  _id: vendor._id,
  shopName: vendor.shopName,
  category: vendor.category,
  location: vendor.location,
  address: vendor.address,
  shopImage: vendor.shopImage,
  galleryImages: vendor.galleryImages || [],
  gallery: vendor.galleryImages || [],
  shopVideo: vendor.shopVideo || '',
  workingHours: vendor.workingHours,
  rating: vendor.rating,
  totalReviews: vendor.totalReviews,
  serviceLevel: vendor.serviceLevel,
  serviceMode: vendor.serviceMode || 'shop',
  isShopOpen: vendor.isShopOpen,
  isClosedToday: vendor.isClosedToday,
  offers: vendor.offers || [],
  createdAt: vendor.createdAt,
  updatedAt: vendor.updatedAt,
  ...extra
});

const calculateDistanceInMeters = (fromLat, fromLng, toLat, toLng) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusInMeters = 6371000;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const originLat = toRadians(fromLat);
  const destinationLat = toRadians(toLat);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusInMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

// ... (registerVendor, uploadDocs, getVendorProfile preserved)

const registerVendor = async (req, res) => {
  try {
    const { shopName, category, address, location, serviceLevel, serviceMode } = req.body;
    const existingVendor = await Vendor.findOne({ ownerId: req.user._id });
    if (existingVendor) return res.status(400).json({ message: 'Vendor already exists' });

    console.log('[DEBUG] Registering Vendor for user:', req.user._id);
    const vendor = await Vendor.create({
      shopName,
      category,
      address,
      location,
      ownerId: req.user._id,
      status: 'pending',
      serviceLevel: serviceLevel || 'standard',
      serviceMode: serviceMode === 'home' ? 'home' : 'shop'
    });
    console.log('[DEBUG] Vendor Record Created:', vendor._id, 'with ownerId:', vendor.ownerId);
    await User.findByIdAndUpdate(req.user._id, { role: 'vendor' });

    const admins = await User.find({ role: 'admin' });
    if (admins.length > 0) {
      NotificationService.sendNotification({
        userIds: admins.map(a => a._id), role: 'admin', type: 'NEW_VENDOR_REGISTRATION',
        title: 'New Vendor Registration', message: `A new vendor "${shopName}" has registered and is pending approval.`,
        data: { vendorId: vendor._id }, referenceId: `NEW_VENDOR_${vendor._id}`
      });
    }

    res.status(201).json(vendor);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const uploadDocs = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (!req.files) return res.status(400).json({ message: 'No files' });

    const uploadToCloudinary = (fileBuffer, isVideo = false) => {
      return new Promise((resolve, reject) => {
        const options = {
          folder: 'zerone/vendors',
          resource_type: isVideo ? 'video' : 'auto'
        };
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
          if (error) reject(error); else resolve(result.secure_url);
        });
        uploadStream.end(fileBuffer);
      });
    };

    const files = req.files;
    if (files.aadhaarFront) vendor.aadhaarFront = await uploadToCloudinary(files.aadhaarFront[0].buffer);
    if (files.aadhaarBack) vendor.aadhaarBack = await uploadToCloudinary(files.aadhaarBack[0].buffer);
    if (files.panCard) vendor.panCard = await uploadToCloudinary(files.panCard[0].buffer);
    if (files.gstCertificate) vendor.gstCertificate = await uploadToCloudinary(files.gstCertificate[0].buffer);
    if (files.shopRegistration) vendor.shopRegistration = await uploadToCloudinary(files.shopRegistration[0].buffer);
    if (files.shopImage) vendor.shopImage = await uploadToCloudinary(files.shopImage[0].buffer);
    if (files.vendorPhoto) vendor.vendorPhoto = await uploadToCloudinary(files.vendorPhoto[0].buffer);

    // 🎨 NEW: Gallery & Video
    if (files.gallery) {
      const galleryUrls = await Promise.all(
        files.gallery.map(file => uploadToCloudinary(file.buffer))
      );
      vendor.galleryImages = [...(vendor.galleryImages || []), ...galleryUrls];
    }
    if (files.video) {
      vendor.shopVideo = await uploadToCloudinary(files.video[0].buffer, true);
    }

    const requiresShopImage = (vendor.serviceMode || 'shop') === 'shop';
    const hasRequiredMedia = vendor.aadhaarFront && vendor.aadhaarBack && vendor.panCard && vendor.vendorPhoto && (!requiresShopImage || vendor.shopImage);
    if (hasRequiredMedia) {
      vendor.isProfileComplete = true;
    }
    await vendor.save();
    res.status(200).json(vendor);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id }).populate('category', 'name');
    if (!vendor) {
      console.log('[DEBUG] Vendor NOT FOUND for user:', req.user._id);
      return res.status(404).json({ message: 'Vendor not found' });
    }
    console.log('[DEBUG] getVendorProfile SUCCESS. User:', req.user._id, 'Status:', vendor.status);
    res.status(200).json(vendor);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 📍 UPDATED: Search + Multi-Category Support
const getNearbyVendors = async (req, res) => {
  try {
    const { lng, lat, category, search, serviceType = 'all', page = 1, limit = 10 } = req.query;
    if (!lng || !lat) return res.status(400).json({ message: 'Lng/Lat required' });

    const parsedLng = parseFloat(lng);
    const parsedLat = parseFloat(lat);
    const discoveryRadius = parseInt(process.env.VENDOR_DISCOVERY_RADIUS, 10) || 10000;
    const normalizedLimit = parseInt(limit);
    const skip = (parseInt(page) - 1) * normalizedLimit;
    const normalizedServiceType = ['all', 'shop', 'home'].includes(String(serviceType).toLowerCase())
      ? String(serviceType).toLowerCase()
      : 'all';

    // 🚀 AGGREGATION PIPELINE: High-Performance Geospatial Search
    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parsedLng, parsedLat] },
          distanceField: 'dist.calculated',
          maxDistance: discoveryRadius,
          query: { status: 'active', isActive: true },
          spherical: true
        }
      }
    ];

    // Filter by Category
    if (category) {
      const catIds = category.split(',').map(id => new mongoose.Types.ObjectId(id));
      pipeline.push({ $match: { category: { $in: catIds } } });
    }

    // Search Logic: Intelligent Matching
    if (search) {
      const matchingServices = await Service.find({
        name: { $regex: search, $options: 'i' },
        isActive: true
      }).select('vendorId');

      const vendorIds = matchingServices.map(s => s.vendorId);
      pipeline.push({
        $match: {
          $or: [
            { shopName: { $regex: search, $options: 'i' } },
            { _id: { $in: vendorIds } }
          ]
        }
      });
    }

    // Lookup Category and Services
    pipeline.push(
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' }
    );

    const vendors = await Vendor.aggregate(pipeline);

    // Enrich with Intelligent Service Selection & Offers
    const enrichedVendors = await Promise.all(vendors.map(async (v) => {
      const allServices = await Service.find({ vendorId: v._id, isActive: true })
        .select('_id name price image images duration showOnHome type')
        .sort({ showOnHome: -1, price: 1, createdAt: 1 })
        .lean();

      // 🧠 SEARCH INTELLIGENCE: Find the service that matches the search query best
      let primaryService = allServices.find((service) => service.showOnHome) || allServices[0];
      if (search) {
        const matched = allServices.find(s => s.name.toLowerCase().includes(search.toLowerCase()));
        if (matched) primaryService = matched;
      }

      // 🎁 CALCULATE DISCOUNTS (Same logic as before but applied to primaryService)
      const activeOffers = await Offer.find({ 
        vendorId: v._id, 
        isActive: true,
        $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }]
      });

      const mainPrice = primaryService?.price || 0;
      let discountedPrice = mainPrice;
      let offerLabel = '';

      if (activeOffers.length > 0) {
        const applicableOffers = activeOffers.filter(o => 
          (!o.serviceIds || o.serviceIds.length === 0 || o.serviceIds.includes(primaryService?._id)) &&
          (mainPrice >= (o.minPurchaseAmount || 0))
        );

        if (applicableOffers.length > 0) {
          const bestOffer = applicableOffers.reduce((prev, curr) => {
            let prevD = prev.discountType === 'percentage' ? (mainPrice * prev.value / 100) : prev.value;
            let currD = curr.discountType === 'percentage' ? (mainPrice * curr.value / 100) : curr.value;
            return currD > prevD ? curr : prev;
          });

          let reduction = bestOffer.discountType === 'percentage' ? (mainPrice * bestOffer.value / 100) : bestOffer.value;
          if (bestOffer.maxDiscountLimit > 0) reduction = Math.min(reduction, bestOffer.maxDiscountLimit);
          discountedPrice = Math.max(0, mainPrice - reduction);
          offerLabel = bestOffer.discountType === 'percentage' ? `${bestOffer.value}% OFF` : `₹${bestOffer.value} OFF`;
        }
      }

      return buildPublicVendorResponse(v, {
        dist: v.dist,
        service: primaryService?.name || 'Beauty Service',
        price: mainPrice,
        discountedPrice: discountedPrice < mainPrice ? Math.round(discountedPrice) : null,
        offerLabel,
        serviceImage: primaryService?.image || primaryService?.images?.[0] || '',
        serviceType: primaryService?.type || 'shop',
        serviceCount: allServices.length,
        services: allServices
      });
    }));

    const modeFilteredVendors = normalizedServiceType === 'all'
      ? enrichedVendors
      : enrichedVendors.filter((vendor) => {
          const currentServiceType = vendor.serviceType || 'shop';
          if (normalizedServiceType === 'shop') {
            return currentServiceType === 'shop' || currentServiceType === 'both';
          }
          return currentServiceType === 'home' || currentServiceType === 'both';
        });

    const paginatedVendors = modeFilteredVendors.slice(skip, skip + normalizedLimit);

    // 🚀 ENGAGEMENT TRACKING: Increment profileViews (Throttled)
    const ip = req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress;
    const cacheKey = `view:${ip}`;

    // Bulk update views for vendors not recently viewed by this IP
    for (const v of paginatedVendors) {
      const vendorId = v._id.toString();
      const uniqueKey = `${cacheKey}:${vendorId}`;

      if (!global.viewThrottle) global.viewThrottle = new Map();
      const lastViewed = global.viewThrottle.get(uniqueKey);
      const ONE_HOUR = 60 * 60 * 1000;

      if (!lastViewed || (Date.now() - lastViewed > ONE_HOUR)) {
        await Vendor.findByIdAndUpdate(v._id, { $inc: { profileViews: 1 } });
        global.viewThrottle.set(uniqueKey, Date.now());
      }
    }

    res.status(200).json(paginatedVendors);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateShopStatus = async (req, res) => {
  try {
    const { isShopOpen, isClosedToday, closedDates } = req.body;
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    if (isShopOpen !== undefined) vendor.isShopOpen = isShopOpen;
    if (isClosedToday !== undefined) vendor.isClosedToday = isClosedToday;
    if (closedDates) vendor.closedDates = closedDates;

    await vendor.save();
    res.status(200).json(vendor);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const createOffer = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    const offer = await Offer.create({ ...req.body, vendorId: vendor._id });
    res.status(201).json(offer);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const getOffers = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    const offers = await Offer.find({ vendorId: vendor._id });
    res.status(200).json(offers);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateOffer = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    const offer = await Offer.findOneAndUpdate({ _id: req.params.id, vendorId: vendor._id }, req.body, { new: true });
    res.status(200).json(offer);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const getVendorBookings = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    const { from, to, status } = req.query;
    const filter = { vendorId: vendor._id };

    if (from || to) {
      const startDate = from
        ? moment(from).startOf('day').toDate()
        : moment(to).startOf('day').toDate();
      const endDate = to
        ? moment(to).endOf('day').toDate()
        : moment(from).endOf('day').toDate();

      filter.startTime = {
        $gte: startDate,
        $lte: endDate
      };
    }
    const allowedStatus = ['confirmed', 'completed', 'cancelled'];
    if (status && allowedStatus.includes(status)) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate('userId', 'name phone image')
      .populate('staffId', 'name')
      .sort({ startTime: -1 });

    const now = moment().tz('Asia/Kolkata');
    const formatted = bookings.map(b => {
      const doc = b.toObject();
      const startTime = moment(doc.startTime).tz('Asia/Kolkata');
      const bufferTime = startTime.clone().subtract(30, 'minutes');

      const endTime = moment(doc.endTime).tz('Asia/Kolkata');

      // SOP Level Flags
      doc.canCancel = !now.isSameOrAfter(bufferTime) && doc.status === 'confirmed';
      doc.canContact = now.isSameOrAfter(bufferTime) && doc.status === 'confirmed' && now.isBefore(endTime);
      if (doc.type !== 'home') {
        doc.serviceAddress = undefined;
      }

      return doc;
    });

    res.status(200).json(formatted);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getVendorDashboard = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    const weekStart = moment().startOf('week').toDate();

    // 📅 Today's Bookings
    const todayBookings = await Booking.find({
      vendorId: vendor._id,
      startTime: { $gte: todayStart, $lt: todayEnd }
    })
      .populate('userId', 'name image')
      .populate('staffId', 'name isOwner')
      .sort({ startTime: 1 });

    // 💰 Today's Earnings
    const todayEarnings = todayBookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    // 💰 Weekly Earnings
    const weekBookings = await Booking.find({
      vendorId: vendor._id,
      startTime: { $gte: weekStart, $lt: todayEnd },
      status: { $in: ['confirmed', 'completed'] }
    });
    const weekEarnings = weekBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    // 💰 Total Earnings (All time confirmed/completed)
    const allBookings = await Booking.find({
      vendorId: vendor._id,
      status: { $in: ['confirmed', 'completed'] }
    });
    const totalEarnings = allBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    // 👨‍🔧 Active Staff
    const Staff = require('../models/Staff');
    const activeStaffCount = await Staff.countDocuments({ vendorId: vendor._id, isActive: true });
    const [billingSettings, subscriptionState, dailyPlan, monthlyPlan] = await Promise.all([
      getBillingSettings(),
      getVendorSubscriptionState(vendor),
      getSubscriptionPlanForVendor('daily', vendor.serviceLevel),
      getSubscriptionPlanForVendor('monthly', vendor.serviceLevel)
    ]);

    res.status(200).json({
      shopName: vendor.shopName,
      address: vendor.address,
      rating: vendor.rating,
      isShopOpen: vendor.isShopOpen,
      isClosedToday: vendor.isClosedToday,
      workingHours: vendor.workingHours,
      walletBalance: vendor.walletBalance,
      minimumWalletThreshold: billingSettings.minWalletThreshold || 100,
      subscription: {
        currentPlan: subscriptionState.currentPlan,
      serviceLevel: vendor.serviceLevel,
      serviceMode: vendor.serviceMode || 'shop',
      planExpiry: subscriptionState.isTrialActive
          ? vendor.freeTrial?.expiryDate || null
          : (subscriptionState.isMonthlyActive ? vendor.expiryDate || null : null),
        nextDeduction: vendor.planType === 'daily' ? moment().add(1, 'day').startOf('day').toDate() : null,
        isActive: subscriptionState.isActive,
        dailyPrice: dailyPlan.price,
        monthlyPrice: monthlyPlan.price
      },
      engagement: {
        profileViews: vendor.profileViews || 0,
        serviceClicks: vendor.serviceClicks || 0,
        customerLoss: !subscriptionState.isActive ? (vendor.profileViews || 0) : 0
      },
      stats: {
        todayBookings: todayBookings.length,
        todayEarnings,
        weekEarnings,
        totalEarnings,
        activeStaff: activeStaffCount,
        avgRating: vendor.rating
      },
      revenueHistory: await Promise.all([...Array(7)].map(async (_, i) => {
        const d = moment().subtract(i, 'days');
        const start = d.clone().startOf('day').toDate();
        const end = d.clone().endOf('day').toDate();
        const bookings = await Booking.find({
          vendorId: vendor._id,
          startTime: { $gte: start, $lt: end },
          status: { $in: ['confirmed', 'completed'] }
        });
        return {
          day: d.format('MMM D'),
          revenue: bookings.reduce((sum, b) => sum + b.totalPrice, 0)
        };
      })).then(res => res.reverse()),
      schedule: todayBookings.map(b => ({
        id: b._id,
        time: moment(b.startTime).format('hh:mm A'),
        customerName: b.userId?.name || 'Customer',
        customerImage: b.userId?.image || '',
        service: b.services.map(s => s.name).join(', '),
        status: b.status,
        staffName: b.staffId?.name || 'Owner',
        staffType: b.staffId?.isOwner ? 'owner' : 'staff'
      }))
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getVendorTransactions = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const { from, to } = req.query;
    const filter = { vendorId: vendor._id };

    if (from && to) {
      filter.timestamp = {
        $gte: moment(from).startOf('day').toDate(),
        $lte: moment(to).endOf('day').toDate()
      };
    }

    const WalletTransaction = require('../models/WalletTransaction');
    const transactions = await WalletTransaction.find(filter).sort({ timestamp: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getVendorDetail = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      status: 'active',
      isActive: true
    }).populate('category', 'name').lean();
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    // Enrich vendor detail with current offers
    const activeOffers = await Offer.find({ 
      vendorId: vendor._id, 
      isActive: true,
      $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }]
    });

    res.status(200).json(buildPublicVendorResponse(vendor, { activeOffers }));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateShopProfile = async (req, res) => {
  try {
    const { workingHours, shopName, address, location } = req.body;
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    if (workingHours) vendor.workingHours = workingHours;
    if (shopName) vendor.shopName = shopName;
    if (address) vendor.address = address;
    if (location) vendor.location = location;

    await vendor.save();
    res.status(200).json(vendor);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const createWalkIn = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const { name, phone, staffId, services, startTime, totalPrice, totalDuration } = req.body;

    const booking = await Booking.create({
      vendorId: vendor._id,
      staffId,
      isWalkIn: true,
      walkInCustomerName: name,
      walkInCustomerPhone: phone,
      services,
      totalPrice,
      totalDuration: totalDuration || 30,
      startTime: startTime || new Date(),
      endTime: moment(startTime || new Date()).add(totalDuration || 30, 'minutes').toDate(),
      status: 'completed',
      type: 'shop'
    });

    // 💰 WALLET INTEGRATION: Credit vendor for direct walk-in
    if (totalPrice > 0) {
      vendor.walletBalance = (vendor.walletBalance || 0) + totalPrice;
      await vendor.save();

      const WalletTransaction = require('../models/WalletTransaction');
      await WalletTransaction.create({
        vendorId: vendor._id,
        initiatedByUserId: req.user._id,
        amount: totalPrice,
        type: 'credit',
        category: 'booking_revenue',
        reason: 'Walk-in service completed',
        status: 'completed',
        referenceId: `${booking._id}_WALK_REV`,
        description: `Direct revenue from Walk-in #${booking._id.toString().slice(-6).toUpperCase()}`
      });
    }

    // 👨‍🔧 STAFF NOTIFICATION: Alert the professional about their immediate Walk-in
    const staff = await Staff.findById(booking.staffId);
    if (staff && getStaffNotificationTarget(staff)) {
      await NotificationService.sendNotification({
        userIds: getStaffNotificationTarget(staff),
        role: 'staff',
        type: 'STAFF_ASSIGNED',
        title: 'New Assignment (Walk-in)',
        message: `New Walk-in client: ${name}. Services: ${booking.services.map(s => s.name).join(', ')}.`,
        data: { bookingId: booking._id },
        referenceId: `${booking._id}_WALK_ASSIGN`
      });
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const createManualBooking = async (req, res) => {
  try {
    const { name, phone, serviceIds, staffId, startTime, type } = req.body;
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    const vendorId = vendor._id;

    if (!name || !serviceIds || !staffId || !startTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const Service = require('../models/Service');
    const services = await Service.find({ _id: { $in: serviceIds }, vendorId });
    if (services.length === 0) return res.status(404).json({ message: 'Services not found' });

    const totalDuration = services.reduce((acc, s) => acc + (s.duration || 0) + (s.bufferTime || 0), 0);
    const totalPrice = services.reduce((acc, s) => acc + (s.price || 0), 0);
    const endTime = moment(startTime).add(totalDuration, 'minutes').toDate();

    const existing = await Booking.findOne({
      staffId,
      status: { $ne: 'cancelled' },
      startTime: { $lt: endTime },
      endTime: { $gt: new Date(startTime) }
    });
    if (existing) return res.status(400).json({ message: 'Staff is busy at this time' });

    const booking = await Booking.create({
      vendorId,
      staffId,
      isWalkIn: true,
      walkInCustomerName: name,
      walkInCustomerPhone: phone,
      services: services.map(s => ({ serviceId: s._id, name: s.name, price: s.price, duration: s.duration })),
      totalPrice,
      totalDuration,
      startTime: new Date(startTime),
      endTime,
      type: type || 'shop',
      status: 'confirmed'
    });

    // 👨‍🔧 STAFF NOTIFICATION: Alert the professional about their new Manual Booking
    const staff = await Staff.findById(staffId);
    if (staff && getStaffNotificationTarget(staff)) {
      await NotificationService.sendNotification({
        userIds: getStaffNotificationTarget(staff),
        role: 'staff',
        type: 'STAFF_ASSIGNED',
        title: 'New Dashboard Assignment',
        message: `New manual booking for ${name}. Services: ${services.map(s => s.name).join(', ')}.`,
        data: { bookingId: booking._id },
        referenceId: `${booking._id}_MANUAL_ASSIGN`
      });
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerVendor, uploadDocs, getVendorProfile, getNearbyVendors, getVendorDetail,
  updateShopStatus, createOffer, getOffers, updateOffer, getVendorBookings, getVendorDashboard,
  updateShopProfile, createWalkIn, createManualBooking
};

