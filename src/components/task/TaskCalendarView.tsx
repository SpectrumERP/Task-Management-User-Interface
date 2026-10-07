import { useState, useEffect } from 'react';
import { Task, TaskStatus } from '@/types/task';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/dateTime';
import { getPriorityBadgeClass } from '@/lib/priorityStyles';
import { getStatusTextClass, resolveCanonicalStatus } from '@/lib/taskStatusGroups';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  Layers,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  List as ListIcon,
  LayoutGrid,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ActionTip, TruncatedText } from '@/components/master/shared/TruncatedCellTip';

interface TaskCalendarViewProps {
  tasks: Task[];
  isLoading?: boolean;
  loadError?: boolean;
  onRetryLoad?: () => void;
  onTaskClick: (taskId: number) => void;
  onAddTask?: (date?: Date) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  onViewModeChange?: (mode: 'list' | 'board' | 'calendar') => void;
}

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';


function getOpaqueTint(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#ffffff';
  
  // Opaque mix: 16% category color + 84% white
  const mix = (c: number) => Math.round(c * 0.16 + 255 * 0.84);
  
  const mixedR = mix(r).toString(16).padStart(2, '0');
  const mixedG = mix(g).toString(16).padStart(2, '0');
  const mixedB = mix(b).toString(16).padStart(2, '0');
  
  return `#${mixedR}${mixedG}${mixedB}`;
}

function getContrastColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return '#0f172a';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#0f172a';
  
  // Relative luminance — dark text on light surfaces, white on dark
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#0f172a' : '#ffffff';
}

