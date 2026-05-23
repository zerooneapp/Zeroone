const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('./src/models/Vendor');
const Service = require('./src/models/Service');
const Category = require('./src/models/Category');

async function seedProfessional() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Seeding Professional Makeup & Beauty Parlour');

    let makeupCat = await Category.findOne({ name: /Makeup/i });
    if (!makeupCat) {
      makeupCat = await Category.create({ name: 'Makeup Artist', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400' });
    }

    let beautyCat = await Category.findOne({ name: /Beauty/i });
    if (!beautyCat) {
      beautyCat = await Category.create({ name: 'Beauty Parlour', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400' });
    }

    const vendors = [
      {
        shopName: 'Glitter & Glo Studio',
        address: 'Hoshangabad Road, Bhopal',
        coordinates: [77.4526, 23.1899],
        category: makeupCat._id,
        rating: 4.8,
        reviews: 95,
        image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800',
        services: [
          { name: 'Bridal HD Makeup', price: 15000, duration: 180 },
          { name: 'Engagement Makeup', price: 5500, duration: 120 },
          { name: 'Party Makeup', price: 2500, duration: 60 }
        ]
      },
      {
        shopName: 'Elegant Beauty Boutique',
        address: 'Gulmohar, Bhopal',
        coordinates: [77.4350, 23.2100],
        category: beautyCat._id,
        rating: 4.6,
        reviews: 140,
        image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800',
        services: [
          { name: 'Full Body Waxing', price: 1200, duration: 90 },
          { name: 'Threading & Forehead', price: 80, duration: 15 },
          { name: 'VLCC Gold Facial', price: 1800, duration: 60 },
          { name: 'Hair Cut & Styling', price: 650, duration: 45 }
        ]
      }
    ];

    for (const vd of vendors) {
        console.log('Seeding:', vd.shopName);
        let vendor = await Vendor.findOne({ shopName: vd.shopName });
        if (!vendor) {
            vendor = await Vendor.create({
                shopName: vd.shopName,
                ownerId: new mongoose.Types.ObjectId(),
                category: vd.category,
                location: { type: 'Point', coordinates: vd.coordinates },
                address: vd.address,
                shopImage: vd.image,
                serviceLevel: 'premium',
                rating: vd.rating,
                totalReviews: vd.reviews,
                status: 'active',
                isProfileComplete: true
            });
        }
        await Service.deleteMany({ vendorId: vendor._id });
        for(const s of vd.services) {
            await Service.create({ ...s, vendorId: vendor._id, category: vd.category, isActive: true });
        }
    }

    console.log('✅ Makeup & Beauty Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Root error:', err);
    process.exit(1);
  }
}

seedProfessional();
