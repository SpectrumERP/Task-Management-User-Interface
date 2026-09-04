import { useEffect, useState } from 'react';
import { Folder, ChevronDown, Check, Menu, Search, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ClipboardDrawer } from '@/components/ui/ClipboardDrawer';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onMenuClick?: () => void;
  className?: string;
}

export function Navbar({ onMenuClick, className }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const { fillValues, selectedFolder, setSelectedFolder, fetchFillValues } = useTaskStore();
  const { isHideFolder } = useSettings();

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

  return (
    <header
      className={cn(
        "h-14 shrink-0 px-4 flex items-center justify-between border-b z-20 transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300",
        isScrolled
          ? "bg-white/35 backdrop-blur-md border-slate-200/30 shadow-none"
          : "bg-white border-slate-200/60 shadow-none",
        className
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden w-10 rounded-xl hover:bg-[#e8f1f8] flex items-center justify-center shrink-0 border border-slate-200/80"
          >
            <Menu size={20} className="text-slate-600" />
          </Button>
        )}
        <div className="hidden sm:flex flex-col gap-1 leading-none py-0.5">
          <span className="page-eyebrow">Workspace</span>
          <span className="page-title">Task overview</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Workspace Folder Dropdown */}
        {!isHideFolder && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2.5 px-3.5 h-9 rounded-xl border border-slate-200 bg-white hover:bg-[#f5f9fc] hover:border-[#006699]/25 transition-all font-semibold text-xs text-slate-700 shadow-sm"
              >
                <div className="flex w-6 h-6 shrink-0 items-center justify-center rounded-lg bg-[#006699]/10 text-[#006699]">
                  <Folder size={14} className="fill-[#006699]/20" />
                </div>
                <span className="max-w-[150px] truncate text-slate-700 font-semibold text-[11px]">
                  {selectedFolder ? selectedFolder["Folder Name"] : "Select Folder..."}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 rounded-xl p-1 shadow-xl border border-slate-100 bg-white max-h-[60vh] flex flex-col" align="end">
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
                    className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-[#006699]/30"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <DropdownMenuSeparator className="my-0 bg-slate-100 shrink-0" />

              <div className="overflow-y-auto overflow-x-hidden p-1 flex-1">
                {filteredFolders.length > 0 ? (
                  filteredFolders.map((folder: any) => {
                    const isSelected = selectedFolder?.TaskFolderNo === folder.TaskFolderNo;
                    return (
                      <DropdownMenuItem
                        key={folder.TaskFolderNo}
                        onClick={() => handleFolderChange(folder)}
                        className={`flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer text-xs font-bold transition-all ${isSelected
                          ? "bg-[#006699]/5 text-[#006699]"
                          : "text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${isSelected ? "bg-[#006699]/10 text-[#006699]" : "bg-slate-100 text-slate-400"
                            }`}>
                            <Folder size={12} className={isSelected ? "fill-[#006699]/20" : ""} />
                          </div>
                          <span className="truncate">{folder["Folder Name"]}</span>
                        </div>
                        {isSelected && <Check size={14} className="text-[#006699] stroke-[3]" />}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "group ml-1 h-9 gap-2 rounded-xl border-0 bg-[#e8f3f8]/70 pl-1 pr-2 sm:pr-2.5",
                "hover:bg-[#e8f3f8] data-[state=open]:bg-[#e8f3f8]",
                "transition-colors"
              )}
            >
              <span className="relative shrink-0">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-[#006699] text-white text-[12px] font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              </span>
              <div className="hidden sm:flex items-center gap-1.5 min-w-0 text-left">
                <span className="text-[12px] font-semibold text-slate-800 truncate max-w-[90px]">
                  {printingName}
                </span>
                <span className="text-[11px] font-medium text-[#006699]/75 truncate max-w-[80px]">
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
          <DropdownMenuContent
            className="w-[272px] rounded-2xl p-0 overflow-hidden border border-slate-200/70 bg-white shadow-[0_16px_40px_-12px_rgba(15,23,42,0.25)]"
            align="end"
            sideOffset={10}
            forceMount
          >
            {/* Profile header */}
            <div className="relative overflow-hidden px-3.5 pt-3.5 pb-3">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#e8f3f8_0%,#ffffff_55%)]" />
              <div className="relative flex items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                    <AvatarFallback className="bg-[#006699] text-white text-[15px] font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[13.5px] font-semibold text-slate-800 truncate">
                      {printingName}
                    </span>
                    <span className="text-[11.5px] font-medium text-[#006699] truncate shrink-0">
                      @{loginId}
                    </span>
                  </p>
                  {email ? (
                    <p className="mt-1 text-[11px] text-slate-400 truncate">{email}</p>
                  ) : (
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-emerald-600/90">
                      Active session
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mx-3 h-px bg-slate-100" />

            {/* Actions */}
            <div className="p-2">
              <DropdownMenuItem
                className="group/logout flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-slate-600 outline-none focus:bg-red-50 focus:text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-600"
                onClick={logout}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f7fa] text-slate-500 transition-colors group-hover/logout:bg-red-100 group-hover/logout:text-red-600 group-focus/logout:bg-red-100 group-focus/logout:text-red-600 data-[highlighted]:bg-red-100">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
