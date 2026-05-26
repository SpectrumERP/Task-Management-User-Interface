import { useState } from 'react';
import { Task, TaskStatus } from '@/types/task';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  ChevronDown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface TaskCalendarViewProps {
  tasks: Task[];
  isLoading?: boolean;
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
  if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#ffffff';
  
  // Relative luminance calculation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? '#1e293b' : '#ffffff';
}

export function TaskCalendarView({ 
  tasks, 
  isLoading, 
  onTaskClick, 
  onAddTask,
  showFilters,
  onToggleFilters,
  onViewModeChange
}: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

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
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'High': return 'bg-orange-500/10 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      default: return 'bg-slate-500/10 text-slate-700 border-slate-200';
    }
  };

  // Get Status styles
  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'Done': return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> Done</span>;
      case 'In Progress': return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={10} /> Progress</span>;
      case 'In Review': return <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full"><Layers size={10} /> Review</span>;
      default: return <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Todo</span>;
    }
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

    return (
      <div className="flex flex-col min-h-[720px] bg-white rounded-3xl border border-slate-150 shadow-xl overflow-hidden animate-in fade-in duration-300">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-slate-150 bg-slate-50/30">
          {weekdays.map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r last:border-r-0 border-slate-150/60">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-[660px]">
          {totalSlots.map((date, index) => {
            const isCurrentMonth = date.getMonth() === month;
            const isToday = new Date().toDateString() === date.toDateString();
            const dayTasks = sortTasks(tasks.filter(t => isTaskOnDate(t, date)));
            const visibleTasks = dayTasks.slice(0, 3);
            const overflowCount = dayTasks.length - 3;

            return (
              <div
                key={index}
                className={cn(
                  "p-2 border-r border-b border-slate-150/60 flex flex-col group min-h-[110px] relative transition-colors duration-150",
                  isCurrentMonth ? "bg-white" : "bg-slate-50/15 text-slate-400",
                  isToday && "bg-[#006699]/5"
                )}
              >
                {/* Date display & Hover + Action */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "text-xs font-extrabold transition-all",
                      isToday ? "bg-[#006699] text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md shadow-[#006699]/15" : "text-slate-700",
                      !isCurrentMonth && "text-slate-400 opacity-40"
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {onAddTask && (
                    <button
                      onClick={() => onAddTask(date)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-[#e1ecf7] hover:bg-[#d0e3f5] text-[#006699] flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-sm"
                      title="Quick Add Task"
                    >
                      <Plus size={11} strokeWidth={3} />
                    </button>
                  )}
                </div>

                {/* Day tasks list */}
                <div className="space-y-1.5 flex-1 overflow-hidden">
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
                              : (customColor ? getOpaqueTint(customColor) : '#f1f5f9'),
                            color: task.isAllDay
                              ? (customColor ? getContrastColor(customColor) : '#ffffff')
                              : '#1e293b',
                            borderColor: task.isAllDay
                              ? 'transparent'
                              : (customColor ? `${customColor}40` : '#e2e8f0'),
                            zIndex: isHovered ? 9999 : undefined
                          }}
                          className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold truncate cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex items-center justify-between border",
                            task.isAllDay ? "" : "hover:bg-slate-50"
                          )}
                          title={task.title}
                        >
                          <div className="flex items-center gap-1.5 truncate max-w-[85%]">
                            {customColor && !task.isAllDay && (
                              <span 
                                className="w-1.5 h-1.5 rounded-full shrink-0 border border-black/5 shadow-inner" 
                                style={{ backgroundColor: customColor }}
                              />
                            )}
                            <span className="truncate">{task.title}</span>
                          </div>
                          {!task.isAllDay && task.priority === 'Urgent' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 ml-1" />
                          )}
                        </div>
                      );
                  })}

                  {overflowCount > 0 && (
                    <button
                      onClick={() => setSelectedDayTasks({ date, tasks: dayTasks })}
                      className="w-full text-left px-2.5 py-0.5 text-[9px] font-black text-[#006699] uppercase tracking-wider hover:underline animate-pulse shrink-0"
                    >
                      + {overflowCount} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
      <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-150 shadow-xl overflow-hidden animate-in fade-in duration-300">
        {/* Headers */}
        <div className="grid grid-cols-8 border-b border-slate-150 bg-slate-50/50 sticky top-0 z-10">
          <div className="py-4 border-r border-slate-150 flex items-center justify-center">
            <Clock size={14} className="text-slate-400" />
          </div>
          {days.map((date, idx) => {
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <div key={idx} className="py-2.5 text-center border-r last:border-r-0 border-slate-150 flex flex-col items-center justify-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className={cn(
                  "text-sm font-black w-7 h-7 rounded-full flex items-center justify-center mt-0.5",
                  isToday ? "bg-[#006699] text-white shadow-md shadow-[#006699]/15" : "text-slate-800"
                )}>
                  {date.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* All-Day tasks bar */}
        <div className="grid grid-cols-8 border-b border-slate-150 bg-amber-50/10 min-h-[40px] items-center">
          <div className="px-2 text-center text-[9px] font-black text-amber-600 uppercase tracking-widest border-r border-slate-150 h-full flex items-center justify-center">
            All-Day
          </div>
          {days.map((date, idx) => {
            const dayAllDayTasks = tasks.filter(t => t.isAllDay && isTaskOnDate(t, date));
            return (
              <div key={idx} className="p-1 border-r last:border-r-0 border-slate-150 space-y-1 self-stretch flex flex-col justify-start">
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
                      className="px-2 py-0.5 rounded-md text-[9px] font-bold truncate cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
                      title={t.title}
                    >
                      {t.title}
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
                <div key={h} className="border-b border-slate-100 w-full h-full" />
              ))}
            </div>

            {/* Time markers column */}
            <div className="col-span-1 border-r border-slate-150 bg-slate-50/30">
              {hours.map(h => (
                <div key={h} className="h-[50px] text-right pr-3 pt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                </div>
              ))}
            </div>

            {/* Daily event columns */}
            {days.map((date, idx) => {
              const dayTasks = tasks.filter(t => isTaskOnDate(t, date));
              const positioned = calculateCollisionColumns(dayTasks);

              return (
                <div key={idx} className="col-span-1 border-r last:border-r-0 border-slate-150 relative h-full group">
                  {onAddTask && (
                    <div
                      onClick={() => onAddTask(date)}
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-slate-100 cursor-pointer pointer-events-none group-hover:pointer-events-auto"
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
                            : (customColor ? getOpaqueTint(customColor) : '#f8fafc'),
                          borderColor: customColor ? `${customColor}40` : '#e2e8f0',
                          zIndex: isHovered ? 9999 : zIndex,
                          transform: isHovered ? 'scale(1.05)' : undefined,
                          boxShadow: isHovered ? '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.15)' : undefined,
                        }}
                        className={cn(
                          "absolute p-1.5 border shadow-sm cursor-pointer transition-all duration-200 overflow-hidden flex flex-col justify-between",
                          width < 100 ? "rounded-lg border-slate-200" : "rounded-xl border-slate-150"
                        )}
                      >
                        <div className="overflow-hidden">
                          <h4 className="text-[10px] font-black text-slate-800 leading-tight truncate">{task.title}</h4>
                          <span className="text-[8px] font-bold text-slate-400 block mt-0.5">
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
    );
  };

  // --- DAY VIEW RENDER ---
  const renderDayView = () => {
    const dayTasks = tasks.filter(t => isTaskOnDate(t, currentDate));
    const allDayTasks = dayTasks.filter(t => t.isAllDay);
    const positioned = calculateCollisionColumns(dayTasks);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-150 shadow-xl overflow-hidden animate-in fade-in duration-300">
        {/* Date / Day view all-day panel */}
        <div className="p-4 border-b border-slate-150 bg-slate-50/50 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-450 uppercase tracking-widest">Single Day Timeline</span>
            <span className="text-xs font-bold text-[#006699]">{dayTasks.length} Scheduled Tasks</span>
          </div>

          {allDayTasks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mr-1.5">All-Day:</span>
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
                    className="px-3 py-1 rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all hover:scale-105"
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
                <div key={h} className="border-b border-slate-100 w-full h-full" />
              ))}
            </div>

            {/* Left hour labels */}
            <div className="col-span-1 border-r border-slate-150 bg-slate-50/20">
              {hours.map(h => (
                <div key={h} className="h-[50px] text-right pr-4 pt-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                </div>
              ))}
            </div>

            {/* Large positioned task container */}
            <div className="col-span-7 relative h-full group">
              {onAddTask && (
                <div
                  onClick={() => onAddTask(currentDate)}
                  className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-slate-50 cursor-pointer pointer-events-none group-hover:pointer-events-auto"
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
                        : (customColor ? getOpaqueTint(customColor) : '#f8fafc'),
                      borderColor: customColor ? `${customColor}40` : '#e2e8f0',
                      zIndex: isHovered ? 9999 : zIndex,
                      transform: isHovered ? 'scale(1.03)' : undefined,
                      boxShadow: isHovered ? '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.15)' : undefined,
                    }}
                    className={cn(
                      "absolute p-3 border shadow-md cursor-pointer transition-all duration-200 overflow-hidden flex flex-col justify-between",
                      width < 100 ? "rounded-xl border-slate-200" : "rounded-2xl border-slate-150"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-800 truncate">{task.title}</h4>
                        {getStatusBadge(task.status)}
                      </div>

                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        {task.start_date ? new Date(task.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - {' '}
                        {task.end_date ? new Date(task.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>

                      {task.description && (
                        <p className="text-[10px] text-slate-500 font-medium line-clamp-2 mt-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider",
                        getPriorityStyle(task.priority)
                      )}>
                        {task.priority}
                      </span>
                      {task.assignedDisplayName && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                          <User size={10} className="text-[#006699]" />
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
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-150 shadow-xl text-center">
          <CalendarIcon className="h-14 w-14 text-slate-300 animate-bounce mb-4" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">No Scheduled Tasks</h3>
          <p className="text-xs text-slate-450 font-bold mt-1 max-w-xs">Use the list, board, or task form to schedule start and due dates for your tasks.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {groupKeys.map(dateStr => {
          const date = new Date(dateStr);
          const isToday = new Date().toDateString() === dateStr;
          const dayTasks = grouped[dateStr];

          return (
            <div key={dateStr} className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-white/75 backdrop-blur-md rounded-3xl p-5 border border-slate-150 shadow-md">
              {/* Date node Column */}
              <div className="lg:col-span-1 border-l-4 border-[#006699] pl-4 flex flex-col justify-center">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isToday ? "text-[#006699] animate-pulse" : "text-slate-400"
                )}>
                  {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
                <span className="text-xl font-black text-slate-800 mt-1">
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-xs font-bold text-slate-400 mt-0.5">{date.getFullYear()}</span>
              </div>

              {/* Tasks list inside Card */}
              <div className="lg:col-span-3 space-y-4">
                {dayTasks.map(task => {
                  const customColor = task.calendarColor && task.calendarColor !== 'none' ? task.calendarColor : null;

                  return (
                    <div
                      key={task.taskNo}
                      onClick={() => onTaskClick(task.taskNo)}
                      className="group border border-slate-150/80 rounded-2xl p-4 bg-white hover:bg-slate-50/50 hover:shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.01] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          {customColor && (
                            <span
                              style={{ backgroundColor: customColor }}
                              className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                            />
                          )}
                          <span className="text-[10px] font-mono font-bold text-slate-400">#{task.code || `TSK-${task.taskNo}`}</span>
                          {getStatusBadge(task.status)}
                        </div>

                        <h4 className="text-xs font-black text-slate-800 group-hover:text-[#006699] transition-colors">{task.title}</h4>
                        {task.description && (
                          <p className="text-[10px] text-slate-450 font-bold line-clamp-1 leading-normal">{task.description}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {/* Time range */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-150">
                          <Clock size={11} className="text-[#006699]" />
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">
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
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider",
                          getPriorityStyle(task.priority)
                        )}>
                          {task.priority}
                        </span>

                        {/* Assignee Avatar */}
                        {task.assignedDisplayName && (
                          <div className="flex items-center gap-1 bg-[#e1ecf7]/40 px-2.5 py-1 rounded-xl border border-[#006699]/10">
                            <span className="w-4 h-4 rounded-full bg-[#006699] text-white flex items-center justify-center text-[9px] font-black">
                              {task.assignedDisplayName[0].toUpperCase()}
                            </span>
                            <span className="text-[9px] font-bold text-slate-700">{task.assignedDisplayName}</span>
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
    <div className="space-y-2 flex flex-col flex-1 min-h-0">
      {/* Calendar Header with Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white rounded-3xl border border-slate-150 p-3 sm:p-4 md:p-1.5 md:py-1 shadow-lg shadow-slate-100/30 shrink-0">

        {/* Navigation buttons: takes full width on mobile, aligned left on desktop */}
        <div className="flex items-center justify-between md:justify-start gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={viewMode === 'agenda'}
              className="h-10 w-10 p-0 rounded-xl border-slate-200 bg-white hover:bg-slate-50 transition-all active:scale-95 text-slate-650 hover:text-slate-800 flex items-center justify-center shrink-0"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-10 px-4 sm:px-5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest transition-all active:scale-95 shrink-0"
            >
              TODAY
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={viewMode === 'agenda'}
              className="h-10 w-10 p-0 rounded-xl border-slate-200 bg-white hover:bg-slate-50 transition-all active:scale-95 text-slate-650 hover:text-slate-800 flex items-center justify-center shrink-0"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </Button>
          </div>

          {/* Date range header */}
          <h2 className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 select-none">
            <CalendarIcon size={14} className="text-[#006699]" />
            {formatDateHeader()}
          </h2>
        </div>

        {/* Unified Calendar Right Control Actions: horizontal layout stacking neatly below on mobile */}
        <div className="flex flex-col sm:flex-row md:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 border-t border-slate-100 md:border-none pt-2.5 md:pt-0">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-start">
            {onToggleFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={onToggleFilters}
                className={cn(
                  "h-10 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-200 gap-1.5 sm:gap-2 shadow-sm shrink-0 flex-1 sm:flex-initial justify-center",
                  showFilters && "border-[#006699] text-[#006699] bg-[#e1ecf7]/50"
                )}
              >
                <SlidersHorizontal size={13} className={cn("transition-transform duration-300", showFilters && "rotate-180")} />
                <span>FILTERS</span>
              </Button>
            )}

            {onViewModeChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 shadow-sm gap-1.5 sm:gap-2.5 transition-all flex items-center justify-between text-[10px] sm:text-xs shrink-0 flex-1 sm:flex-initial"
                  >
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <CalendarIcon size={14} className="text-[#006699]" />
                      <span className="hidden xs:inline">Calendar View</span>
                      <span className="xs:hidden">Calendar</span>
                    </span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border border-slate-100 p-1 min-w-[140px] shadow-xl bg-white z-[60]">
                  <DropdownMenuItem
                    onClick={() => onViewModeChange('list')}
                    className="rounded-lg text-xs font-bold px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50"
                  >
                    <ListIcon size={14} />
                    List View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onViewModeChange('board')}
                    className="rounded-lg text-xs font-bold px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50"
                  >
                    <LayoutGrid size={14} />
                    Board View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onViewModeChange('calendar')}
                    className="rounded-lg text-xs font-bold px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors bg-slate-100 text-[#006699]"
                  >
                    <CalendarIcon size={14} />
                    Calendar View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* View Mode Segmented Controls: spans full-width on mobile and distributes buttons evenly! */}
          <div className="flex items-center bg-slate-100/50 p-1 rounded-xl sm:rounded-2xl border border-slate-200/30 shadow-inner w-full sm:w-auto justify-between sm:justify-start">
            {(['month', 'week', 'day', 'agenda'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3 sm:px-4 py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest transition-all duration-200 flex-1 sm:flex-initial text-center justify-center",
                  viewMode === mode
                    ? "bg-white text-[#006699] shadow-md shadow-slate-250/20"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/20"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Calendar Body */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white rounded-3xl border border-slate-150 shadow-md">
            <span className="w-8 h-8 rounded-full border-4 border-[#006699] border-t-transparent animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Updating Schedule View...</p>
          </div>
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
        <DialogContent className="rounded-3xl border border-slate-100 bg-white max-w-md p-6 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3 flex flex-col gap-1">
            <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={16} className="text-[#006699]" />
              Schedule Details
            </DialogTitle>
            {selectedDayTasks && (
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                {selectedDayTasks.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto scrollbar-hide pr-1">
            {selectedDayTasks?.tasks.map(task => {
              const customColor = task.calendarColor || '#006699';

              return (
                <div
                  key={task.taskNo}
                  onClick={() => {
                    setSelectedDayTasks(null);
                    onTaskClick(task.taskNo);
                  }}
                  style={{ borderLeft: `4px solid ${customColor}`, backgroundColor: `${customColor}0d` }}
                  className="p-3 rounded-2xl border border-slate-150 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.01] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-800 leading-tight truncate">{task.title}</h4>
                    <span className="text-[9px] font-bold text-slate-450 block mt-1">
                      {task.isAllDay ? 'All Day Task' : (
                        <>
                          {task.start_date ? new Date(task.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - {' '}
                          {task.end_date ? new Date(task.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </>
                      )}
                    </span>
                  </div>

                  <span className={cn(
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider",
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
