import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const getInitialTheme = (): boolean => {
  const saved = localStorage.getItem('chatsphere_theme');
  if (saved !== null) {
    return saved === 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const useThemeStore = create<ThemeState>((set) => {
  const initialDark = getInitialTheme();
  if (initialDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    isDark: initialDark,
    toggleTheme: () =>
      set((state) => {
        const nextDark = !state.isDark;
        if (nextDark) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('chatsphere_theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('chatsphere_theme', 'light');
        }
        return { isDark: nextDark };
      }),
    setTheme: (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('chatsphere_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('chatsphere_theme', 'light');
      }
      set({ isDark });
    },
  };
});
