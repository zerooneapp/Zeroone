import api from './api';

// /settings/shared (support numbers, feature toggles, promotion price) is
// admin-managed and rarely changes, but many pages requested it on every
// mount. One cached copy is shared for a short time; concurrent callers share
// one in-flight request. Resolves to the axios response ({ data }), like
// api.get, so callers keep using res.data.
const SHARED_SETTINGS_TTL_MS = 2 * 60 * 1000;

let cachedResponse = null;
let cachedAt = 0;
let inFlight = null;

export const getSharedSettings = ({ force = false } = {}) => {
  if (!force && cachedResponse && Date.now() - cachedAt < SHARED_SETTINGS_TTL_MS) {
    return Promise.resolve(cachedResponse);
  }
  if (inFlight) return inFlight;

  // main.jsx starts this request at app load; reuse it once.
  const prefetched = typeof window !== 'undefined' ? window.__PREFETCHED_DATA__?.sharedSettingsPromise : null;
  if (prefetched) window.__PREFETCHED_DATA__.sharedSettingsPromise = null;

  const request = prefetched
    // If the startup request failed, fetch again instead of failing the caller.
    ? prefetched.catch(() => api.get('/settings/shared'))
    : api.get('/settings/shared');

  inFlight = request
    .then((res) => {
      cachedResponse = res;
      cachedAt = Date.now();
      return res;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export default getSharedSettings;
