import { useState, useEffect } from 'react';
import { Sidebar, navItems, masterItems, menuMasterItems } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogOut } from 'lucide-react';

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

  const handleTabChange = (id: string) => {
    if (onTabChange) {
      onTabChange(id);
    }
    setIsMobileSidebarOpen(false);
  };

  const accessibleForms = useAuthStore(state => state.accessibleForms);
  const fetchAccessibleForms = useAuthStore(state => state.fetchAccessibleForms);
  const logout = useAuthStore(state => state.logout);
  const isSettingsLoaded = useSettingsStore(state => state.isLoaded);

  useEffect(() => {
    if (accessibleForms === null) {
      fetchAccessibleForms();
    }
  }, [accessibleForms, fetchAccessibleForms]);

  useEffect(() => {
    if (accessibleForms && accessibleForms.length > 0 && onTabChange) {
      const allItems = [...navItems, ...masterItems, ...menuMasterItems];
      const currentItem = allItems.find(item => item.id === activeTab);

      // If the current tab has a formNo and the user doesn't have access to it
      if (currentItem && currentItem.formNo && !accessibleForms.includes(currentItem.formNo)) {
        // Find the first accessible item
        const firstAccessible = allItems.find(item => item.formNo && accessibleForms.includes(item.formNo));
        if (firstAccessible) {
          onTabChange(firstAccessible.id);
        }
      }
    }
  }, [accessibleForms, activeTab, onTabChange]);

  if (accessibleForms === null || !isSettingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc] fixed inset-0 z-[100]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#006699]"></div>
      </div>
    );
  }

  if (accessibleForms !== null && accessibleForms.length === 0) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#f8fafc] fixed inset-0 z-[100]">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-slate-600 mb-8 max-w-md text-center">
          You do not have access to any modules in the Task Management system. Please contact your system administrator for assistance.
        </p>
        <Button onClick={logout} className="gap-2 bg-[#006699] hover:bg-[#005580]">
          <LogOut size={16} />
          Logout
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full fixed inset-0 bg-white overflow-hidden">
      {/* Mobile Sidebar Slide-Over Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-all duration-300",
          isMobileSidebarOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"
        )}
      >
        {/* Backdrop overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300",
            isMobileSidebarOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setIsMobileSidebarOpen(false)}
        />

        {/* Drawer Panel */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col h-full",
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onClose={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Desktop Static Sidebar */}
      <div className={cn("hidden lg:flex h-full transition-all duration-300", isDesktopSidebarCollapsed ? "w-[80px]" : "w-64")}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCollapsed={isDesktopSidebarCollapsed}
          onToggleCollapse={() => {
            setIsDesktopSidebarCollapsed(prev => {
              const next = !prev;
              localStorage.setItem('isSidebarCollapsed', String(next));
              return next;
            });
          }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-hidden flex flex-col bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
