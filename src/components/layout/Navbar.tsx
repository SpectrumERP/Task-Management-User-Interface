import { useEffect, useState } from 'react';
import {
  Folder,
  ChevronDown,
  Check,
  Menu,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelLeftClose,
  HelpCircle,
  Sparkles,
  BookOpen,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ClipboardDrawer } from '@/components/ui/ClipboardDrawer';
import { useSettings } from '@/hooks/useSettings';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useToggleFocusMode } from '@/hooks/useToggleFocusMode';
import { FullscreenHelpGuide } from '@/components/layout/FullscreenHelpGuide';
import { NotificationNav } from '@/components/layout/NotificationNav';
import { forceStartOnboardingTour } from '@/components/layout/OnboardingSpotlightTour';
import { forceStartPageGuide } from '@/components/layout/InternalPageGuideTour';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onMenuClick?: () => void;
  /** Desktop sidebar expand/collapse */
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  /** Full-screen / focus: show brand logo only */
  logoOnly?: boolean;
  className?: string;
}

export function Navbar({ onMenuClick, onToggleSidebar, isSidebarCollapsed = false, logoOnly = false, className }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const { fillValues, selectedFolder, setSelectedFolder, fetchFillValues } = useTaskStore();
  const { isHideFolder } = useSettings();
  const { isFocusMode, isSidebarOpen, toggleFocusMode, toggleSidebar } = useToggleFocusMode();

  const [folderSearch, setFolderSearch] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!fillValues) {
      fetchFillValues(companyNo.toString());
    }
  }, [fillValues, fetchFillValues]);

  useEffect(() => {
    const isIgnoredScrollTarget = (el: HTMLElement) =>
      !!el.closest('[role="menu"], [data-radix-popper-content-wrapper], [data-radix-select-content], [data-radix-dropdown-menu-content]');

    const handleScroll = (event: Event) => {
      const target = event.target;

      if (target === document || target === document.documentElement || target === document.body) {
        setIsScrolled((window.scrollY || document.documentElement.scrollTop || 0) > 8);
        return;
      }

      if (!(target instanceof HTMLElement)) return;
      if (isIgnoredScrollTarget(target)) return;

      // Only react to elements that actually scroll
      if (target.scrollHeight <= target.clientHeight + 2) return;

      setIsScrolled(target.scrollTop > 8);
    };

    document.addEventListener('scroll', handleScroll, true);
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, []);

  const handleFolderChange = (folder: any) => {
    setSelectedFolder(folder);
  };

  const printingName = user?.PrintingName || user?.name || 'User';
  const loginId = user?.LoginID || user?.username || 'admin';
  const email = user?.Email || user?.email || '';
  const initial = printingName.charAt(0).toUpperCase();

  const filteredFolders = fillValues?.folder?.filter((f: any) =>
    f["Folder Name"]?.toLowerCase().includes(folderSearch.toLowerCase())
  ) || [];

  const profileMenuBody = (
    <>
      <div className="relative overflow-hidden px-3.5 pt-3.5 pb-3">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tm-tint)_0%,var(--tm-muted)_55%)]" />
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
              <AvatarFallback className="bg-[#0EA5E9] text-white text-[15px] font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 min-w-0">
              <span className="text-[13.5px] font-semibold text-slate-100 truncate">
                {printingName}
              </span>
              <span className="text-[11.5px] font-medium text-[#0EA5E9] truncate shrink-0">
                @{loginId}
              </span>
            </p>
            {email ? (
              <p className="mt-1 text-[11px] text-slate-400 truncate">{email}</p>
            ) : (
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-emerald-400/90">
                Active session
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-3 h-px bg-[var(--tm-muted)]" />

      <div className="p-2 space-y-0.5">
        <DropdownMenuItem
          className="group/help flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-slate-300 outline-none focus:bg-[#0EA5E9]/10 focus:text-[#0EA5E9] data-[highlighted]:bg-[#0EA5E9]/10 data-[highlighted]:text-[#0EA5E9]"
          onSelect={() => {
            // Delay so dropdown closes before mask opens
            window.setTimeout(() => forceStartOnboardingTour(), 80);
          }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]/12 text-[#0EA5E9] transition-colors group-hover/help:bg-[#0EA5E9]/20">
            <Sparkles size={15} strokeWidth={2} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
            <span className="inline-flex items-center gap-1.5">
              Spectrum Guide
              <HelpCircle size={12} className="opacity-70" />
            </span>
            <span className="mt-0.5 text-[10px] font-medium text-slate-400 group-hover/help:text-[#0EA5E9]/80">
              App chrome walkthrough — sidebar, header, theme
            </span>
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="group/page flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-slate-300 outline-none focus:bg-[#0EA5E9]/10 focus:text-[#0EA5E9] data-[highlighted]:bg-[#0EA5E9]/10 data-[highlighted]:text-[#0EA5E9]"
          onSelect={() => {
            window.setTimeout(() => forceStartPageGuide(), 80);
          }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]/12 text-[#0EA5E9] transition-colors group-hover/page:bg-[#0EA5E9]/20">
            <BookOpen size={15} strokeWidth={2} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
            <span>Page Guide</span>
            <span className="mt-0.5 text-[10px] font-medium text-slate-400 group-hover/page:text-[#0EA5E9]/80">
              Is page ke inner controls ka walkthrough
            </span>
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="group/logout flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-slate-300 outline-none focus:bg-red-500/10 focus:text-red-400 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-400"
          onClick={logout}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--tm-muted)] text-slate-500 transition-colors group-hover/logout:bg-red-100 group-hover/logout:text-red-400 group-focus/logout:bg-red-100 group-focus/logout:text-red-400 data-[highlighted]:bg-red-100">
            <LogOut size={15} strokeWidth={2} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
            <span>Log out</span>
            <span className="mt-0.5 text-[10px] font-medium text-slate-400 group-hover/logout:text-red-400 group-focus/logout:text-red-400">
              End your current session
            </span>
          </span>
        </DropdownMenuItem>
      </div>
    </>
  );

  return (
    <header
      className={cn(
        "theme-app-chrome relative h-14 w-full shrink-0 flex items-center border-b z-40 overflow-visible transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300",
        isScrolled
          ? "bg-[var(--tm-chrome)]/95 backdrop-blur-md border-[var(--tm-chrome-border)] shadow-sm"
          : "bg-[var(--tm-chrome)] border-[var(--tm-chrome-border)]",
        className
      )}
    >
      {logoOnly ? (
        <div className="flex h-full w-full items-center justify-between gap-3 px-4 sm:px-5">
          <BrandLogo maxHeight={44} maxWidth={200} className="min-w-0" />
          <div className="flex items-center gap-2 shrink-0">
            <ActionTip label={isSidebarOpen ? 'Close menu' : 'Open menu'}>
              <Button
                type="button"
                variant="outline"
                onClick={toggleSidebar}
                aria-label={isSidebarOpen ? 'Close left menu' : 'Open left menu'}
                className="h-9 w-9 p-0 rounded-[8px] text-[#0EA5E9] border-[#0EA5E9]/35 bg-[#0EA5E9]/10 hover:bg-[#0EA5E9]/20 shadow-none"
              >
                {isSidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
              </Button>
            </ActionTip>
            <ActionTip label="Exit full screen">
              <Button
                type="button"
                variant="outline"
                onClick={toggleFocusMode}
                aria-label="Exit full screen"
                className="h-9 w-9 p-0 rounded-[8px] text-[#0EA5E9] border-[#0EA5E9]/35 bg-[#0EA5E9]/10 hover:bg-[#0EA5E9]/20 shadow-none"
              >
                <Minimize2 size={15} />
              </Button>
            </ActionTip>

            <FullscreenHelpGuide autoOpenOnce={false} />

            <NotificationNav />

            <ThemeToggle variant="chip" size="md" />

            <DropdownMenu>
              <ActionTip label="Account">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    data-tour="profile"
                    aria-label={`Account menu for ${printingName}`}
                    className={cn(
                      "group h-9 gap-2 rounded-[8px] border border-[#0EA5E9]/35 bg-[#0EA5E9]/10 pl-1 pr-2.5",
                      "hover:bg-[#0EA5E9]/20 data-[state=open]:bg-[#0EA5E9]/20",
                      "transition-colors shadow-none"
                    )}
                  >
                  <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-[#0EA5E9] text-white text-[12px] font-semibold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--tm-chrome)] bg-emerald-500" />
                  </span>
                  <div className="hidden sm:flex items-center gap-1.5 min-w-0 text-left">
                    <span className="text-[12px] font-semibold text-slate-100 truncate max-w-[90px]">
                      {printingName}
                    </span>
                    <span className="text-[11px] font-medium text-[#0EA5E9]/80 truncate max-w-[80px]">
                      @{loginId}
                    </span>
                  </div>
                  <ChevronDown
                    size={13}
                    strokeWidth={2.2}
                    className="hidden sm:block text-slate-400 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  />
                </Button>
              </DropdownMenuTrigger>
              </ActionTip>
              <DropdownMenuContent
                className="w-[272px] rounded-2xl p-0 overflow-hidden border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_16px_40px_-12px_rgba(15,23,42,0.25)]"
                align="end"
                sideOffset={10}
                forceMount
              >
                {profileMenuBody}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: menu + logo */}
          <div className="flex lg:hidden items-center gap-2.5 min-w-0 pl-4">
            {onMenuClick && (
              <ActionTip label="Menu">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMenuClick}
                  aria-label="Open menu"
                  className="w-10 rounded-xl hover:bg-[var(--tm-muted)] flex items-center justify-center shrink-0 border border-[var(--tm-border)]/80"
                >
                  <Menu size={20} className="text-slate-300" />
                </Button>
              </ActionTip>
            )}
            <BrandLogo maxHeight={44} maxWidth={200} className="min-w-0" />
          </div>

          {/* Desktop brand rail
          - Expanded: full logo in rail, collapse arrow on vertical divider
          - Collapsed: expand arrow centered in rail (fills the icon column),
            full logo alone after divider (no twin-logo clash) */}
          <div
            className={cn(
              "theme-header-rail relative hidden lg:flex h-full items-center shrink-0 overflow-visible border-r border-[var(--tm-chrome-border)] transition-[width] duration-300",
              isSidebarCollapsed ? "w-14 justify-center px-1" : "w-56 pl-3 pr-4"
            )}
          >
            {!isSidebarCollapsed && (
              <BrandLogo maxHeight={44} maxWidth={148} className="min-w-0" />
            )}

            {onToggleSidebar && (
              <span
                className={cn(
                  'z-50',
                  isSidebarCollapsed
                    ? 'relative'
                    : 'absolute top-1/2 -translate-y-1/2 -right-[9px]'
                )}
              >
                <ActionTip
                  label={isSidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
                  side="bottom"
                >
                  <button
                    type="button"
                    onClick={onToggleSidebar}
                    aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className={cn(
                      'theme-sidebar-edge-toggle inline-flex items-center justify-center',
                      'rounded-md border border-white/10',
                      'bg-[#2A303C] text-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.35)]',
                      'hover:bg-[#353B4A] hover:text-white',
                      'transition-colors duration-200',
                      isSidebarCollapsed ? 'h-9 w-9' : 'h-8 w-[18px]'
                    )}
                    data-tour="sidebar-toggle"
                  >
                    {isSidebarCollapsed ? (
                      <ChevronRight size={16} strokeWidth={2.25} />
                    ) : (
                      <ChevronLeft size={14} strokeWidth={2.25} />
                    )}
                  </button>
                </ActionTip>
              </span>
            )}
          </div>

          {/* Collapsed: one clear logo after the rail — not next to a twin control */}
          {isSidebarCollapsed && (
            <div className="hidden lg:flex items-center pl-4 min-w-0">
              <BrandLogo maxHeight={44} maxWidth={200} className="min-w-0" />
            </div>
          )}
          <div className="flex flex-1 items-center justify-end gap-2 min-w-0 px-4 sm:px-5">
            {!isHideFolder && (
              <DropdownMenu>
                <ActionTip label="Folders">
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      aria-label="Folders"
                      className="flex items-center gap-2.5 px-3.5 h-9 rounded-xl border border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] hover:border-[#0EA5E9]/25 transition-all font-semibold text-xs text-slate-200 shadow-sm"
                    >
                    <div className="flex w-6 h-6 shrink-0 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9]">
                      <Folder size={14} className="fill-[#0EA5E9]/20" />
                    </div>
                    <span className="max-w-[150px] truncate text-slate-200 font-semibold text-[11px]">
                      {selectedFolder ? selectedFolder["Folder Name"] : "Select Folder..."}
                    </span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                </ActionTip>
                <DropdownMenuContent className="w-72 rounded-xl p-1 shadow-xl border border-[var(--tm-border)] bg-[var(--tm-surface)] max-h-[60vh] flex flex-col" align="end">
                  <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2 shrink-0">
                    Select Workspace Folder
                  </DropdownMenuLabel>

                  <div className="px-2 pb-2 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Search folders..."
                        value={folderSearch}
                        onChange={(e) => setFolderSearch(e.target.value)}
                        className="h-8 pl-8 text-xs bg-[var(--tm-muted)] border-[var(--tm-border)] focus-visible:ring-1 focus-visible:ring-[#0EA5E9]/30"
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <DropdownMenuSeparator className="my-0 bg-[var(--tm-muted)] shrink-0" />

                  <div className="overflow-y-auto overflow-x-hidden p-1 flex-1">
                    {filteredFolders.length > 0 ? (
                      filteredFolders.map((folder: any) => {
                        const isSelected = selectedFolder?.TaskFolderNo === folder.TaskFolderNo;
                        return (
                          <DropdownMenuItem
                            key={folder.TaskFolderNo}
                            onClick={() => handleFolderChange(folder)}
                            className={`flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer text-xs font-bold transition-all ${isSelected
                              ? "bg-[#0EA5E9]/5 text-[#0EA5E9]"
                              : "text-slate-300 hover:bg-[var(--tm-muted)]"
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${isSelected ? "bg-[#0EA5E9]/10 text-[#0EA5E9]" : "bg-[var(--tm-muted)] text-slate-400"
                                }`}>
                                <Folder size={12} className={isSelected ? "fill-[#0EA5E9]/20" : ""} />
                              </div>
                              <span className="truncate">{folder["Folder Name"]}</span>
                            </div>
                            {isSelected && <Check size={14} className="text-[#0EA5E9] stroke-[3]" />}
                          </DropdownMenuItem>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-center text-xs font-medium text-slate-400">
                        No folders found
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <ClipboardDrawer />

            <ActionTip label={isFocusMode ? 'Exit full screen' : 'Full screen'}>
              <Button
                type="button"
                variant="outline"
                onClick={toggleFocusMode}
                aria-label={isFocusMode ? 'Exit full screen' : 'Full screen'}
                data-tour="fullscreen"
                className="h-9 w-9 p-0 rounded-[8px] text-[#0EA5E9] border-[#0EA5E9]/35 bg-[#0EA5E9]/10 hover:bg-[#0EA5E9]/20 shadow-none"
              >
                {isFocusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </Button>
            </ActionTip>

            <FullscreenHelpGuide autoOpenOnce={false} />

            <NotificationNav />

            <ThemeToggle variant="chip" size="md" />

            <DropdownMenu>
              <ActionTip label="Account">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    data-tour="profile"
                    aria-label={`Account menu for ${printingName}`}
                    className={cn(
                      "group h-9 gap-2 rounded-[8px] border border-[#0EA5E9]/35 bg-[#0EA5E9]/10 pl-1 pr-2.5",
                      "hover:bg-[#0EA5E9]/20 data-[state=open]:bg-[#0EA5E9]/20",
                      "transition-colors shadow-none"
                    )}
                  >
                    <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-[#0EA5E9] text-white text-[12px] font-semibold">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--tm-chrome)] bg-emerald-500" />
                    </span>
                    <div className="hidden sm:flex items-center gap-1.5 min-w-0 text-left">
                      <span className="text-[12px] font-semibold text-slate-100 truncate max-w-[90px]">
                        {printingName}
                      </span>
                      <span className="text-[11px] font-medium text-[#0EA5E9]/80 truncate max-w-[80px]">
                        @{loginId}
                      </span>
                    </div>
                    <ChevronDown
                      size={13}
                      strokeWidth={2.2}
                      className="hidden sm:block text-slate-400 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    />
                  </Button>
                </DropdownMenuTrigger>
              </ActionTip>
              <DropdownMenuContent
                className="w-[272px] rounded-2xl p-0 overflow-hidden border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_16px_40px_-12px_rgba(15,23,42,0.25)]"
                align="end"
                sideOffset={10}
                forceMount
              >
                {profileMenuBody}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </header>
  );
}
