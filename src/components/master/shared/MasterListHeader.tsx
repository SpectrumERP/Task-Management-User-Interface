import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight, Search, X, Plus } from 'lucide-react';

interface MasterListHeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
  canAdd: boolean;
  children?: React.ReactNode;
}

export function MasterListHeader({
  title,
  searchQuery,
  onSearchChange,
  onAddClick,
  canAdd,
  children,
}: MasterListHeaderProps) {
  return (
    <>
      {/* Breadcrumb Header */}
      <div className="flex items-center shrink-0 mb-0 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <button className="text-slate-500 hover:text-[#006699] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006699] rounded cursor-default">Masters</button>
          <ChevronRight size={16} className="text-slate-400" />
          <span className="text-slate-900 font-bold tracking-tight">{title}</span>
        </div>
      </div>

      {/* Filters & Actions Section */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
        {/* Search Input Card */}
        <Card className="flex-1 p-3.5 border-none shadow-md shadow-slate-200/20 bg-white/90 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center gap-3 h-10 sm:h-11">
          <Search size={16} className="text-slate-400 ml-1 shrink-0" />
          <Input placeholder={`Search ${title.toLowerCase()} records by name, code...`} value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent border-none text-xs font-medium text-slate-700 h-full p-0 focus-visible:ring-0 placeholder:text-slate-400 placeholder:font-semibold flex-1"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSearchChange('')}
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-655 flex items-center justify-center shrink-0"
            >
              <X size={14} />
            </Button>
          )}
        </Card>

        {children}

        {/* Add Record Button */}
        {canAdd && (
          <Button
            onClick={onAddClick}
            className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-[#006699] hover:bg-[#005580] text-white shadow-lg shadow-[#006699]/15 font-medium text-xs normal-case gap-0.5 shrink-0 transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center"
          >
            <Plus size={14} strokeWidth={3.5} />
            Add Record
          </Button>
        )}
      </div>
    </>
  );
}
