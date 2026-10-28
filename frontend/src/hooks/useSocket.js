import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useNotificationStore from '../store/notificationStore';
import toast from 'react-hot-toast';
import { getNativeFcmToken } from '../services/fcmService';

const getSocketUrl = () => {
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (configuredSocketUrl) return configuredSocketUrl.replace(/\/+$/, '');

  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return window.location.origin;

  try {
    const parsedApiUrl = new URL(apiUrl, window.location.origin);
    const isLocalFrontend = ['localhost', '127.0.0.1'].includes(parsedApiUrl.hostname)
      && parsedApiUrl.port === '3000';
    if (isLocalFrontend && import.meta.env.DEV) {
      return parsedApiUrl.protocol + '//' + parsedApiUrl.hostname + ':5003';
    }

    // A localhost value must never be used by the deployed site. Use the
    // current origin when no production socket URL was configured.
    if (isLocalFrontend && import.meta.env.PROD) {
      return window.location.origin;
    }

    // In local Vite development, API requests go through the /api proxy on
    // the frontend origin. Socket.IO uses the same proxy path as well.
    if (import.meta.env.DEV && parsedApiUrl.origin === window.location.origin) {
      return window.location.origin;
    }
    return parsedApiUrl.origin;
  } catch {
    return window.location.origin;
  }
};

const useSocket = (userId) => {
  const socketRef = useRef(null);
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!userId) return;

    // Connect to the backend origin (or the local Vite Socket.IO proxy).
    const socket = io(getSocketUrl(), {
      path: '/socket.io',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    // Join on every connection so reconnects restore the private room.
    socket.on('connect', () => {
      socket.emit('join', userId);
    });
    socket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection failed:', error.message);
    });

    // Listen for Notifications
    socket.on('new_notification', (notification) => {
      console.log('[SOCKET] New notification received:', notification);
      addNotification(notification);
      
      const notificationType = String(notification?.type || '').toUpperCase();
      const notificationText = [notification?.title, notification?.message]
        .filter(Boolean)
        .join(' ');
      const isBookingConfirmation =
        notificationType === 'BOOKING_CONFIRMED' ||
        notificationType === 'BOOKING_RESCHEDULED' ||
        /booking\s+(confirmed|rescheduled)/i.test(notificationText);

      // Booking confirmation is already shown on the success screen.
      if (!isBookingConfirmation) {
        // Let the global Toaster style control the background and text color.
        // A local white text override made the default white toast unreadable.
        toast(notification.title || 'New Notification');
      }

      // Keep the notification store and live list updates active.
      window.dispatchEvent(new CustomEvent('new-socket-notification', { detail: notification }));

      // Play Sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.play().catch(e => console.log('Sound playback failed:', e.message));
    });

    // Listen for Force Logout Events
    socket.on('FORCE_LOGOUT', async (payload) => {
      console.log('[SOCKET] Force logout event received');

      // Sent when another device logs in: the device whose push token is
      // `exceptToken` is the new one and must stay logged in.
      const exceptToken = payload?.exceptToken;
      if (exceptToken) {
        let ownToken = null;
        try {
          ownToken = (await getNativeFcmToken()) || localStorage.getItem('fcm_token');
        } catch { /* ignore */ }
        if (ownToken && ownToken === exceptToken) return;
      }

      window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    });

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [userId, addNotification]);

  return socketRef.current;
};

export default useSocket;
