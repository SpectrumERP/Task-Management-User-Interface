import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export interface MasterColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

interface MasterEntityTableProps<T extends { id: string; code?: string; createdBy?: string; createdDate?: string }> {
  rows: T[];
  nameHeader: string;
  columns?: MasterColumn<T>[];
  getCode: (row: T) => React.ReactNode;
  getName: (row: T) => React.ReactNode;
  onEdit: (row: T) => void;
  onDelete: (id: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
  isLoading?: boolean;
  emptyIcon: React.ComponentType<{ size?: number }>;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function MasterEntityTable<T extends { id: string; code?: string; createdBy?: string; createdDate?: string }>({
  rows,
  nameHeader,
  columns = [],
  getCode,
  getName,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
  isLoading,
  emptyIcon: EmptyIcon,
  emptyTitle = 'No Records Found',
  emptyDescription = 'No master records match your search criteria. Try adjusting filters or click the Add button above to create a new one.',
}: MasterEntityTableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl overflow-hidden p-6 space-y-4 animate-pulse flex-1">
        <div className="h-10 bg-slate-100 rounded-xl w-full" />
        <div className="h-12 bg-slate-55 rounded-xl w-full" />
        <div className="h-12 bg-slate-55 rounded-xl w-full" />
        <div className="h-12 bg-slate-55 rounded-xl w-full" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-[24px] border border-slate-100 p-8 text-center animate-fade-in">
        <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-3">
          <EmptyIcon size={32} />
        </div>
        <h3 className="text-sm font-medium text-slate-700">{emptyTitle}</h3>
        <p className="text-xs text-slate-400 font-semibold mt-1 max-w-sm">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[24px] border border-slate-100 shadow-xl shadow-slate-100/30 overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin min-h-0">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(241,245,249,1)]">
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600   pl-4">Code</th>
              <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600 capitalize">{nameHeader}</th>
              {columns.map((col, idx) => (
                <th key={idx} className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">{col.header}</th>
              ))}
              <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Created By</th>
              <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Created Date</th>
              <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600   text-right pr-4 w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60 bg-white">
            {rows.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-3.5 py-2 text-[11px] font-medium text-slate-700 pl-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium  bg-slate-100 text-slate-600 border border-slate-200/50">
                    {getCode(item)}
                  </span>
                </td>
                <td className="px-3.5 py-2 text-[11px] font-medium text-slate-800">
                  <div className="flex items-center gap-0.5">{getName(item)}</div>
                </td>
                {columns.map((col, idx) => (
                  <td key={idx} className="px-3.5 py-2 text-[11px] text-slate-600 font-medium">
                    {col.render(item)}
                  </td>
                ))}
                <td className="px-3.5 py-2 text-[11px] font-semibold text-slate-600 truncate max-w-[120px]">
                  {item.createdBy || 'System'}
                </td>
                <td className="px-3.5 py-2.5 text-[11px] font-medium text-slate-600  ">
                  {item.createdDate ? format(new Date(item.createdDate), 'MMM dd, yyyy h:mm a') : 'N/A'}
                </td>
                <td className="px-3.5 py-2 text-right pr-4 w-[100px]">
                  <div className="flex items-center justify-end gap-1">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(item)}
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-[#006699] hover:bg-slate-100/60 transition-colors flex items-center justify-center"
                      >
                        <Edit size={13} />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item.id)}
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50/50 transition-colors flex items-center justify-center"
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
