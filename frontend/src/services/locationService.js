export const DEFAULT_LOCATION = Object.freeze({
  lat: 23.2599,
  lng: 77.4126
});

let browserLocationPromise = null;

export const hasValidCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return false;

  const [lng, lat] = coordinates;
  return Number.isFinite(Number(lng)) &&
    Number.isFinite(Number(lat)) &&
    Number(lng) >= -180 &&
    Number(lng) <= 180 &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    !(Number(lng) === 0 && Number(lat) === 0);
};

export const getUserCoordinates = (user) => {
  const coordinates = user?.location?.coordinates;
  if (!hasValidCoordinates(coordinates)) return null;

  return {
    lng: Number(coordinates[0]),
    lat: Number(coordinates[1])
  };
};

export const getBrowserLocation = () => {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new Error('Geolocation is not supported by this browser'));
  }

  const hostname = window.location.hostname;
  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  if (window.isSecureContext === false && !isLocalhost) {
    return Promise.reject(new Error('Location access requires HTTPS'));
  }

  if (browserLocationPromise) return browserLocationPromise;

  browserLocationPromise = new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      reject,
      {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 300000
      }
    );
  }).catch((error) => {
    browserLocationPromise = null;
    throw error;
  });

  return browserLocationPromise;
};

export const reverseGeocode = async (lat, lng) => {
  const fallback = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    ? Number(lat).toFixed(4) + ', ' + Number(lng).toFixed(4)
    : 'Current location';

  try {
    const response = await fetch(
      'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' +
      encodeURIComponent(lat) +
      '&lon=' +
      encodeURIComponent(lng)
    );

    if (!response.ok) throw new Error('Reverse geocoding failed');

    const data = await response.json();
    return data?.display_name || fallback;
  } catch (error) {
    console.warn('[Location] Reverse geocoding failed; saving coordinates instead.', error);
    return fallback;
  }
};