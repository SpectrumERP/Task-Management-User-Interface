import { useEffect, useState } from 'react';
import { Folder, ChevronDown, Check, Menu, Search } from 'lucide-react';

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

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const { fillValues, selectedFolder, setSelectedFolder, fetchFillValues } = useTaskStore();
  const { isHideFolder } = useSettings();

  const [folderSearch, setFolderSearch] = useState('');

  useEffect(() => {
    if (!fillValues) {
      fetchFillValues(companyNo.toString());
    }
  }, [fillValues, fetchFillValues]);

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
    <header className="py-1 px-4 flex items-center justify-between bg-white border-b sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200"
          >
            <Menu size={20} className="text-slate-600" />
          </Button>
        )}

        {/* <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tasks..."
            className="bg-slate-100/80 border-none rounded-full pl-10 h-10 w-full focus-visible:bg-slate-200/50 transition-all"
          />
        </div> */}
      </div>

      <div className="flex items-center gap-2">
        {/* Workspace Folder Dropdown */}
        {!isHideFolder && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2.5 px-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300 transition-all font-bold text-xs text-slate-700 shadow-sm"
            >
              <div className="flex w-6 shrink-0 items-center justify-center rounded-lg bg-[#006699]/10 text-[#006699]">
                <Folder size={14} className="fill-[#006699]/20" />
              </div>
              <span className="max-w-[150px] truncate text-slate-700 font-extrabold   text-[10px]">
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
            <Button variant="ghost" className="ml-2 p-0 w-10 rounded-full overflow-hidden border-2 border-slate-100 hover:border-[#006699]/20 transition-all">
              <Avatar className="h-full w-full">
                <AvatarFallback className="bg-[#006699] text-white font-bold">{initial}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0 p-1">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-[#006699]/10">
                    <AvatarFallback className="bg-[#006699] text-white font-bold">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-black leading-none text-slate-900">{printingName}</p>
                    <p className="text-[10px] font-bold leading-none text-[#006699] mt-1 opacity-70 uppercase tracking-tight">{loginId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <p className="text-xs font-medium text-slate-500 truncate">{email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500 font-bold cursor-pointer hover:bg-red-50 focus:bg-red-50 transition-colors" onClick={logout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
