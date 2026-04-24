const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Staff = require('../models/Staff');
const Vendor = require('../models/Vendor');

const checkDuplicates = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zerone');
    console.log('Connected successfully.\n');

    console.log('--- Checking for Staff with duplicate phone numbers ---\n');

    const duplicates = await Staff.aggregate([
      {
        $group: {
          _id: '$phone',
          count: { $sum: 1 },
          staffMembers: { $push: { id: '$_id', name: '$name', vendorId: '$vendorId' } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate phone numbers found in the Staff collection.');
    } else {
      console.log(`❌ Found ${duplicates.length} phone numbers used by multiple staff accounts:\n`);

      for (const group of duplicates) {
        console.log(`Phone: ${group._id} (Used ${group.count} times)`);
        for (const s of group.staffMembers) {
          const vendor = await Vendor.findById(s.vendorId).select('shopName');
          console.log(`  - Staff: ${s.name} (ID: ${s.id}) | Vendor: ${vendor?.shopName || 'Unknown'} (ID: ${s.vendorId})`);
        }
        console.log('-----------------------------------');
      }
      
      console.log('\nPotential Bug Impact: When logging in with any of these numbers,');
      console.log('the system will always open the FIRST staff member it finds in the database,');
      console.log('ignoring the others.');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error running check:', error);
    process.exit(1);
  }
};

checkDuplicates();
