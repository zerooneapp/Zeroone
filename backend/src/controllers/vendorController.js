const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const Service = require('../models/Service');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Offer = require('../models/Offer');
const Notification = require('../models/Notification');
const redis = require('../config/redis');
const WalletTransaction = require('../models/WalletTransaction');
const GlobalSettings = require('../models/GlobalSettings');
const cloudinary = require('../config/cloudinary');
const moment = require('moment-timezone');
const NotificationService = require('../services/notificationService');
const {
  getBillingSettings,
  getSubscriptionPlanForVendor,
  getVendorSubscriptionState
} = require('../services/walletService');
const Staff = require('../models/Staff');
const VendorClosure = require('../models/VendorClosure');
const VendorAvailability = require('../models/VendorAvailability');
const { hasLegacyShopOfflineClosure } = require('../services/vendorClosureService');
const InventoryLog = require('../models/InventoryLog');
const InventoryItem = require('../models/InventoryItem');
const { getPricingPreviewForServiceIds } = require('../services/offerPricingService');

const getStaffNotificationTarget = (staff) => staff?._id || null;

const getOperationalShopOpen = async (vendor) => (
  vendor.isShopOpen || await hasLegacyShopOfflineClosure(vendor._id)
);

const buildPublicVendorResponse = (vendor, extra = {}) => {
  return {
    _id: vendor._id,
    shopName: vendor.shopName,
    category: vendor.category,
    location: vendor.location,
    address: vendor.address,
    shopImage: vendor.shopImage,
    featuredImage: vendor.featuredImage || '',
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
  };
};

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

const registerVendor = async (req, res) => {
  try {
    const { shopName, ownerName, category, address, location, serviceLevel, serviceMode } = req.body;
    
    if (ownerName && /[^a-zA-Z\s]/.test(ownerName)) {
      return res.status(400).json({ message: 'Owner name should only contain alphabets and spaces' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'User context not found. Please log in again.' });
    }

    let vendor = await Vendor.findOne({ ownerId: req.user._id, shopName });

    if (vendor) {
      // If the shop was registered but documents weren't uploaded (incomplete), update and reuse it.
      if (!vendor.isProfileComplete) {
        console.log('[DEBUG] Reusing incomplete vendor profile:', vendor._id);
        vendor.ownerName = ownerName;
        vendor.category = category;
        vendor.address = address;
        vendor.location = location;
        vendor.serviceLevel = serviceLevel || 'standard';
        vendor.serviceMode = serviceMode === 'home' ? 'home' : 'shop';
        await vendor.save();
        return res.status(200).json(vendor);
      } else {
        return res.status(400).json({ message: 'A shop with this name already exists under your account' });
      }
    }

    console.log('[DEBUG] Registering Vendor for user:', req.user._id);
    vendor = await Vendor.create({
      shopName,
      ownerName,
      category,
      address,
      location,
      ownerId: req.user._id,
      status: 'pending',
      serviceLevel: serviceLevel || 'standard',
      serviceMode: serviceMode === 'home' ? 'home' : 'shop'
    });
    res.status(201).json(vendor);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const uploadDocs = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User context not found. Please log in again.' });
    }

    const activeVendorId = req.headers['x-vendor-id'] || req.user.lastActiveVendorId;
    let query = { ownerId: req.user._id };
    if (activeVendorId) {
      query._id = activeVendorId;
    }

    const vendor = await Vendor.findOne(query).populate('ownerId', 'name image');
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });
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
    const uploadTasks = [];

    const singleFileKeys = ['aadhaarFront', 'aadhaarBack', 'panCard', 'gstCertificate', 'shopRegistration', 'shopImage', 'vendorPhoto'];
    
    singleFileKeys.forEach(key => {
      if (files[key]) {
        uploadTasks.push(
          uploadToCloudinary(files[key][0].buffer).then(url => {
            vendor[key] = url;
          })
        );
      }
    });

    if (files.gallery) {
      const galleryTask = Promise.all(
        files.gallery.map(file => uploadToCloudinary(file.buffer))
      ).then(urls => {
        vendor.galleryImages = [...(vendor.galleryImages || []), ...urls];
      });
      uploadTasks.push(galleryTask);
    }

    if (files.video) {
      uploadTasks.push(
        uploadToCloudinary(files.video[0].buffer, true).then(url => {
          vendor.shopVideo = url;
        })
      );
    }

    await Promise.all(uploadTasks);

    const requiresShopImage = (vendor.serviceMode || 'shop') === 'shop';
    const hasRequiredMedia = 
      vendor.aadhaarFront && 
      vendor.aadhaarBack && 
      vendor.vendorPhoto && 
      (!requiresShopImage || vendor.shopImage);

    if (hasRequiredMedia && !vendor.isProfileComplete) {
      vendor.isProfileComplete = true;
      
      // Update role and notify admins ONLY when profile is first completed
      await User.findByIdAndUpdate(req.user._id, { role: 'vendor' });
      
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        NotificationService.sendNotification({
          userIds: admins.map(a => a._id), 
          role: 'admin', 
          type: 'NEW_VENDOR_REGISTRATION',
          title: 'New Partner Registration', 
          message: `A new partner "${vendor.shopName}" has uploaded documents and is pending approval.`,
          data: { vendorId: vendor._id }, 
          referenceId: `NEW_VENDOR_${vendor._id}`
        });
      }
    }

    await vendor.save();
    res.status(200).json(vendor);
  } catch (error) { 
    console.error('[UploadDocsError]', error);
    res.status(500).json({ message: error.message }); 
  }
};

