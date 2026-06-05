const mongoose = require('mongoose');
const GlobalSettings = require('./src/models/GlobalSettings');
require('dotenv').config();

async function testPatch() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zeroone');
    try {
        let updateData = { features: { membershipActive: false, subscriptionActive: true } };
        const settings = await GlobalSettings.findOneAndUpdate(
            {}, 
            { $set: updateData }, 
            { new: true, upsert: true }
        );
        console.log("After update:", settings);
    } catch(err) {
        console.error("Error:", err);
    }
    process.exit(0);
}
testPatch();
