import { useSettingsStore } from '@/store/useSettingsStore';

// Reads the app-wide settings loaded from /api/portal-setting (fetched once at app startup).
// Returns DEFAULT_APP_SETTINGS until the fetch resolves, so consumers never need a null check.
export function useSettings() {
  return useSettingsStore((state) => state.settings);
}
