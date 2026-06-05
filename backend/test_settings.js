const mongoose = require('mongoose');
const GlobalSettings = require('./src/models/GlobalSettings');
require('dotenv').config();

async function test() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zeroone');
    try {
        let settings = await GlobalSettings.findOne();
        if (!settings) {
            console.log("Creating new settings...");
            settings = await GlobalSettings.create({});
            console.log("Created:", settings);
        } else {
            console.log("Found:", settings);
        }
    } catch(err) {
        console.error("Error:", err);
    }
    process.exit(0);
}
test();
