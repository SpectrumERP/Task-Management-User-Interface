import { useEffect } from 'react';
import { Folder, ChevronDown, Check, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.companyNo || authCompanies?.[0]?.CompanyNo || 1;
  const { fillValues, selectedFolder, setSelectedFolder, fetchFillValues } = useTaskStore();

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

  return (
    <header className="h-16 px-6 flex items-center justify-between bg-white border-b sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200"
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2.5 h-10 px-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300 transition-all font-bold text-xs text-slate-700 shadow-sm"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#006699]/10 text-[#006699]">
                <Folder size={14} className="fill-[#006699]/20" />
              </div>
              <span className="max-w-[150px] truncate text-slate-700 font-extrabold uppercase tracking-wider text-[10px]">
                {selectedFolder ? selectedFolder["Folder Name"] : "Select Folder..."}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72 rounded-xl p-1 shadow-xl border border-slate-100 bg-white" align="end">
            <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">
              Select Workspace Folder
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-slate-100" />
            {fillValues?.folder && fillValues.folder.length > 0 ? (
              fillValues.folder.map((folder) => {
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
                No folders available
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-2 p-0 h-10 w-10 rounded-full overflow-hidden border-2 border-slate-100 hover:border-[#006699]/20 transition-all">
              <Avatar className="h-full w-full">
                <AvatarFallback className="bg-[#006699] text-white font-bold">{initial}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2 p-1">
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
            {/* <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
            <DropdownMenuSeparator /> */}
            <DropdownMenuItem className="text-red-500 font-bold cursor-pointer hover:bg-red-50 focus:bg-red-50 transition-colors" onClick={logout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
