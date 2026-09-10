import { create } from 'zustand';

interface FocusModeState {
  /** Task create/edit focus: logo-only header + optional browser fullscreen */
  isFocusMode: boolean;
  /** In focus mode: left nav fully open (true) or fully hidden (false) */
  isSidebarOpen: boolean;
  enterFocusMode: () => void;
  exitFocusMode: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useFocusModeStore = create<FocusModeState>((set) => ({
  isFocusMode: false,
  isSidebarOpen: false,

  enterFocusMode: () => {
    localStorage.setItem('isSidebarCollapsed', 'true');
    set({ isFocusMode: true, isSidebarOpen: false });
  },

  exitFocusMode: () => {
    set({ isFocusMode: false, isSidebarOpen: false });
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  setSidebarOpen: (open) => {
    set({ isSidebarOpen: open });
  },
}));
