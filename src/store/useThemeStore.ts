import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'steelmont-theme';
const DEFAULT_THEME: ThemeMode = 'dark';

function applyThemeClass(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.setAttribute('data-theme', theme);
  // Prefer computed --tm-page so theme-color stays in sync with design tokens
  const pageBg =
    getComputedStyle(root).getPropertyValue('--tm-page').trim() ||
    (theme === 'dark' ? '#0B1220' : '#F4F6FA');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', pageBg);
}



export function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

/** Paint a theme without writing localStorage (login first-view). */
export function previewTheme(theme: ThemeMode) {
  applyThemeClass(theme);
  useThemeStore.setState({ theme });
}

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: DEFAULT_THEME,
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
  const theme = getStoredTheme();
  applyThemeClass(theme);
  useThemeStore.setState({ theme });
  return theme;
}
