import { create } from 'zustand';
import api from '../services/api';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    try {
      set({ loading: true });
      const { data } = await api.get('/notifications');
      const unreadCount = data.filter(n => !n.isRead).length;
      set({ notifications: data, unreadCount, loading: false });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ loading: false });
    }
  },

  addNotification: (notification) => {
    set((state) => {
      const exists = state.notifications.find(n => n._id === notification._id);
      if (exists) return state;

      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1
      };
    });
  },

  markAsRead: async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      set((state) => ({
        notifications: state.notifications.map(n => 
          n._id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      set((state) => ({
        notifications: state.notifications.filter(n => n._id !== notificationId),
        unreadCount: state.notifications.find(n => n._id === notificationId && !n.isRead) 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount
      }));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }
}));

export default useNotificationStore;
