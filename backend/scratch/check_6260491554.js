const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');

async function checkNumber() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found in .env');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const phone = '6260491554';
        
        const user = await User.findOne({ phone });
        const vendor = await Vendor.findOne({ phone });
        const vendorByOwner = user ? await Vendor.findOne({ ownerId: user._id }) : null;

        console.log('--- Analysis for 6260491554 ---');
        if (user) {
            console.log('User Found:');
            console.log('ID:', user._id);
            console.log('Role:', user.role);
            console.log('Name:', user.name || 'N/A');
        } else {
            console.log('No User found with this phone number.');
        }

        if (vendorByOwner) {
            console.log('Partner (Vendor) Found:');
            console.log('Shop Name:', vendorByOwner.shopName);
            console.log('Status:', vendorByOwner.status);
            console.log('Profile Complete:', vendorByOwner.isProfileComplete);
        } else {
            console.log('No Partner (Vendor) found for this user.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkNumber();
