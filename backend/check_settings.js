const mongoose = require('mongoose');
const GlobalSettings = require('./src/models/GlobalSettings');
require('dotenv').config();

async function checkSettings() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zeroone');
    const settings = await GlobalSettings.findOne({});
    console.log(JSON.stringify(settings, null, 2));
    process.exit(0);
}
checkSettings();
