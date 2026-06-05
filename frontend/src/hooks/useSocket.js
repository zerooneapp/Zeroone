import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useNotificationStore from '../store/notificationStore';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const useSocket = (userId) => {
  const socketRef = useRef(null);
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!userId) return;

    // Connect
    socketRef.current = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Join Private Room
    socketRef.current.emit('join', userId);

    // Listen for Notifications
    socketRef.current.on('new_notification', (notification) => {
      console.log('[SOCKET] New notification received:', notification);
      addNotification(notification);
      
      // Visual Toast
      toast(notification.title || 'New Notification', {
        icon: '🔔',
        style: {
          borderRadius: '12px',
          background: '#00246b',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 'bold'
        }
      });

      // Dispatch a Global Event for Components to React
      window.dispatchEvent(new CustomEvent('new-socket-notification', { detail: notification }));

      // Play Sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.play().catch(e => console.log('Sound playback failed:', e.message));
    });

    // Listen for Force Logout Events
    socketRef.current.on('FORCE_LOGOUT', () => {
      console.log('[SOCKET] Force logout event received');
      window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userId, addNotification]);

  return socketRef.current;
};

export default useSocket;
