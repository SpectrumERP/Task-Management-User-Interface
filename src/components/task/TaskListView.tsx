import { useState, useEffect } from 'react';
import { Task } from '@/types/task';
import { Card } from '@/components/ui/card';
import { ArrowRight, Settings2, Edit2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useTaskStore } from '@/store/useTaskStore';

interface TaskListViewProps {
  tasks: Task[];
  isLoading?: boolean;
  onTaskClick?: (taskId: number) => void;
}
type ColumnKey = 'code' | 'status' | 'title' | 'category' | 'type' | 'priority' | 'dueDate' | 'completionDate' | 'folder' | 'createdBy' | 'createdDate' | 'owner' | 'originator' | 'companyName' | 'location' | 'actions';
interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'code', label: '# / Code', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'title', label: 'Task Title', defaultVisible: true },
  { key: 'category', label: 'Category', defaultVisible: true },
  { key: 'type', label: 'Type', defaultVisible: true },
  { key: 'priority', label: 'Priority', defaultVisible: true },
  { key: 'owner', label: 'Owner', defaultVisible: true },
  { key: 'dueDate', label: 'Due Date', defaultVisible: false },
  { key: 'completionDate', label: 'Completion Date', defaultVisible: false },
  { key: 'folder', label: 'Folder', defaultVisible: false },
  { key: 'companyName', label: 'Company', defaultVisible: false },
  { key: 'location', label: 'Location', defaultVisible: false },
  { key: 'originator', label: 'Originator', defaultVisible: false },
  { key: 'createdBy', label: 'Created By', defaultVisible: false },
  { key: 'createdDate', label: 'Created Date', defaultVisible: false },

  { key: 'actions', label: '', defaultVisible: true }, // Actions shouldn't typically be hidden but we can allow it
];

