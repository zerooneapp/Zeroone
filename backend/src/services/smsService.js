const https = require('https');

const API_KEY_HOST = 'cloud.smsindiahub.in';
const API_KEY_PATH = '/api/mt/SendSMS';
const TRANSACTIONAL_PATH = '/vendorsms/pushsms.aspx';

const buildOtpMessage = (otp) => {
  const template =
    process.env.SMSINDIAHUB_OTP_TEMPLATE ||
    'Welcome to the zeroone powered by SMSINDIAHUB. Your OTP for registration is ${otp}';

  return template
    .replace(/##var##/g, otp)
    .replace(/\${otp}/g, otp)
    .replace(/\$\[otp\]/g, otp)
    .replace(/\{#var#\}/g, otp);
};

const performHttpsRequest = ({ hostname, path }) => new Promise((resolve, reject) => {
  const req = https.request(
    {
      hostname,
      path,
      method: 'GET'
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    }
  );

  req.on('error', reject);
  req.end();
});

const parseProviderResponse = (statusCode, body) => {
  console.log(`[SMS-OTP] Provider Response [${statusCode}]: ${body}`);

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`SMS API responded with status ${statusCode}: ${body}`);
  }

  try {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    const successCode = parsed?.ErrorCode === '000';
    const successStatus = String(parsed?.status || '').toLowerCase() === 'success';

    if (successCode || successStatus) {
      return parsed;
    }

    // Some gateways return "0" or "Success" in other fields
    if (parsed?.code === 200 || parsed?.message === 'Success' || parsed?.Status === 'Success') {
      return parsed;
    }

    throw new Error(parsed?.ErrorMessage || parsed?.detail || parsed?.message || 'SMS API returned failure');
  } catch (error) {
    // Fallback for non-JSON responses
    const isSuccess = /success|done|sent|accepted|ok|job/i.test(body);
    if (isSuccess) {
      return body;
    }

    throw new Error(`Failed to parse response: ${body}`);
  }
};

const sendViaTransactionalRoute = async ({ normalizedPhone, text }) => {
  const user = process.env.SMSINDIAHUB_USERNAME;
  const password = process.env.SMSINDIAHUB_PASSWORD;
  const senderId = process.env.SMSINDIAHUB_SENDER_ID;

  if (!user || !password) {
    // Silently skip if no transactional credentials, sendOtpSms will fallback
    throw new Error('MISSING_TRANSACTIONAL_CREDENTIALS');
  }

  const query = new URLSearchParams({
    user,
    password,
    msisdn: normalizedPhone,
    sid: senderId,
    msg: text,
    fl: '0',
    gwid: process.env.SMSINDIAHUB_GWID || '2'
  });

  if (process.env.SMSINDIAHUB_ENTITY_ID) query.append('peid', process.env.SMSINDIAHUB_ENTITY_ID);
  if (process.env.SMSINDIAHUB_TEMPLATE_ID) query.append('tempid', process.env.SMSINDIAHUB_TEMPLATE_ID);

  console.log(`[SMS-OTP] Requesting transactional route for ${normalizedPhone}`);

  const response = await performHttpsRequest({
    hostname: API_KEY_HOST,
    path: `${TRANSACTIONAL_PATH}?${query.toString()}`
  });

  return parseProviderResponse(response.statusCode, response.body);
};

const sendViaApiKeyRoute = async ({ normalizedPhone, text }) => {
  const apiKey = process.env.SMSINDIAHUB_API_KEY;
  const senderId = process.env.SMSINDIAHUB_SENDER_ID;

  if (!apiKey || !senderId) {
    throw new Error('SMSINDIAHUB API key route credentials are not configured in .env');
  }

  const query = new URLSearchParams({
    APIKey: apiKey,
    senderid: senderId,
    channel: process.env.SMSINDIAHUB_CHANNEL || 'Transactional',
    DCS: process.env.SMSINDIAHUB_DCS || '0',
    flashsms: process.env.SMSINDIAHUB_FLASHSMS || '0',
    route: process.env.SMSINDIAHUB_ROUTE || '2',
    gwid: process.env.SMSINDIAHUB_GWID || '2',
    number: normalizedPhone,
    text
  });

  // Comprehensive DLT Parameter Support
  if (process.env.SMSINDIAHUB_ENTITY_ID) {
    query.append('EntityId', process.env.SMSINDIAHUB_ENTITY_ID);
    query.append('entityid', process.env.SMSINDIAHUB_ENTITY_ID);
    query.append('peid', process.env.SMSINDIAHUB_ENTITY_ID);
  }

  if (process.env.SMSINDIAHUB_TEMPLATE_ID) {
    query.append('TemplateId', process.env.SMSINDIAHUB_TEMPLATE_ID);
    query.append('templateid', process.env.SMSINDIAHUB_TEMPLATE_ID);
    query.append('tempid', process.env.SMSINDIAHUB_TEMPLATE_ID);
  }

  console.log(`[SMS-OTP] Requesting API key route for ${normalizedPhone}`);

  const response = await performHttpsRequest({
    hostname: API_KEY_HOST,
    path: `${API_KEY_PATH}?${query.toString()}`
  });

  return parseProviderResponse(response.statusCode, response.body);
};

const sendOtpSms = async (phone, otp) => {
  const normalizedPhone = String(phone).startsWith('91') ? String(phone) : `91${phone}`;
  const text = buildOtpMessage(otp);

  console.log(`[SMS-OTP] Attempting to send OTP to ${normalizedPhone}`);
  console.log(`[SMS-OTP] Message Content: "${text}"`);

  try {
    const transactionalResponse = await sendViaTransactionalRoute({ normalizedPhone, text });
    console.log(`[SMS-OTP] Success via Transactional Route`);
    return transactionalResponse;
  } catch (err) {
    if (err.message !== 'MISSING_TRANSACTIONAL_CREDENTIALS') {
      console.warn(`[SMS-OTP] Transactional route failed: ${err.message}`);
    }

    try {
      const apiKeyResponse = await sendViaApiKeyRoute({ normalizedPhone, text });
      console.log(`[SMS-OTP] Success via API Key Route`);
      return apiKeyResponse;
    } catch (apiErr) {
      console.error(`[SMS-OTP] API Key route failed: ${apiErr.message}`);
      throw apiErr;
    }
  }
};

module.exports = {
  sendOtpSms
};
