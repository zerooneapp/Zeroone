const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://zerooneappinfo_db_user:8xR09oSOETAW3pZh@ac-pitmbpp-shard-00-00.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-01.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-02.djq3ivp.mongodb.net:27017/ZeroOne?ssl=true&replicaSet=atlas-mvko1y-shard-0&authSource=admin&retryWrites=true&w=majority";
const vendorId = "69fc6f742949567b568d98a2";

async function checkReviews() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const Review = mongoose.model('Review', new mongoose.Schema({
            vendorId: mongoose.Schema.Types.ObjectId,
            rating: Number,
            status: String,
            comment: String
        }));

        const reviews = await Review.find({ vendorId: new mongoose.Types.ObjectId(vendorId) });
        
        console.log(`Found ${reviews.length} reviews for vendor ${vendorId} (SHREE BEAUTY SALON):`);
        reviews.forEach(r => {
            console.log(`- Rating: ${r.rating}, Status: ${r.status || 'N/A'}, Comment: ${r.comment}`);
        });

        if (reviews.length > 0) {
            const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            console.log(`Real Average Rating: ${avg.toFixed(1)}`);
        } else {
            console.log("No reviews found in the database for this vendor.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkReviews();
