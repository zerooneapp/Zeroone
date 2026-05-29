const mongoose = require('mongoose');
require('dotenv').config();

const checkPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const PromotionPlan = require('../src/models/PromotionPlan');
    const plans = await PromotionPlan.find({}).lean();
    console.log(`Total Promotion Plans: ${plans.length}`);
    plans.forEach((p, idx) => {
      console.log(`[${idx}] ID: ${p._id} | name: ${p.name} | amount: ${p.amount} | durationDays: ${p.durationDays}`);
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkPlans();
