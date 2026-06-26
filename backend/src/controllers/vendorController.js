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
const { hasLegacyShopOfflineClosure } = require('../services/vendorClosureService');

const getStaffNotificationTarget = (staff) => staff?._id || null;

const getOperationalShopOpen = async (vendor) => (
  vendor.isShopOpen || await hasLegacyShopOfflineClosure(vendor._id)
);

const buildPublicVendorResponse = (vendor, extra = {}) => {
  const { isShopCurrentlyOpen } = require('../utils/shopStatus');
  const dynamicIsShopOpen = isShopCurrentlyOpen(vendor.workingHours);

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
    isShopOpen: vendor.isShopOpen && dynamicIsShopOpen,
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

    const existingShop = await Vendor.findOne({ ownerId: req.user._id, shopName });
    if (existingShop) return res.status(400).json({ message: 'A shop with this name already exists under your account' });

    console.log('[DEBUG] Registering Vendor for user:', req.user._id);
    const vendor = await Vendor.create({
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
      vendor.panCard && 
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
    const allowedStatus = ['confirmed', 'completed', 'cancelled'];
    if (status && allowedStatus.includes(status)) {
      filter.status = status;
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
      status: { $in: ['confirmed', 'completed'] }
    });
    const weekEarnings = weekBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    const totalEarningsResult = await Booking.aggregate([
      { $match: { vendorId: vendor._id, status: { $in: ['confirmed', 'completed'] } } },
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
              status: { $in: ['confirmed', 'completed'] }
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
        time: moment(b.startTime).tz('Asia/Kolkata').format('hh:mm A'),
        customerName: b.userId?.name || 'Customer',
        customerImage: b.userId?.image || '',
        customerPhone: b.userId?.phone || '',
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
    const { workingHours, shopName, address, location, featuredImage } = req.body;
    const vendor = req.vendor;
    if (!vendor) return res.status(404).json({ message: 'Partner not found' });

    if (workingHours) {
      vendor.workingHours = workingHours;
    }
    if (shopName) vendor.shopName = shopName;
    if (address) vendor.address = address;
    if (location) vendor.location = location;
    if (featuredImage !== undefined) vendor.featuredImage = featuredImage;

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

    const start = moment(from).startOf('day').toDate();
    const end = moment(to).endOf('day').toDate();

    const report = await Booking.aggregate([
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
          attendance: { $size: '$activeDays' }
        }
      },
      { $sort: { staffName: 1 } }
    ]);

    res.status(200).json({
      shopName: vendor.shopName,
      range: { from, to },
      data: report
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
        { $match: { vendorId: new mongoose.Types.ObjectId(vendor._id), status: { $in: ['confirmed', 'completed'] } } },
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
              $sum: { $cond: [{ $in: ['$status', ['confirmed', 'completed']] }, '$totalPrice', 0] }
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
        .select('startTime userId staffId services status totalPrice walkInCustomerName walkInCustomerPhone')
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

    console.log(`[DASHBOARD-STATS] Vendor: ${vendor.shopName}, TodayServices: ₹${todayServiceRevenue}, TodayMemberships: ₹${todayMembershipRevenue}`);

    const stats = {
      todayBookings: todayBookings.filter(b => b.status !== 'cancelled').length,
      todayEarnings: todayServiceRevenue + todayMembershipRevenue,
      weekEarnings: statsData[0]?.weekEarnings || 0,
      totalEarnings
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
          avgRating: vendor.rating
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
  deleteGalleryImage,
  replaceGalleryImage,
  updateSingleMedia,
  deleteSingleMedia,
  deleteVideo,
  getVendorTransactions,
  getLiveReport
};
