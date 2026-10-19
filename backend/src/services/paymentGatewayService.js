const crypto = require('crypto');
const { getBillingSettings } = require('./walletService');
const {
  getRazorpayConfig,
  createRazorpayOrder,
  verifyRazorpaySignature
} = require('./razorpayService');
const {
  getCashfreeConfig,
  createCashfreeOrder,
  verifyCashfreePayment,
  verifyCashfreeWebhookSignature
} = require('./cashfreeService');

const SUPPORTED_GATEWAYS = new Set(['razorpay', 'cashfree']);

const getPaymentGatewaySettings = async () => {
  const settings = await getBillingSettings();
  const active = SUPPORTED_GATEWAYS.has(settings?.paymentGateway?.active)
    ? settings.paymentGateway.active
    : 'razorpay';
  const razorpay = getRazorpayConfig();
  const cashfree = getCashfreeConfig();

  return {
    active,
    razorpay: {
      enabled: razorpay.enabled,
      keyId: razorpay.keyId || ''
    },
    cashfree: {
      enabled: cashfree.enabled,
      mode: cashfree.environment
    }
  };
};

const getActiveGateway = async () => {
  const settings = await getPaymentGatewaySettings();
  const config = settings[settings.active];
  if (!config?.enabled) {
    throw new Error(`${settings.active === 'cashfree' ? 'Cashfree' : 'Razorpay'} is not configured`);
  }
  return settings.active;
};

const createGatewayOrder = async ({
  gateway,
  amount,
  receipt,
  notes = {},
  customer = {},
  orderNote,
  returnUrl,
  notifyUrl
}) => {
  const selectedGateway = gateway || await getActiveGateway();
  if (!SUPPORTED_GATEWAYS.has(selectedGateway)) throw new Error('Unsupported payment gateway');

  if (selectedGateway === 'razorpay') {
    const order = await createRazorpayOrder({ amount, receipt, notes });
    return {
      gateway: selectedGateway,
      order,
      orderId: order.id,
      amount: Number(amount),
      currency: order.currency || 'INR',
      keyId: getRazorpayConfig().keyId
    };
  }

  const order = await createCashfreeOrder({
    amount,
    orderId: receipt,
    customer,
    orderNote: orderNote || 'ZeroOne payment',
    orderTags: notes,
    returnUrl,
    notifyUrl
  });
  return {
    gateway: selectedGateway,
    order,
    orderId: order.order_id,
    paymentSessionId: order.payment_session_id,
    amount: Number(amount),
    currency: order.order_currency || 'INR',
    mode: getCashfreeConfig().environment
  };
};

const verifyGatewayPayment = async ({
  gateway,
  orderId,
  paymentId,
  signature,
  expectedAmount
}) => {
  if (gateway === 'cashfree') {
    return verifyCashfreePayment({ orderId, paymentId, expectedAmount });
  }

  if (gateway !== 'razorpay') throw new Error('Unsupported payment gateway');
  if (!orderId || !paymentId || !signature) return { verified: false, message: 'Missing payment verification fields' };
  return {
    verified: verifyRazorpaySignature({ orderId, paymentId, signature }),
    paymentId,
    signature,
    message: 'Invalid payment signature'
  };
};

const verifyGatewayWebhookSignature = ({ gateway, signature, timestamp, rawBody }) => {
  if (gateway === 'cashfree') {
    return verifyCashfreeWebhookSignature({ signature, timestamp, rawBody });
  }

  if (gateway === 'razorpay') {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!secret || !signature || rawBody === undefined || rawBody === null) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(String(signature));
    return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  return false;
};

module.exports = {
  SUPPORTED_GATEWAYS,
  getPaymentGatewaySettings,
  getActiveGateway,
  createGatewayOrder,
  verifyGatewayPayment,
  verifyGatewayWebhookSignature
};