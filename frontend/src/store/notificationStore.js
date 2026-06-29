import { create } from 'zustand';
import api from '../services/api';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    try {
      set({ loading: true });
      const activeVendorId = localStorage.getItem('activeVendorId');
      const params = activeVendorId ? { vendorId: activeVendorId } : {};
      
      const { data } = await api.get('/notifications', { params });
      const unreadCount = data.filter(n => !n.isRead).length;
      set({ notifications: data, unreadCount, loading: false });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ loading: false });
    }
  },

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

  addNotification: (notification) => {
    set((state) => {
      // If we are filtering by vendor, check if notification belongs to this vendor
      const activeVendorId = localStorage.getItem('activeVendorId');
      if (activeVendorId && notification.vendorId && String(notification.vendorId) !== String(activeVendorId)) {
        return state; // Suppress socket updates that belong to another shop
      }

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
      const activeVendorId = localStorage.getItem('activeVendorId');
      const params = activeVendorId ? { vendorId: activeVendorId } : {};
      await api.patch(`/notifications/${notificationId}/read`, null, { params });
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
      const activeVendorId = localStorage.getItem('activeVendorId');
      const params = activeVendorId ? { vendorId: activeVendorId } : {};
      await api.patch('/notifications/all/read', null, { params });
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
  },

  deleteBulk: async (ids) => {
    try {
      await api.delete('/notifications/bulk', { data: { ids } });
      set((state) => {
        const deletedNotifications = state.notifications.filter(n => ids.includes(n._id));
        const deletedUnreadCount = deletedNotifications.filter(n => !n.isRead).length;
        return {
          notifications: state.notifications.filter(n => !ids.includes(n._id)),
          unreadCount: Math.max(0, state.unreadCount - deletedUnreadCount)
        };
      });
    } catch (error) {
      console.error('Failed to delete notifications in bulk:', error);
    }
  }
}));

export default useNotificationStore;
