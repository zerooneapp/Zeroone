const express = require('express');
const {
  handleRazorpayWebhook,
  handleCashfreeWebhook
} = require('../controllers/paymentWebhookController');

const router = express.Router();

router.post('/webhook/razorpay', handleRazorpayWebhook);
router.post('/webhook/cashfree', handleCashfreeWebhook);

module.exports = router;