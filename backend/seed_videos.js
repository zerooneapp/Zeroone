const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Vendor = require('./src/models/Vendor');

const salonVideo = "https://player.vimeo.com/external/371433846.sd.mp4?s=236da13eef15007519a2c3c2bc166beae7779943&profile_id=165&oauth2_token_id=57447761"; // Salon promo
const spaVideo = "https://player.vimeo.com/external/448883204.sd.mp4?s=bc468087948332145e12ec686a6af327598cf4ee&profile_id=165&oauth2_token_id=57447761"; // Spa/Massage
const makeupVideo = "https://player.vimeo.com/external/494252666.sd.mp4?s=bcb1866347c20c4c47bb9207908b98b7a69b2d9a&profile_id=165&oauth2_token_id=57447761"; // Beauty/Makeup

const seedVideos = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const vendors = await Vendor.find();
    console.log(`Updating ${vendors.length} vendors with promo videos...`);

    for (const vendor of vendors) {
      let videoUrl = salonVideo;
      
      const name = vendor.shopName.toLowerCase();
      if (name.includes('spa') || name.includes('massage')) {
        videoUrl = spaVideo;
      } else if (name.includes('makeup') || name.includes('boutique') || name.includes('beauty')) {
        videoUrl = makeupVideo;
      }

      await Vendor.findByIdAndUpdate(vendor._id, { shopVideo: videoUrl });
    }

    console.log('Successfully seeded promo videos for all vendors!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding videos:', err);
    process.exit(1);
  }
};

seedVideos();
