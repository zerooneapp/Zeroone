const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://zerooneappinfo_db_user:8xR09oSOETAW3pZh@ac-pitmbpp-shard-00-00.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-01.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-02.djq3ivp.mongodb.net:27017/ZeroOne?ssl=true&replicaSet=atlas-mvko1y-shard-0&authSource=admin&retryWrites=true&w=majority";

async function findMismatchedRatings() {
    try {
        await mongoose.connect(MONGODB_URI);
        const Review = mongoose.model('Review', new mongoose.Schema({ vendorId: mongoose.Schema.Types.ObjectId, rating: Number }));
        const Vendor = mongoose.model('Vendor', new mongoose.Schema({ rating: Number, totalReviews: Number, shopName: String }));

        const reviews = await Review.aggregate([
            { $group: { _id: "$vendorId", count: { $sum: 1 }, avg: { $avg: "$rating" } } }
        ]);

        console.log("Checking for mismatches...");
        for (const r of reviews) {
            const vendor = await Vendor.findById(r._id);
            if (vendor) {
                if (vendor.rating !== Number(r.avg.toFixed(1)) || vendor.totalReviews !== r.count) {
                    console.log(`MISMATCH found for ${vendor.shopName} (${vendor._id}):`);
                    console.log(`- DB Reviews: Count=${r.count}, Avg=${r.avg.toFixed(1)}`);
                    console.log(`- Vendor Doc: Count=${vendor.totalReviews}, Avg=${vendor.rating}`);
                    
                    // Update them now
                    await Vendor.findByIdAndUpdate(vendor._id, {
                        rating: Number(r.avg.toFixed(1)),
                        totalReviews: r.count
                    });
                    console.log("-> FIXED in Vendor document.");
                }
            }
        }
        console.log("Check complete.");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

findMismatchedRatings();
