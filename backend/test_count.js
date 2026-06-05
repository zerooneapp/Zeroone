const mongoose = require('mongoose');
const GlobalSettings = require('./src/models/GlobalSettings');
require('dotenv').config();

async function testCount() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zeroone');
    try {
        const count = await GlobalSettings.countDocuments();
        const all = await GlobalSettings.find({});
        console.log("Count:", count);
        all.forEach(doc => console.log(doc._id, doc.features));
    } catch(err) {
        console.error("Error:", err);
    }
    process.exit(0);
}
testCount();
