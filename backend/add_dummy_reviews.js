const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://zerooneappinfo_db_user:8xR09oSOETAW3pZh@ac-pitmbpp-shard-00-00.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-01.djq3ivp.mongodb.net:27017,ac-pitmbpp-shard-00-02.djq3ivp.mongodb.net:27017/ZeroOne?ssl=true&replicaSet=atlas-mvko1y-shard-0&authSource=admin&retryWrites=true&w=majority";
const vendorId = "69fc6f742949567b568d98a2"; // SHREE BEAUTY SALON

async function addDummyReviews() {
    try {
        await mongoose.connect(MONGODB_URI);
        
        const Review = mongoose.model('Review', new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            vendorId: mongoose.Schema.Types.ObjectId,
            bookingId: mongoose.Schema.Types.ObjectId,
            rating: Number,
            comment: String,
            status: String,
            createdAt: { type: Date, default: Date.now }
        }));

        const Vendor = mongoose.model('Vendor', new mongoose.Schema({
            rating: Number,
            totalReviews: Number
        }));

        // Fetch a user to associate the reviews with
        const User = mongoose.model('User', new mongoose.Schema({ name: String }));
        const user = await User.findOne({ role: 'customer' });
        const userId = user ? user._id : new mongoose.Types.ObjectId();

        console.log("Adding 3 dummy reviews for SHREE BEAUTY SALON...");

        const reviewsData = [
            { userId, vendorId: new mongoose.Types.ObjectId(vendorId), rating: 5, comment: "Amazing service! Very professional staff.", status: "approved" },
            { userId, vendorId: new mongoose.Types.ObjectId(vendorId), rating: 4, comment: "Good experience, will visit again.", status: "pending" },
            { userId, vendorId: new mongoose.Types.ObjectId(vendorId), rating: 5, comment: "Best salon in the area!", status: "approved" }
        ];

        await Review.insertMany(reviewsData);

        // Recalculate Vendor Rating
        const stats = await Review.aggregate([
            { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: "$vendorId", count: { $sum: 1 }, avg: { $avg: "$rating" } } }
        ]);

        const reviewStats = stats[0];
        await Vendor.findByIdAndUpdate(vendorId, {
            rating: Number(reviewStats.avg.toFixed(1)),
            totalReviews: reviewStats.count
        });

        console.log(`Successfully added 3 reviews. New Rating: ${reviewStats.avg.toFixed(1)}, Total: ${reviewStats.count}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

addDummyReviews();
