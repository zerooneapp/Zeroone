const axios = require('axios');

/**
 * Send OTP via SMS India Hub
 * @param {string} phone - Mobile number
 * @param {string} otp - The 6 digit OTP to send
 * @returns {Promise<any>}
 */
const sendOtpSms = async (phone, otp) => {
  const apiKey = process.env.SMSINDIAHUB_API_KEY;
  const senderId = process.env.SMSINDIAHUB_SENDER_ID;
  const isOtpEnabled = process.env.OTP_ENABLED !== 'false'; // Default to true unless explicitly 'false'

  // Clean phone: Remove any non-numeric characters
  const cleanPhone = String(phone).replace(/\D/g, '');
  const formattedMobile = (cleanPhone.length === 12 && cleanPhone.startsWith('91')) ? cleanPhone : `91${cleanPhone.slice(-10)}`;

  // Build message from template
  let template = process.env.SMSINDIAHUB_OTP_TEMPLATE || 'Welcome to the ZeroOne powered by SMSINDIAHUB. Your OTP for registration is ${otp}';
  template = template.replace(/^["']|["']$/g, "");
  const message = template.replace(/\${otp}/g, otp);

  // If credentials missing, log simulated send
  if (!apiKey || !senderId) {
    console.warn('[SMSINDIAHUB] Credentials missing in .env. Check SMSINDIAHUB_API_KEY and SMSINDIAHUB_SENDER_ID.');
    console.log(`[SIMULATED SMS] To: ${formattedMobile}, OTP: ${otp}, Msg: "${message}"`);
    return true;
  }

  if (!isOtpEnabled) {
    console.warn('[SMSINDIAHUB] SMS Sending is DISABLED via OTP_ENABLED flag.');
    console.log(`[SIMULATED SMS] To: ${formattedMobile}, OTP: ${otp}, Msg: "${message}"`);
    return true;
  }

  try {
    // Log attempt
    console.log(`[SMSINDIAHUB] Attempting to send SMS to ${formattedMobile}...`);

    // Transactional API URL
    const url = `http://cloud.smsindiahub.in/vendorsms/pushsms.aspx`;

    const params = {
      user: apiKey,
      password: apiKey,
      APIKey: apiKey,
      msisdn: formattedMobile,
      msg: message,
      sid: senderId,
      fl: 0,
      gwid: 2
    };

    // Add DLT parameters if available
    if (process.env.SMSINDIAHUB_ENTITY_ID) params.peid = process.env.SMSINDIAHUB_ENTITY_ID;
    if (process.env.SMSINDIAHUB_TEMPLATE_ID) params.tempid = process.env.SMSINDIAHUB_TEMPLATE_ID;

    const response = await axios.get(url, { params });

    console.log('[SMSINDIAHUB] Response:', response.data);

    // Basic verification
    if (typeof response.data === 'string' && response.data.toLowerCase().includes('failed')) {
      throw new Error(response.data);
    }

    return response.data;
  } catch (error) {
    console.error('[SMSINDIAHUB] Failed to send SMS:', error.message);
    // We log but don't strictly throw to prevent crashing the auth flow if it's not critical,
    // but for OTP verification we usually want to know it failed.
    throw error;
  }
};

module.exports = {
  sendOtpSms
};
