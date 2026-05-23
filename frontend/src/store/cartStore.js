import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      vendor: null,
      items: [],
      
      addItem: (vendor, service) => set((state) => {
        // If adding from a different vendor, clear cart first
        if (state.vendor && state.vendor._id !== vendor._id) {
          return {
            vendor,
            items: [service]
          };
        }
        
        // Prevent duplicates
        if (state.items.find(item => item._id === service._id)) return state;

        return {
          vendor,
          items: [...state.items, service]
        };
      }),

      removeItem: (serviceId) => set((state) => {
        const nextItems = state.items.filter(item => item._id !== serviceId);
        return {
          items: nextItems,
          vendor: nextItems.length === 0 ? null : state.vendor
        };
      }),

      rescheduleBookingId: null,

      setRescheduleBookingId: (id) => set({ rescheduleBookingId: id }),
      
      clearCart: () => set({ items: [], vendor: null, rescheduleBookingId: null }),

      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.price, 0);
      },

      getTotalDuration: () => {
        return get().items.reduce((sum, item) => sum + (item.duration + (item.bufferTime || 0)), 0);
      }
    }),
    {
      name: 'zerone-cart',
    }
  )
);
