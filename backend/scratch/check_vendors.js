const mongoose = require('mongoose');
require('dotenv').config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database:', mongoose.connection.name);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    const vendorsCount = await mongoose.connection.db.collection('vendors').countDocuments();
    console.log('Total documents in vendors collection:', vendorsCount);

    const sample = await mongoose.connection.db.collection('vendors').find().limit(5).toArray();
    console.log('Sample vendors:', JSON.stringify(sample, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