export function TaskCalendarView({ 
  tasks, 
  isLoading,
  loadError,
  onRetryLoad,
  onTaskClick, 
  onAddTask,
  showFilters,
  onToggleFilters,
  onViewModeChange
}: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'agenda' : 'month'
  );

  // Prefer agenda on narrow phones (month/week grids are too cramped)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => {
      if (mq.matches) {
        setViewMode((prev) => (prev === 'month' || prev === 'week' ? 'agenda' : prev));
      }
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // State for "More Tasks" popover/dialog in Month view
  const [selectedDayTasks, setSelectedDayTasks] = useState<{ date: Date; tasks: Task[] } | null>(null);

  // State for hovering overlapping tasks in Week/Day views
  const [hoveredTaskNo, setHoveredTaskNo] = useState<number | null>(null);

  // Helper: Format date string safely
  const formatDateHeader = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'long' })} ${startOfWeek.getFullYear()}`;
      }
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short' })} ${currentDate.getFullYear()}`;
    }
    if (viewMode === 'day') {
      return `${currentDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${formatDate(currentDate)}`;
    }
    return 'Agenda Timeline';
  };

  // Helper: Navigate calendar
  const handlePrev = () => {
    setCurrentDate(prev => {
      const nextDate = new Date(prev);
      if (viewMode === 'month') nextDate.setMonth(prev.getMonth() - 1);
      else if (viewMode === 'week') nextDate.setDate(prev.getDate() - 7);
      else if (viewMode === 'day') nextDate.setDate(prev.getDate() - 1);
      return nextDate;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const nextDate = new Date(prev);
      if (viewMode === 'month') nextDate.setMonth(prev.getMonth() + 1);
      else if (viewMode === 'week') nextDate.setDate(prev.getDate() + 7);
      else if (viewMode === 'day') nextDate.setDate(prev.getDate() + 1);
      return nextDate;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Check if a task falls on a specific date
  const isTaskOnDate = (task: Task, date: Date) => {
    if (!task.start_date && !task.end_date) return false;

    const start = task.start_date ? new Date(task.start_date) : null;
    const end = task.end_date ? new Date(task.end_date) : null;

    // Normalize date to midnight for comparison
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const checkDate = (d: Date) => {
      const comp = new Date(d);
      comp.setHours(0, 0, 0, 0);
      return comp.getTime() === targetDate.getTime();
    };

    if (start && end) {
      const sComp = new Date(start);
      sComp.setHours(0, 0, 0, 0);
      const eComp = new Date(end);
      eComp.setHours(0, 0, 0, 0);
      return targetDate >= sComp && targetDate <= eComp;
    }

    if (start) return checkDate(start);
    if (end) return checkDate(end);

    return false;
  };

  // Sort tasks: All-Day first, then by priority, then by title
  const sortTasks = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return (b.priority_No || 0) - (a.priority_No || 0);
    });
  };

  // Get Priority colors
  const getPriorityStyle = (priority: string) => getPriorityBadgeClass(priority, null, 'soft');

  // Get Status styles — text color only (no badge background)
  const getStatusBadge = (status: TaskStatus | string) => {
    const pill = resolveCanonicalStatus(status);
    const label =
      pill === 'In-Progress' ? 'In-Progress' :
      pill === 'Complete' ? 'Complete' :
      pill === 'Cancelled' ? 'Cancelled' :
      pill === 'Hold' ? 'Hold' :
      pill === 'Assigned' ? 'Assigned' :
      status || 'Assigned';
    const Icon =
      pill === 'Complete' ? CheckCircle2 :
      pill === 'In-Progress' ? Clock :
      pill === 'Hold' ? Layers :
      null;
    return (
      <span className={cn('flex items-center gap-1 text-[10px]', getStatusTextClass(status))}>
        {Icon ? <Icon size={10} /> : null}
        {label}
      </span>
    );
  };

  // --- RENDER MONTH VIEW ---
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Pad before days of current month
    const totalSlots: Date[] = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      totalSlots.push(new Date(year, month - 1, prevMonthDays - i));
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      totalSlots.push(new Date(year, month, i));
    }

    // Pad after days
    const remainingSlots = 42 - totalSlots.length; // standard 6-week grid
    for (let i = 1; i <= remainingSlots; i++) {
      totalSlots.push(new Date(year, month + 1, i));
    }

    const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const weekdaysShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
      <div className="flex flex-col min-h-[420px] sm:min-h-[640px] h-full bg-[var(--tm-surface)] overflow-x-auto overflow-y-hidden animate-in fade-in duration-300">
        <div className="min-w-[560px] flex flex-col flex-1 min-h-0">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] shrink-0">
          {weekdays.map((day, i) => (
            <div key={day} className="py-2 sm:py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 border-r last:border-r-0 border-[var(--tm-border)]">
              <span className="sm:hidden">{weekdaysShort[i]}</span>
              <span className="hidden sm:inline">{day}</span>
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-[360px] sm:min-h-[560px]">
          {totalSlots.map((date, index) => {
            const isCurrentMonth = date.getMonth() === month;
            const isToday = new Date().toDateString() === date.toDateString();
            const dayTasks = sortTasks(tasks.filter(t => isTaskOnDate(t, date)));
            // Cell fits ~2 task pills OR 1 pill + "+N more". Showing 2 pills + more clips the last pill.
            const maxTaskSlots = 2;
            const hasOverflow = dayTasks.length > maxTaskSlots;
            const visibleCount = hasOverflow ? maxTaskSlots - 1 : Math.min(dayTasks.length, maxTaskSlots);
            const visibleTasks = dayTasks.slice(0, visibleCount);
            const overflowCount = dayTasks.length - visibleCount;

            return (
              <div
                key={index}
                className={cn(
                  "p-1.5 sm:p-2 border-r border-b border-[var(--tm-border)] flex flex-col group min-h-[96px] relative transition-colors duration-150",
                  isCurrentMonth ? "bg-[var(--tm-surface)] hover:bg-[var(--tm-elevated)]/80" : "bg-[var(--tm-muted)]/40 text-slate-400",
                  isToday && "bg-[var(--tm-tint)]/70"
                )}
              >
                <div className="flex items-center justify-between mb-1.5 shrink-0">
                  <span
                    className={cn(
                      "text-[11px] font-semibold tabular-nums transition-all inline-flex items-center justify-center",
                      isToday
                        ? "bg-[#0EA5E9] text-white w-6 h-6 rounded-[8px] shadow-sm shadow-[#0EA5E9]/20"
                        : "text-slate-200 w-6 h-6",
                      !isCurrentMonth && "text-slate-400 opacity-50"
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {onAddTask && (
                    <button
                      type="button"
                      onClick={() => onAddTask(date)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-[6px] bg-[var(--tm-tint)] hover:bg-[#d7ebf4] text-[#0EA5E9] flex items-center justify-center transition-all duration-200"
                      title="Quick Add Task"
                    >
                      <Plus size={11} strokeWidth={2.5} />
                    </button>
                  )}
                </div>

                <div className="flex flex-col flex-1 min-h-0 gap-0.5">
                  <div className="flex flex-col gap-0.5 min-h-0 overflow-hidden">
                    {visibleTasks.map(task => {
                      const customColor = task.calendarColor && task.calendarColor !== 'none' ? task.calendarColor : null;
                      const isHovered = hoveredTaskNo === task.taskNo;

                      return (
                        <div
                          key={task.taskNo}
                          onClick={() => onTaskClick(task.taskNo)}
                          onMouseEnter={() => setHoveredTaskNo(task.taskNo)}
                          onMouseLeave={() => setHoveredTaskNo(null)}
                          style={{
                            borderLeft: customColor ? `3px solid ${customColor}` : `3px solid #cbd5e1`,
                            backgroundColor: task.isAllDay
                              ? (customColor || '#94a3b8')
                              : (customColor ? getOpaqueTint(customColor) : 'var(--tm-muted)'),
                            color: task.isAllDay
                              ? (customColor ? getContrastColor(customColor) : '#ffffff')
                              : (customColor
                                  ? getContrastColor(getOpaqueTint(customColor))
                                  : 'var(--tm-input-fg)'),
                            borderColor: task.isAllDay
                              ? 'transparent'
                              : (customColor ? `${customColor}40` : 'var(--tm-border)'),
                            zIndex: isHovered ? 9999 : undefined
                          }}
                          className={cn(
                            "px-1.5 py-0.5 rounded-[6px] text-[10px] font-medium cursor-pointer transition-all hover:brightness-[0.98] flex items-center justify-between border shrink-0 min-h-[22px]",
                            task.isAllDay ? "" : "hover:bg-[var(--tm-muted)]"
                          )}
                        >
                          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden max-w-[85%]">
                            {customColor && !task.isAllDay && (
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0 border border-black/5"
                                style={{ backgroundColor: customColor }}
                              />
                            )}
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <TruncatedText text={task.title} className="text-[10px] font-medium" />
                            </div>
                          </div>
                          {!task.isAllDay && task.priority === 'Urgent' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 ml-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {overflowCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDayTasks({ date, tasks: dayTasks })}
                      className="w-full text-left px-1.5 py-0.5 text-[9px] font-semibold text-[#0EA5E9] hover:underline shrink-0"
                    >
                      +{overflowCount} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    );
  };

  // --- RENDER WEEK & DAY GRID ---
  // Calculates absolute positions for overlapping events
  const calculateCollisionColumns = (dayTasks: Task[]) => {
    const nonAllDayTasks = dayTasks.filter(t => !t.isAllDay && t.start_date);

    const parsed = nonAllDayTasks.map(task => {
      const start = new Date(task.start_date!);
      const end = task.end_date ? new Date(task.end_date) : new Date(start.getTime() + 60 * 60 * 1000); // 1h duration default

      const startMin = start.getHours() * 60 + start.getMinutes();
      const endMin = end.getHours() * 60 + end.getMinutes();

      return {
        task,
        startMin,
        endMin: Math.max(endMin, startMin + 75) // Minimum 75 mins slot height for superb text legibility!
      };
    });

    // Sort by start time, then by duration
    parsed.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

    // Collision grouping
    const columns: typeof parsed[] = [];

    parsed.forEach(item => {
      let placed = false;

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        // Check if there is an overlap in this column
        const hasOverlap = col.some(placedItem =>
          item.startMin < placedItem.endMin && item.endMin > placedItem.startMin
        );

        if (!hasOverlap) {
          col.push(item);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([item]);
      }
    });

    const positionedTasks: { task: Task; top: number; height: number; left: number; width: number; zIndex: number }[] = [];
    const totalColumns = columns.length;

    columns.forEach((col, colIndex) => {
      col.forEach(item => {
        // Top percent: minutes from midnight / 1440 mins total in day
        const top = (item.startMin / 1440) * 100;
        const height = ((item.endMin - item.startMin) / 1440) * 100;

        let left = 0;
        let width = 100;

        if (totalColumns > 1) {
          width = Math.max(52, 100 - (totalColumns - 1) * 12);
          left = (colIndex * (100 - width)) / (totalColumns - 1);
        }

        positionedTasks.push({
          task: item.task,
          top,
          height,
          left,
          width,
          zIndex: colIndex + 1
        });
      });
    });

    return positionedTasks;
  };

  // --- WEEK VIEW RENDER ---
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-full bg-[var(--tm-surface)] overflow-x-auto overflow-y-hidden animate-in fade-in duration-300">
        <div className="min-w-[720px] flex flex-col flex-1 min-h-0">
        {/* Headers */}
        <div className="grid grid-cols-8 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] sticky top-0 z-10">
          <div className="py-3 border-r border-[var(--tm-border)] flex items-center justify-center">
            <Clock size={14} className="text-slate-400" />
          </div>
          {days.map((date, idx) => {
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <div key={idx} className="py-2.5 text-center border-r last:border-r-0 border-[var(--tm-border)] flex flex-col items-center justify-center">
                <span className="text-[10px] font-medium text-slate-400  ">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className={cn(
                  "text-sm font-medium w-7 h-7 rounded-full flex items-center justify-center mt-0.5",
                  isToday ? "bg-[#0EA5E9] text-white shadow-md shadow-[#0EA5E9]/15" : "text-slate-100"
                )}>
                  {date.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* All-Day tasks bar */}
        <div className="grid grid-cols-8 border-b border-[var(--tm-border)] bg-amber-500/10 min-h-[40px] items-center">
          <div className="px-2 text-center text-[9px] font-medium text-amber-400 normal-case border-r border-[var(--tm-border)] h-full flex items-center justify-center">
            All-Day
          </div>
          {days.map((date, idx) => {
            const dayAllDayTasks = tasks.filter(t => t.isAllDay && isTaskOnDate(t, date));
            return (
              <div key={idx} className="p-1 border-r last:border-r-0 border-[var(--tm-border)] space-y-0 self-stretch flex flex-col justify-start">
                {dayAllDayTasks.map(t => {
                  const hasColor = t.calendarColor && t.calendarColor !== 'none';
                  return (
                    <div
                      key={t.taskNo}
                      onClick={() => onTaskClick(t.taskNo)}
                      style={{ 
                        backgroundColor: hasColor ? t.calendarColor : '#94a3b8',
                        color: hasColor ? getContrastColor(t.calendarColor!) : '#ffffff'
                      }}
                      className="px-2 py-0.5 rounded-md text-[9px] font-medium cursor-pointer transition-all hover:scale-[1.02] shadow-sm overflow-hidden"
                    >
                      <TruncatedText text={t.title} className="text-[9px] font-medium" />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto min-h-[500px] max-h-[600px] relative scrollbar-hide">
          <div className="grid grid-cols-8 relative" style={{ height: '1440px' }}>
            {/* Hour lines background */}
            <div className="absolute inset-0 col-start-2 col-span-7 grid grid-rows-24 pointer-events-none">
              {hours.map(h => (
                <div key={h} className="border-b border-[var(--tm-border)] w-full h-full" />
              ))}
            </div>

            {/* Time markers column */}
            <div className="col-span-1 border-r border-[var(--tm-border)] bg-[var(--tm-muted)]/30">
              {hours.map(h => (
                <div key={h} className="h-[50px] text-right pr-3 pt-1 text-[9px] font-medium text-slate-400 normal-case">
                  {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                </div>
              ))}
            </div>

            {/* Daily event columns */}
            {days.map((date, idx) => {
              const dayTasks = tasks.filter(t => isTaskOnDate(t, date));
              const positioned = calculateCollisionColumns(dayTasks);

              return (
                <div key={idx} className="col-span-1 border-r last:border-r-0 border-[var(--tm-border)] relative h-full group">
                  {onAddTask && (
                    <div
                      onClick={() => onAddTask(date)}
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-[var(--tm-muted)] cursor-pointer pointer-events-none group-hover:pointer-events-auto"
                      title="Click slot to create task"
                    />
                  )}
                   {positioned.map(({ task, top, height, left, width, zIndex }) => {
                    const customColor = task.calendarColor && task.calendarColor !== 'none' ? task.calendarColor : null;
                    const isUrgent = task.priority === 'Urgent';
                    const isHovered = hoveredTaskNo === task.taskNo;

                    return (
                      <div
                        key={task.taskNo}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick(task.taskNo);
                        }}
                        onMouseEnter={() => setHoveredTaskNo(task.taskNo)}
                        onMouseLeave={() => setHoveredTaskNo(null)}
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          left: `${left}%`,
                          width: `${width}%`,
                          borderLeft: customColor ? `4px solid ${customColor}` : `4px solid #cbd5e1`,
                          backgroundColor: isHovered 
                            ? '#ffffff' 
                            : (customColor ? getOpaqueTint(customColor) : 'var(--tm-page)'),
                          borderColor: customColor ? `${customColor}40` : 'var(--tm-border)',
                          zIndex: isHovered ? 9999 : zIndex,
                          transform: isHovered ? 'scale(1.05)' : undefined,
                          boxShadow: isHovered ? '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.15)' : undefined,
                        }}
                        className={cn(
                          "absolute p-1.5 border shadow-sm cursor-pointer transition-all duration-200 overflow-hidden flex flex-col justify-between",
                          width < 100 ? "rounded-lg border-[var(--tm-border)]" : "rounded-xl border-[var(--tm-border)]"
                        )}
                      >
                        <div className="overflow-hidden min-w-0">
                          <TruncatedText text={task.title} className="text-[10px] font-medium text-slate-100 leading-tight" />
                          <span className="text-[8px] font-medium text-slate-400 block mt-0.5">
                            {task.start_date ? new Date(task.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        {isUrgent && (
                          <div className="flex items-center justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>
    );
  };

  // --- DAY VIEW RENDER ---
  const renderDayView = () => {
    const dayTasks = tasks.filter(t => isTaskOnDate(t, currentDate));
    const allDayTasks = dayTasks.filter(t => t.isAllDay);
    const positioned = calculateCollisionColumns(dayTasks);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-full bg-[var(--tm-surface)] overflow-hidden animate-in fade-in duration-300">
        {/* Date / Day view all-day panel */}
        <div className="px-4 py-3 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Single Day Timeline</span>
            <span className="text-xs font-semibold text-[#0EA5E9]">{dayTasks.length} Scheduled Tasks</span>
          </div>

          {allDayTasks.length > 0 && (
            <div className="flex flex-wrap items-center gap-0.5 mt-1">
              <span className="text-[10px] font-medium text-amber-400   mr-1.5">All-Day:</span>
              {allDayTasks.map(t => {
                const hasColor = t.calendarColor && t.calendarColor !== 'none';
                return (
                  <div
                    key={t.taskNo}
                    onClick={() => onTaskClick(t.taskNo)}
                    style={{ 
                      backgroundColor: hasColor ? t.calendarColor : '#94a3b8',
                      color: hasColor ? getContrastColor(t.calendarColor!) : '#ffffff'
                    }}
                    className="px-3 py-1 rounded-xl text-xs font-medium cursor-pointer shadow-sm transition-all hover:scale-105"
                  >
                    {t.title}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-[500px] max-h-[600px] relative scrollbar-hide">
          <div className="grid grid-cols-8 relative" style={{ height: '1440px' }}>
            {/* Hour slots lines */}
            <div className="absolute inset-0 col-start-2 col-span-7 grid grid-rows-24 pointer-events-none">
              {hours.map(h => (
                <div key={h} className="border-b border-[var(--tm-border)] w-full h-full" />
              ))}
            </div>

            {/* Left hour labels */}
            <div className="col-span-1 border-r border-[var(--tm-border)] bg-[var(--tm-muted)]/20">
              {hours.map(h => (
                <div key={h} className="h-[50px] text-right pr-4 pt-2 text-[9px] font-medium text-slate-400 normal-case">
                  {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                </div>
              ))}
            </div>

            {/* Large positioned task container */}
            <div className="col-span-7 relative h-full group">
              {onAddTask && (
                <div
                  onClick={() => onAddTask(currentDate)}
                  className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-[var(--tm-muted)] cursor-pointer pointer-events-none group-hover:pointer-events-auto"
                  title="Click to schedule task"
                />
              )}
              {positioned.map(({ task, top, height, left, width, zIndex }) => {
                const customColor = task.calendarColor && task.calendarColor !== 'none' ? task.calendarColor : null;
                const isHovered = hoveredTaskNo === task.taskNo;

                return (
                  <div
                    key={task.taskNo}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(task.taskNo);
                    }}
                    onMouseEnter={() => setHoveredTaskNo(task.taskNo)}
                    onMouseLeave={() => setHoveredTaskNo(null)}
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                      borderLeft: customColor ? `4.5px solid ${customColor}` : `4.5px solid #cbd5e1`,
                      backgroundColor: isHovered 
                        ? '#ffffff' 
                        : (customColor ? getOpaqueTint(customColor) : 'var(--tm-page)'),
                      borderColor: customColor ? `${customColor}40` : 'var(--tm-border)',
                      zIndex: isHovered ? 9999 : zIndex,
                      transform: isHovered ? 'scale(1.03)' : undefined,
                      boxShadow: isHovered ? '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.15)' : undefined,
                    }}
                    className={cn(
                      "absolute p-3 border shadow-md cursor-pointer transition-all duration-200 overflow-hidden flex flex-col justify-between",
                      width < 100 ? "rounded-xl border-[var(--tm-border)]" : "rounded-2xl border-[var(--tm-border)]"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-0.5 min-w-0">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <TruncatedText text={task.title} className="text-xs font-medium text-slate-100" />
                        </div>
                        {getStatusBadge(task.status)}
                      </div>

                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        {task.start_date ? new Date(task.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - {' '}
                        {task.end_date ? new Date(task.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>

                      {task.description && (
                        <p className="text-[10px] text-slate-500 font-medium line-clamp-2 mt-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-[var(--tm-border)]">
                      <span className={cn(
                        "text-[9px] font-medium  px-2 py-0.5 rounded-md border ",
                        getPriorityStyle(task.priority)
                      )}>
                        {task.priority}
                      </span>
                      {task.assignedDisplayName && (
                        <span className="flex items-center gap-1 text-[9px] font-medium text-slate-500">
                          <User size={10} className="text-[#0EA5E9]" />
                          {task.assignedDisplayName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- AGENDA VIEW RENDER ---
  const renderAgendaView = () => {
    // Sort all tasks chronologically
    const chronTasks = [...tasks]
      .filter(t => t.start_date || t.end_date)
      .sort((a, b) => {
        const dateA = new Date(a.start_date || a.end_date!);
        const dateB = new Date(b.start_date || b.end_date!);
        return dateA.getTime() - dateB.getTime();
      });

    // Group tasks by Date string
    const grouped = chronTasks.reduce<Record<string, Task[]>>((acc, t) => {
      const dateStr = new Date(t.start_date || t.end_date!).toDateString();
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(t);
      return acc;
    }, {});

    const groupKeys = Object.keys(grouped);

    if (groupKeys.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--tm-tint)] text-[#0EA5E9]/70">
            <CalendarIcon size={22} strokeWidth={1.75} />
          </span>
          <h3 className="text-sm font-semibold text-slate-100">No Scheduled Tasks</h3>
          <p className="text-xs text-slate-400 font-medium mt-1 max-w-xs">Use the list, board, or task form to schedule start and due dates for your tasks.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 p-3 sm:p-4 animate-in fade-in duration-300">
        {groupKeys.map(dateStr => {
          const date = new Date(dateStr);
          const isToday = new Date().toDateString() === dateStr;
          const dayTasks = grouped[dateStr];

          return (
            <div key={dateStr} className="grid grid-cols-1 lg:grid-cols-4 gap-4 rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              {/* Date node Column */}
              <div className="lg:col-span-1 border-l-[3px] border-[#0EA5E9] pl-3.5 flex flex-col justify-center">
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  isToday ? "text-[#0EA5E9]" : "text-slate-400"
                )}>
                  {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
                <span className="text-lg font-semibold text-slate-100 mt-0.5">
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-xs font-medium text-slate-400 mt-0.5">{date.getFullYear()}</span>
              </div>

              {/* Tasks list inside Card */}
              <div className="lg:col-span-3 space-y-2.5">
                {dayTasks.map(task => {
                  const customColor = task.calendarColor && task.calendarColor !== 'none' ? task.calendarColor : null;

                  return (
                    <div
                      key={task.taskNo}
                      onClick={() => onTaskClick(task.taskNo)}
                      className="group border border-[var(--tm-border)]/80 rounded-[8px] p-3.5 bg-[var(--tm-surface)] hover:border-[#0EA5E9]/25 hover:bg-[var(--tm-elevated)]/60 cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center flex-wrap gap-0.5">
                          {customColor && (
                            <span
                              style={{ backgroundColor: customColor }}
                              className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                            />
                          )}
                          <span className="text-[10px] font-mono font-medium text-slate-400">#{task.code || `TSK-${task.taskNo}`}</span>
                          {getStatusBadge(task.status)}
                        </div>

                        <h4 className="text-xs font-medium text-slate-100 group-hover:text-[#0EA5E9] transition-colors">{task.title}</h4>
                        {task.description && (
                          <p className="text-[10px] text-slate-450 font-medium line-clamp-1 leading-normal">{task.description}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {/* Time range */}
                        <div className="flex items-center gap-0.5 bg-[var(--tm-muted)] px-2.5 py-1 rounded-xl border border-[var(--tm-border)]">
                          <Clock size={11} className="text-[#0EA5E9]" />
                          <span className="text-[9px] font-medium text-slate-300  ">
                            {task.isAllDay ? 'All Day' : (
                              <>
                                {task.start_date ? new Date(task.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - {' '}
                                {task.end_date ? new Date(task.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </>
                            )}
                          </span>
                        </div>

                        {/* Priority */}
                        <span className={cn(
                          "text-[9px] font-medium  px-2 py-0.5 rounded-md border ",
                          getPriorityStyle(task.priority)
                        )}>
                          {task.priority}
                        </span>

                        {/* Assignee Avatar */}
                        {task.assignedDisplayName && (
                          <div className="flex items-center gap-1 bg-[#e1ecf7]/40 px-1.5 py-0.5 rounded-xl border border-[#0EA5E9]/10 max-w-full min-w-0" onClick={(e) => e.stopPropagation()}>
                            <UserAvatar
                              loginNo={task.owner_user_No}
                              displayName={task.assignedDisplayName}
                              size="sm"
                              className="h-4.5 w-4.5 shrink-0"
                            />
                            <TruncatedText
                              text={task.assignedDisplayName}
                              className="text-[9px] font-medium text-slate-200"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-[12px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
      {/* Calendar Header with Controls */}
      <div className="shrink-0 border-b border-[var(--tm-border)] bg-[var(--tm-surface)]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-3.5 sm:px-4 pt-3.5 pb-2.5">
          {/* Date hero + month nav */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0EA5E9]">
              Schedule
            </p>
            <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={handlePrev}
                disabled={viewMode === 'agenda'}
                className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-[8px] text-slate-500 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)] disabled:opacity-35 disabled:pointer-events-none transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft size={18} strokeWidth={2} />
              </button>

              <h2 className="text-[1.35rem] sm:text-[1.5rem] font-bold tracking-tight text-slate-100 leading-none truncate select-none">
                {formatDateHeader()}
              </h2>

              <button
                type="button"
                onClick={handleNext}
                disabled={viewMode === 'agenda'}
                className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-[8px] text-slate-500 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)] disabled:opacity-35 disabled:pointer-events-none transition-colors"
                aria-label="Next"
              >
                <ChevronRight size={18} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Utility actions */}
          <div className="flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={handleToday}
              className="h-8 px-3 rounded-[8px] text-[11px] font-semibold text-[#0EA5E9] bg-[var(--tm-tint)] hover:bg-[#d7ebf4] transition-colors"
            >
              Today
            </button>

            {onToggleFilters && (
              <ActionTip label="Filters">
                <button
                  type="button"
                  onClick={onToggleFilters}
                  aria-label="Filters"
                  className={cn(
                    "h-8 w-8 inline-flex items-center justify-center rounded-[8px] border transition-colors",
                    showFilters
                      ? "border-[#0EA5E9]/35 bg-[var(--tm-tint)] text-[#0EA5E9]"
                      : "border-[var(--tm-border)] bg-[var(--tm-surface)] text-slate-500 hover:text-[#0EA5E9] hover:border-[#0EA5E9]/25"
                  )}
                >
                  <SlidersHorizontal size={14} className={cn(showFilters && "rotate-180 transition-transform")} />
                </button>
              </ActionTip>
            )}

            {onViewModeChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-8 px-2.5 inline-flex items-center gap-1 rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] text-slate-300 hover:text-[#0EA5E9] hover:border-[#0EA5E9]/25 transition-colors text-[11px] font-medium"
                  >
                    <CalendarIcon size={13} className="text-[#0EA5E9]" />
                    <span className="hidden sm:inline">View</span>
                    <ChevronDown size={13} className="text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-[8px] border border-[var(--tm-border)]/80 p-1 min-w-[150px] shadow-lg bg-[var(--tm-surface)] z-[60]">
                  <DropdownMenuItem
                    onClick={() => onViewModeChange('list')}
                    className="rounded-[6px] text-xs font-medium px-2.5 py-2 cursor-pointer flex items-center gap-2 text-slate-300 focus:bg-[var(--tm-page)] focus:text-[#0EA5E9]"
                  >
                    <ListIcon size={14} />
                    List View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onViewModeChange('board')}
                    className="rounded-[6px] text-xs font-medium px-2.5 py-2 cursor-pointer flex items-center gap-2 text-slate-300 focus:bg-[var(--tm-page)] focus:text-[#0EA5E9]"
                  >
                    <LayoutGrid size={14} />
                    Board View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onViewModeChange('calendar')}
                    className="rounded-[6px] text-xs font-medium px-2.5 py-2 cursor-pointer flex items-center gap-2 bg-[var(--tm-tint)] text-[#0EA5E9]"
                  >
                    <CalendarIcon size={14} />
                    Calendar View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Underline view tabs */}
        <div className="flex items-center gap-0.5 px-3.5 sm:px-4 overflow-x-auto scrollbar-hide">
          {([
            { id: 'month' as const, label: 'Month' },
            { id: 'week' as const, label: 'Week' },
            { id: 'day' as const, label: 'Day' },
            { id: 'agenda' as const, label: 'Agenda' },
          ]).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setViewMode(mode.id)}
              className={cn(
                "relative px-3.5 py-2.5 text-[12px] font-semibold transition-colors whitespace-nowrap",
                viewMode === mode.id
                  ? "text-[#0EA5E9]"
                  : "text-slate-500 hover:text-slate-100"
              )}
            >
              {mode.label}
              {viewMode === mode.id ? (
                <span className="absolute left-2 right-2 bottom-0 h-[2.5px] rounded-full bg-[#0EA5E9]" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Main Calendar Body */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide relative bg-[var(--tm-elevated)]/40">
        {isLoading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28">
            <BrandLoader size="sm" message="Loading schedule" />
          </div>
        ) : loadError && tasks.length === 0 ? (
          <LoadErrorState
            title="Failed to load schedule"
            description="Could not load calendar tasks. Retry uses the same filters."
            onRetry={onRetryLoad}
          />
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'agenda' && renderAgendaView()}
          </>
        )}
      </div>

      {/* "More Tasks" Popover Dialog */}
      <Dialog open={selectedDayTasks !== null} onOpenChange={() => setSelectedDayTasks(null)}>
        <DialogContent className="rounded-[12px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] max-w-md p-0 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] gap-0 overflow-hidden [&>button]:hidden">
          <DialogHeader className="px-4 py-3 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] flex flex-row items-start gap-3 space-y-0 text-left">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
              <Sparkles size={14} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[14px] font-semibold text-slate-100">
                Schedule Details
              </DialogTitle>
              {selectedDayTasks && (
                <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                  {selectedDayTasks.date.toLocaleDateString('en-US', { weekday: 'long' })}, {formatDate(selectedDayTasks.date)}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedDayTasks(null)}
              className="h-8 w-8 p-0 rounded-[8px] shrink-0 text-slate-400 hover:text-slate-300 hover:bg-[var(--tm-muted)]"
              aria-label="Close"
            >
              <X size={15} strokeWidth={1.75} />
            </Button>
          </DialogHeader>

          <div className="space-y-2 p-4 max-h-[300px] overflow-y-auto scrollbar-hide">
            {selectedDayTasks?.tasks.map(task => {
              const customColor = task.calendarColor || '#0EA5E9';

              return (
                <div
                  key={task.taskNo}
                  onClick={() => {
                    setSelectedDayTasks(null);
                    onTaskClick(task.taskNo);
                  }}
                  style={{ borderLeft: `3px solid ${customColor}`, backgroundColor: `${customColor}0d` }}
                  className="p-3 rounded-[8px] border border-[var(--tm-border)]/70 cursor-pointer hover:border-[#0EA5E9]/25 hover:shadow-sm transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <TruncatedText text={task.title} className="text-xs font-semibold text-slate-100 leading-tight" />
                    <span className="text-[10px] font-medium text-slate-500 block mt-1">
                      {task.isAllDay ? 'All Day Task' : (
                        <>
                          {task.start_date ? new Date(task.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - {' '}
                          {task.end_date ? new Date(task.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </>
                      )}
                    </span>
                  </div>

                  <span className={cn(
                    "text-[9px] font-semibold px-2 py-0.5 rounded-[6px] border shrink-0",
                    getPriorityStyle(task.priority)
                  )}>
                    {task.priority}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
