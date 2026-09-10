import { useState, useEffect, useRef } from 'react';
import { Sidebar, navItems, masterItems, menuMasterItems } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFocusModeStore } from '@/store/useFocusModeStore';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogOut } from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { OnboardingSpotlightTour } from '@/components/layout/OnboardingSpotlightTour';
import { InternalPageGuideTour } from '@/components/layout/InternalPageGuideTour';

import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

export function MainLayout({ children, activeTab = 'board', onTabChange }: MainLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(() => {
    return localStorage.getItem('isSidebarCollapsed') === 'true';
  });

  const isFocusMode = useFocusModeStore((s) => s.isFocusMode);
  const isFocusSidebarOpen = useFocusModeStore((s) => s.isSidebarOpen);
  const exitFocusMode = useFocusModeStore((s) => s.exitFocusMode);
  const setSidebarOpen = useFocusModeStore((s) => s.setSidebarOpen);
  const hadBrowserFullscreen = useRef(false);

  const handleTabChange = (id: string) => {
    if (onTabChange) {
      onTabChange(id);
    }
    setIsMobileSidebarOpen(false);
  };

  const accessibleForms = useAuthStore((state) => state.accessibleForms);
  const fetchAccessibleForms = useAuthStore((state) => state.fetchAccessibleForms);
  const logout = useAuthStore((state) => state.logout);
  const isSettingsLoaded = useSettingsStore((state) => state.isLoaded);

  useEffect(() => {
    if (accessibleForms === null) {
      fetchAccessibleForms();
    }
  }, [accessibleForms, fetchAccessibleForms]);

  // Esc / browser exit fullscreen → leave focus mode
  useEffect(() => {
    const onFsChange = () => {
      if (document.fullscreenElement) {
        hadBrowserFullscreen.current = true;
        return;
      }
      if (hadBrowserFullscreen.current) {
        hadBrowserFullscreen.current = false;
        exitFocusMode();
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [exitFocusMode]);

  // Keep local collapse flag in sync when entering/leaving focus
  useEffect(() => {
    if (isFocusMode) {
      setIsDesktopSidebarCollapsed(true);
      setIsMobileSidebarOpen(false);
      return;
    }
    setIsDesktopSidebarCollapsed(localStorage.getItem('isSidebarCollapsed') === 'true');
  }, [isFocusMode]);

  // Focus-mode Menu open → also open mobile drawer on small screens
  useEffect(() => {
    if (!isFocusMode) return;
    if (isFocusSidebarOpen && window.matchMedia('(max-width: 1023px)').matches) {
      setIsMobileSidebarOpen(true);
    } else if (!isFocusSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  }, [isFocusMode, isFocusSidebarOpen]);

  useEffect(() => {
    if (accessibleForms && accessibleForms.length > 0 && onTabChange) {
      const allItems = [...navItems, ...masterItems, ...menuMasterItems];
      const currentItem = allItems.find((item) => item.id === activeTab);

      if (currentItem && currentItem.formNo && !accessibleForms.includes(currentItem.formNo)) {
        const firstAccessible = allItems.find(
          (item) => item.formNo && accessibleForms.includes(item.formNo)
        );
        if (firstAccessible) {
          onTabChange(firstAccessible.id);
        }
      }
    }
  }, [accessibleForms, activeTab, onTabChange]);

  if (accessibleForms === null || !isSettingsLoaded) {
    return <BrandLoader fullScreen message="Loading workspace" />;
  }

  if (accessibleForms !== null && accessibleForms.length === 0) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[var(--tm-page)] fixed inset-0 z-[100]">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Access Denied</h1>
        <p className="text-slate-300 mb-8 max-w-md text-center">
          You do not have access to any modules in the Task Management system. Please contact your
          system administrator for assistance.
        </p>
        <Button onClick={logout} className="gap-2 bg-[#0EA5E9] hover:bg-[#0284C7]">
          <LogOut size={16} />
          Logout
        </Button>
      </div>
    );
  }

  // Focus mode: fully open (w-56) or fully hidden (w-0). Normal: collapse to icons.
  const sidebarWidth = isFocusMode
    ? isFocusSidebarOpen
      ? 'w-56'
      : 'w-0 border-0'
    : isDesktopSidebarCollapsed
      ? 'w-[80px]'
      : 'w-56';

  const showDesktopSidebar = !isFocusMode || isFocusSidebarOpen;

  return (
    <div className="flex flex-col h-screen w-full fixed inset-0 bg-[var(--tm-page)] overflow-hidden">
      <Navbar
        onMenuClick={() => {
          if (isFocusMode) {
            setSidebarOpen(true);
            setIsMobileSidebarOpen(true);
          } else {
            setIsMobileSidebarOpen(true);
          }
        }}
        logoOnly={isFocusMode}
        isSidebarCollapsed={!isFocusMode && isDesktopSidebarCollapsed}
        onToggleSidebar={
          isFocusMode
            ? undefined
            : () => {
                setIsDesktopSidebarCollapsed((prev) => {
                  const next = !prev;
                  localStorage.setItem('isSidebarCollapsed', String(next));
                  return next;
                });
              }
        }
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Mobile Sidebar Slide-Over Drawer */}
        <div
          className={cn(
            'fixed inset-0 z-50 lg:hidden transition-all duration-300',
            isMobileSidebarOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
          )}
        >
          <div
            className={cn(
              'absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-300',
              isMobileSidebarOpen ? 'opacity-100' : 'opacity-0'
            )}
            onClick={() => {
              setIsMobileSidebarOpen(false);
              if (isFocusMode) setSidebarOpen(false);
            }}
          />

          <div
            className={cn(
              'absolute inset-y-0 left-0 w-56 bg-[var(--tm-sidebar)] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col h-full border-r border-[var(--tm-chrome-border)]',
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <Sidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onClose={() => {
                setIsMobileSidebarOpen(false);
                if (isFocusMode) setSidebarOpen(false);
              }}
            />
          </div>
        </div>

        {/* Desktop Static Sidebar */}
        <div
          className={cn(
            'relative hidden lg:flex h-full transition-all duration-300',
            sidebarWidth,
            showDesktopSidebar ? 'overflow-visible' : 'overflow-hidden pointer-events-none opacity-0'
          )}
        >
          <Sidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isCollapsed={!isFocusMode && isDesktopSidebarCollapsed}
            hideBrand
            onToggleCollapse={
              isFocusMode
                ? undefined
                : () => {
                    setIsDesktopSidebarCollapsed((prev) => {
                      const next = !prev;
                      localStorage.setItem('isSidebarCollapsed', String(next));
                      return next;
                    });
                  }
            }
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-transparent">
            {children}
          </main>
        </div>
      </div>

      <OnboardingSpotlightTour />
      <InternalPageGuideTour />
    </div>
  );
}
