import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'steelmont-theme';

function applyThemeClass(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B1220' : '#F5F7F9');
}

function readStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return 'dark';
}

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    applyThemeClass(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

/** Call once at app boot (before paint if possible). */
export function initTheme(): ThemeMode {
  const theme = readStoredTheme();
  applyThemeClass(theme);
  useThemeStore.setState({ theme });
  return theme;
}
