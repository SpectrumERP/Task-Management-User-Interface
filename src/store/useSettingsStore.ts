import { create } from 'zustand';
import { apiService } from '@/services/apiService';

export interface AppSettings {
  isHideFolder: boolean;
  isHideType: boolean;
  categoryFieldCaption: string;
  typeFieldCaption: string;
  isHideDetailSection: boolean;
  tagCaption: string;
}

interface PortalSettingResponse {
  success: boolean;
  message: string;
  data: AppSettings;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  isHideFolder: true,
  isHideType: true,
  categoryFieldCaption: 'Category',
  typeFieldCaption: 'Type',
  isHideDetailSection: false,
  tagCaption: 'Tags',
};

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  isLoading: boolean;
  fetchSettings: (force?: boolean) => Promise<AppSettings>;
}

// Dedupe concurrent callers (e.g. multiple components mounting at once) into one fetch.
let activeSettingsPromise: Promise<AppSettings> | null = null;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_APP_SETTINGS,
  isLoaded: false,
  isLoading: false,

  fetchSettings: async (force = false) => {
    const state = get();
    if (state.isLoaded && !force) return state.settings;
    if (activeSettingsPromise) return activeSettingsPromise;

    activeSettingsPromise = (async () => {
      set({ isLoading: true });
      try {
        const response = await apiService.get<PortalSettingResponse>('/api/portal-setting');
        const merged = { ...DEFAULT_APP_SETTINGS, ...response.data };
        set({ settings: merged, isLoaded: true });
        return merged;
      } catch (error) {
        console.error('Failed to load portal settings, falling back to defaults:', error);
        set({ isLoaded: true });
        return get().settings;
      } finally {
        set({ isLoading: false });
        activeSettingsPromise = null;
      }
    })();

    return activeSettingsPromise;
  },
}));
