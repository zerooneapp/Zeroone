const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://zerooneappinfo_db_user:8xR09oSOETAW3pZh@ac-pitmbpp-shard-00-00.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-01.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-02.djq3ivp.mongodb.net:27017/ZeroOne?ssl=true&replicaSet=atlas-mvko1y-shard-0&authSource=admin&retryWrites=true&w=majority";

async function analyzeAllReviews() {
    try {
        await mongoose.connect(MONGODB_URI);
        const Review = mongoose.model('Review', new mongoose.Schema({
            vendorId: mongoose.Schema.Types.ObjectId,
            rating: Number,
            status: String
        }));

        const stats = await Review.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    avgRating: { $avg: "$rating" }
                }
            }
        ]);

        console.log("Global Review Statistics:");
        stats.forEach(s => {
            console.log(`- Status: ${s._id || 'N/A'}, Count: ${s.count}, Avg Rating: ${s.avgRating.toFixed(2)}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

analyzeAllReviews();
