import { useFocusModeStore } from '@/store/useFocusModeStore';

/**
 * App-wide full screen / focus mode (logo-only header + hide sidebar).
 */
export function useToggleFocusMode() {
  const isFocusMode = useFocusModeStore((s) => s.isFocusMode);
  const isSidebarOpen = useFocusModeStore((s) => s.isSidebarOpen);
  const enterFocusMode = useFocusModeStore((s) => s.enterFocusMode);
  const exitFocusMode = useFocusModeStore((s) => s.exitFocusMode);
  const toggleSidebar = useFocusModeStore((s) => s.toggleSidebar);

  const toggleFocusMode = async () => {
    if (isFocusMode) {
      exitFocusMode();
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          /* ignore */
        }
      }
      return;
    }

    enterFocusMode();

    try {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
      };
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      }
    } catch {
      // In-app focus mode still active if browser blocks Fullscreen API
    }
  };

  return {
    isFocusMode,
    isSidebarOpen,
    toggleFocusMode,
    toggleSidebar,
  };
}
