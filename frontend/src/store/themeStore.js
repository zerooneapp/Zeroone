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
      // 'light' | 'dark' | 'system'
      themeMode: 'system',
      isDarkMode: getSystemDark(),

      setThemeMode: (mode) => {
        const isDark =
          mode === 'dark' ? true :
          mode === 'light' ? false :
          getSystemDark();
        applyTheme(isDark);
        set({ themeMode: mode, isDarkMode: isDark });
      },

      // Legacy toggle kept for header button — cycles between light/dark
      toggleTheme: () => {
        const { themeMode } = get();
        const nextMode = themeMode === 'dark' ? 'light' : 'dark';
        const isDark = nextMode === 'dark';
        applyTheme(isDark);
        set({ themeMode: nextMode, isDarkMode: isDark });
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
        const mode = state.themeMode || 'system';
        const isDark =
          mode === 'dark' ? true :
          mode === 'light' ? false :
          getSystemDark();
        applyTheme(isDark);
        state.isDarkMode = isDark;
      },
    }
  )
);
