import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';

const AddressPopup = () => {
  const { user, role, isAuthenticated, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Auto-trigger location fetch whenever a customer with no address authenticated
  useEffect(() => {
    if (isAuthenticated && role === 'customer' && (!user || !user.address) && !loading) {
      handleAutoFetchLocation();
    }
  }, [user?.address, role, isAuthenticated]);

  const handleAutoFetchLocation = () => {
    if (!navigator.geolocation) {
      return console.warn('Geolocation not supported by this browser');
    }

    setLoading(true);
    
    // Rapido-style silent fetch
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Intelligent Reverse Geocoding (Using Nominatim for broad compatibility)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          // Construct best possible readable address
          const readableAddress = data.display_name || 
                                 (data.address ? `${data.address.road || ''}, ${data.address.suburb || data.address.city || ''}`.trim() : null) || 
                                 `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          const payload = { 
            address: readableAddress,
            location: {
              type: 'Point',
              coordinates: [longitude, latitude]
            }
          };
          
          // Silent background save
          const res = await api.patch('/users/profile', payload);
          updateUser(res.data);
          
          // Subtle professional notification
          toast.success(`Service Location Set: ${readableAddress.split(',')[0]}`, {
            style: {
              background: '#1C2C4E',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '900',
              borderRadius: '1rem',
              padding: '12px 24px'
            }
          });
        } catch (err) {
          console.error('Location Reverse Geocode Failed:', err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        // Only toast if specifically needed, otherwise fail silently to not annoy user
        console.warn('Location Access Denied:', err.message);
        if (err.code === 1) { // PERMISSION_DENIED
             // Optional: Show a subtle prompt later if required
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // This component no longer renders any UI, it acts as a headless controller
  return null;
};

export default AddressPopup;
