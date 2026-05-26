import { Droppable } from '@hello-pangea/dnd';
import { Task, TaskStatus } from '@/types/task';
import { TaskCard } from './TaskCard';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: () => void;
  onTaskClick?: (taskId: number) => void;
}

export function Column({ status, tasks, onAddTask, onTaskClick }: ColumnProps) {
  return (
    <div className="flex flex-col w-[85vw] sm:w-[350px] min-w-[280px] sm:min-w-[350px] h-full p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/50 ring-1 ring-white/20">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-800 text-base">{status}</h3>
          <div className="bg-slate-200 text-slate-600 rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-bold">
            {tasks.length}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
          <MoreHorizontal size={20} />
        </Button>
      </div>

      {/* Drop Zone */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto scrollbar-hide px-2 transition-colors rounded-2xl",
              snapshot.isDraggingOver ? "bg-slate-100/50" : ""
            )}
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.taskNo} task={task} index={index} onTaskClick={onTaskClick} />
            ))}
            {provided.placeholder}

            {/* Add Task Button at bottom of column */}
            <button 
              onClick={onAddTask}
              className="w-full py-3 mt-2 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:border-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all text-xs font-bold"
            >
              <Plus size={16} />
              Add Task
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
}

import { cn } from '@/lib/utils';
