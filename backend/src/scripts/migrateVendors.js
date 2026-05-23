const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Vendor = require('../models/Vendor');
const User = require('../models/User');

const migrateVendors = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zerone');
    console.log('Connected successfully.\n');

    console.log('--- Starting Vendor Data Migration ---\n');

    const vendors = await Vendor.find({
      $or: [
        { ownerName: { $exists: false } },
        { ownerName: null },
        { ownerName: '' },
        { serviceLevel: 'basic' }
      ]
    });

    console.log(`Found ${vendors.length} vendors needing migration.`);

    let fixedCount = 0;

    for (const vendor of vendors) {
      console.log(`Processing Vendor: ${vendor.shopName} (${vendor._id})`);
      
      let changed = false;

      // 1. Fix serviceLevel 'basic' -> 'standard'
      if (vendor.serviceLevel === 'basic') {
        console.log('  - Updating serviceLevel: basic -> standard');
        vendor.serviceLevel = 'standard';
        changed = true;
      }

      // 2. Fix missing ownerName
      if (!vendor.ownerName) {
        const user = await User.findById(vendor.ownerId);
        const newName = user?.name || 'Unknown Owner';
        console.log(`  - Updating missing ownerName: -> ${newName}`);
        vendor.ownerName = newName;
        changed = true;
      }

      if (changed) {
        // Use validateBeforeSave: false if there are other strict validations 
        // but it's better to keep it true to ensure we fix everything.
        // If save fails here, we'll see why.
        try {
          await vendor.save();
          fixedCount++;
          console.log('  ✅ Successfully updated.');
        } catch (saveError) {
          console.error(`  ❌ Failed to save vendor ${vendor._id}:`, saveError.message);
        }
      }
      console.log('-----------------------------------');
    }

    console.log(`\nMigration Summary:`);
    console.log(`Total processed: ${vendors.length}`);
    console.log(`Successfully fixed: ${fixedCount}`);

    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Migration Error:', error);
    process.exit(1);
  }
};

migrateVendors();
