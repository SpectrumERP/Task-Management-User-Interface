import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/types/task';
import { MessageSquare, Clock, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface TaskCardProps {
  task: Task;
  index: number;
  onTaskClick?: (taskId: number) => void;
}

export function TaskCard({ task, index, onTaskClick }: TaskCardProps) {
  const navigate = useNavigate();

  const PriorityIcon = {
    4: () => <AlertCircle className="text-red-500 fill-red-500/10" size={18} />, // Urgent
    3: () => <AlertTriangle className="text-orange-500" size={18} />, // High
    2: () => <Info className="text-blue-500" size={18} />, // Medium
    1: () => null, // Low
  }[task.priority_No] || (() => null);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

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
                <PriorityIcon />
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
                  {task.categoryName && (
                    <span className="bg-[#e1ecf7] text-[#006699] text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                      {task.categoryName}
                    </span>
                  )}
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
                <div className="flex -space-x-1.5">
                  <div className="h-6 w-6 rounded-full border border-white bg-gradient-to-br from-[#006699] to-[#00b4d8] flex items-center justify-center overflow-hidden shadow-sm">
                    <span className="text-[8px] font-black text-white">{getInitials(task.assignedDisplayName)}</span>
                  </div>
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