export function TaskListView({ tasks, isLoading, onTaskClick }: TaskListViewProps) {
  const navigate = useNavigate();
  const { fillValues } = useTaskStore();

  // Initialize visible columns from localStorage or defaults
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    const saved = localStorage.getItem('taskListViewColumns');
    if (saved) {
      try {
        return new Set(JSON.parse(saved) as ColumnKey[]);
      } catch (e) {
        // ignore
      }
    }
    return new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('taskListViewColumns', JSON.stringify(Array.from(visibleColumns)));
  }, [visibleColumns]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingColumns, setPendingColumns] = useState<Set<ColumnKey>>(visibleColumns);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');

  useEffect(() => {
    if (dropdownOpen) {
      setPendingColumns(new Set(visibleColumns));
      setColumnSearchQuery('');
    }
  }, [dropdownOpen, visibleColumns]);

  const togglePendingColumn = (key: ColumnKey) => {
    setPendingColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  const handleResizeStart = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const startWidth = (e.target as HTMLElement).closest('th')?.getBoundingClientRect().width || 100;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getContrastColor = (hexColor?: string) => {
    if (!hexColor) return '#1e293b';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6 && hex.length !== 3) return '#1e293b';

    let r = 0, g = 0, b = 0;
    if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else if (hex.length === 3) {
      r = parseInt(hex.substring(0, 1) + hex.substring(0, 1), 16);
      g = parseInt(hex.substring(1, 1) + hex.substring(1, 1), 16);
      b = parseInt(hex.substring(2, 2) + hex.substring(2, 2), 16);
    }

    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 140 ? '#0f172a' : '#ffffff';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 w-full bg-slate-100 animate-pulse rounded-lg border border-slate-200" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-20 bg-white/50 border-dashed border-2 border-slate-200 rounded-[32px]">
        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <ArrowRight className="text-slate-300" size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-800">No tasks found</h3>
        <p className="text-slate-500 text-sm font-medium">Try adjusting your filters or create a new task.</p>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <Card className="flex-1 overflow-auto border-slate-200/60 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md border-b border-slate-200 text-slate-600 font-semibold text-xs tracking-wider">
            <tr>
              {COLUMNS.map(col => visibleColumns.has(col.key) && (
                <th
                  key={col.key}
                  className={cn(
                    "px-1.5 py-1 whitespace-nowrap relative group/th",
                    col.key === 'actions' && "w-[50px] text-center p-1 sticky right-0 z-40 bg-slate-50/90 backdrop-blur-md border-l border-slate-200 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]"
                  )}
                  style={colWidths[col.key] ? { width: colWidths[col.key], minWidth: colWidths[col.key], maxWidth: colWidths[col.key] } : {}}
                >
                  {col.key === 'actions' ? (
                    <div className="flex justify-center">
                      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-1 flex items-center gap-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50">
                            <Settings2 size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48" onInteractOutside={() => setDropdownOpen(false)}>
                          <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                          <div className="px-2 pb-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <Input
                                placeholder="Search columns..."
                                value={columnSearchQuery}
                                onChange={(e) => setColumnSearchQuery(e.target.value)}
                                className="h-8 w-full pl-8 text-xs bg-slate-50 border-slate-200"
                              />
                            </div>
                          </div>
                          <DropdownMenuSeparator />
                          <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                            {COLUMNS.filter(c => (c.label || 'Actions').toLowerCase().includes(columnSearchQuery.toLowerCase())).map((c) => (
                              <DropdownMenuCheckboxItem
                                key={c.key}
                                checked={pendingColumns.has(c.key)}
                                onSelect={(e) => e.preventDefault()} // Prevent closing on click
                                onCheckedChange={() => togglePendingColumn(c.key)}
                                disabled={c.key === 'title' || c.key === 'actions'} // Prevent hiding subject and actions
                              >
                                {c.label || 'Actions'}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </div>
                          <DropdownMenuSeparator />
                          <div className="flex justify-end gap-0.5 p-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setDropdownOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-[#006699] hover:bg-[#005580]"
                              onClick={() => {
                                setVisibleColumns(pendingColumns);
                                setDropdownOpen(false);
                              }}
                            >
                              Apply
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <div className="flex items-center w-full h-full pr-2">
                      <span className="truncate">{col.label}</span>
                      <div
                        className="w-1.5 h-full absolute right-0 top-0 cursor-col-resize hover:bg-blue-400/50 active:bg-blue-500 opacity-0 group-hover/th:opacity-100 transition-opacity z-10"
                        onMouseDown={(e) => handleResizeStart(e, col.key)}
                      />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <tr
                key={task.taskNo}
                onClick={() => onTaskClick ? onTaskClick(task.taskNo) : navigate(`/task/${task.taskNo}`)}
                className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                {/* Code */}
                {visibleColumns.has('code') && (
                  <td className="px-1.5 py-1 align-middle">
                    <span className="text-[11px] font-medium text-[#006699]   whitespace-nowrap">
                      {task.code || `CP-${100 + task.taskNo}`}
                    </span>
                  </td>
                )}

                {/* Status */}
                {visibleColumns.has('status') && (
                  <td className="px-1.5 py-1 align-middle">
                    <div className={cn(
                      "px-1.5 py-0.5 rounded-md text-[10px] font-medium normal-case text-center inline-flex items-center justify-center whitespace-nowrap shadow-sm",
                      task.status === 'Done' ? "bg-green-100/80 text-green-800" :
                        task.status === 'In Progress' ? "bg-blue-100/80 text-blue-800" :
                          task.status === 'In Review' ? "bg-purple-100/80 text-purple-800" :
                            "bg-slate-100/80 text-slate-800"
                    )}>
                      {task.status}
                    </div>
                  </td>
                )}

                {/* Subject */}
                {visibleColumns.has('title') && (
                  <td className="px-1.5 py-1 align-middle w-full max-w-0">
                    <span
                      className="font-medium text-slate-800 group-hover:text-[#006699] transition-colors truncate block w-full select-all"
                      title={task.title}
                    >
                      {task.title}
                    </span>
                  </td>
                )}

                {/* Category */}
                {visibleColumns.has('category') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    {task.categoryName ? (() => {
                      const catObj = fillValues?.category?.find(
                        c => c.OperTaskCategoryNo === task.category_No || c.Category === task.categoryName
                      );
                      const bgColor = catObj?.ColorCoding || catObj?.colorCoding || (catObj as any)?.color || '#e2e8f0';
                      const textColor = getContrastColor(bgColor);
                      return (
                        <span
                          style={{ backgroundColor: bgColor, color: textColor }}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-md normal-case shadow-sm"
                        >
                          {task.categoryName}
                        </span>
                      );
                    })() : <span className="text-slate-300">-</span>}
                  </td>
                )}

                {/* Type */}
                {visibleColumns.has('type') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    {task.typeName ? (
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {task.typeName}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                )}

                {/* Priority */}
                {visibleColumns.has('priority') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    <span className={cn(
                      "text-[10px] font-medium   px-1.5 py-0.5 rounded-md shadow-sm",
                      task.priority_No >= 3 ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      {task.priority}
                    </span>
                  </td>
                )}

                {/* Owner */}
                {visibleColumns.has('owner') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    <div className="flex items-center gap-0.5">
                      {/* <UserAvatar
                        loginNo={task.owner_user_No}
                        displayName={task.assignedDisplayName}
                        size="sm"
                      /> */}
                      <span className="text-xs font-semibold text-slate-700">{task.assignedDisplayName || '-'}</span>
                    </div>
                  </td>
                )}

                {/* Due Date */}
                {visibleColumns.has('dueDate') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    {task.end_date ? (
                      <span className="text-xs font-medium text-slate-700">{format(new Date(task.end_date), 'MMM dd, yyyy')}</span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                )}

                {/* Completion Date */}
                {visibleColumns.has('completionDate') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    {task.completionDate ? (
                      <span className="text-xs font-medium text-slate-700">{format(new Date(task.completionDate), 'MMM dd, yyyy')}</span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                )}

                {/* Folder */}
                {visibleColumns.has('folder') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-700">
                      {task.folderName || fillValues?.folder?.find(f => f.TaskFolderNo === task.project_No)?.["Folder Name"] || task.project_No || '-'}
                    </span>
                  </td>
                )}

                {/* Company */}
                {visibleColumns.has('companyName') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-700">{task.companyName || '-'}</span>
                  </td>
                )}

                {/* Location */}
                {visibleColumns.has('location') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-700">{task.locationName || (task.location_No ? `Loc ${task.location_No}` : '-')}</span>
                  </td>
                )}

                {/* Originator */}
                {visibleColumns.has('originator') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-700">{task.originatorDisplayName || '-'}</span>
                  </td>
                )}

                {/* Created By */}
                {visibleColumns.has('createdBy') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-700">
                      {task.createdBy?.displayName || task.originatorDisplayName || '-'}
                    </span>
                  </td>
                )}

                {/* Created Date */}
                {visibleColumns.has('createdDate') && (
                  <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                    {task.createdDate ? (
                      <span className="text-xs font-medium text-slate-700">{format(new Date(task.createdDate), 'MMM dd, yyyy h:mm a')}</span>
                    ) : task.start_date ? (
                      <span className="text-xs font-medium text-slate-700">{format(new Date(task.start_date), 'MMM dd, yyyy h:mm a')}</span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                )}

                {/* Actions */}
                {visibleColumns.has('actions') && (
                  <td className="px-1.5 py-1 align-middle text-right sticky right-0 z-10 bg-white/90 backdrop-blur-md border-l border-slate-200 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] group-hover:bg-slate-50/90">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/task/${task.taskNo}`);
                      }}
                      className="h-6 w-6 rounded-md text-slate-400 hover:text-[#006699] hover:bg-slate-100 flex items-center justify-center transition-all duration-200"
                    >
                      <Edit2 size={14} strokeWidth={2.5} />
                    </Button>
                  </td>
                )}

              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
