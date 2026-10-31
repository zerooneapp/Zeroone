const bcrypt = require('bcryptjs');
const { verifyToken } = require('../utils/totp');
const { signDeveloperToken, send404 } = require('../middleware/developerMiddleware');

// Simple in-memory brute-force guard, keyed by IP. Resets on server restart.
const attempts = new Map(); // ip -> { count, firstAt, blockedUntil }
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const BLOCK_MS = 30 * 60 * 1000;  // 30 minutes

const getClientIp = (req) =>
  (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection?.remoteAddress || 'unknown').trim();

const isBlocked = (ip) => {
  const rec = attempts.get(ip);
  return rec?.blockedUntil && rec.blockedUntil > Date.now();
};

const registerFailure = (ip) => {
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, firstAt: now, blockedUntil: 0 };
  if (now - rec.firstAt > WINDOW_MS) { rec.count = 0; rec.firstAt = now; }
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) rec.blockedUntil = now + BLOCK_MS;
  attempts.set(ip, rec);
};

const clearFailures = (ip) => attempts.delete(ip);

// @desc  Developer login: phone + password + TOTP. Any failure returns a generic 404.
// @route POST /api/<DEVELOPER_ROUTE_KEY>/auth/login
const developerLogin = async (req, res) => {
  const ip = getClientIp(req);
  try {
    const { phone, password, token } = req.body || {};

    if (!process.env.DEVELOPER_PHONE || !process.env.DEVELOPER_PASSWORD_HASH ||
        !process.env.DEVELOPER_TOTP_SECRET || !process.env.DEVELOPER_JWT_SECRET) {
      return send404(req, res);
    }
    if (isBlocked(ip)) return send404(req, res);

    const phoneOk = phone === process.env.DEVELOPER_PHONE;
    const passwordOk = phoneOk && password
      ? await bcrypt.compare(String(password), process.env.DEVELOPER_PASSWORD_HASH)
      : false;
    const totpOk = verifyToken(process.env.DEVELOPER_TOTP_SECRET, token);

    if (!phoneOk || !passwordOk || !totpOk) {
      registerFailure(ip);
      return send404(req, res);
    }

    clearFailures(ip);
    console.warn(`[DEV-PANEL] developer login success from ${ip}`);
    return res.status(200).json({ token: signDeveloperToken(phone), expiresInHours: 12 });
  } catch (err) {
    registerFailure(ip);
    return send404(req, res);
  }
};

// @desc  Confirm a developer token is still valid (used by the panel on load)
// @route GET /api/<DEVELOPER_ROUTE_KEY>/auth/me
const developerMe = (req, res) => res.status(200).json({ phone: req.developer.phone });

module.exports = { developerLogin, developerMe };
