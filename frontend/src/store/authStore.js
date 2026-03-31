import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      loading: false,
      isInitialized: false,
      vendorStatus: {
        isActive: false,
        currentPlan: null,
        wallet: 0,
        serviceLevel: 'basic'
      },

      login: async (credentials) => {
        set({ loading: true });
        try {
          const res = await api.post('/auth/login', credentials);
          const { user, token, role } = res.data;
          
          set({ 
            user: res.data, 
            token, 
            role, 
            isAuthenticated: true 
          });

          localStorage.setItem('token', token);

          // If vendor, immediately sync status
          if (role === 'vendor') {
            await get().syncVendorStatus();
          }

          return { success: true, role };
        } catch (err) {
          return { success: false, message: err.response?.data?.message || 'Login failed' };
        } finally {
          set({ loading: false });
        }
      },

      requestOTP: async (phone) => {
        set({ loading: true });
        try {
          const res = await api.post('/auth/send-otp', { phone });
          return { success: true, message: res.data.message, otp: res.data.otp };
        } catch (err) {
          return { success: false, message: err.response?.data?.message || 'Failed to send OTP' };
        } finally {
          set({ loading: false });
        }
      },

      verifyOTP: async (phone, otp) => {
        set({ loading: true });
        try {
          const res = await api.post('/auth/verify-otp', { phone, otp });
          const { token, role, needsRegistration } = res.data;

          // NEW: Always set token so subsequent profile completion (protected routes) work
          if (token) {
            set({ 
              token, 
              role, 
              isAuthenticated: !needsRegistration, // Not fully authenticated till registration complete
              user: needsRegistration ? null : res.data
            });
            localStorage.setItem('token', token);
            if (role === 'vendor' && !needsRegistration) await get().syncVendorStatus();
          }

          return { success: true, needsRegistration, data: res.data };
        } catch (err) {
          return { success: false, message: err.response?.data?.message || 'Invalid OTP' };
        } finally {
          set({ loading: false });
        }
      },

      logout: () => {
        set({ 
          user: null, 
          token: null, 
          role: null, 
          isAuthenticated: false,
          vendorStatus: {
            isActive: false,
            currentPlan: null,
            wallet: 0,
            serviceLevel: 'basic'
          }
        });
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('token');
      },

      syncVendorStatus: async () => {
        try {
          const res = await api.get('/vendor/dashboard');
          const { subscription, walletBalance } = res.data;
          set({ 
            vendorStatus: {
              isActive: subscription?.isActive || false,
              currentPlan: subscription?.currentPlan || null,
              wallet: walletBalance || 0,
              serviceLevel: subscription?.serviceLevel || 'basic'
            }
          });
        } catch (err) {
          console.error('Vendor status sync failed', err);
        }
      },

      restoreSession: async () => {
        const { token } = get();
        if (!token) {
          set({ isInitialized: true });
          return;
        }

        try {
          set({ loading: true });
          const res = await api.get('/auth/me');
          set({ 
            user: res.data.user, 
            role: res.data.role, 
            isAuthenticated: true 
          });

          if (res.data.role === 'vendor') {
            await get().syncVendorStatus();
          }
        } catch (err) {
          get().logout();
        } finally {
          set({ loading: false, isInitialized: true });
        }
      },

      updateUser: (updatedUser) => {
        set((state) => ({
          user: { ...state.user, ...updatedUser }
        }));
      },

      setCredentials: (data) => {
        set({
          token: data.token,
          role: data.role,
          user: data.user,
          isAuthenticated: true
        });
        localStorage.setItem('token', data.token);
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, role: state.role, isAuthenticated: state.isAuthenticated })
    }
  )
);
