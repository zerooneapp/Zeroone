const axios = require('axios');
const crypto = require('crypto');

const getCashfreeConfig = () => {
  const clientId = process.env.CASHFREE_CLIENT_ID || '';
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET || '';
  const environment = (process.env.CASHFREE_ENV || 'sandbox').toLowerCase() === 'production'
    ? 'production'
    : 'sandbox';

  return {
    clientId,
    clientSecret,
    environment,
    apiVersion: process.env.CASHFREE_API_VERSION || '2026-01-01',
    baseUrl: environment === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg',
    enabled: Boolean(clientId && clientSecret)
  };
};

const getHeaders = (config, idempotencyKey) => ({
  accept: 'application/json',
  'content-type': 'application/json',
  'x-api-version': config.apiVersion,
  'x-client-id': config.clientId,
  'x-client-secret': config.clientSecret,
  'x-request-id': crypto.randomUUID(),
  ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {})
});

const assertConfigured = () => {
  const config = getCashfreeConfig();
  if (!config.enabled) throw new Error('Cashfree is not configured');
  return config;
};

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message ||
  error?.response?.data?.error_description ||
  error?.response?.data?.code ||
  error?.message ||
  fallback
);

const createCashfreeOrder = async ({
  amount,
  orderId,
  customer = {},
  orderNote = 'ZeroOne payment',
  orderTags = {},
  returnUrl,
  notifyUrl
}) => {
  const config = assertConfigured();
  const payload = {
    order_id: orderId,
    order_amount: Number(Number(amount).toFixed(2)),
    order_currency: 'INR',
    customer_details: {
      customer_id: String(customer.customerId || customer.id || 'zeroone_user'),
      customer_name: customer.name || undefined,
      customer_email: customer.email || undefined,
      customer_phone: customer.phone || undefined
    },
    order_note: orderNote,
    order_tags: Object.entries(orderTags || {})
      .slice(0, 10)
      .reduce((tags, [key, value]) => {
        tags[key] = String(value);
        return tags;
      }, {})
  };

  const orderMeta = {};
  if (returnUrl) orderMeta.return_url = returnUrl;
  if (notifyUrl) orderMeta.notify_url = notifyUrl;
  if (Object.keys(orderMeta).length) payload.order_meta = orderMeta;

  try {
    const response = await axios.post(`${config.baseUrl}/orders`, payload, {
      headers: getHeaders(config, crypto.randomUUID()),
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create Cashfree order'));
  }
};

const fetchCashfreeOrder = async (orderId) => {
  const config = assertConfigured();
  try {
    const response = await axios.get(`${config.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
      headers: getHeaders(config),
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to fetch Cashfree order'));
  }
};

const fetchCashfreePayments = async (orderId) => {
  const config = assertConfigured();
  try {
    const response = await axios.get(`${config.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, {
      headers: getHeaders(config),
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to fetch Cashfree payments'));
  }
};

const verifyCashfreePayment = async ({ orderId, paymentId, expectedAmount }) => {
  if (!orderId) return { verified: false, message: 'Cashfree order id is required' };

  const [order, payments] = await Promise.all([
    fetchCashfreeOrder(orderId),
    fetchCashfreePayments(orderId)
  ]);
  const paymentList = Array.isArray(payments) ? payments : (Array.isArray(payments?.data) ? payments.data : []);
  const successfulPayment = paymentList.find((payment) => {
    const status = String(payment.payment_status || '').toUpperCase();
    const amountMatches = expectedAmount === undefined ||
      Math.abs(Number(payment.payment_amount) - Number(expectedAmount)) < 0.01;
    const paymentMatches = !paymentId || String(payment.cf_payment_id) === String(paymentId);
    return status === 'SUCCESS' && amountMatches && paymentMatches;
  });

  return {
    verified: Boolean(successfulPayment && String(order.order_status).toUpperCase() === 'PAID'),
    order,
    payment: successfulPayment || null,
    paymentId: successfulPayment?.cf_payment_id || paymentId || '',
    message: successfulPayment ? '' : 'Cashfree payment is not successful or amount does not match'
  };
};

const verifyCashfreeWebhookSignature = ({ signature, timestamp, rawBody }) => {
  const config = assertConfigured();
  if (!signature || !timestamp || rawBody === undefined || rawBody === null) return false;
  const expected = crypto
    .createHmac('sha256', config.clientSecret)
    .update(`${timestamp}${rawBody}`)
    .digest('base64');
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(String(signature));
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

module.exports = {
  getCashfreeConfig,
  createCashfreeOrder,
  fetchCashfreeOrder,
  fetchCashfreePayments,
  verifyCashfreePayment,
  verifyCashfreeWebhookSignature
};