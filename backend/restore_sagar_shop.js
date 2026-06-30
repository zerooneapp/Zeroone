const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Vendor = require('./src/models/Vendor');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected...');

    // Shop #4 is the one we want to change back to Sagar
    const shopId = '6a420975e64beaae58259354';
    const vendor = await Vendor.findById(shopId);

    if (vendor) {
      vendor.shopName = 'Sagar Beauty Parlour';
      vendor.ownerName = 'Sagar';
      await vendor.save();
      console.log('✅ Successfully restored Shop #4 to "Sagar Beauty Parlour" with owner "Sagar".');
    } else {
      console.log('❌ Shop not found');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();
