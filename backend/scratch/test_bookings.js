require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const moment = require('moment-timezone');

async function test() {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("DB Connected.");

    const page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const matchLine = {};
    console.log("Running optimized pipeline...");
    let total;
    const search = 'test'; // Simulation query parameter

    if (search) {
      const countPipeline = [
        { $match: matchLine },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $or: [
              { 'user.name': { $regex: search, $options: 'i' } },
              { 'vendor.shopName': { $regex: search, $options: 'i' } },
              { bookingId: { $regex: search, $options: 'i' } }
            ]
          }
        },
        { $count: "total" }
      ];
      const countResult = await Booking.aggregate(countPipeline).allowDiskUse(true);
      total = countResult[0]?.total || 0;
    } else {
      total = await Booking.countDocuments(matchLine);
    }

    const dataPipeline = [
      { $match: matchLine }
    ];

    if (!search) {
      dataPipeline.push({ $sort: { createdAt: -1, startTime: -1 } });
    }

    dataPipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } }
    );

    if (search) {
      dataPipeline.push(
        {
          $match: {
            $or: [
              { 'user.name': { $regex: search, $options: 'i' } },
              { 'vendor.shopName': { $regex: search, $options: 'i' } },
              { bookingId: { $regex: search, $options: 'i' } }
            ]
          }
        },
        { $sort: { createdAt: -1, startTime: -1 } }
      );
    }

    dataPipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const bookings = await Booking.aggregate(dataPipeline).allowDiskUse(true);

    console.log("Total:", total);
    console.log("Bookings Count:", bookings.length);

  } catch (err) {
    console.error("ERROR DETECTED:", err);
  } finally {
    await mongoose.disconnect();
    console.log("DB Disconnected.");
  }
}

test();
