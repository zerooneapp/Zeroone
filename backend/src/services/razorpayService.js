const https = require('https');
const crypto = require('crypto');

const getRazorpayConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  return {
    keyId,
    keySecret,
    enabled: Boolean(keyId && keySecret)
  };
};

const createRazorpayOrder = ({ amount, receipt, notes = {} }) => {
  const { keyId, keySecret, enabled } = getRazorpayConfig();

  if (!enabled) {
    throw new Error('Razorpay is not configured');
  }

  const payload = JSON.stringify({
    amount: Math.round(Number(amount) * 100),
    currency: 'INR',
    receipt,
    notes
  });

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.razorpay.com',
      path: '/v1/orders',
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          if (res.statusCode >= 400) {
            return reject(new Error(parsed?.error?.description || 'Failed to create Razorpay order'));
          }
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const { keySecret, enabled } = getRazorpayConfig();
  if (!enabled) {
    throw new Error('Razorpay is not configured');
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
};

module.exports = {
  getRazorpayConfig,
  createRazorpayOrder,
  verifyRazorpaySignature
};
