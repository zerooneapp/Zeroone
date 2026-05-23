const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://zerooneappinfo_db_user:8xR09oSOETAW3pZh@ac-pitmbpp-shard-00-00.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-01.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-02.djq3ivp.mongodb.net:27017/ZeroOne?ssl=true&replicaSet=atlas-mvko1y-shard-0&authSource=admin&retryWrites=true&w=majority";

async function syncAllRatings() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const Review = mongoose.model('Review', new mongoose.Schema({
            vendorId: mongoose.Schema.Types.ObjectId,
            rating: Number,
            status: String
        }));

        const Vendor = mongoose.model('Vendor', new mongoose.Schema({
            rating: Number,
            totalReviews: Number
        }));

        const vendors = await Vendor.find({});
        console.log(`Processing ${vendors.length} vendors...`);

        for (const vendor of vendors) {
            const stats = await Review.aggregate([
                {
                    $match: {
                        vendorId: vendor._id,
                        $or: [
                            { status: 'approved' },
                            { status: 'pending' },
                            { status: { $exists: false } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: '$vendorId',
                        totalReviews: { $sum: 1 },
                        avgRating: { $avg: '$rating' }
                    }
                }
            ]);

            const reviewStats = stats[0] || { totalReviews: 0, avgRating: 0 };
            
            await Vendor.findByIdAndUpdate(vendor._id, {
                totalReviews: reviewStats.totalReviews,
                rating: Number((reviewStats.avgRating || 0).toFixed(1))
            });
            
            console.log(`Updated Vendor ${vendor._id}: Rating=${reviewStats.avgRating.toFixed(1)}, Total=${reviewStats.totalReviews}`);
        }

        console.log("Sync complete!");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

syncAllRatings();
