const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Vendor = require('./src/models/Vendor');
const { getVendorSubscriptionState } = require('./src/services/walletService');

async function checkVendorStatus(phone) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to Database');

    const user = await User.findOne({ phone });
    if (!user) {
      console.log('No user found with phone:', phone);
      return;
    }

    const vendor = await Vendor.findOne({ ownerId: user._id });
    if (!vendor) {
      console.log('No vendor profile found for this user.');
      return;
    }

    const subState = await getVendorSubscriptionState(vendor);

    console.log('\n--- VENDOR STATUS REPORT ---');
    console.log('Shop Name:', vendor.shopName);
    console.log('Current Status:', vendor.status);
    console.log('Wallet Balance:', vendor.walletBalance);
    console.log('Plan Type:', vendor.planType);
    console.log('Service Level:', vendor.serviceLevel);
    console.log('----------------------------');
    console.log('Is Plan Active:', subState.isActive ? 'YES ✅' : 'NO ❌');
    console.log('Current Effective Plan:', subState.currentPlan);
    console.log('Reason for Status:', subState.isTrialActive ? 'Trial Active' : 
                                    subState.isMonthlyActive ? 'Monthly Active' :
                                    subState.isDailyActive ? 'Daily Active (Sufficient Balance)' : 
                                    'Inactive (Insufficient Balance/Expired)');
    
    if (vendor.planType === 'monthly') {
      console.log('Monthly Expiry:', vendor.expiryDate);
    } else if (vendor.planType === 'trial') {
      console.log('Trial Expiry:', vendor.freeTrial?.expiryDate);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkVendorStatus('1234567890');
