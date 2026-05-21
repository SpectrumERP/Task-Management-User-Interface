import { Task } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, ArrowRight, MessageSquare, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { useTaskStore } from '@/store/useTaskStore';

interface TaskListViewProps {
  tasks: Task[];
  isLoading?: boolean;
  onTaskClick?: (taskId: number) => void;
}

export function TaskListView({ tasks, isLoading, onTaskClick }: TaskListViewProps) {
  const navigate = useNavigate();
  const { fillValues } = useTaskStore();

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

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 w-full bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
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
        <h3 className="text-lg font-bold text-slate-800">No tasks found</h3>
        <p className="text-slate-500 text-sm font-medium">Try adjusting your filters or create a new task.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Card
          key={task.taskNo}
          onClick={() => onTaskClick ? onTaskClick(task.taskNo) : navigate(`/task/${task.taskNo}`)}
          className="group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 border-slate-200/60 rounded-[20px] cursor-pointer overflow-hidden bg-white/80 backdrop-blur-sm"
        >
          <div className="flex items-center p-2.5 px-5 gap-4">
            {/* 1. Status & ID */}
            <div className="flex flex-col items-center justify-center w-[90px] shrink-0 border-r border-slate-100 pr-4">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-0.5">{task.code || `CP-${100 + task.taskNo}`}</span>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider text-center flex items-center justify-center min-h-[18px] w-full max-w-[76px]",
                task.status === 'Done' ? "bg-green-100/80 text-green-800" :
                  task.status === 'In Progress' ? "bg-blue-100/80 text-blue-800" :
                    task.status === 'In Review' ? "bg-purple-100/80 text-purple-800" :
                      "bg-slate-200/80 text-slate-800"
              )}>
                {task.status}
              </div>
            </div>

            {/* 2. Content */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <h3 className="text-[15px] font-black text-slate-900 group-hover:text-[#006699] transition-colors line-clamp-1 leading-snug">
                {task.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-slate-600">
                  <Calendar size={11} className="text-[#006699]" />
                  <span className="text-[10px] font-bold">{task.start_date ? format(new Date(task.start_date), 'MMM dd') : 'No date'}</span>
                </div>
                {task.categoryName && (() => {
                  const catObj = fillValues?.category?.find(
                    c => c.OperTaskCategoryNo === task.category_No || c.Category === task.categoryName
                  );
                  const bgColor = catObj?.ColorCoding || catObj?.colorCoding || (catObj as any)?.color || '#e2e8f0';
                  const textColor = getContrastColor(bgColor);
                  return (
                    <span 
                      style={{ backgroundColor: bgColor, color: textColor }}
                      className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-black/5 shadow-sm"
                    >
                      {task.categoryName}
                    </span>
                  );
                })()}
                {task.typeName && (
                  <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#006699]" />
                    {task.typeName}
                  </span>
                )}
              </div>
            </div>

            {/* 3. Priority & Stats */}
            <div className="hidden md:flex flex-col items-end gap-1 px-4">
              <div className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm",
                task.priority_No >= 3 ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"
              )}>
                {task.priority}
              </div>
              <div className="flex items-center gap-2 text-slate-600 font-extrabold">
                {task.task_comments && task.task_comments.length > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageSquare size={12} className="text-[#006699]" />
                    <span className="text-[10px]">{task.task_comments.length}</span>
                  </div>
                )}
                {(task.estimated_effort_value ?? 0) > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-[#006699]" />
                    <span className="text-[10px]">{task.estimated_effort_value}h</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Owner Avatar */}
            <div className="flex items-center justify-center pl-4 border-l border-slate-100 shrink-0">
              <div 
                className="h-7 w-7 rounded-full bg-gradient-to-br from-[#006699] to-[#00b4d8] flex items-center justify-center text-[10px] font-black text-white shadow-md shadow-[#006699]/10 cursor-help"
                title={task.assignedDisplayName ? `Owner: ${task.assignedDisplayName}` : 'Unassigned'}
              >
                {getInitials(task.assignedDisplayName)}
              </div>
            </div>

            {/* 5. Quick Actions / Edit */}
            <div className="flex items-center justify-center pl-4 border-l border-slate-100 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/task/${task.taskNo}`);
                }}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-[#006699] hover:bg-slate-50 flex items-center justify-center transition-all duration-200"
              >
                <Edit2 size={13} strokeWidth={2.5} />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
