const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('./src/models/Vendor');
const Service = require('./src/models/Service');
const Category = require('./src/models/Category');

async function seed() {
  try {
    console.log('Connecting to:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find any active vendor or created one
    let v = await Vendor.findOne();
    if (!v) {
        console.log('No vendor found. Creating a test one...');
        // Create a temporary category if none exists
        let cat = await Category.findOne();
        if (!cat) {
            cat = await Category.create({ name: 'Salon', image: 'https://via.placeholder.com/100' });
        }
        
        v = await Vendor.create({
            shopName: 'ZerOne Test Salon',
            ownerId: new mongoose.Types.ObjectId(), // Orphan owner
            category: cat._id,
            location: { type: 'Point', coordinates: [77.4126, 23.2599] },
            address: 'MP Nagar, Bhopal',
            status: 'approved'
        });
    }

    const catId = v.category;
    console.log('Seeding data for:', v.shopName, 'ID:', v._id);

    // Update Vendor details for Bhopal Mockup
    v.galleryImages = [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000',
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1000',
      'https://images.unsplash.com/photo-1522337660859-02bcefce17c0?w=1000',
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1000'
    ];
    v.shopVideo = 'https://res.cloudinary.com/dgzkrahwp/video/upload/v1743621506/zerone/vendors/demo.mp4';
    v.workingHours = { start: '09:00 AM', end: '10:00 PM' };
    v.serviceLevel = 'premium';
    v.rating = 4.8;
    v.totalReviews = 450;
    
    await v.save();

    // Add Services
    console.log('Cleaning old services...');
    await Service.deleteMany({ vendorId: v._id });
    
    const services = [
      { name: 'Classic Haircut', price: 150, duration: 30 },
      { name: 'Beard Grooming Pro', price: 120, duration: 30 },
      { name: 'Royal Facial Spa', price: 850, duration: 60 },
      { name: 'Hair Color (Global)', price: 1200, duration: 90 },
      { name: 'Head Massage (Oil)', price: 200, duration: 30 }
    ];

    for (const s of services) {
      await Service.create({
        ...s,
        vendorId: v._id,
        category: catId,
        isActive: true
      });
    }

    console.log('✅ Seeding complete successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
