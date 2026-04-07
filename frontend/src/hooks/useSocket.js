import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useNotificationStore from '../store/notificationStore';

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
      
      // Dispatch a Global Event for Components to React
      window.dispatchEvent(new CustomEvent('new-socket-notification', { detail: notification }));

      // Play Sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.play().catch(e => console.log('Sound playback failed:', e.message));
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
