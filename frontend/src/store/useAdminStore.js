import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAdminStore = create(
  persist(
    (set) => ({
      admin: {
        name: 'Super Admin',
        role: 'admin',
        avatar: null
      },
      notificationsCount: 0,
      isSidebarOpen: true,
      
      setAdmin: (admin) => set({ admin }),
      setNotificationsCount: (count) => set({ notificationsCount: count }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      closeSidebar: () => set({ isSidebarOpen: false }),
      openSidebar: () => set({ isSidebarOpen: true }),
    }),
    {
      name: 'admin-storage',
    }
  )
);
