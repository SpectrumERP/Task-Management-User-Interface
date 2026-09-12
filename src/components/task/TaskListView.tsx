import React, { useState, useEffect } from 'react';
import { Task } from '@/types/task';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { ClipboardList, Settings2, Edit2, Search, Eye, Plus, ChevronRight, ChevronDown, CornerDownRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useFormRights } from '@/hooks/useFormRights';
import { useSettings } from '@/hooks/useSettings';
import { taskUrl } from '@/lib/dealMonitor';
import { useAuthStore } from '@/store/useAuthStore';
import { canUserEditTask } from '@/lib/taskAccess';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useTaskStore } from '@/store/useTaskStore';

interface TaskListViewProps {
  tasks: Task[];
  isLoading?: boolean;
  loadError?: boolean;
  onRetryLoad?: () => void;
  onTaskClick?: (taskId: number) => void;
  onCreateTask?: () => void;
  hideCategoryColumn?: boolean;
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
  { key: 'owner', label: 'Assign To', defaultVisible: true },
  { key: 'dueDate', label: 'Due Date', defaultVisible: false },
  { key: 'completionDate', label: 'Completion Date', defaultVisible: false },
  { key: 'folder', label: 'Folder', defaultVisible: false },
  { key: 'companyName', label: 'Company', defaultVisible: false },
  { key: 'location', label: 'Location', defaultVisible: false },
  { key: 'originator', label: 'Assign By', defaultVisible: false },
  { key: 'createdBy', label: 'Created By', defaultVisible: false },
  { key: 'createdDate', label: 'Created Date', defaultVisible: false },

  { key: 'actions', label: '', defaultVisible: true }, // Actions shouldn't typically be hidden but we can allow it
];

