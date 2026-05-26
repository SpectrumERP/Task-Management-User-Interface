import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/types/task';
import { MessageSquare, Clock, AlertCircle, AlertTriangle, Info, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/UserAvatar';

import { useTaskStore } from '@/store/useTaskStore';

interface TaskCardProps {
  task: Task;
  index: number;
  onTaskClick?: (taskId: number) => void;
}

export function TaskCard({ task, index, onTaskClick }: TaskCardProps) {
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

  const PriorityIcon = {
    4: () => <AlertCircle className="text-red-500 fill-red-500/10" size={18} />, // Urgent
    3: () => <AlertTriangle className="text-orange-500" size={18} />, // High
    2: () => <Info className="text-blue-500" size={18} />, // Medium
    1: () => null, // Low
  }[task.priority_No] || (() => null);

  const displayCode = task.code || `CP-${100 + task.taskNo}`;

  return (
    <Draggable draggableId={task.taskNo.toString()} index={index} isDragDisabled={true}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onTaskClick ? onTaskClick(task.taskNo) : navigate(`/task/${task.taskNo}`)}
          className={cn(
            "group mb-3 cursor-pointer",
            snapshot.isDragging ? "z-50" : ""
          )}
        >
          <Card className={cn(
            "border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden active:scale-[0.98]",
            snapshot.isDragging ? "rotate-2 scale-105 shadow-xl border-primary/20" : ""
          )}>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{displayCode}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/task/${task.taskNo}`);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-200 h-6 w-6 rounded-md text-slate-400 hover:text-[#006699] hover:bg-slate-100 flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Edit2 size={12} strokeWidth={2.5} />
                  </button>
                  <PriorityIcon />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <h4 className="text-[13px] font-black text-slate-900 leading-tight group-hover:text-[#006699] transition-colors line-clamp-1">
                  {task.title}
                </h4>
                
                <div className="flex flex-wrap gap-1 mt-1">
                  {task.typeName && (
                    <span className="bg-slate-200 text-slate-800 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                      {task.typeName}
                    </span>
                  )}
                  {task.categoryName && (() => {
                    const catObj = fillValues?.category?.find(
                      c => c.OperTaskCategoryNo === task.category_No || c.Category === task.categoryName
                    );
                    const bgColor = catObj?.ColorCoding || catObj?.colorCoding || (catObj as any)?.color || '#e2e8f0';
                    const textColor = getContrastColor(bgColor);
                    return (
                      <span 
                        style={{ backgroundColor: bgColor, color: textColor }}
                        className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider border border-black/5"
                      >
                        {task.categoryName}
                      </span>
                    );
                  })()}
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                    task.priority_No >= 3 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-700"
                  )}>
                    {task.priority}
                  </span>
                </div>

                <p className="text-[10px] text-slate-600 font-medium line-clamp-1 leading-normal pt-0.5">
                  {task.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex -space-x-1.5 items-center">
                  <UserAvatar
                    loginNo={task.owner_user_No}
                    displayName={task.assignedDisplayName}
                    size="sm"
                    className="border border-white shadow-sm"
                  />
                  {task.collaborators && task.collaborators.length > 0 && (
                    <div className="h-5.5 w-5.5 rounded-full border border-white bg-slate-200 flex items-center justify-center text-[7px] font-black text-slate-700">
                      +{task.collaborators.length}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {task.task_comments && task.task_comments.length > 0 && (
                    <div className="flex items-center gap-1 text-slate-600 font-extrabold">
                      <MessageSquare size={12} className="text-[#006699]" />
                      <span className="text-[9px]">{task.task_comments.length}</span>
                    </div>
                  )}
                  {task.priority_No >= 3 && (
                     <div className="flex items-center gap-1 text-slate-600 font-extrabold">
                        <Clock size={12} className="text-[#006699]" />
                        <span className="text-[9px]">2h</span>
                     </div>
                  )}
                  {task.status === 'In Progress' && (
                    <div className="bg-[#e1ecf7] text-[#006699] text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                      65%
                    </div>
                  )}
                  {task.status === 'In Review' && (
                    <div className="bg-red-50 text-red-500 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                      Needs Fix
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
