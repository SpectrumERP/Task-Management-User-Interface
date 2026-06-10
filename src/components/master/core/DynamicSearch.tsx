import { useState } from 'react';
import { MasterConfig } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, LayoutGrid, X, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DynamicSearchProps {
  config: MasterConfig;
  data: any[];
  isLoading: boolean;
  onDelete: (id: string | number) => void;
  masterPath: string; 
  titleIcon?: React.ElementType;
}

export function DynamicSearch({ config, data, isLoading, onDelete, masterPath, titleIcon: Icon = LayoutGrid }: DynamicSearchProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    return Object.values(item).some((val) => 
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3.5 sm:p-4 sm:px-6 gap-2 bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
      {/* Breadcrumb Header */}
      <div className="flex items-center shrink-0 mb-0 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <button className="text-slate-500 hover:text-[#006699] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006699] rounded cursor-default">Masters</button>
          <ChevronRight size={16} className="text-slate-400" />
          <span className="text-slate-900 font-bold tracking-tight">{config.title}</span>
        </div>
      </div>

      {/* Filters & Actions Section */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
        {/* Search Input Card */}
        <Card className="flex-1 p-3.5 border-none shadow-md shadow-slate-200/20 bg-white/90 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center gap-3 h-10 sm:h-11">
          <Search size={16} className="text-slate-400 ml-1 shrink-0" />
          <Input 
            placeholder={`Search ${config.title.toLowerCase()} records by name, code...`} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs font-medium text-slate-700 h-full p-0 focus-visible:ring-0 placeholder:text-slate-400 placeholder:font-semibold flex-1"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery('')}
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center shrink-0"
            >
              <X size={14} />
            </Button>
          )}
        </Card>

        {/* Add Record Button */}
        <Button
          onClick={() => navigate(`/${masterPath}/new`)}
          className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-[#006699] hover:bg-[#005580] text-white shadow-lg shadow-[#006699]/15 font-medium text-xs normal-case gap-0.5 shrink-0 transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center"
        >
          <Plus size={14} strokeWidth={3.5} />
          Add Record
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 flex flex-col">
      {isLoading ? (
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl overflow-hidden p-6 space-y-4 animate-pulse flex-1">
          <div className="h-10 bg-slate-100 rounded-xl w-full" />
          <div className="h-12 bg-slate-50 rounded-xl w-full" />
          <div className="h-12 bg-slate-50 rounded-xl w-full" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-[24px] border border-slate-100 p-8 text-center animate-fade-in">
          <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-3">
            <Icon size={32} />
          </div>
          <h3 className="text-sm font-medium text-slate-700">No Records Found</h3>
          <p className="text-xs text-slate-400 font-semibold mt-1 max-w-sm">No master records match your search criteria. Try adjusting filters or click the Add button above to create a new one.</p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-md rounded-[24px] border border-slate-100 shadow-xl shadow-slate-100/30 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin min-h-0">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(241,245,249,1)]">
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {config.columns.map((col, idx) => (
                    <th key={col.key} className={cn("px-3.5 py-2.5 text-[11px] font-semibold text-slate-600", idx === 0 && "pl-4")} style={{ width: col.width }}>
                      {col.header}
                    </th>
                  ))}
                  <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600 text-right pr-4 w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((row) => (
                  <tr key={row[config.idField]} className="hover:bg-slate-50/80 transition-colors group">
                    {config.columns.map((col, idx) => (
                      <td key={col.key} className={cn("px-3.5 py-2 text-[11px] text-slate-600 font-medium", idx === 0 && "pl-4 text-slate-500 font-semibold")}>
                        {col.render ? col.render(row[col.key], row) : (
                          // Default rendering matching MasterManager styles
                          col.key === 'createdDate' && row[col.key] 
                            ? format(new Date(row[col.key]), 'MMM dd, yyyy h:mm a') 
                            : (col.key === 'createdBy' ? (row[col.key] || 'System') : row[col.key])
                        )}
                      </td>
                    ))}
                    <td className="px-3.5 py-2 text-right pr-4 w-[100px]">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/${masterPath}/edit/${row[config.idField]}`)}
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-[#006699] hover:bg-slate-100/60 transition-colors flex items-center justify-center"
                        >
                          <Edit size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this record?')) {
                              onDelete(row[config.idField]);
                            }
                          }}
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50/50 transition-colors flex items-center justify-center"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination would go here if needed, keeping it simple for now as per old architecture doing client-side filters on full dataset often */}
        </div>
      )}
      </div>
    </div>
  );
}
