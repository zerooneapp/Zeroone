const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('./src/models/Vendor');
const Service = require('./src/models/Service');
const Category = require('./src/models/Category');

async function seedFull() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for Full Seeding');

    const cat = await Category.findOne() || await Category.create({ name: 'Salon', image: 'https://via.placeholder.com/100' });
    const spaCat = await Category.findOne({ name: /Spa/i }) || await Category.create({ name: 'Spa', image: 'https://via.placeholder.com/100' });

    const vendorsToSeed = [
      {
        shopName: 'GlowUp Mens Salon',
        address: 'Arera Colony, Bhopal',
        coordinates: [77.4332, 23.2163],
        rating: 4.9,
        reviews: 120,
        image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
        gallery: [
          'https://images.unsplash.com/photo-1593526613712-7b1b9875105d?w=800',
          'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800'
        ],
        level: 'premium',
        services: [
          { name: 'Classic Beard Trim', price: 99, duration: 30 },
          { name: 'O2 Oxy Facial', price: 750, duration: 60 },
          { name: 'Charcoal Mask', price: 200, duration: 15 }
        ]
      },
      {
        shopName: 'Indigo Grooming House',
        address: 'Indrapuri, Bhopal',
        coordinates: [77.4612, 23.2355],
        rating: 4.5,
        reviews: 210,
        image: 'https://images.unsplash.com/photo-1562322102-308a41ca4fa1?w=800',
        gallery: [
          'https://images.unsplash.com/photo-1621605815841-aa89727402dc?w=800',
          'https://images.unsplash.com/photo-1622288090986-1230509934bb?w=800'
        ],
        level: 'standard',
        services: [
          { name: 'Student Haircut', price: 80, duration: 15 },
          { name: 'Deep Conditioning', price: 350, duration: 45 },
          { name: 'Hair Wash', price: 50, duration: 15 }
        ]
      },
      {
        shopName: 'The Royal Spa & Lounge',
        address: 'Bittan Market, Bhopal',
        coordinates: [77.4300, 23.2050],
        rating: 5.0,
        reviews: 85,
        image: 'https://images.unsplash.com/photo-1544161515-4ae6ce6eef31?w=800',
        gallery: [
          'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800',
          'https://images.unsplash.com/photo-1631730359585-38a4935ccbb2?w=800'
        ],
        level: 'premium',
        services: [
          { name: 'Swedish Massage', price: 1500, duration: 60 },
          { name: 'Aroma Therapy', price: 1800, duration: 90 },
          { name: 'Hot Stone Spa', price: 2500, duration: 120 }
        ]
      }
    ];

    for (const vd of vendorsToSeed) {
        console.log('Seeding:', vd.shopName);
        let vendor = await Vendor.findOne({ shopName: vd.shopName });
        if (!vendor) {
            vendor = await Vendor.create({
                shopName: vd.shopName,
                ownerId: new mongoose.Types.ObjectId(),
                category: vd.shopName.includes('Spa') ? spaCat._id : cat._id,
                location: { type: 'Point', coordinates: vd.coordinates },
                address: vd.address,
                shopImage: vd.image,
                galleryImages: vd.gallery,
                serviceLevel: vd.level,
                rating: vd.rating,
                totalReviews: vd.reviews,
                status: 'active',
                isProfileComplete: true
            });
        }

        // Services
        await Service.deleteMany({ vendorId: vendor._id });
        for(const s of vd.services) {
            await Service.create({
                ...s,
                vendorId: vendor._id,
                category: vendor.category,
                isActive: true
            });
        }
    }

    console.log('✅ Full Home Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Root error:', err);
    process.exit(1);
  }
}

seedFull();