export function TaskListView({ tasks, isLoading, loadError, onRetryLoad, onTaskClick, onCreateTask, hideCategoryColumn = false }: TaskListViewProps) {
  const navigate = useNavigate();
  const { isUpdate } = useFormRights(1547);
  const user = useAuthStore((s) => s.user);
  const { fillValues } = useTaskStore();
  const { isHideType, isHideFolder } = useSettings();
  const canEditTask = (task: Task) => canUserEditTask(user, task, isUpdate);
  const isColumnAllowed = (key: ColumnKey) => !(
    (key === 'type' && isHideType) ||
    (key === 'folder' && isHideFolder) ||
    (key === 'category' && hideCategoryColumn)
  );

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

  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const toggleExpand = (e: React.MouseEvent, taskNo: number) => {
    e.stopPropagation();
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskNo)) next.delete(taskNo);
      else next.add(taskNo);
      return next;
    });
  };

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingColumns, setPendingColumns] = useState<Set<ColumnKey>>(visibleColumns);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');

  useEffect(() => {
    // Force cleanup any lingering dialog scroll/pointer locks from Radix UI when entering the list view
    document.body.style.pointerEvents = 'auto';
    document.body.removeAttribute('data-scroll-locked');
  }, []);

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
    if (!hexColor) return 'var(--tm-input-fg)';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6 && hex.length !== 3) return 'var(--tm-input-fg)';

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

  // Full loader only on first load (no rows yet). Refetch / view-switch keeps existing rows.
  if (isLoading && tasks.length === 0) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center">
        <BrandLoader size="sm" message="Loading tasks" />
      </div>
    );
  }

  if (loadError && tasks.length === 0) {
    return (
      <LoadErrorState
        title="Failed to load tasks"
        description="Could not load the task list. Retry uses the same filters — nothing else changes."
        onRetry={onRetryLoad}
        className="h-full"
      />
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="h-full min-h-0 flex flex-col items-center justify-center px-6 py-10">
        <div className="h-14 w-14 rounded-2xl bg-[var(--tm-tint)] flex items-center justify-center mb-3 ring-1 ring-[#0EA5E9]/15">
          <ClipboardList className="text-[#0EA5E9]" size={26} strokeWidth={1.75} />
        </div>
        <h3 className="text-base font-semibold text-slate-100 tracking-tight">No tasks found</h3>
        <p className="text-slate-500 text-sm font-medium mt-1 max-w-sm text-center">
          Try clearing filters, or create a new task to get started.
        </p>
        {onCreateTask ? (
          <Button
            type="button"
            onClick={onCreateTask}
            className="mt-4 h-9 px-4 rounded-lg bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-semibold gap-1.5"
          >
            <Plus size={14} strokeWidth={2.5} />
            Create task
          </Button>
        ) : null}
      </div>
    );
  }

  const openTask = (task: Task) => {
    if (onTaskClick) onTaskClick(task.taskNo);
    else navigate(taskUrl(task.taskNo, task.categoryName));
  };

  const renderTaskCard = (task: Task, isSubtask = false) => (
    <div
      key={task.taskNo}
      role="button"
      tabIndex={0}
      onClick={() => openTask(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openTask(task);
        }
      }}
      className={cn(
        "w-full text-left rounded-xl border shadow-sm active:bg-[var(--tm-muted)] transition-colors cursor-pointer",
        isSubtask ? "border-[#0EA5E9]/20 bg-[var(--tm-elevated)]/40 px-2 py-2" : "border-[var(--tm-border)]/80 bg-[var(--tm-elevated)]/60 px-3 py-2.5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {!isSubtask && task.subTasks && task.subTasks.length > 0 && (
              <button onClick={(e) => toggleExpand(e, task.taskNo)} className="p-0.5 -ml-1 text-slate-400 hover:text-slate-200">
                {expandedTasks.has(task.taskNo) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            <span className="text-[10px] font-semibold text-[#0EA5E9] tabular-nums">
              {task.code || `CP-${100 + task.taskNo}`}
            </span>
            {task.status ? (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-[var(--tm-muted)] text-slate-200">
                {task.status}
              </span>
            ) : null}
            {task.priority ? (() => {
              const priorityObj = fillValues?.priority?.find(
                p => p.OperTaskPriorityNo === task.priority_No || p.Priority === task.priority
              );
              const colorCoding = priorityObj?.ColorCoding;
              if (colorCoding && colorCoding !== 'none') {
                const contrastText = getContrastColor(colorCoding);
                return (
                  <span
                    className="items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium shadow-sm"
                    style={{ backgroundColor: colorCoding, color: contrastText }}
                  >
                    {task.priority}
                  </span>
                );
              }
              return (
                <span className="text-[9px] font-medium text-slate-300">
                  {task.priority}
                </span>
              );
            })() : null}
          </div>
          <p className="text-sm font-semibold text-slate-100 leading-snug line-clamp-2">{task.title}</p>
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            {task.assignedDisplayName || 'Unassigned'}
            {task.end_date
              ? ` · Due ${format(new Date(task.end_date), 'MMM dd')}`
              : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            title="View"
            onClick={(e) => {
              e.stopPropagation();
              openTask(task);
            }}
            className="h-8 w-8 rounded-lg text-slate-400 hover:bg-[var(--tm-muted)] hover:text-slate-200"
          >
            <Eye size={14} strokeWidth={2.25} />
          </Button>
          {canEditTask(task) ? (
            <Button
              variant="ghost"
              size="icon"
              title="Edit"
              onClick={(e) => {
                e.stopPropagation();
                navigate(taskUrl(task.taskNo, task.categoryName));
              }}
              className="h-8 w-8 rounded-lg text-slate-400 hover:bg-[var(--tm-muted)] hover:text-slate-200"
            >
              <Edit2 size={14} strokeWidth={2.5} />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderTableRow = (task: Task, isSubtask = false) => (
    <tr
      key={task.taskNo}
      onClick={() => openTask(task)}
      className={cn("group transition-colors cursor-pointer", isSubtask ? "bg-[var(--tm-surface)]/30" : "")}
    >
      {/* Code */}
      {visibleColumns.has('code') && (
        <td className={cn("px-1.5 py-1 align-middle", isSubtask && "pl-8")}>
          <div className="flex items-center gap-1">
            {isSubtask ? (
              <CornerDownRight size={14} className="text-slate-400 mr-1" />
            ) : (
              <>
                {task.subTasks && task.subTasks.length > 0 ? (
                  <button onClick={(e) => toggleExpand(e, task.taskNo)} className="p-0.5 -ml-1 text-slate-400 hover:text-slate-200">
                    {expandedTasks.has(task.taskNo) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <span className="w-3.5" />
                )}
              </>
            )}
            <span className="text-[11px] font-medium text-[#0EA5E9] whitespace-nowrap">
              {task.code || `CP-${100 + task.taskNo}`}
            </span>
          </div>
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
                  "bg-[var(--tm-muted)]/80 text-slate-100"
          )}>
            {task.status}
          </div>
        </td>
      )}

      {/* Subject */}
      {visibleColumns.has('title') && (
        <td className="px-1.5 py-1 align-middle w-full max-w-0">
          <span
            className="font-medium text-slate-100 group-hover:text-[#0EA5E9] transition-colors truncate block w-full select-all"
            title={task.title}
          >
            {task.title}
          </span>
        </td>
      )}

      {/* Category */}
      {visibleColumns.has('category') && isColumnAllowed('category') && (
        <td className="px-1.5 py-1 align-middle whitespace-nowrap">
          {task.categoryName ? (() => {
            const catObj = fillValues?.category?.find(
              c => c.OperTaskCategoryNo === task.category_No || c.Category === task.categoryName
            );
            const bgColor = catObj?.ColorCoding || catObj?.colorCoding || (catObj as any)?.color || 'var(--tm-border)';
            const textColor = getContrastColor(bgColor);
            return (
              <span
                style={{ backgroundColor: bgColor, color: textColor }}
                className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-medium shadow-sm"
              >
                {task.categoryName}
              </span>
            );
          })() : <span className="text-slate-300">-</span>}
        </td>
      )}

      {/* Type */}
      {visibleColumns.has('type') && !isHideType && (
        <td className="px-1.5 py-1 align-middle whitespace-nowrap">
          {task.typeName ? (
            <span className="text-xs font-semibold text-slate-300 bg-[var(--tm-muted)] px-2 py-0.5 rounded-md border border-[var(--tm-border)]">
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
          {(() => {
            const priorityObj = fillValues?.priority?.find(
              p => p.OperTaskPriorityNo === task.priority_No || p.Priority === task.priority
            );
            const colorCoding = priorityObj?.ColorCoding;
            if (colorCoding && colorCoding !== 'none') {
              const contrastText = getContrastColor(colorCoding);
              return (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-medium shadow-sm"
                  style={{ backgroundColor: colorCoding, color: contrastText }}
                >
                  {task.priority}
                </span>
              );
            }
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-medium text-slate-300 bg-[var(--tm-muted)]">
                {task.priority}
              </span>
            );
          })()}
        </td>
      )}

      {/* Owner */}
      {visibleColumns.has('owner') && (
        <td className="px-1.5 py-1 align-middle whitespace-nowrap">
          <div className="flex items-center gap-0.5">
            <span className="text-xs font-semibold text-slate-200">{task.assignedDisplayName || '-'}</span>
          </div>
        </td>
      )}

      {/* Due Date */}
      {visibleColumns.has('dueDate') && (
        <td className="px-1.5 py-1 align-middle whitespace-nowrap">
          {task.end_date ? (
            <span className="text-xs font-medium text-slate-200">{format(new Date(task.end_date), 'MMM dd, yyyy')}</span>
          ) : <span className="text-slate-300">-</span>}
        </td>
      )}

      {/* Completion Date */}
      {visibleColumns.has('completionDate') && (
        <td className="px-1.5 py-1 align-middle whitespace-nowrap">
          {task.completionDate ? (
            <span className="text-xs font-medium text-slate-200">{format(new Date(task.completionDate), 'MMM dd, yyyy')}</span>
          ) : <span className="text-slate-300">-</span>}
        </td>
      )}

      {/* Folder */}
      {visibleColumns.has('folder') && !isHideFolder && (
        <td className="px-1.5 py-1 align-middle whitespace-nowrap">
          <span className="text-xs font-medium text-slate-200">
            {task.folderName || fillValues?.folder?.find(f => f.TaskFolderNo === task.project_No)?.["Folder Name"] || task.project_No || '-'}
          </span>
        </td>
      )}

      {/* Company */}
      {visibleColumns.has('companyName') && (
        <td className="px-1.5 py-1 align-middle whitespace-nowrap">
          <span className="text-xs font-medium text-slate-200">{task.companyName || '-'}</span>
        </td>
      )}

      {/* Location */}
      {visibleColumns.has('location') && (
        <td className="px-1.5 py-1 align-middle whitespace-nowrap">
          <span className="text-xs font-medium text-slate-200">{task.locationName || (task.location_No ? `Loc ${task.location_No}` : '-')}</span>
        </td>
      )}

      {/* Originator */}
      {visibleColumns.has('originator') && (
        <td className="px-1.5 py-1 align-middle whitespace-nowrap">
          <span className="text-xs font-medium text-slate-200">{task.originatorDisplayName || '-'}</span>
        </td>
      )}

      {/* Created By */}
      {visibleColumns.has('createdBy') && (
        <td className="px-1.5 py-1 align-middle whitespace-nowrap">
          <span className="text-xs font-medium text-slate-200">
            {task.createdBy?.displayName || task.originatorDisplayName || '-'}
          </span>
        </td>
      )}

      {/* Created Date */}
      {visibleColumns.has('createdDate') && (
        <td className="px-1.5 py-1 align-middle whitespace-nowrap">
          {task.createdDate ? (
            <span className="text-xs font-medium text-slate-200">{format(new Date(task.createdDate), 'MMM dd, yyyy h:mm a')}</span>
          ) : task.start_date ? (
            <span className="text-xs font-medium text-slate-200">{format(new Date(task.start_date), 'MMM dd, yyyy h:mm a')}</span>
          ) : <span className="text-slate-300">-</span>}
        </td>
      )}

      {/* Actions */}
      {visibleColumns.has('actions') && (
        <td className="px-1.5 py-1 align-middle text-right sticky right-0 z-10 tm-sticky-cell backdrop-blur-md border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
          <div className="inline-flex items-center justify-end gap-0.5 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              title="View"
              onClick={(e) => {
                e.stopPropagation();
                if (onTaskClick) onTaskClick(task.taskNo);
                else navigate(taskUrl(task.taskNo, task.categoryName));
              }}
              className="h-7 w-7 rounded-md text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]"
            >
              <Eye size={14} strokeWidth={2.25} />
            </Button>
            {canEditTask(task) && (
              <Button
                variant="ghost"
                size="icon"
                title="Edit"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(taskUrl(task.taskNo, task.categoryName));
                }}
                className="h-7 w-7 rounded-md text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]"
              >
                <Edit2 size={14} strokeWidth={2.5} />
              </Button>
            )}
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="h-full min-h-0 overflow-auto" data-page-tour="task-table">
      {/* Mobile / tablet cards */}
      <div className="md:hidden flex flex-col gap-2 p-2 sm:p-3">
        {tasks.map((task) => (
          <React.Fragment key={task.taskNo}>
            {renderTaskCard(task)}
            {expandedTasks.has(task.taskNo) && task.subTasks && task.subTasks.length > 0 && (
              <div className="flex flex-col gap-2 pl-4 border-l-2 border-[#0EA5E9]/20 ml-2 mt-1 mb-1">
                {task.subTasks.map((subTask: Task) => renderTaskCard(subTask, true))}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {/* Desktop table */}
      <div className="hidden md:block min-w-0">
        <table className="tm-data-table w-full text-sm text-left min-w-[720px]">
          <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-slate-200 font-semibold text-xs tracking-wider shadow-[0_1px_0_rgba(14,165,233,0.08)]">
            <tr>
              {COLUMNS.map(col => visibleColumns.has(col.key) && isColumnAllowed(col.key) && (
                <th
                  key={col.key}
                  className={cn(
                    "px-1.5 py-1 whitespace-nowrap relative group/th",
                    col.key === 'actions' && "w-[50px] text-center p-1 sticky right-0 z-40 bg-[var(--tm-elevated)] backdrop-blur-md border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.35)]"
                  )}
                  style={colWidths[col.key] ? { width: colWidths[col.key], minWidth: colWidths[col.key], maxWidth: colWidths[col.key] } : {}}
                >
                  {col.key === 'actions' ? (
                    <div className="flex justify-center">
                      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-1 flex items-center gap-1 text-slate-400 hover:text-slate-100 hover:bg-[var(--tm-muted)]">
                            <Settings2 size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className={cn(
                            'w-56 p-0 overflow-hidden flex flex-col',
                            'max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))]',
                            'rounded-xl border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-lg'
                          )}
                          onInteractOutside={() => setDropdownOpen(false)}
                        >
                          <div className="shrink-0 px-3 pt-2.5 pb-2 space-y-2 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]">
                            <DropdownMenuLabel className="p-0 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                              Toggle Columns
                            </DropdownMenuLabel>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                              <Input
                                placeholder="Search columns..."
                                value={columnSearchQuery}
                                onChange={(e) => setColumnSearchQuery(e.target.value)}
                                className="h-8 w-full pl-8 text-xs bg-[var(--tm-surface)] border-[var(--tm-border)]"
                              />
                            </div>
                          </div>

                          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
                            {COLUMNS.filter(
                              (c) =>
                                isColumnAllowed(c.key) &&
                                (c.label || 'Actions')
                                  .toLowerCase()
                                  .includes(columnSearchQuery.toLowerCase())
                            ).map((c) => (
                              <DropdownMenuCheckboxItem
                                key={c.key}
                                checked={pendingColumns.has(c.key)}
                                onSelect={(e) => e.preventDefault()}
                                onCheckedChange={() => togglePendingColumn(c.key)}
                                disabled={c.key === 'title' || c.key === 'actions'}
                                className="text-xs"
                              >
                                {c.label || 'Actions'}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </div>

                          <div className="shrink-0 flex justify-end gap-2 px-2.5 py-2 border-t border-[var(--tm-border)] bg-[var(--tm-elevated)]">
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
                              className="h-7 text-xs bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
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
          <tbody className="divide-y divide-[var(--tm-border)]">
            {tasks.map((task) => (
              <React.Fragment key={task.taskNo}>
                {renderTableRow(task)}
                {expandedTasks.has(task.taskNo) && task.subTasks && task.subTasks.length > 0 && (
                  task.subTasks.map((subTask: Task) => renderTableRow(subTask, true))
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
