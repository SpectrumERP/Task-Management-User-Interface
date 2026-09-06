import { useMemo, useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Task, TaskStatus } from '@/types/task';
import { TaskCard } from './TaskCard';
import {
  MoreHorizontal,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowDownAZ,
  ArrowUpWideNarrow,
  ListRestart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: () => void;
  onTaskClick?: (taskId: number) => void;
}

type ColumnSort = 'default' | 'priority' | 'title';

function statusAccent(status: string) {
  const s = status.toLowerCase().trim();
  if (s.includes('complete') || s === 'done') {
    return {
      top: 'border-t-[3px] border-t-emerald-500',
      bar: 'bg-emerald-500',
      badge: 'bg-emerald-500 text-white',
    };
  }
  if (s === 'close' || s === 'closed') {
    return {
      top: 'border-t-[3px] border-t-teal-400',
      bar: 'bg-teal-400',
      badge: 'bg-teal-400 text-white',
    };
  }
  if (s.includes('progress')) {
    return {
      top: 'border-t-[3px] border-t-sky-500',
      bar: 'bg-sky-500',
      badge: 'bg-sky-500 text-white',
    };
  }
  if (s.includes('review')) {
    return {
      top: 'border-t-[3px] border-t-violet-500',
      bar: 'bg-violet-500',
      badge: 'bg-violet-500 text-white',
    };
  }
  if (s.includes('rejected')) {
    return {
      top: 'border-t-[3px] border-t-slate-500',
      bar: 'bg-slate-500',
      badge: 'bg-slate-500 text-white',
    };
  }
  if (s.includes('hold') || s.includes('pending') || s.includes('open') || s.includes('reopen')) {
    return {
      top: 'border-t-[3px] border-t-[#F59E0B]',
      bar: 'bg-[#F59E0B]',
      badge: 'bg-[#F59E0B] text-white',
    };
  }
  if (s.includes('draft') || s.includes('todo') || s.includes('to do') || s.includes('to-do')) {
    return {
      top: 'border-t-[3px] border-t-[#0EA5E9]',
      bar: 'bg-[#0EA5E9]',
      badge: 'bg-[#0EA5E9] text-white',
    };
  }
  return {
    top: 'border-t-[3px] border-t-slate-400',
    bar: 'bg-slate-400',
    badge: 'bg-slate-400 text-white',
  };
}

export function Column({ status, tasks, onAddTask, onTaskClick }: ColumnProps) {
  const accent = statusAccent(status);
  const [collapsed, setCollapsed] = useState(false);
  const [sortBy, setSortBy] = useState<ColumnSort>('default');

  const sortedTasks = useMemo(() => {
    if (sortBy === 'default') return tasks;
    const next = [...tasks];
    if (sortBy === 'priority') {
      next.sort((a, b) => (b.priority_No || 0) - (a.priority_No || 0));
    } else if (sortBy === 'title') {
      next.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
    }
    return next;
  }, [tasks, sortBy]);

  if (collapsed) {
    return (
      <div className="flex flex-col w-12 min-w-12 h-full rounded-[12px] theme-kanban-column bg-[var(--tm-surface)] border border-[var(--tm-border)]/80 overflow-hidden">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className={cn(
            'relative flex-1 flex flex-col items-center gap-3 px-1.5 py-3 hover:bg-[var(--tm-muted)]/60 transition-colors bg-[var(--tm-surface)]',
            accent.top
          )}
          title={`Expand ${status}`}
        >
          <ChevronRight size={14} className="text-slate-400 shrink-0" />
          <span
            className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
              accent.badge
            )}
          >
            {tasks.length}
          </span>
          <span
            className="text-[11px] font-semibold text-slate-200 tracking-wide"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {status}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-[85vw] sm:w-[320px] min-w-[260px] sm:min-w-[320px] h-full rounded-[12px] theme-kanban-column bg-[var(--tm-surface)] border border-[var(--tm-border)] shadow-[var(--tm-shadow)] overflow-hidden snap-center shrink-0">
      <div className={cn('relative px-3.5 py-3 border-b border-[var(--tm-border)] bg-[var(--tm-surface)]', accent.top)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-slate-100 text-[13px] truncate">{status}</h3>
            <span
              className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
                accent.badge
              )}
            >
              {tasks.length}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-[7px] text-slate-400 hover:text-slate-200 hover:bg-[var(--tm-surface)]/80 shrink-0"
                aria-label={`${status} column menu`}
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[var(--tm-surface)] border-[var(--tm-border)] text-slate-100">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Column actions
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer focus:bg-[var(--tm-muted)] focus:text-slate-50"
                onClick={onAddTask}
              >
                <Plus size={14} className="text-[#0EA5E9]" />
                Add Task
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer focus:bg-[var(--tm-muted)] focus:text-slate-50"
                onClick={() => setCollapsed(true)}
              >
                <ChevronDown size={14} className="text-slate-400" />
                Collapse column
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-[var(--tm-border)]" />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Sort
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer focus:bg-[var(--tm-muted)] focus:text-slate-50"
                onClick={() => setSortBy('priority')}
              >
                <ArrowUpWideNarrow size={14} className="text-[#F59E0B]" />
                Priority (high first)
                {sortBy === 'priority' ? <span className="ml-auto text-[#0EA5E9]">✓</span> : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer focus:bg-[var(--tm-muted)] focus:text-slate-50"
                onClick={() => setSortBy('title')}
              >
                <ArrowDownAZ size={14} className="text-slate-400" />
                Title (A–Z)
                {sortBy === 'title' ? <span className="ml-auto text-[#0EA5E9]">✓</span> : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer focus:bg-[var(--tm-muted)] focus:text-slate-50"
                onClick={() => setSortBy('default')}
                disabled={sortBy === 'default'}
              >
                <ListRestart size={14} className="text-slate-400" />
                Default order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'theme-kanban-column-body flex-1 overflow-y-auto scrollbar-hide px-3 py-3 transition-colors',
              snapshot.isDraggingOver ? 'bg-[var(--tm-tint)]/50' : 'bg-[var(--tm-elevated)]'
            )}
          >
            {sortedTasks.length === 0 ? (
              <div className="mb-3 rounded-[8px] border border-dashed border-[var(--tm-border)] bg-[var(--tm-surface)]/70 px-3 py-6 text-center">
                <p className="text-[11px] font-medium text-slate-400">No tasks in {status}</p>
              </div>
            ) : (
              sortedTasks.map((task, index) => (
                <TaskCard key={task.taskNo} task={task} index={index} onTaskClick={onTaskClick} />
              ))
            )}
            {provided.placeholder}

            <button
              type="button"
              onClick={onAddTask}
              className="w-full py-2.5 mt-1 border border-dashed border-[#0EA5E9]/35 rounded-[8px] flex items-center justify-center gap-1.5 text-[#0EA5E9] hover:border-[#0EA5E9]/55 hover:bg-[var(--tm-tint)] transition-all text-[11px] font-semibold bg-[var(--tm-surface)]/90 shadow-sm"
            >
              <Plus size={14} strokeWidth={2.25} />
              Add Task
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
}
