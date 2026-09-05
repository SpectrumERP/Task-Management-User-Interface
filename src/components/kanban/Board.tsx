import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useTaskStore } from '@/store/useTaskStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Column } from './Column';
import { TaskStatus, Task } from '@/types/task';
import { useState, useEffect } from 'react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface BoardProps {
  onAddTask: (status?: string) => void;
  onTaskClick?: (taskId: number) => void;
}

export function Board({ onAddTask, onTaskClick }: BoardProps) {
  const { tasks, moveTask, fetchTasks, isLoading: isTasksLoading, fetchFillValues } = useTaskStore();
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const [statuses, setStatuses] = useState<{ StatusNo: number; Status: string }[]>([]);
  const [isStatusesLoading, setIsStatusesLoading] = useState(true);

  useEffect(() => {
    const initBoard = async () => {
      try {
        // 1. Fetch Statuses via deduplicated fetchFillValues helper
        const statusResponse = await fetchFillValues(companyNo.toString());
        if (!statusResponse) return;

        const filteredStatuses = statusResponse.status.filter(s => {
          const lower = s.Status.toLowerCase();
          return lower !== 'all' && lower !== '[all]' && lower !== 'approval in progress' && lower !== 'approval-in-progress';
        });

        // Custom sort to make sure Draft/Todo columns are first and Complete/Closed columns are last!
        const order = ['draft', 'todo', 'to-do', 'to do', 'in progress', 'in-progress', 'inreview', 'in review', 'complete', 'completed', 'close', 'closed'];
        const sortedStatuses = [...filteredStatuses].sort((a, b) => {
          const nameA = a.Status.toLowerCase().trim();
          const nameB = b.Status.toLowerCase().trim();

          const indexA = order.indexOf(nameA);
          const indexB = order.indexOf(nameB);

          const valA = indexA === -1 ? 99 : indexA;
          const valB = indexB === -1 ? 99 : indexB;

          return valA - valB;
        });

        setStatuses(sortedStatuses);
        setIsStatusesLoading(false);

        // 2. Fetch Tasks
        await fetchTasks();
      } catch (error) {
        console.error('Failed to initialize board:', error);
        setIsStatusesLoading(false);
      }
    };
    initBoard();
  }, [fetchTasks]);

  const isLoading = isStatusesLoading || isTasksLoading;

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    moveTask(parseInt(draggableId), destination.droppableId as TaskStatus);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <BrandLoader size="md" message="Loading board" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 h-full overflow-x-auto pb-8 pt-1 px-1 scrollbar-hide">
        {statuses.map((s) => (
          <Column
            key={s.StatusNo}
            status={s.Status as any}
            tasks={tasks.filter((t: Task) => t.status === s.Status)}
            onAddTask={() => onAddTask(s.Status)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
