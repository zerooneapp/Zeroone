// Per-phone throttle for OTP sends. Keyed by phone (not IP) so it stays correct
// behind proxies/load balancers where every request shares one IP, and so a
// brand-new number (no user row yet) is limited too.
//
// In-memory: it is per server instance. The wrong-OTP attempt limit is stored
// in the database (otpAttempts) so it holds across instances/restarts.

const COOLDOWN_MS = 30 * 1000;          // min gap between two OTPs to the same number
const WINDOW_MS = 15 * 60 * 1000;       // rolling window
const MAX_SENDS_PER_WINDOW = 5;         // OTPs per number per window

const MAX_VERIFY_ATTEMPTS = 5;          // wrong OTP guesses before the OTP is burned

const sends = new Map(); // phone -> number[] (timestamps)

/**
 * Returns { allowed: true } and records the send, or
 * { allowed: false, retryAfterSec, reason }.
 */
const checkAndRecordOtpSend = (phone) => {
  const now = Date.now();
  const recent = (sends.get(phone) || []).filter((t) => now - t < WINDOW_MS);

  const last = recent[recent.length - 1];
  if (last && now - last < COOLDOWN_MS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((COOLDOWN_MS - (now - last)) / 1000),
      reason: 'cooldown'
    };
  }

  if (recent.length >= MAX_SENDS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000),
      reason: 'limit'
    };
  }

  recent.push(now);
  sends.set(phone, recent);
  return { allowed: true };
};

// Drop stale entries so the map cannot grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [phone, times] of sends) {
    if (!times.some((t) => now - t < WINDOW_MS)) sends.delete(phone);
  }
}, 10 * 60 * 1000).unref();

module.exports = { checkAndRecordOtpSend, MAX_VERIFY_ATTEMPTS };
