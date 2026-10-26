import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  getBrowserLocation,
  reverseGeocode
} from '../services/locationService';

const AddressPopup = () => {
  const { user, role, isAuthenticated, isInitialized, updateUser } = useAuthStore();
  const [, setLoading] = useState(false);
  const attemptedRef = useRef(false);
  const lastUserIdRef = useRef(null);

  useEffect(() => {
    const userId = user?._id ? String(user._id) : null;

    // Wait for a real authenticated customer before requesting browser location.
    // This avoids firing the request during auth hydration or on the login screen.
    if (!isAuthenticated || role !== 'customer' || !userId) {
      attemptedRef.current = false;
      lastUserIdRef.current = null;
      return;
    }

    // A different customer in the same browser gets a fresh location attempt.
    if (lastUserIdRef.current !== userId) {
      lastUserIdRef.current = userId;
      attemptedRef.current = false;
    }

    // Fetch once when this authenticated customer enters the app, including
    // after a full refresh. The ref prevents duplicate calls in one session.
    if (
      isInitialized &&
      !attemptedRef.current
    ) {
      attemptedRef.current = true;
      void handleAutoFetchLocation();
    }
  }, [isAuthenticated, isInitialized, role, user?._id]);

  const handleAutoFetchLocation = async () => {
    setLoading(true);

    try {
      const { lat, lng } = await getBrowserLocation();
      const readableAddress = await reverseGeocode(lat, lng);
      const payload = {
        address: readableAddress,
        location: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      };

      const res = await api.patch('/users/profile', payload);
      updateUser(res.data);

      toast.success('Service Location Set: ' + readableAddress.split(',')[0], {
        style: {
          color: '#fff',
          fontSize: '12px',
          fontWeight: '900',
          borderRadius: '1rem',
          padding: '12px 24px'
        }
      });
    } catch (error) {
      console.warn('[Location] Auto fetch failed:', error);
      const message = error?.code === 1
        ? 'Please allow location permission and try again.'
        : error?.message === 'Location access requires HTTPS'
          ? 'Location access requires an HTTPS connection.'
          : 'Unable to fetch your location. Please try again from Saved Addresses.';
      toast.error(message, { id: 'location-fetch-failed' });
    } finally {
      setLoading(false);
    }
  };

  return null;
};

export default AddressPopup;
