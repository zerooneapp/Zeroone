const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('./src/models/Vendor');

async function fixImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to fix vendor images');

    const defaultImages = [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000',
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1000',
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1000'
    ];

    const vendors = await Vendor.find({ $or: [{ shopImage: null }, { shopImage: '' }] });
    console.log(`Found ${vendors.length} vendors with missing images.`);

    for (let i=0; i < vendors.length; i++) {
        const v = vendors[i];
        v.shopImage = defaultImages[i % defaultImages.length];
        await v.save();
        console.log(`Updated: ${v.shopName}`);
    }

    console.log('✅ Image Fix Complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Root error:', err);
    process.exit(1);
  }
}

fixImages();
