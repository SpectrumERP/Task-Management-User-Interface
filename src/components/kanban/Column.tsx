import { Droppable } from '@hello-pangea/dnd';
import { Task, TaskStatus } from '@/types/task';
import { TaskCard } from './TaskCard';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: () => void;
  onTaskClick?: (taskId: number) => void;
}

function statusAccent(status: string) {
  const s = status.toLowerCase().trim();
  if (s.includes('complete') || s === 'close' || s === 'closed' || s === 'done') {
    return {
      bar: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      header: 'from-emerald-50/80 to-white',
    };
  }
  if (s.includes('progress')) {
    return {
      bar: 'bg-sky-500',
      badge: 'bg-sky-50 text-sky-700 ring-sky-100',
      header: 'from-sky-50/80 to-white',
    };
  }
  if (s.includes('review')) {
    return {
      bar: 'bg-violet-500',
      badge: 'bg-violet-50 text-violet-700 ring-violet-100',
      header: 'from-violet-50/80 to-white',
    };
  }
  if (s.includes('hold') || s.includes('pending') || s.includes('open') || s.includes('reopen')) {
    return {
      bar: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-700 ring-amber-100',
      header: 'from-amber-50/80 to-white',
    };
  }
  if (s.includes('draft') || s.includes('todo') || s.includes('to do') || s.includes('to-do')) {
    return {
      bar: 'bg-[#006699]',
      badge: 'bg-[#e8f3f8] text-[#006699] ring-[#006699]/12',
      header: 'from-[#f4f9fc] to-white',
    };
  }
  return {
    bar: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-600 ring-slate-200',
    header: 'from-slate-50 to-white',
  };
}

export function Column({ status, tasks, onAddTask, onTaskClick }: ColumnProps) {
  const accent = statusAccent(status);

  return (
    <div className="flex flex-col w-[85vw] sm:w-[320px] min-w-[260px] sm:min-w-[320px] h-full rounded-[12px] bg-white border border-slate-200/80 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)] overflow-hidden">
      <div className={cn('relative px-3.5 py-3 border-b border-slate-100 bg-gradient-to-r', accent.header)}>
        <span className={cn('absolute left-0 top-0 bottom-0 w-1', accent.bar)} />
        <div className="flex items-center justify-between gap-2 pl-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-slate-800 text-[13px] truncate">{status}</h3>
            <span className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ring-1',
              accent.badge
            )}>
              {tasks.length}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-[7px] text-slate-400 hover:text-slate-600 hover:bg-white/80 shrink-0"
          >
            <MoreHorizontal size={16} />
          </Button>
        </div>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 overflow-y-auto scrollbar-hide px-3 py-3 transition-colors',
              snapshot.isDraggingOver ? 'bg-[#f4f9fc]' : 'bg-[#f8fbfd]/40'
            )}
          >
            {tasks.length === 0 ? (
              <div className="mb-3 rounded-[8px] border border-dashed border-slate-200 bg-white/70 px-3 py-6 text-center">
                <p className="text-[11px] font-medium text-slate-400">No tasks in {status}</p>
              </div>
            ) : (
              tasks.map((task, index) => (
                <TaskCard key={task.taskNo} task={task} index={index} onTaskClick={onTaskClick} />
              ))
            )}
            {provided.placeholder}

            <button
              type="button"
              onClick={onAddTask}
              className="w-full py-2.5 mt-1 border border-dashed border-[#006699]/25 rounded-[8px] flex items-center justify-center gap-1.5 text-[#006699] hover:border-[#006699]/45 hover:bg-[#e8f3f8] transition-all text-[11px] font-semibold bg-white/80"
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
