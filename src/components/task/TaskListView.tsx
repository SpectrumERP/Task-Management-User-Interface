import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task } from '@/types/task';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardList, Settings2, Edit2, Eye, Search, Plus, ChevronRight, ChevronDown, CornerDownRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDateOnly, formatUtcDateTime, toUtcMs } from '@/lib/dateTime';
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
import { ActionTip, TruncatedText } from '@/components/master/shared/TruncatedCellTip';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { SortableHeader, sortHeaderCellProps, useTableSort } from '@/components/shared/useTableSort';
import { DataTableScroll } from '@/components/shared/DataTableScroll';
import { getStatusPillClass } from '@/lib/taskStatusGroups';
import { RowEditIcon, RowViewIcon } from '@/components/shared/RowIcons';

interface TaskListViewProps {
  tasks: Task[];
  isLoading?: boolean;
  loadError?: boolean;
  onRetryLoad?: () => void;
  onTaskClick?: (taskId: number) => void;
  onCreateTask?: () => void;
  onClearFilters?: () => void;
  hideCategoryColumn?: boolean;
}
type ColumnKey = 'code' | 'status' | 'title' | 'category' | 'type' | 'priority' | 'dueDate' | 'completionDate' | 'folder' | 'createdBy' | 'createdDate' | 'owner' | 'originator' | 'companyName' | 'location' | 'actions';
interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'code', label: 'Code', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'title', label: 'Task Title', defaultVisible: true },
  { key: 'category', label: 'Category', defaultVisible: true },
  { key: 'type', label: 'Type', defaultVisible: true },
  { key: 'priority', label: 'Priority', defaultVisible: true },
  { key: 'owner', label: 'Assign To', defaultVisible: true },
  { key: 'dueDate', label: 'Due Date', defaultVisible: true },
  { key: 'completionDate', label: 'Completion Date', defaultVisible: false },
  { key: 'folder', label: 'Folder', defaultVisible: false },
  { key: 'companyName', label: 'Company', defaultVisible: false },
  { key: 'location', label: 'Location', defaultVisible: false },
  { key: 'originator', label: 'Assign By', defaultVisible: false },
  { key: 'createdBy', label: 'Created By', defaultVisible: false },
  { key: 'createdDate', label: 'Created Date', defaultVisible: false },

  { key: 'actions', label: 'Actions', defaultVisible: true }, // Actions shouldn't typically be hidden but we can allow it
];

/** Default widths sized so header labels (e.g. Priority, Completion Date) fit fully. */
const DEFAULT_COL_WIDTH: Partial<Record<ColumnKey, string>> = {
  code: 'var(--tm-col-id-width)',
  status: '5.5rem',
  title: '14rem',
  category: '9rem',
  type: '6.5rem',
  priority: '6.5rem',
  owner: '7.5rem',
  dueDate: '5.75rem',
  completionDate: '9.5rem',
  folder: '6.5rem',
  companyName: '8rem',
  location: '7rem',
  originator: '7.5rem',
  createdBy: '7.5rem',
  createdDate: '11.5rem',
};

/** Actions: full "Actions" label + column toggle + View/Edit icons. */
const ACTIONS_COL_PX = 118;

const cellOverflowClass = 'px-3 py-1.5 border-r border-[var(--tm-border)] text-slate-300 align-middle overflow-hidden max-w-0';

function parseCssWidthPx(value: string | number | undefined, fallback = 120): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed.endsWith('rem')) return (parseFloat(trimmed) || 0) * 16;
  if (trimmed.endsWith('px')) return parseFloat(trimmed) || fallback;
  const asNum = parseFloat(trimmed);
  return Number.isFinite(asNum) ? asNum : fallback;
}

