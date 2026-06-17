const mongoose = require('mongoose');
const { getVendorInsights } = require('../src/controllers/adminController');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zeroone');
  
  const req = {
    params: { id: '6a3275ddc52470a407c98e6c' },
    query: { from: '2026-06-01', to: '2026-06-17' }
  };

  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log('Status Code:', this.statusCode);
      console.log('Response Data:', JSON.stringify(data, null, 2));
    }
  };

  await getVendorInsights(req, res);
  await mongoose.disconnect();
}

run().catch(console.error);
