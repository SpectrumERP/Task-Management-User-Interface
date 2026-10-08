import { useEffect, useState } from 'react';
import {
  Folder,
  ChevronDown,
  Check,
  Menu,
  Search,
  LogOut,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelLeftClose,
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
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useToggleFocusMode } from '@/hooks/useToggleFocusMode';
import { FullscreenHelpGuide } from '@/components/layout/FullscreenHelpGuide';
import { NotificationNav } from '@/components/layout/NotificationNav';
import { forceStartOnboardingTour } from '@/components/layout/OnboardingSpotlightTour';
import { forceStartPageGuide } from '@/components/layout/InternalPageGuideTour';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { cn } from '@/lib/utils';
import { UserType } from '@/types/enums';
import { ModuleLauncher } from '@/components/layout/ModuleLauncher';
// Header copy of the client logo, trimmed to its edges so it reads at header size.
import SteelMontLogo from '@/assets/SteelMontLogoHeader.png';

/** CRM sidebar toggle glyph (panel with a left rail). */
function SidebarToggleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path strokeLinecap="round" d="M9 3.5v17" />
    </svg>
  );
}

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
  const initial = printingName.charAt(0).toUpperCase();
  const userTypeValue = Number(user?.UserType ?? user?.userType ?? user?.role);
  const roleLabel =
    userTypeValue === UserType.admin
      ? 'Admin'
      : userTypeValue === UserType.General
        ? 'General'
        : (typeof user?.role === 'string' && user.role.trim() ? user.role : null);
  // Avatar text like the CRM header: first letters of two words, else the first two letters (EDP → ED).
  const nameParts = printingName.trim().split(/\s+/).filter(Boolean);
  const avatarInitials = (
    nameParts.length > 1 ? `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}` : printingName.trim().slice(0, 2)
  ).toUpperCase() || initial;

  const filteredFolders = fillValues?.folder?.filter((f: any) =>
    f["Folder Name"]?.toLowerCase().includes(folderSearch.toLowerCase())
  ) || [];

  // Account menu — same look as the CRM's: avatar header, plain rows (grey hover), Sign Out in red below a line.
  const profileMenuBody = (
    <>
      <div className="flex items-center gap-3 border-b border-[#EEF2F6] px-4 py-3 dark:border-[var(--tm-border)]">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-[linear-gradient(135deg,#1E56A0,#C41E1E)] text-white text-sm font-bold">
            {avatarInitials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#0c1a3a] dark:text-[#E2E8F0]">{printingName}</p>
          <p className="truncate text-xs text-[#7a8494]">{roleLabel ?? `@${loginId}`}</p>
        </div>
      </div>

      <DropdownMenuItem
        className="flex w-full cursor-pointer items-center gap-3 rounded-none px-4 py-2.5 text-left text-xs font-medium text-[#4a5d82] outline-none transition-colors hover:bg-[#F1F5F9] focus:bg-[#F1F5F9] focus:text-[#4a5d82] data-[highlighted]:bg-[#F1F5F9] data-[highlighted]:text-[#4a5d82] dark:text-slate-300 dark:hover:bg-[var(--tm-muted)] dark:focus:bg-[var(--tm-muted)] dark:data-[highlighted]:bg-[var(--tm-muted)] [&_svg]:size-3.5"
        onSelect={() => {
          // Delay so dropdown closes before mask opens
          window.setTimeout(() => forceStartOnboardingTour(), 80);
        }}
      >
        <Sparkles className="shrink-0 text-[#94a3b8]" strokeWidth={2} />
        <span className="flex-1">Spectrum Guide</span>
      </DropdownMenuItem>

      <DropdownMenuItem
        className="flex w-full cursor-pointer items-center gap-3 rounded-none px-4 py-2.5 text-left text-xs font-medium text-[#4a5d82] outline-none transition-colors hover:bg-[#F1F5F9] focus:bg-[#F1F5F9] focus:text-[#4a5d82] data-[highlighted]:bg-[#F1F5F9] data-[highlighted]:text-[#4a5d82] dark:text-slate-300 dark:hover:bg-[var(--tm-muted)] dark:focus:bg-[var(--tm-muted)] dark:data-[highlighted]:bg-[var(--tm-muted)] [&_svg]:size-3.5"
        onSelect={() => {
          window.setTimeout(() => forceStartPageGuide(), 80);
        }}
      >
        <BookOpen className="shrink-0 text-[#94a3b8]" strokeWidth={2} />
        <span className="flex-1">Page Guide</span>
      </DropdownMenuItem>

      <div className="mt-1 border-t border-[#EEF2F6] dark:border-[var(--tm-border)]">
        <DropdownMenuItem
          className="flex w-full cursor-pointer items-center gap-3 rounded-none px-4 py-2.5 text-left text-xs font-semibold text-[#c41e1e] outline-none transition-colors hover:bg-[#fff0f0] focus:bg-[#fff0f0] focus:text-[#c41e1e] data-[highlighted]:bg-[#fff0f0] data-[highlighted]:text-[#c41e1e] dark:hover:bg-red-500/10 dark:focus:bg-red-500/10 dark:data-[highlighted]:bg-red-500/10 [&_svg]:size-3.5"
          onClick={() => logout()}
        >
          <LogOut className="shrink-0" strokeWidth={2} />
          <span className="flex-1">Sign Out</span>
        </DropdownMenuItem>
      </div>
    </>
  );

  return (
    <header
      className={cn(
        "theme-app-chrome relative h-[calc(3.5rem+1px)] w-full shrink-0 flex items-center border-b z-40 overflow-visible transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300",
        isScrolled
          ? "bg-[var(--tm-chrome)]/95 backdrop-blur-md border-[var(--tm-chrome-border)] shadow-sm"
          : "bg-[var(--tm-chrome)] border-[var(--tm-chrome-border)]",
        className
      )}
    >
      {logoOnly ? (
        <div className="flex h-full w-full items-center justify-between gap-3 pr-4 sm:pr-5">
          {/* Full screen, as in the CRM: menu open → blue rail with the light logo above the sidebar (slides with it);
              menu closed → the colour logo in the white header. */}
          <div className="flex h-full min-w-0 items-center">
            <div
              aria-hidden={!isSidebarOpen}
              className={cn(
                "theme-header-rail crm-rail relative z-[1] hidden lg:flex h-[calc(100%+1px)] self-start items-center shrink-0 overflow-hidden bg-[#1E56A0] transition-[width] duration-300",
                isSidebarOpen ? "w-56 border-r border-b border-white/10" : "w-0 border-0"
              )}
            >
              <div className="w-56 shrink-0 px-3">
                <img
                  src={`${import.meta.env.BASE_URL}spectrum-erp-logo-on-dark.png`}
                  alt="Spectrum ERP"
                  className="block h-9 w-full min-w-0 object-contain object-left"
                />
              </div>
            </div>
            <div className={cn("flex min-w-0 items-center pl-4", isSidebarOpen && "lg:hidden")}>
              <img src={`${import.meta.env.BASE_URL}spectrum-erp-logo.png`} alt="Spectrum ERP" className="block h-8 w-auto max-w-[10.5rem] object-contain object-left" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ActionTip label={isSidebarOpen ? 'Close menu' : 'Open menu'}>
              <Button
                type="button"
                variant="outline"
                onClick={toggleSidebar}
                aria-label={isSidebarOpen ? 'Close left menu' : 'Open left menu'}
                className="h-8 w-8 p-0 rounded-lg border border-[#CBD5E1] bg-[#eef3fc] text-[#1E56A0] hover:border-[#1E56A0] hover:bg-[#eef3fc] active:scale-95 shadow-none transition-[background-color,border-color,color,transform] duration-200"
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
                className="h-8 w-8 p-0 rounded-lg border border-[#CBD5E1] bg-[#eef3fc] text-[#1E56A0] hover:border-[#1E56A0] hover:bg-[#eef3fc] active:scale-95 shadow-none transition-[background-color,border-color,color,transform] duration-200"
              >
                <Minimize2 size={15} />
              </Button>
            </ActionTip>

            <ThemeToggle variant="chip" size="md" className="h-8 w-8 p-0 rounded-lg border border-[#CBD5E1] bg-[#eef3fc] text-[#1E56A0] hover:border-[#1E56A0] hover:bg-[#eef3fc] active:scale-95 shadow-none transition-[background-color,border-color,color,transform] duration-200 dark:border-[#CBD5E1] dark:bg-[#eef3fc] dark:text-[#1E56A0] dark:hover:bg-[#eef3fc] dark:hover:text-[#1E56A0]" />

            <FullscreenHelpGuide autoOpenOnce={false} />

            <NotificationNav />


            <DropdownMenu>
              <ActionTip label="Account">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    data-tour="profile"
                    aria-label={`Account menu for ${printingName}`}
                    className={cn(
                      "group h-9 gap-2 rounded-lg border-0 bg-transparent px-2 py-1",
                      "hover:bg-[#F1F5F9] data-[state=open]:bg-[#F1F5F9]",
                      "transition-colors shadow-none"
                    )}
                  >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-[linear-gradient(135deg,#1E56A0,#C41E1E)] text-white text-xs font-bold">
                      {avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex items-center gap-1.5 min-w-0 text-left">
                    <span className="text-[13px] font-semibold text-[#0c1a3a] dark:text-[#E2E8F0] truncate max-w-[140px]">
                      {printingName}
                    </span>
                  </div>
                  <ChevronDown
                    size={13}
                    strokeWidth={2.2}
                    className="hidden sm:block text-[#94a3b8] shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  />
                </Button>
              </DropdownMenuTrigger>
              </ActionTip>
              <DropdownMenuContent
                className="w-56 rounded-xl p-0 overflow-hidden border border-[#E2E8F0] bg-white shadow-[0_16px_48px_rgba(12,26,58,0.18)] dark:border-[var(--tm-border)] dark:bg-[var(--tm-surface)]"
                align="end"
                sideOffset={6}
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
                  className="h-8 w-8 rounded-lg bg-[#eef3fc] hover:bg-[#dfe9f9] flex items-center justify-center shrink-0 border border-[#CBD5E1]"
                >
                  <Menu size={16} className="text-[#1E56A0]" />
                </Button>
              </ActionTip>
            )}
            <img src={`${import.meta.env.BASE_URL}spectrum-erp-logo.png`} alt="Spectrum ERP" className="block h-8 w-auto max-w-[10.5rem] object-contain object-left" />
          </div>

          {/* Desktop brand rail — CRM layout:
          - Expanded: logo in the blue rail; "Collapse menu" button just after it in the header
          - Collapsed: "Expand menu" button in the rail; logo in the header */}
          <div
            className={cn(
              "theme-header-rail crm-rail relative z-[1] hidden lg:flex h-[calc(100%+1px)] self-start items-center shrink-0 overflow-visible border-r border-b border-white/10 bg-[#1E56A0] transition-[width] duration-300",
              isSidebarCollapsed ? "w-14 justify-center px-1" : "w-56 px-3"
            )}
          >
            {!isSidebarCollapsed && (
              <img
                src={`${import.meta.env.BASE_URL}spectrum-erp-logo-on-dark.png`}
                alt="Spectrum ERP"
                className="block h-9 w-full min-w-0 object-contain object-left"
              />
            )}

            {onToggleSidebar && isSidebarCollapsed && (
              <ActionTip label="Expand menu" side="right">
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  aria-label="Expand menu"
                  aria-expanded={false}
                  className="group inline-flex h-9 w-9 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  data-tour="sidebar-toggle"
                >
                  <span
                    aria-hidden
                    className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-white transition-colors group-hover:bg-white/20"
                  >
                    <SidebarToggleIcon size={15} />
                  </span>
                </button>
              </ActionTip>
            )}
          </div>

          {/* Expanded: CRM "Collapse menu" button. Collapsed: the logo (the rail holds the expand button). */}
          {onToggleSidebar && !isSidebarCollapsed && (
            <div className="hidden lg:flex items-center pl-4 shrink-0">
              <ActionTip label="Collapse menu" side="bottom">
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  aria-label="Collapse menu"
                  aria-expanded
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E56A0]/25 bg-[#1E56A0] text-white shadow-sm transition-[background-color,transform] duration-200 ease-out hover:bg-[#17457F] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E56A0]"
                  data-tour="sidebar-toggle"
                >
                  <SidebarToggleIcon size={15} />
                </button>
              </ActionTip>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="hidden lg:flex items-center pl-4 min-w-0">
              <img src={`${import.meta.env.BASE_URL}spectrum-erp-logo.png`} alt="Spectrum ERP" className="block h-8 w-auto max-w-[10.5rem] object-contain object-left" />
            </div>
          )}
          {/* Spectrum ERP │ client (SteelMont) logo — vertical line, then the client logo; desktop/tablet only */}
          <div className="hidden shrink-0 items-center gap-3 pl-3 md:flex">
            <span aria-hidden className="h-8 w-px bg-[#CBD5E1] dark:bg-[var(--tm-border)]" />
            <span className="client-logo-chip">
              <img src={SteelMontLogo} alt="SteelMont" className="client-logo block h-10 w-auto object-contain" />
            </span>
          </div>
          {/* Spectrum ERP module launcher — after the sidebar toggle / logo, as in the CRM */}
          <div className="flex items-center pl-2 lg:pl-3 shrink-0">
            <ModuleLauncher />
          </div>
          <div className="flex flex-1 items-center justify-end gap-1.5 lg:gap-2 min-w-0 px-4 sm:px-5">
            {!isHideFolder && (
              <DropdownMenu>
                <ActionTip label="Folders">
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      aria-label="Folders"
                      className="flex items-center gap-2 px-2.5 h-8 rounded-lg border border-[#CBD5E1] bg-[var(--tm-surface)] hover:border-[#1E56A0] transition-colors font-semibold text-xs text-slate-200 shadow-none"
                    >
                    <div className="flex w-6 h-6 shrink-0 items-center justify-center rounded-lg bg-[#1E56A0]/10 text-[#1E56A0]">
                      <Folder size={14} className="fill-[#1E56A0]/20" />
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
                        className="h-8 pl-8 text-xs bg-[var(--tm-muted)] border-[var(--tm-border)] focus-visible:ring-1 focus-visible:ring-[#1E56A0]/30"
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
                              ? "bg-[#1E56A0]/5 text-[#1E56A0]"
                              : "text-slate-300 hover:bg-[var(--tm-muted)]"
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${isSelected ? "bg-[#1E56A0]/10 text-[#1E56A0]" : "bg-[var(--tm-muted)] text-slate-400"
                                }`}>
                                <Folder size={12} className={isSelected ? "fill-[#1E56A0]/20" : ""} />
                              </div>
                              <span className="truncate">{folder["Folder Name"]}</span>
                            </div>
                            {isSelected && <Check size={14} className="text-[#1E56A0] stroke-[3]" />}
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
                className="h-8 w-8 p-0 rounded-lg border border-[#CBD5E1] bg-[#eef3fc] text-[#1E56A0] hover:border-[#1E56A0] hover:bg-[#eef3fc] active:scale-95 shadow-none transition-[background-color,border-color,color,transform] duration-200"
              >
                {isFocusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </Button>
            </ActionTip>

            <ThemeToggle variant="chip" size="md" className="h-8 w-8 p-0 rounded-lg border border-[#CBD5E1] bg-[#eef3fc] text-[#1E56A0] hover:border-[#1E56A0] hover:bg-[#eef3fc] active:scale-95 shadow-none transition-[background-color,border-color,color,transform] duration-200 dark:border-[#CBD5E1] dark:bg-[#eef3fc] dark:text-[#1E56A0] dark:hover:bg-[#eef3fc] dark:hover:text-[#1E56A0]" />

            <FullscreenHelpGuide autoOpenOnce={false} />

            <NotificationNav />


            <DropdownMenu>
              <ActionTip label="Account">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    data-tour="profile"
                    aria-label={`Account menu for ${printingName}`}
                    className={cn(
                      "group h-9 gap-2 rounded-lg border-0 bg-transparent px-2 py-1",
                      "hover:bg-[#F1F5F9] data-[state=open]:bg-[#F1F5F9]",
                      "transition-colors shadow-none"
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-[linear-gradient(135deg,#1E56A0,#C41E1E)] text-white text-xs font-bold">
                        {avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex items-center gap-1.5 min-w-0 text-left">
                      <span className="text-[13px] font-semibold text-[#0c1a3a] dark:text-[#E2E8F0] truncate max-w-[140px]">
                        {printingName}
                      </span>
                    </div>
                    <ChevronDown
                      size={13}
                      strokeWidth={2.2}
                      className="hidden sm:block text-[#94a3b8] shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    />
                  </Button>
                </DropdownMenuTrigger>
              </ActionTip>
              <DropdownMenuContent
                className="w-56 rounded-xl p-0 overflow-hidden border border-[#E2E8F0] bg-white shadow-[0_16px_48px_rgba(12,26,58,0.18)] dark:border-[var(--tm-border)] dark:bg-[var(--tm-surface)]"
                align="end"
                sideOffset={6}
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
