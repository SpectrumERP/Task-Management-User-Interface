import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';

import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

export function MainLayout({ children, activeTab = 'board', onTabChange }: MainLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const handleTabChange = (id: string) => {
    if (onTabChange) {
      onTabChange(id);
    }
    setIsMobileSidebarOpen(false);
  };

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
          onToggleCollapse={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
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
