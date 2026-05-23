import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import api from './services/api'

// Initialize the global prefetch cache
window.__PREFETCHED_DATA__ = {
  categories: null,
  vendors: null,
  location: null,
  bookings: null,
  memberships: null,
  vendorDetails: {}, // Mapped by vendorId: { vendor, services }
  cartData: null,    // Prefetched slots & staff for cart page
};

// Start prefetching categories immediately on load
api.get('/categories')
  .then(res => {
    window.__PREFETCHED_DATA__.categories = res.data;
  })
  .catch(err => console.warn('[Prefetch] Categories failed', err.message));

// Start prefetching bookings and memberships if user is logged in
const token = localStorage.getItem('token');
if (token) {
  api.get('/bookings/my')
    .then(res => {
      window.__PREFETCHED_DATA__.bookings = res.data;
    })
    .catch(err => console.warn('[Prefetch] Bookings failed', err.message));

  api.get('/memberships/my-memberships')
    .then(res => {
      window.__PREFETCHED_DATA__.memberships = res.data;
    })
    .catch(err => console.warn('[Prefetch] Memberships failed', err.message));
}

// Start prefetching location & nearby vendors as early as possible
const prefetchVendors = (lat, lng) => {
  window.__PREFETCHED_DATA__.location = { lat, lng };
  api.get('/vendors/nearby', {
    params: {
      lat,
      lng,
      page: 1,
      limit: 10
    }
  })
  .then(res => {
    window.__PREFETCHED_DATA__.vendors = res.data;
    if (res.data?.vendors) {
      res.data.vendors.forEach(v => {
        window.__PREFETCHED_DATA__.vendorDetails[v._id] = {
          vendor: v,
          services: v.services || []
        };
      });
    }
  })
  .catch(err => console.warn('[Prefetch] Vendors failed', err.message));
};

// Try to use saved coordinates from auth-storage (fastest)
let locationPrefetched = false;
try {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const parsed = JSON.parse(authStorage);
    const coords = parsed?.state?.user?.location?.coordinates;
    if (coords && coords[0] && coords[1]) {
      prefetchVendors(coords[1], coords[0]);
      locationPrefetched = true;
    }
  }
} catch (e) {
  console.warn('[Prefetch] Coordinates parsing failed', e.message);
}

// Fallback to browser geolocation or default Bhopal location
if (!locationPrefetched) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        prefetchVendors(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        prefetchVendors(23.2599, 77.4126); // Default Bhopal
      }
    );
  } else {
    prefetchVendors(23.2599, 77.4126); // Default Bhopal
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
