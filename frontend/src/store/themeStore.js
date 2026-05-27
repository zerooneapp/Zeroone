import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const getSystemDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      // Force theme to 'system'
      themeMode: 'system',
      isDarkMode: getSystemDark(),

      setThemeMode: (mode) => {
        // Enforce system mode only
        const systemDark = getSystemDark();
        applyTheme(systemDark);
        set({ themeMode: 'system', isDarkMode: systemDark });
      },

      // Legacy toggle disabled as we now only support system default theme
      toggleTheme: () => {
        const systemDark = getSystemDark();
        applyTheme(systemDark);
        set({ themeMode: 'system', isDarkMode: systemDark });
      },

      // Called by App.jsx when system theme changes
      onSystemThemeChange: () => {
        const { themeMode } = get();
        if (themeMode === 'system') {
          const isDark = getSystemDark();
          applyTheme(isDark);
          set({ isDarkMode: isDark });
        }
      },
    }),
    {
      name: 'theme-storage',
      // Only persist themeMode, not isDarkMode (recalculated on load)
      partialize: (state) => ({ themeMode: state.themeMode }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        themeMode: persistedState?.themeMode || currentState.themeMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const isDark = getSystemDark();
        applyTheme(isDark);
        state.themeMode = 'system';
        state.isDarkMode = isDark;
      },
    }
  )
);
