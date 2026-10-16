import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/types/task';
import { MessageSquare, Clock, AlertCircle, AlertTriangle, Info, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPriorityBadgeClass } from '@/lib/priorityStyles';
import { getStatusChipClass } from '@/lib/taskStatusGroups';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/UserAvatar';

import { useTaskStore } from '@/store/useTaskStore';
import { useSettings } from '@/hooks/useSettings';
import { taskUrl } from '@/lib/dealMonitor';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { canUserEditTask } from '@/lib/taskAccess';

interface TaskCardProps {
  task: Task;
  index: number;
  onTaskClick?: (taskId: number) => void;
}

export function TaskCard({ task, index, onTaskClick }: TaskCardProps) {
  const navigate = useNavigate();
  const { fillValues } = useTaskStore();
  const { isHideType } = useSettings();
  const user = useAuthStore((s) => s.user);
  const { isUpdate } = useFormRights(1547);
  const canEdit = canUserEditTask(user, task, isUpdate);

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

  const PriorityIcon = {
    4: () => <AlertCircle className="text-red-500 fill-red-500/10" size={18} />, // Urgent
    3: () => <AlertTriangle className="text-[#F59E0B]" size={18} />, // High
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
          style={provided.draggableProps.style as React.CSSProperties}
          onClick={() => {
            if (onTaskClick) {
              onTaskClick(task.taskNo);
            } else {
              navigate(taskUrl(task.taskNo, task.categoryName));
            }
          }}
          className={cn(
            "group mb-3 cursor-pointer",
            snapshot.isDragging ? "z-50" : ""
          )}
        >
          <Card className={cn(
            "theme-task-card border border-[var(--tm-border)] shadow-sm hover:border-[#0EA5E9]/40 hover:shadow-[0_8px_24px_-12px_rgba(14,165,233,0.22)] transition-all duration-200 rounded-[8px] overflow-hidden active:scale-[0.98] bg-[var(--tm-surface)]",
            snapshot.isDragging ? "rotate-1 scale-[1.02] shadow-xl border-[#0EA5E9]/30" : ""
          )}>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] font-semibold text-slate-500">{displayCode}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(taskUrl(task.taskNo, task.categoryName));
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 h-6 w-6 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)] flex items-center justify-center cursor-pointer"
                    >
                      <Edit2 size={12} strokeWidth={2.25} />
                    </button>
                  )}
                  <PriorityIcon />
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[13px] font-semibold text-slate-100 leading-snug group-hover:text-[#0EA5E9] transition-colors line-clamp-2">
                  {task.title}
                </h4>

                <div className="flex flex-wrap gap-1">
                  {task.typeName && !isHideType && (
                    <span className="bg-[var(--tm-muted)] text-slate-300 text-[9px] font-semibold px-1.5 py-0.5 rounded-[5px]">
                      {task.typeName}
                    </span>
                  )}
                  {task.categoryName && (() => {
                    const catObj = fillValues?.category?.find(
                      c => c.OperTaskCategoryNo === task.category_No || c.Category === task.categoryName
                    );
                    const bgColor = catObj?.ColorCoding || catObj?.colorCoding || (catObj as any)?.color || 'var(--tm-border)';
                    const textColor = getContrastColor(bgColor);
                    return (
                      <span
                        style={{ backgroundColor: bgColor, color: textColor }}
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-[5px] border border-black/5"
                      >
                        {task.categoryName}
                      </span>
                    );
                  })()}
                  <span className={cn(
                    "text-[9px] font-semibold px-1.5 py-0.5 rounded-[5px]",
                    getPriorityBadgeClass(task.priority, task.priority_No, 'soft')
                  )}>
                    {task.priority}
                  </span>
                </div>

                {task.description ? (
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-snug">
                    {task.description}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[var(--tm-border)]">
                <div className="flex -space-x-1.5 items-center">
                  <UserAvatar
                    loginNo={task.owner_user_No}
                    displayName={task.assignedDisplayName}
                    size="sm"
                    className="border border-white shadow-sm"
                  />
                  {task.collaborators && task.collaborators.length > 0 && (
                    <div className="h-5 w-5 rounded-full border border-white bg-[var(--tm-muted)] flex items-center justify-center text-[8px] font-semibold text-slate-300">
                      +{task.collaborators.length}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {task.task_comments && task.task_comments.length > 0 && (
                    <div className="flex items-center gap-1 text-slate-500 font-semibold">
                      <MessageSquare size={12} className="text-[#0EA5E9]" />
                      <span className="text-[10px]">{task.task_comments.length}</span>
                    </div>
                  )}
                  {task.priority_No >= 3 && (
                    <div className="flex items-center gap-1 text-slate-500 font-semibold">
                      <Clock size={12} className="text-[#F59E0B]" />
                      <span className="text-[10px]">2h</span>
                    </div>
                  )}
                  {(task.status === 'In Progress' || task.status === 'In-Progress') && (
                    <div className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-[5px]', getStatusChipClass(task.status))}>
                      65%
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
