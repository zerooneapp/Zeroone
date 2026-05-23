const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/src/models/User');
const Vendor = require('../backend/src/models/Vendor');

async function checkNumber() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const phone = '6261640704';
        
        const user = await User.findOne({ phone });
        const vendor = await Vendor.findOne({ phone }); // Some models might store phone in Vendor too
        const vendorByOwner = user ? await Vendor.findOne({ ownerId: user._id }) : null;

        console.log('--- Analysis for 6261640704 ---');
        if (user) {
            console.log('User Found:');
            console.log('ID:', user._id);
            console.log('Role:', user.role);
            console.log('Name:', user.name);
        } else {
            console.log('No User found with this phone number.');
        }

        if (vendor) {
            console.log('Vendor Found (by direct phone):');
            console.log('Shop Name:', vendor.shopName);
            console.log('Status:', vendor.status);
        }

        if (vendorByOwner) {
            console.log('Vendor Found (associated with this User ID):');
            console.log('Shop Name:', vendorByOwner.shopName);
            console.log('Status:', vendorByOwner.status);
        }

        if (!user && !vendor && !vendorByOwner) {
            console.log('This number is not registered in the system.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkNumber();
