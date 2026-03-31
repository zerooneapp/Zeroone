const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('./src/models/Vendor');
const Service = require('./src/models/Service');

async function debugImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to fix vendor images');

    const imageMap = {
      'ZerOne Test Salon': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200',
      'GlowUp Mens Salon': 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200',
      'Indigo Grooming House': 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200',
      'The Royal Spa & Lounge': 'https://images.unsplash.com/photo-1544161515-4ae6ce6eef31?w=1200',
      'Glitter & Glo Studio': 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=1200',
      'Elegant Beauty Boutique': 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1200'
    };

    const vendors = await Vendor.find();
    for (const v of vendors) {
       v.shopImage = imageMap[v.shopName] || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200';
       await v.save();
       console.log(`Updated: ${v.shopName}`);

       // Update services with random service related images
       await Service.updateMany({ vendorId: v._id }, { 
         image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400' 
       });
    }

    console.log('✅ Image Fix Complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Root error:', err);
    process.exit(1);
  }
}

debugImages();
