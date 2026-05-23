const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const VendorMembershipPlan = require('../src/models/VendorMembershipPlan');
const Vendor = require('../src/models/Vendor');

async function checkPlans() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found in .env');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        
        const plans = await VendorMembershipPlan.find().populate('vendorId', 'shopName');

        console.log('--- Current Membership Plans in DB ---');
        if (plans.length > 0) {
            plans.forEach(plan => {
                console.log(`Plan: ${plan.name} | Vendor: ${plan.vendorId?.shopName || 'Unknown'} | Price: ${plan.price}`);
            });
        } else {
            console.log('No membership plans found in the database.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkPlans();