const getVendorProfile = async (req, res) => {
  try {
    const activeVendorId = req.activeVendorId || req.user?.lastActiveVendorId;
    let vendor = null;
    if (activeVendorId) {
      vendor = await Vendor.findOne({ _id: activeVendorId, ownerId: req.user._id }).populate('category', 'name');
    } else {
      vendor = await Vendor.findOne({ ownerId: req.user._id }).populate('category', 'name');
    }
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });
    res.status(200).json(vendor);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getNearbyVendors = async (req, res) => {
  try {
    const { lng, lat, category, search, serviceType = 'all', page = 1, limit = 10 } = req.query;
    if (!lng || !lat) return res.status(400).json({ message: 'Lng/Lat required' });

    const parsedLng = parseFloat(lng);
    const parsedLat = parseFloat(lat);

    let discoveryRadiusInMeters = parseInt(process.env.VENDOR_DISCOVERY_RADIUS, 10) || 10000;
    try {
      const settings = await GlobalSettings.findOne();
      if (settings && settings.discoveryRadius) {
        discoveryRadiusInMeters = settings.discoveryRadius * 1000;
      }
    } catch (err) {
      console.error('[SETTINGS-ERROR] Failed to fetch discovery radius, using fallback');
    }

    const normalizedLimit = parseInt(limit);
    const skip = (parseInt(page) - 1) * normalizedLimit;
    const normalizedServiceType = ['all', 'shop', 'home'].includes(String(serviceType).toLowerCase())
      ? String(serviceType).toLowerCase()
      : 'all';

    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parsedLng, parsedLat] },
          distanceField: 'dist.calculated',
          maxDistance: discoveryRadiusInMeters,
          query: { status: 'active', isActive: true, isProfileComplete: true },
          spherical: true
        }
      },
      {
        $sort: { isPromoted: -1, "dist.calculated": 1 }
      }
    ];

    if (category) {
      const catIds = category.split(',').map(id => new mongoose.Types.ObjectId(id));
      pipeline.push({ $match: { category: { $in: catIds } } });
    }

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

    pipeline.push(
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' }
    );

    const vendors = await Vendor.aggregate(pipeline);

    const enrichedVendors = await Promise.all(vendors.map(async (v) => {
      const operationalShopOpen = await getOperationalShopOpen(v);
      const allServices = await Service.find({ vendorId: v._id, isActive: true })
        .select('_id name price image images duration showOnHome type category')
        .sort({ showOnHome: -1, price: 1, createdAt: 1 })
        .lean();

      let primaryService = allServices.find((service) => service.showOnHome) || allServices[0];
      if (search) {
        const matched = allServices.find(s => s.name.toLowerCase().includes(search.toLowerCase()));
        if (matched) primaryService = matched;
      }

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

      return buildPublicVendorResponse({ ...v, isShopOpen: operationalShopOpen }, {
        dist: v.dist,
        service: primaryService?.name || 'Beauty Service',
        price: mainPrice,
        discountedPrice: discountedPrice < mainPrice ? Math.round(discountedPrice) : null,
        offerLabel,
        serviceImage: v.featuredImage || primaryService?.image || primaryService?.images?.[0] || v.shopImage || '',
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

    const ip = req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress;
    const cacheKey = `view:${ip}`;

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

    res.status(200).json({
      vendors: paginatedVendors,
      totalCount: modeFilteredVendors.length,
      totalPages: Math.ceil(modeFilteredVendors.length / normalizedLimit),
      currentPage: Number(page)
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateShopStatus = async (req, res) => {
  try {
    const { isShopOpen, isClosedToday, closedDates } = req.body;
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    if (isShopOpen !== undefined) vendor.isShopOpen = isShopOpen;
    if (isClosedToday !== undefined) vendor.isClosedToday = isClosedToday;
    if (closedDates) vendor.closedDates = closedDates;

    await vendor.save();
    res.status(200).json(vendor);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const createOffer = async (req, res) => {
  try {
    const vendor = req.vendor;
    const offer = await Offer.create({ ...req.body, vendorId: vendor._id });
    res.status(201).json(offer);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const getOffers = async (req, res) => {
  try {
    const vendor = req.vendor;
    const offers = await Offer.find({ vendorId: vendor._id }).lean();
    res.status(200).json(offers);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateOffer = async (req, res) => {
  try {
    const vendor = req.vendor;
    const offer = await Offer.findOneAndUpdate({ _id: req.params.id, vendorId: vendor._id }, req.body, { returnDocument: 'after' });
    res.status(200).json(offer);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const getVendorBookings = async (req, res) => {
  try {
    const vendor = req.vendor;
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
    const allowedStatus = ['confirmed', 'completed', 'cancelled', 'pending_completion'];
    if (status && allowedStatus.includes(status)) {
      if (status === 'confirmed') {
        filter.status = { $in: ['confirmed', 'pending_completion'] };
      } else {
        filter.status = status;
      }
    }

    const bookings = await Booking.find(filter)
      .populate('userId', 'name phone image')
      .populate('staffId', 'name')
      .populate('services.serviceId', 'price')
      .sort({ startTime: -1 });

    const now = moment().tz('Asia/Kolkata');
    const formatted = bookings.map(b => {
      const doc = b.toObject();
      const startTime = moment(doc.startTime).tz('Asia/Kolkata');
      const endTime = moment(doc.endTime).tz('Asia/Kolkata');

      doc.canCancel = doc.status === 'confirmed';
      doc.canContact = doc.status === 'confirmed' && now.isBefore(endTime);
      if (doc.type !== 'home') {
        doc.serviceAddress = undefined;
      }

      let originalTotalPrice = 0;
      doc.services = (doc.services || []).map(s => {
        const origPrice = s.originalPrice !== undefined 
          ? s.originalPrice 
          : (s.serviceId && s.serviceId.price !== undefined ? s.serviceId.price : s.price);
        
        s.originalPrice = origPrice;
        originalTotalPrice += origPrice;
        // Keep serviceId as string for consistency if populated
        if (s.serviceId && typeof s.serviceId === 'object' && s.serviceId._id) {
          s.serviceId = s.serviceId._id.toString();
        }
        return s;
      });
      doc.originalTotalPrice = originalTotalPrice;

      return doc;
    });

    res.status(200).json(formatted);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getVendorDashboard = async (req, res) => {
  try {
    const activeVendorId = req.activeVendorId || req.user?.lastActiveVendorId;
    if (!activeVendorId) return res.status(400).json({ message: 'No active vendor context' });
    const vendor = await Vendor.findById(activeVendorId).populate('ownerId', 'name image phone');
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    const todayStart = moment().tz('Asia/Kolkata').startOf('day').toDate();
    const todayEnd = moment().tz('Asia/Kolkata').endOf('day').toDate();
    const weekStart = moment().tz('Asia/Kolkata').startOf('week').toDate();

    const todayBookings = await Booking.find({
      vendorId: vendor._id,
      startTime: { $gte: todayStart, $lt: todayEnd }
    })
      .populate('userId', 'name image phone')
      .populate('staffId', 'name isOwner')
      .sort({ startTime: 1 });

    const todayEarnings = todayBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    const weekBookings = await Booking.find({
      vendorId: vendor._id,
      startTime: { $gte: weekStart, $lt: todayEnd },
      status: 'completed'
    });
    const weekEarnings = weekBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    const totalEarningsResult = await Booking.aggregate([
      { $match: { vendorId: vendor._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalEarnings = totalEarningsResult[0]?.total || 0;

    const [activeStaffCount, activeStaffMembers] = await Promise.all([
      Staff.countDocuments({ vendorId: vendor._id, isActive: true }),
      Staff.find({ vendorId: vendor._id, isActive: true })
        .populate('userId', 'image')
        .select('name image userId')
        .lean()
    ]);

    const StaffClosure = require('../models/StaffClosure');
    const now = new Date();
    const activeClosures = await StaffClosure.find({
      staffId: { $in: activeStaffMembers.map(s => s._id) },
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gt: now }
    }).lean();
    const absentStaffIds = new Set(activeClosures.map(c => c.staffId.toString()));

    const activeStaffCards = activeStaffMembers
        .filter(staff => !absentStaffIds.has(staff._id.toString()))
        .map((staff) => ({
          id: staff._id.toString(),
          type: 'staff',
          name: staff.name,
          image: staff.image || staff.userId?.image || '',
          todayBookings: todayBookings.filter((booking) => booking.staffId && booking.staffId._id.toString() === staff._id.toString()).length
        }));
    const [billingSettings, subscriptionState, dailyPlan, monthlyPlan] = await Promise.all([
      getBillingSettings(),
      getVendorSubscriptionState(vendor),
      getSubscriptionPlanForVendor('daily', vendor.serviceLevel),
      getSubscriptionPlanForVendor('monthly', vendor.serviceLevel)
    ]);

    const { isShopCurrentlyOpen } = require('../utils/shopStatus');
    const dynamicIsShopOpen = isShopCurrentlyOpen(vendor.workingHours);
    const operationalShopOpen = await getOperationalShopOpen(vendor);

    res.status(200).json({
      vendorId: vendor._id,
      shopName: vendor.shopName,
      address: vendor.address,
      rating: vendor.rating,
      isShopOpen: operationalShopOpen,
      isOpenNow: operationalShopOpen && dynamicIsShopOpen,
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
        todayBookings: todayBookings.filter(b => b.status !== 'cancelled').length,
        todayEarnings,
        weekEarnings,
        totalEarnings,
        activeStaff: activeStaffCount,
        avgRating: vendor.rating
      },
      revenueHistory: await (async () => {
        const sevenDaysAgo = moment().tz('Asia/Kolkata').subtract(6, 'days').startOf('day').toDate();
        const stats = await Booking.aggregate([
          {
            $match: {
              vendorId: vendor._id,
              startTime: { $gte: sevenDaysAgo },
              status: 'completed'
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$startTime", timezone: "Asia/Kolkata" } },
              revenue: { $sum: "$totalPrice" }
            }
          },
          { $sort: { _id: 1 } }
        ]);

        const statsMap = stats.reduce((acc, curr) => {
          acc[curr._id] = curr.revenue;
          return acc;
        }, {});

        return [...Array(7)].map((_, i) => {
          const d = moment().tz('Asia/Kolkata').subtract(6 - i, 'days');
          const dateStr = d.format('YYYY-MM-DD');
          return {
            day: d.format('MMM D'),
            revenue: statsMap[dateStr] || 0
          };
        });
      })(),
      activeStaffCards,
      hasRegisteredStaff: activeStaffMembers.length > 0,
      schedule: todayBookings.map(b => ({
        id: b._id,
        startTime: b.startTime,
        time: moment(b.startTime).tz('Asia/Kolkata').format('hh:mm A'),
        totalDuration: b.totalDuration,
        endTime: b.endTime,
        customerId: b.userId?._id?.toString() || null,
        isWalkIn: b.isWalkIn || false,
        customerName: b.userId?.name || b.walkInCustomerName || 'Customer',
        customerImage: b.userId?.image || '',
        customerPhone: b.userId?.phone || b.walkInCustomerPhone || '',
        service: b.services.map(s => s.name).join(', '),
        totalPrice: b.totalPrice || 0,
        status: b.status,
        staffId: b.staffId?._id?.toString() || null,
        staffName: b.staffId?.name || 'Owner',
        staffType: b.staffId?.isOwner ? 'owner' : 'staff'
      }))
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getVendorTransactions = async (req, res) => {
  try {
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

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
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });
    const activeOffers = await Offer.find({ 
      vendorId: vendor._id, 
      isActive: true,
      $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }]
    });

    const operationalShopOpen = await getOperationalShopOpen(vendor);
    res.status(200).json(buildPublicVendorResponse({ ...vendor, isShopOpen: operationalShopOpen }, { activeOffers }));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateShopProfile = async (req, res) => {
  try {
    const { workingHours, shopName, address, location, featuredImage, weeklyOff } = req.body;
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    if (workingHours) {
      vendor.workingHours = workingHours;
    }
    if (shopName) vendor.shopName = shopName;
    if (address) vendor.address = address;
    if (location) vendor.location = location;
    if (featuredImage !== undefined) vendor.featuredImage = featuredImage;
    if (weeklyOff !== undefined) vendor.weeklyOff = weeklyOff;

    await vendor.save();
    res.status(200).json(vendor);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const createWalkIn = async (req, res) => {
  try {
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

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
      completedAt: new Date(),
      type: 'shop'
    });

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
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });
    const vendorId = vendor._id;

    if (!name || !serviceIds || !staffId || !startTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const services = await Service.find({ _id: { $in: serviceIds }, vendorId });
    if (services.length === 0) return res.status(404).json({ message: 'Services not found' });

    const totalDuration = services.reduce((acc, s) => acc + (s.duration || 0) + (s.bufferTime || 0), 0);
    const endTime = moment(startTime).add(totalDuration, 'minutes').toDate();

    const existing = await Booking.findOne({
      staffId,
      status: { $ne: 'cancelled' },
      startTime: { $lt: endTime },
      endTime: { $gt: new Date(startTime) }
    });
    if (existing) return res.status(400).json({ message: 'Staff is busy at this time' });

    // Calculate discounted prices based on active offers
    const pricing = await getPricingPreviewForServiceIds(vendorId, serviceIds);
    const bookingServices = services.map(s => {
      const pricingService = pricing?.services?.find(ps => String(ps.serviceId) === String(s._id));
      return {
        serviceId: s._id,
        name: s.name,
        price: pricingService ? pricingService.price : s.price,
        duration: s.duration,
        bufferTime: s.bufferTime || 0
      };
    });
    const totalPrice = pricing ? pricing.finalTotal : services.reduce((acc, s) => acc + (s.price || 0), 0);

    const booking = await Booking.create({
      vendorId,
      staffId,
      isWalkIn: true,
      walkInCustomerName: name,
      walkInCustomerPhone: phone,
      services: bookingServices,
      totalPrice,
      totalDuration,
      startTime: new Date(startTime),
      endTime,
      type: type || 'shop',
      status: 'confirmed'
    });

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

const getLoyalCustomers = async (req, res) => {
  try {
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    const loyalCustomers = await Booking.aggregate([
      { $match: { vendorId: vendor._id, status: { $in: ['confirmed', 'completed'] } } },
      {
        $group: {
          _id: {
            $cond: [
              { $ifNull: ["$userId", false] },
              "$userId",
              {
                $cond: [
                  { $and: [{ $ne: ["$walkInCustomerPhone", ""] }, { $ifNull: ["$walkInCustomerPhone", false] }] },
                  "$walkInCustomerPhone",
                  { $ifNull: ["$walkInCustomerName", "$_id"] }
                ]
              }
            ]
          },
          bookingCount: { $sum: 1 },
          lastBooking: { $max: '$startTime' },
          totalSpent: { $sum: '$totalPrice' },
          name: { $first: { $ifNull: ["$walkInCustomerName", "Unknown"] } },
          phone: { $first: { $ifNull: ["$walkInCustomerPhone", "Unknown"] } },
          isWalkIn: { $first: { $cond: [{ $ifNull: ["$userId", false] }, false, true] } }
        }
      },
      { $sort: { bookingCount: -1 } }
    ]);

    const result = await Promise.all(loyalCustomers.map(async (item) => {
      if (!item.isWalkIn && mongoose.Types.ObjectId.isValid(item._id)) {
        const user = await User.findById(item._id).select('name phone image');
        return {
          ...item,
          name: user?.name || item.name,
          phone: user?.phone || item.phone,
          image: user?.image || ''
        };
      }
      return item;
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomerBookingHistory = async (req, res) => {
  try {
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    const { customerId, isWalkIn, phone, name } = req.query;

    let matchQuery = {
      vendorId: vendor._id,
      status: { $in: ['confirmed', 'completed'] }
    };

    if (isWalkIn === 'false') {
      if (mongoose.Types.ObjectId.isValid(customerId)) {
        matchQuery.userId = new mongoose.Types.ObjectId(customerId);
      } else {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
    } else {
      // Walk-in customer: match by phone or name
      const conditions = [];
      if (phone && phone !== 'Unknown' && phone !== '') {
        conditions.push({ walkInCustomerPhone: phone });
      }
      if (name && name !== 'Unknown' && name !== '') {
        conditions.push({ walkInCustomerName: name });
      }
      // Fallback to match by booking id if customerId is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(customerId)) {
        conditions.push({ _id: new mongoose.Types.ObjectId(customerId) });
      }
      
      if (conditions.length > 0) {
        matchQuery.$or = conditions;
      } else {
        return res.status(400).json({ message: 'Invalid customer identifier' });
      }
    }

    const bookings = await Booking.find(matchQuery)
      .select('startTime endTime totalDuration services totalPrice status')
      .sort({ startTime: -1 });

    let productPurchases = [];
    const productConditions = [];
    if (phone && phone !== 'Unknown' && phone !== '') {
      productConditions.push({ customerContact: phone });
    }
    if (name && name !== 'Unknown' && name !== '') {
      productConditions.push({ customerName: name });
    }
    if (productConditions.length > 0) {
      productPurchases = await InventoryLog.find({
        vendorId: vendor._id,
        $or: productConditions
      }).populate('itemId').sort({ createdAt: -1 });
    }

    res.status(200).json({ bookings, products: productPurchases });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteGalleryImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    vendor.galleryImages = (vendor.galleryImages || []).filter(img => img !== imageUrl);
    if (vendor.featuredImage === imageUrl) {
      vendor.featuredImage = '';
    }
    await vendor.save();
    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const replaceGalleryImage = async (req, res) => {
  try {
    const { oldImageUrl } = req.body;
    if (!req.file) return res.status(400).json({ message: 'New image required' });

    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    const uploadToCloudinary = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const options = { folder: 'zerone/vendors', resource_type: 'auto' };
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
          if (error) reject(error); else resolve(result.secure_url);
        });
        uploadStream.end(fileBuffer);
      });
    };

    const newUrl = await uploadToCloudinary(req.file.buffer);
    vendor.galleryImages = (vendor.galleryImages || []).map(img => img === oldImageUrl ? newUrl : img);
    await vendor.save();
    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSingleMedia = async (req, res) => {
  try {
    const { field } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Media required' });

    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    const uploadToCloudinary = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const options = { folder: 'zerone/vendors', resource_type: 'auto' };
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
          if (error) reject(error); else resolve(result.secure_url);
        });
        uploadStream.end(fileBuffer);
      });
    };

    const url = await uploadToCloudinary(req.file.buffer);
    vendor[field] = url;
    await vendor.save();
    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSingleMedia = async (req, res) => {
  try {
    const { field } = req.body;
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    const deletedUrl = vendor[field];
    vendor[field] = '';

    if (vendor.featuredImage && vendor.featuredImage === deletedUrl) {
      vendor.featuredImage = '';
    }

    await vendor.save();
    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });
    vendor.shopVideo = '';
    await vendor.save();
    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLiveReport = async (req, res) => {
  try {
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: 'From and To dates are required' });
    }

    const start = moment(from).tz('Asia/Kolkata').startOf('day').toDate();
    const end = moment(to).tz('Asia/Kolkata').endOf('day').toDate();

    // Fetch vendor availability (weekly schedule) and closures in range
    const [report, availability, closures] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            vendorId: vendor._id,
            startTime: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$staffId',
            totalBookings: { $sum: 1 },
            totalEarning: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, '$totalPrice', 0]
              }
            },
            cancelledByStaff: {
              $sum: {
                $cond: [
                  { 
                    $and: [
                      { $eq: ['$status', 'cancelled'] }, 
                      { $eq: ['$cancelledByRole', 'staff'] }
                    ] 
                  }, 
                  1, 
                  0
                ]
              }
            },
            activeDays: {
              $addToSet: {
                $dateToString: { format: "%Y-%m-%d", date: "$startTime", timezone: "Asia/Kolkata" }
              }
            }
          }
        },
        {
          $lookup: {
            from: 'staffs',
            localField: '_id',
            foreignField: '_id',
            as: 'staffInfo'
          }
        },
        { $unwind: { path: '$staffInfo', preserveNullAndEmptyArrays: false } },
        {
          $project: {
            staffName: '$staffInfo.name',
            totalBookings: 1,
            totalEarning: 1,
            cancelledByStaff: 1,
            activeDays: 1,
            attendance: { $size: '$activeDays' }
          }
        },
        { $sort: { staffName: 1 } }
      ]),
      VendorAvailability.find({ vendorId: vendor._id }).lean(),
      VendorClosure.find({
        vendorId: vendor._id,
        status: 'active',
        startTime: { $lt: end },
        endTime: { $gt: start }
      }).lean()
    ]);

    // Build availability map: day abbreviation -> { openTime, closeTime }
    const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const availMap = {};
    availability.forEach(a => { availMap[a.day] = a; });

    // For each staff row, compute halfDays using closures
    const enriched = report.map(item => {
      let fullDays = 0;
      let halfDays = 0;

      (item.activeDays || []).forEach(dateStr => {
        const dayMoment = moment.tz(dateStr, 'YYYY-MM-DD', 'Asia/Kolkata');
        const dayAbbr = DAY_ABBR[dayMoment.day()];
        const avail = availMap[dayAbbr];

        // Default working hours: 9am–9pm (720 mins) if no availability record
        let workStart, workEnd;
        if (avail && avail.isOpen) {
          const [openH, openM] = (avail.openTime || '09:00').split(':').map(Number);
          const [closeH, closeM] = (avail.closeTime || '21:00').split(':').map(Number);
          workStart = dayMoment.clone().hours(openH).minutes(openM).seconds(0);
          workEnd = dayMoment.clone().hours(closeH).minutes(closeM).seconds(0);
        } else {
          workStart = dayMoment.clone().hours(9).minutes(0).seconds(0);
          workEnd = dayMoment.clone().hours(21).minutes(0).seconds(0);
        }
        const totalWorkMins = workEnd.diff(workStart, 'minutes');
        if (totalWorkMins <= 0) { fullDays++; return; }

        // Sum closure minutes that overlap this working day
        let closedMins = 0;
        closures.forEach(c => {
          const cStart = moment(c.startTime).tz('Asia/Kolkata');
          const cEnd = moment(c.endTime).tz('Asia/Kolkata');
          const overlapStart = moment.max(cStart, workStart);
          const overlapEnd = moment.min(cEnd, workEnd);
          if (overlapEnd.isAfter(overlapStart)) {
            closedMins += overlapEnd.diff(overlapStart, 'minutes');
          }
        });

        const closedRatio = closedMins / totalWorkMins;
        if (closedRatio >= 0.5) {
          halfDays++;  // shop was closed for half or more of the working day
        } else {
          fullDays++;
        }
      });

      return {
        staffName: item.staffName,
        totalBookings: item.totalBookings,
        totalEarning: item.totalEarning,
        cancelledByStaff: item.cancelledByStaff,
        attendance: fullDays,
        halfDays
      };
    });

    res.status(200).json({
      shopName: vendor.shopName,
      range: { from, to },
      data: enriched
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getVendorDashboardBundle = async (req, res) => {
  try {
    // Always fetch FRESH vendor data using activeVendorId context
    const activeVendorId = req.activeVendorId || req.user?.lastActiveVendorId;
    if (!activeVendorId) return res.status(400).json({ message: 'No active vendor context' });
    
    const vendor = await Vendor.findById(activeVendorId).lean();
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });
    const todayStart = moment().tz('Asia/Kolkata').startOf('day').toDate();
    const todayEnd = moment().tz('Asia/Kolkata').endOf('day').toDate();
    const weekStart = moment().tz('Asia/Kolkata').startOf('week').toDate();

    // 1. Core Fetch (Parallel) - Optimized with Projection and Lean
    const [
      billingSettings,
      dailyPlan,
      monthlyPlan,
      unreadCount,
      statsDataResult,
      statsData
    ] = await Promise.all([
      getBillingSettings(),
      getSubscriptionPlanForVendor('daily', vendor.serviceLevel),
      getSubscriptionPlanForVendor('monthly', vendor.serviceLevel),
      Notification.countDocuments({ userId: new mongoose.Types.ObjectId(vendor.ownerId), isRead: false, role: 'vendor' }),
      
      Booking.aggregate([
        { $match: { vendorId: new mongoose.Types.ObjectId(vendor._id), status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),

      // Use Aggregation for all stats in one go - MUCH FASTER
      Booking.aggregate([
        { 
          $match: { 
            vendorId: new mongoose.Types.ObjectId(vendor._id), 
            startTime: { $gte: weekStart, $lt: todayEnd }, 
            status: { $ne: 'cancelled' } 
          } 
        },
        {
          $group: {
            _id: null,
            todayBookings: { 
              $sum: { $cond: [{ $and: [{ $gte: ['$startTime', todayStart] }, { $lt: ['$startTime', todayEnd] }] }, 1, 0] }
            },
            todayEarnings: {
              $sum: { $cond: [{ $and: [{ $eq: ['$status', 'completed'] }, { $gte: ['$startTime', todayStart] }, { $lt: ['$startTime', todayEnd] }] }, '$totalPrice', 0] }
            },
            weekEarnings: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalPrice', 0] }
            }
          }
        }
      ])
    ]);

    const totalEarnings = statsDataResult ? statsDataResult[0]?.total || 0 : 0;

    // 2. Secondary Data Fetch (Dependent on initial data or just bulky)
    const [
      todayBookings,
      activeStaffMembers,
      subscriptionState,
      todayMembershipTransactions,
      recentTransactions
    ] = await Promise.all([
      Booking.find({ 
        vendorId: new mongoose.Types.ObjectId(vendor._id), 
        startTime: { $gte: todayStart, $lt: todayEnd } 
      })
        .select('startTime endTime totalDuration userId staffId services status totalPrice walkInCustomerName walkInCustomerPhone')
        .populate('userId', 'name image phone')
        .populate('staffId', 'name isOwner')
        .sort({ startTime: 1 })
        .lean(),
      
      Staff.find({ vendorId: new mongoose.Types.ObjectId(vendor._id), isActive: true })
        .select('name image userId')
        .populate('userId', 'image')
        .lean(),
      
      getVendorSubscriptionState(vendor, { settings: billingSettings, dailyPlan }),
      
      WalletTransaction.find({ 
        vendorId: new mongoose.Types.ObjectId(vendor._id),
        $or: [
          { category: 'membership_revenue' },
          { reason: 'membership_purchase' }
        ],
        status: 'completed',
        timestamp: { $gte: todayStart, $lt: todayEnd }
      }).lean(),
      
      WalletTransaction.find({ vendorId: new mongoose.Types.ObjectId(vendor._id) })
        .select('type amount timestamp status label')
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()
    ]);

    const todayServiceRevenue = todayBookings
      .filter(b => b.status === 'completed')
      .reduce((acc, b) => acc + (b.totalPrice || 0), 0);

    const todayMembershipRevenue = (todayMembershipTransactions || [])
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    // All-time membership revenue from WalletTransactions
    const allTimeMembershipResult = await WalletTransaction.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendor._id),
          $or: [{ category: 'membership_revenue' }, { reason: 'membership_purchase' }],
          status: 'completed'
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalMembershipEarnings = allTimeMembershipResult[0]?.total || 0;

    // Fetch product sales logs to calculate Product Earning stats dynamically
    const productLogs = await InventoryLog.find({
      vendorId: new mongoose.Types.ObjectId(vendor._id),
      change: { $lt: 0 },
      isReturn: false
    }).lean();

    // Map logs to retail price
    const itemIds = [...new Set(productLogs.map(l => l.itemId.toString()))];
    const itemsList = await InventoryItem.find({ _id: { $in: itemIds } }).select('price').lean();
    const priceMap = itemsList.reduce((acc, item) => {
      acc[item._id.toString()] = item.price || 0;
      return acc;
    }, {});

    let todayProductEarnings = 0;
    let totalProductEarnings = 0;

    productLogs.forEach(log => {
      const price = priceMap[log.itemId.toString()] || 0;
      const amount = Math.abs(log.change) * price;
      totalProductEarnings += amount;

      // Check if logged today
      const logTime = moment(log.createdAt);
      if (logTime.isSameOrAfter(moment(todayStart)) && logTime.isBefore(moment(todayEnd))) {
        todayProductEarnings += amount;
      }
    });

    // Separate service-only and membership earnings
    const todayServiceOnlyEarnings = todayServiceRevenue;
    const todayServiceEarnings = todayServiceRevenue + todayMembershipRevenue;
    const totalServiceOnlyEarnings = totalEarnings - totalMembershipEarnings;
    const totalServiceEarnings = totalEarnings;

    console.log(`[DASHBOARD-STATS] Vendor: ${vendor.shopName}, TodayServices: ₹${todayServiceRevenue}, TodayMemberships: ₹${todayMembershipRevenue}, TodayProducts: ₹${todayProductEarnings}`);

    const stats = {
      todayBookings: todayBookings.filter(b => b.status !== 'cancelled').length,
      todayEarnings: todayServiceEarnings + todayProductEarnings,
      weekEarnings: (statsData[0]?.weekEarnings || 0) + todayProductEarnings,
      totalEarnings: totalServiceEarnings + totalProductEarnings,
      // Granular split for breakdown modal
      todayServiceEarnings,
      todayServiceOnlyEarnings,
      todayMembershipEarnings: todayMembershipRevenue,
      todayProductEarnings,
      totalServiceEarnings,
      totalServiceOnlyEarnings,
      totalMembershipEarnings,
      totalProductEarnings
    };
    
    const StaffClosure = require('../models/StaffClosure');
    const now = new Date();
    const activeClosures = await StaffClosure.find({
      staffId: { $in: activeStaffMembers.map(s => s._id) },
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gt: now }
    }).lean();
    const absentStaffIds = new Set(activeClosures.map(c => c.staffId.toString()));

    const activeStaffCards = activeStaffMembers
        .filter(staff => !absentStaffIds.has(staff._id.toString()))
        .map((staff) => ({
          id: staff._id.toString(),
          type: 'staff',
          name: staff.name,
          image: staff.image || staff.userId?.image || '',
          todayBookings: todayBookings.filter((booking) => 
            booking.staffId && 
            booking.staffId._id.toString() === staff._id.toString() && 
            booking.status !== 'cancelled'
          ).length
        }));

    const { isShopCurrentlyOpen } = require('../utils/shopStatus');
    const dynamicIsShopOpen = isShopCurrentlyOpen(vendor.workingHours);
    const operationalShopOpen = await getOperationalShopOpen(vendor);

    const dailyTotal = (dailyPlan.price || 0) + (dailyPlan.gstPercent ? (dailyPlan.price * dailyPlan.gstPercent) / 100 : 0);
    const requiredBalanceToday = (billingSettings.minWalletThreshold || 100) + dailyTotal;
    const shortfallToResume = Math.max(requiredBalanceToday - (vendor.walletBalance || 0), 0);
    const isLowBalanceWarning = vendor.walletBalance < requiredBalanceToday && subscriptionState.currentPlan === 'daily';

    res.status(200).json({
      dashboard: {
        vendorId: vendor._id,
        shopName: vendor.shopName,
        rating: vendor.rating,
        isShopOpen: operationalShopOpen,
        isOpenNow: operationalShopOpen && dynamicIsShopOpen,
        isClosedToday: vendor.isClosedToday,
        workingHours: vendor.workingHours,
        serviceLevel: vendor.serviceLevel,
        serviceMode: vendor.serviceMode || 'shop',
        stats: {
          todayBookings: stats.todayBookings,
          todayEarnings: stats.todayEarnings,
          weekEarnings: stats.weekEarnings,
          totalEarnings: stats.totalEarnings,
          activeStaff: activeStaffMembers.length,
          avgRating: vendor.rating,
          // Granular breakdown for Revenue Breakdown Modal
          todayServiceEarnings: stats.todayServiceEarnings,
          todayServiceOnlyEarnings: stats.todayServiceOnlyEarnings,
          todayMembershipEarnings: stats.todayMembershipEarnings,
          todayProductEarnings: stats.todayProductEarnings,
          totalServiceEarnings: stats.totalServiceEarnings,
          totalServiceOnlyEarnings: stats.totalServiceOnlyEarnings,
          totalMembershipEarnings: stats.totalMembershipEarnings,
          totalProductEarnings: stats.totalProductEarnings
        },
        engagement: {
          profileViews: vendor.profileViews || 0,
          serviceClicks: vendor.serviceClicks || 0,
          customerLoss: !subscriptionState.isActive ? (vendor.profileViews || 0) : 0
        },
        activeStaffCards,
        hasRegisteredStaff: activeStaffMembers.length > 0,
        schedule: todayBookings.map(b => ({
          id: b._id,
          time: moment(b.startTime).tz('Asia/Kolkata').format('hh:mm A'),
          totalDuration: b.totalDuration,
          endTime: b.endTime,
          customerName: b.userId?.name || b.walkInCustomerName || 'Customer',
          customerImage: b.userId?.image || '',
          customerPhone: b.userId?.phone || b.walkInCustomerPhone || '',
          service: b.services.map(s => s.name).join(', '),
          totalPrice: b.totalPrice || 0,
          status: b.status,
          staffId: b.staffId?._id?.toString() || null,
          staffName: b.staffId?.name || 'Owner',
          staffType: b.staffId?.isOwner ? 'owner' : 'staff'
        }))
      },
      unreadCount,
      transactions: recentTransactions,
      wallet: {
        walletBalance: vendor.walletBalance || 0,
        minimumWalletThreshold: billingSettings.minWalletThreshold || 100,
        requiredBalanceToday,
        shortfallToResume,
        isLowBalanceWarning,
        subscription: {
          ...subscriptionState,
          planExpiry: subscriptionState.isTrialActive
            ? vendor.freeTrial?.expiryDate || null
            : (subscriptionState.isMonthlyActive ? vendor.expiryDate || null : null),
          nextDeduction: vendor.planType === 'daily' ? moment().add(1, 'day').startOf('day').toDate() : null
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerVendor,
  uploadDocs,
  getVendorProfile,
  getNearbyVendors,
  updateShopStatus,
  createOffer,
  getOffers,
  updateOffer,
  getVendorBookings,
  getVendorDashboard,
  getVendorDashboardBundle,
  getVendorDetail,
  updateShopProfile,
  createWalkIn,
  createManualBooking,
  getLoyalCustomers,
  getCustomerBookingHistory,
  deleteGalleryImage,
  replaceGalleryImage,
  updateSingleMedia,
  deleteSingleMedia,
  deleteVideo,
  getVendorTransactions,
  getLiveReport
};