export function TaskListView({ tasks, isLoading, loadError, onRetryLoad, onTaskClick, onCreateTask, onClearFilters, hideCategoryColumn = false }: TaskListViewProps) {
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
    let cols: Set<ColumnKey>;
    if (saved) {
      try {
        cols = new Set(JSON.parse(saved) as ColumnKey[]);
      } catch {
        cols = new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
      }
    } else {
      cols = new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
    }
    // Title + actions must always stay available
    cols.add('title');
    cols.add('actions');
    return cols;
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

  const tableMinWidthPx = useMemo(() => {
    let sum = 0;
    for (const col of COLUMNS) {
      if (!visibleColumns.has(col.key) || !isColumnAllowed(col.key)) continue;
      if (col.key === 'actions') {
        sum += ACTIONS_COL_PX;
        continue;
      }
      const resized = colWidths[col.key];
      sum += resized
        ? resized
        : parseCssWidthPx(DEFAULT_COL_WIDTH[col.key], col.key === 'title' ? 224 : 120);
    }
    return Math.max(sum, 640);
  }, [visibleColumns, colWidths, isHideType, isHideFolder, hideCategoryColumn]);

  const toSortTime = (raw: unknown) => {
    if (raw == null || raw === '') return '';
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    const t = toUtcMs(raw as string | number | Date);
    return t ?? String(raw);
  };

  const getTaskSortValue = useCallback((task: Task, key: string) => {
    switch (key) {
      case 'code': return task.code || `CP-${100 + task.taskNo}`;
      case 'status': return task.status || '';
      case 'title': return task.title || '';
      case 'category': return task.categoryName || '';
      case 'type': return task.typeName || '';
      case 'priority': return task.priority || '';
      case 'owner': return task.assignedDisplayName || '';
      case 'dueDate': return toSortTime(task.end_date);
      case 'completionDate': return toSortTime(task.completionDate);
      case 'folder': return task.folderName || task.project_No || '';
      case 'companyName': return task.companyName || '';
      case 'location': return task.locationName || '';
      case 'originator': return task.originatorDisplayName || '';
      case 'createdBy': return task.createdBy?.displayName || task.originatorDisplayName || '';
      case 'createdDate': return toSortTime(task.createdDate || task.start_date);
      default: return '';
    }
  }, []);

  const { sortCol, sortDesc, handleSort, sortedRows: sortedTasks } = useTableSort(
    tasks,
    getTaskSortValue,
    { defaultKey: null, defaultDesc: false }
  );

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
      <EmptyState
        className="h-full"
        icon={ClipboardList}
        title="No tasks found"
        description={
          onClearFilters
            ? 'Try clearing filters, or create a new task to get started.'
            : 'Create a new task to get started.'
        }
        actions={
          <>
            {onClearFilters ? (
              <Button
                type="button"
                variant="outline"
                onClick={onClearFilters}
                className="h-9 px-4 rounded-lg border-[var(--tm-border)] text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-[var(--tm-muted)] gap-1.5"
              >
                Clear filters
              </Button>
            ) : null}
            {onCreateTask ? (
              <Button
                type="button"
                onClick={onCreateTask}
                className="h-9 px-4 rounded-lg bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-semibold gap-1.5"
              >
                <Plus size={14} strokeWidth={2.5} />
                Create task
              </Button>
            ) : null}
          </>
        }
      />
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
        isSubtask ? "border-[#0EA5E9]/20 bg-[var(--tm-elevated)]/40 px-2 py-2" : "border-[var(--tm-border)]/80 bg-[var(--tm-elevated)]/60 px-3 py-1.5"
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
            <span className="font-semibold text-[#0EA5E9] tabular-nums">
              {task.code || `CP-${100 + task.taskNo}`}
            </span>
            {task.status ? (
              <span className={cn('text-[9px] px-2 py-0.5 rounded-full border font-semibold', getStatusPillClass(task.status, false))}>
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
          <TruncatedText text={task.title || ''} className="text-sm font-semibold text-slate-100 leading-snug" />
          <div className="mt-1 min-w-0">
            <TruncatedText
              text={`${task.assignedDisplayName || 'Unassigned'}${task.end_date ? ` · Due ${formatDateOnly(task.end_date, '')}` : ''}`}
              className="text-[11px] text-slate-400"
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            title="View"
            aria-label="View"
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
              aria-label="Edit"
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
      {/* Code — sticky left so it stays visible while scrolling horizontally */}
      {visibleColumns.has('code') && (
        <td
          className={cn(
            cellOverflowClass,
            'tm-col-id tm-col-sticky-code text-left sticky left-0 z-20 border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.18)]',
            isSubtask && 'pl-8'
          )}
          style={{ textAlign: 'left' }}
        >
          <div className="flex items-center justify-start gap-1 min-w-0 w-full">
            {isSubtask ? (
              <CornerDownRight size={14} className="text-slate-400 shrink-0" />
            ) : task.subTasks && task.subTasks.length > 0 ? (
              <button type="button" onClick={(e) => toggleExpand(e, task.taskNo)} className="p-0.5 -ml-0.5 text-slate-400 hover:text-slate-200 shrink-0">
                {expandedTasks.has(task.taskNo) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : null}
            <div className="min-w-0 flex-1 overflow-hidden">
              <TruncatedText
                text={task.code || `CP-${100 + task.taskNo}`}
                className="text-left text-[#0EA5E9]"
              />
            </div>
          </div>
        </td>
      )}

      {/* Status — pill badge style */}
      {visibleColumns.has('status') && (
        <td className={cn(cellOverflowClass, 'text-left')} style={{ textAlign: 'left' }}>
          <div className="flex w-full min-w-0 justify-start items-center">
            <TruncatedText
              text={task.status || ''}
              className={cn('tm-badge !w-fit !max-w-full text-center normal-case px-2 py-0.5 rounded-full border inline-block', getStatusPillClass(task.status, false))}
            />
          </div>
        </td>
      )}

      {/* Subject */}
      {visibleColumns.has('title') && (
        <td className={cn(cellOverflowClass, 'tm-col-primary')}>
          <TruncatedText
            text={task.title || ''}
            className="text-slate-50 group-hover:text-[#1E56A0] transition-colors select-all"
          />
        </td>
      )}

      {/* Category */}
      {visibleColumns.has('category') && isColumnAllowed('category') && (
        <td className={cellOverflowClass}>
          {task.categoryName ? (() => {
            const catObj = fillValues?.category?.find(
              c => c.OperTaskCategoryNo === task.category_No || c.Category === task.categoryName
            );
            const bgColor = catObj?.ColorCoding || catObj?.colorCoding || (catObj as any)?.color || 'var(--tm-border)';
            const textColor = getContrastColor(bgColor);
            return (
              <div
                style={{ backgroundColor: bgColor, color: textColor }}
                className="tm-badge w-fit max-w-full min-w-0 px-2 py-0.5 rounded-full"
              >
                <TruncatedText text={task.categoryName} />
              </div>
            );
          })() : null}
        </td>
      )}

      {/* Type */}
      {visibleColumns.has('type') && !isHideType && (
        <td className={cellOverflowClass}>
          {task.typeName ? (
            <div className="tm-badge w-fit max-w-full min-w-0 text-slate-300 bg-[var(--tm-muted)] px-2 py-0.5 rounded-full border border-[var(--tm-border)]">
              <TruncatedText text={task.typeName} />
            </div>
          ) : (
            null
          )}
        </td>
      )}

      {/* Priority */}
      {visibleColumns.has('priority') && (
        <td className={cellOverflowClass}>
          {(() => {
            const priorityObj = fillValues?.priority?.find(
              p => p.OperTaskPriorityNo === task.priority_No || p.Priority === task.priority
            );
            const colorCoding = priorityObj?.ColorCoding;
            const label = task.priority || '';
            if (colorCoding && colorCoding !== 'none') {
              const contrastText = getContrastColor(colorCoding);
              return (
                <div
                  className="tm-badge w-fit max-w-full min-w-0 px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: colorCoding, color: contrastText }}
                >
                  <TruncatedText text={label} />
                </div>
              );
            }
            return (
              <div className="tm-badge w-fit max-w-full min-w-0 px-2 py-0.5 rounded-full text-slate-300 bg-[var(--tm-muted)] border border-[var(--tm-border)]">
                <TruncatedText text={label} />
              </div>
            );
          })()}
        </td>
      )}

      {/* Owner */}
      {visibleColumns.has('owner') && (
        <td className={cellOverflowClass} onClick={(e) => e.stopPropagation()}>
          {task.assignedDisplayName ? (
            <div className="flex items-center gap-1.5 min-w-0 w-full">
              <UserAvatar
                loginNo={task.owner_user_No}
                displayName={task.assignedDisplayName}
                size="sm"
                className="shrink-0"
              />
              <TruncatedText
                text={task.assignedDisplayName}
                className="tm-person-link text-slate-200"
              />
            </div>
          ) : (
            null
          )}
        </td>
      )}

      {/* Due Date */}
      {visibleColumns.has('dueDate') && (
        <td className={cellOverflowClass}>
          <TruncatedText
            text={task.end_date ? formatDateOnly(task.end_date) : ''}
            className="text-slate-200"
          />
        </td>
      )}

      {/* Completion Date */}
      {visibleColumns.has('completionDate') && (
        <td className={cellOverflowClass}>
          <TruncatedText
            text={task.completionDate ? formatDateOnly(task.completionDate) : ''}
            className="text-slate-200"
          />
        </td>
      )}

      {/* Folder */}
      {visibleColumns.has('folder') && !isHideFolder && (
        <td className={cellOverflowClass}>
          <TruncatedText
            text={String(task.folderName || fillValues?.folder?.find(f => f.TaskFolderNo === task.project_No)?.['Folder Name'] || task.project_No || '')}
            className="text-slate-200"
          />
        </td>
      )}

      {/* Company */}
      {visibleColumns.has('companyName') && (
        <td className={cellOverflowClass}>
          <TruncatedText
            text={task.companyName || ''}
            className="text-slate-200"
          />
        </td>
      )}

      {/* Location */}
      {visibleColumns.has('location') && (
        <td className={cellOverflowClass}>
          <TruncatedText
            text={task.locationName || (task.location_No ? `Loc ${task.location_No}` : '')}
            className="text-slate-200"
          />
        </td>
      )}

      {/* Originator */}
      {visibleColumns.has('originator') && (
        <td className={cellOverflowClass} onClick={(e) => e.stopPropagation()}>
          {task.originatorDisplayName ? (
            <div className="flex items-center gap-1.5 min-w-0 w-full">
              <UserAvatar
                loginNo={task.originator_user_No}
                displayName={task.originatorDisplayName}
                size="sm"
                className="shrink-0"
              />
              <TruncatedText
                text={task.originatorDisplayName}
                className="text-slate-200"
              />
            </div>
          ) : (
            null
          )}
        </td>
      )}

      {/* Created By */}
      {visibleColumns.has('createdBy') && (
        <td className={cellOverflowClass} onClick={(e) => e.stopPropagation()}>
          {(task.createdBy?.displayName || task.originatorDisplayName) ? (
            <div className="flex items-center gap-1.5 min-w-0 w-full">
              <UserAvatar
                loginNo={task.createdBy?.id || task.createdBy?.loginNo || task.originator_user_No}
                displayName={task.createdBy?.displayName || task.originatorDisplayName}
                size="sm"
                className="shrink-0"
              />
              <TruncatedText
                text={task.createdBy?.displayName || task.originatorDisplayName || ''}
                className="text-slate-200"
              />
            </div>
          ) : (
            null
          )}
        </td>
      )}

      {/* Created Date */}
      {visibleColumns.has('createdDate') && (
        <td className={cellOverflowClass}>
          <TruncatedText
            text={
              task.createdDate
                ? formatUtcDateTime(task.createdDate)
                : task.start_date
                  ? formatUtcDateTime(task.start_date)
                  : ''
            }
            className="text-slate-200"
          />
        </td>
      )}

      {/* Actions */}
      {visibleColumns.has('actions') && (
        <td
          className="px-1.5 py-1.5 align-middle text-center sticky right-0 z-[35] tm-col-actions tm-sticky-cell border-l border-[var(--tm-border)] bg-[var(--tm-surface)]"
          style={{ width: ACTIONS_COL_PX, minWidth: ACTIONS_COL_PX, maxWidth: ACTIONS_COL_PX }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-7 w-full items-center justify-center gap-0.5">
            <ActionTip label="View">
              <Button
                variant="ghost"
                size="icon"
                aria-label="View"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTaskClick) onTaskClick(task.taskNo);
                  else navigate(taskUrl(task.taskNo, task.categoryName));
                }}
                className="h-7 w-7 shrink-0 rounded-md p-0 text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]"
              >
                <RowViewIcon />
              </Button>
            </ActionTip>
            {canEditTask(task) && (
              <ActionTip label="Edit">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(taskUrl(task.taskNo, task.categoryName));
                  }}
                  className="h-7 w-7 shrink-0 rounded-md p-0 text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]"
                >
                  <RowEditIcon />
                </Button>
              </ActionTip>
            )}
          </div>
        </td>
      )}
    </tr>
  );

  const visibleCols = COLUMNS.filter((col) => visibleColumns.has(col.key) && isColumnAllowed(col.key));

  const colWidthStyle = (col: (typeof COLUMNS)[number]) =>
    col.key === 'actions'
      ? { width: ACTIONS_COL_PX, minWidth: ACTIONS_COL_PX, maxWidth: ACTIONS_COL_PX }
      : col.key === 'code' && !colWidths[col.key]
        ? { width: 'var(--tm-col-id-width)', minWidth: 'var(--tm-col-id-width)', maxWidth: 'var(--tm-col-id-width)' }
        : colWidths[col.key]
          ? { width: colWidths[col.key], minWidth: colWidths[col.key], maxWidth: colWidths[col.key] }
          : DEFAULT_COL_WIDTH[col.key]
            ? { width: DEFAULT_COL_WIDTH[col.key], minWidth: DEFAULT_COL_WIDTH[col.key], maxWidth: DEFAULT_COL_WIDTH[col.key] }
            : { width: '14rem', minWidth: '14rem' };

  const tableColgroup = (
    <colgroup>
      {visibleCols.map((col) => (
        <col key={col.key} style={colWidthStyle(col)} />
      ))}
    </colgroup>
  );

  return (
    <DataTableScroll
      className="h-full"
      data-page-tour="task-table"
      minWidth={tableMinWidthPx}
      mobile={
        <div className="flex flex-col gap-2 p-2 sm:p-3">
          {sortedTasks.map((task) => (
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
      }
      header={
        <table className="tm-data-table table-fixed text-left w-full">
          {tableColgroup}
          <thead className="bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-slate-300 tracking-wide">
            <tr>
              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-1.5 border-r border-[var(--tm-border)] last:border-r-0 relative group/th text-left whitespace-nowrap overflow-hidden',
                    col.key === 'code' && 'tm-col-id tm-col-sticky-code sticky left-0 z-[45] bg-[var(--tm-elevated)] border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.28)]',
                    col.key === 'actions' && 'tm-col-actions px-1.5 !text-center last:border-r-0 sticky right-0 z-40 bg-[var(--tm-elevated)] border-l border-[var(--tm-border)]'
                  )}
                  style={colWidthStyle(col)}
                  {...(col.key !== 'actions' ? sortHeaderCellProps(col.key, handleSort) : {})}
                >
                  {col.key === 'actions' ? (
                    <div className="flex items-center justify-center gap-0.5 w-full min-w-0">
                      <span className="whitespace-nowrap">Actions</span>
                      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                        <ActionTip label="Toggle columns">
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Toggle columns"
                              className="h-6 w-6 shrink-0 px-0 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-[var(--tm-muted)]"
                            >
                              <Settings2 size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                        </ActionTip>
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
                                const next = new Set(pendingColumns);
                                next.add('title');
                                next.add('actions');
                                setVisibleColumns(next);
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
                    <div className="flex items-center justify-start w-full min-w-0 h-full pr-2 text-left">
                      <SortableHeader
                        label={col.label}
                        sortKey={col.key}
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        className="min-w-0 w-full justify-start"
                      />
                      <div
                        data-col-resize
                        className="w-1.5 h-full absolute right-0 top-0 cursor-col-resize hover:bg-blue-400/50 active:bg-blue-500 opacity-0 group-hover/th:opacity-100 transition-opacity z-[2]"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleResizeStart(e, col.key);
                        }}
                      />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      }
      body={
        <table className="tm-data-table table-fixed text-left w-full">
          {tableColgroup}
          <tbody className="divide-y divide-[var(--tm-border)]">
            {sortedTasks.map((task) => (
              <React.Fragment key={task.taskNo}>
                {renderTableRow(task)}
                {expandedTasks.has(task.taskNo) && task.subTasks && task.subTasks.length > 0 && (
                  task.subTasks.map((subTask: Task) => renderTableRow(subTask, true))
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      }
    />
  );
}
