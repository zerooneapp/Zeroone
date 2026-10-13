const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');
const Vendor = require('./src/models/Vendor');
const Category = require('./src/models/Category');
const Service = require('./src/models/Service');
const Staff = require('./src/models/Staff');

const PERMANENT_PHONE = '1234567890';
const PERMANENT_OTP = '123456';
const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;

async function seedPartner() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create or Update User with phone 1234567890 as vendor
    let user = await User.findOne({ phone: PERMANENT_PHONE });
    const otpExpiry = new Date(Date.now() + TEN_YEARS_MS);

    if (user) {
      console.log(`Found existing user with phone ${PERMANENT_PHONE}. Updating to vendor...`);
      user.name = user.name || 'Beauty Parlour Partner';
      user.role = 'vendor';
      user.otp = PERMANENT_OTP;
      user.otpExpires = otpExpiry;
      user.isDeleted = false;
      user.isBlocked = false;
      await user.save();
    } else {
      console.log(`Creating new vendor user for ${PERMANENT_PHONE}...`);
      user = await User.create({
        phone: PERMANENT_PHONE,
        name: 'Beauty Parlour Partner',
        role: 'vendor',
        otp: PERMANENT_OTP,
        otpExpires: otpExpiry,
        isDeleted: false,
        isBlocked: false
      });
    }

    // 2. Find or create Category
    let category = await Category.findOne({ isActive: true });
    if (!category) {
      category = await Category.create({
        name: 'Beauty Parlour',
        image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500',
        description: 'Beauty & Wellness Salon Services',
        isActive: true
      });
    }

    // 3. Find or create Vendor shop
    let vendor = await Vendor.findOne({ ownerId: user._id, isDeleted: false });
    if (!vendor) {
      console.log('Creating vendor shop document...');
      vendor = await Vendor.create({
        shopName: 'Beauty Parlour',
        ownerName: user.name || 'Beauty Parlour Partner',
        ownerId: user._id,
        category: category._id,
        location: {
          type: 'Point',
          coordinates: [77.4126, 23.2599] // Bhopal coordinates
        },
        address: 'Zone 2, MP Nagar, Bhopal, Madhya Pradesh 462011',
        serviceMode: 'shop',
        workingHours: {
          start: '09:00 AM',
          end: '09:00 PM'
        },
        weeklyOff: [],
        rating: 4.9,
        totalReviews: 38,
        walletBalance: 2500,
        status: 'approved',
        isActive: true,
        isDeleted: false,
        isProfileComplete: true,
        isShopOpen: true,
        shopImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000',
        featuredImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000',
        galleryImages: [
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000',
          'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1000',
          'https://images.unsplash.com/photo-1522337660859-02bcefce17c0?w=1000'
        ]
      });
    } else {
      console.log(`Updating existing vendor shop ${vendor.shopName}...`);
      vendor.status = 'approved';
      vendor.isActive = true;
      vendor.isDeleted = false;
      vendor.isProfileComplete = true;
      vendor.isShopOpen = true;
      if (!vendor.shopImage) vendor.shopImage = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000';
      if (!vendor.featuredImage) vendor.featuredImage = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000';
      await vendor.save();
    }

    // Set user's active vendor
    user.lastActiveVendorId = vendor._id;
    await user.save();

    // 4. Create Services if none exist
    let services = await Service.find({ vendorId: vendor._id, isActive: true });
    if (services.length === 0) {
      console.log('Creating default services for vendor...');
      const serviceList = [
        { name: 'Hair Cut & Style', price: 299, duration: 30, category: 'Hair Care', description: 'Expert haircut with blow dry and styling' },
        { name: 'Glow Facial Treatment', price: 799, duration: 45, category: 'Skin Care', description: 'Rejuvenating facial for glowing skin' },
        { name: 'Hair Spa & Scalp Care', price: 599, duration: 45, category: 'Hair Care', description: 'Deep conditioning spa with relaxing scalp massage' },
        { name: 'Manicure & Pedicure Combo', price: 499, duration: 45, category: 'Nail Care', description: 'Complete hand and feet grooming' },
        { name: 'Party Makeup Express', price: 1299, duration: 60, category: 'Makeup', description: 'Flawless party look with eye styling' }
      ];

      for (const item of serviceList) {
        await Service.create({
          ...item,
          vendorId: vendor._id,
          isActive: true
        });
      }
      services = await Service.find({ vendorId: vendor._id, isActive: true });
    }

    const serviceIds = services.map(s => s._id);

    // 5. Create Staff Profiles (Owner staff + team staff)
    let ownerStaff = await Staff.findOne({ vendorId: vendor._id, isOwner: true });
    if (!ownerStaff) {
      console.log('Creating owner staff profile...');
      ownerStaff = await Staff.create({
        vendorId: vendor._id,
        userId: user._id,
        name: user.name || 'Owner',
        phone: PERMANENT_PHONE,
        role: 'Owner',
        designation: 'Owner / Specialist',
        isOwner: true,
        isActive: true,
        isDeleted: false,
        services: serviceIds,
        otp: PERMANENT_OTP,
        otpExpires: otpExpiry
      });
    } else {
      ownerStaff.isActive = true;
      ownerStaff.isDeleted = false;
      ownerStaff.services = serviceIds;
      ownerStaff.otp = PERMANENT_OTP;
      ownerStaff.otpExpires = otpExpiry;
      await ownerStaff.save();
    }

    // Add 1-2 team staff if no other staff exist
    const teamStaffCount = await Staff.countDocuments({ vendorId: vendor._id, isOwner: false, isDeleted: false });
    if (teamStaffCount === 0) {
      console.log('Adding team staff members...');
      await Staff.create({
        vendorId: vendor._id,
        name: 'Priya Sharma',
        phone: '9876543210',
        designation: 'Senior Stylist',
        role: 'staff',
        isActive: true,
        isDeleted: false,
        services: serviceIds,
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300'
      });
      await Staff.create({
        vendorId: vendor._id,
        name: 'Ananya Verma',
        phone: '9876543211',
        designation: 'Skin & Spa Expert',
        role: 'staff',
        isActive: true,
        isDeleted: false,
        services: serviceIds,
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'
      });
    }

    console.log('\n========================================');
    console.log('🎉 Partner Seed Completed Successfully!');
    console.log(`📱 Phone: ${PERMANENT_PHONE}`);
    console.log(`🔑 OTP  : ${PERMANENT_OTP}`);
    console.log(`🏪 Shop : ${vendor.shopName} (ID: ${vendor._id})`);
    console.log(`👤 Owner: ${user.name} (Role: ${user.role})`);
    console.log(`✂️  Services: ${services.length} items`);
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding partner:', error);
    process.exit(1);
  }
}

seedPartner();
