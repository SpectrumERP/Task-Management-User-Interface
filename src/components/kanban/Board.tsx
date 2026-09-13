import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useTaskStore, type FilterParams } from '@/store/useTaskStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Column } from './Column';
import { TaskStatus, Task } from '@/types/task';
import { useState, useEffect } from 'react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface BoardProps {
  onAddTask: (status?: string) => void;
  onTaskClick?: (taskId: number) => void;
  /** Keep board data aligned with list/calendar filters. */
  filterParams?: FilterParams | Record<string, unknown> | null;
}

function sortBoardStatuses(statuses: { StatusNo: number; Status: string }[]) {
  const order = ['draft', 'todo', 'to-do', 'to do', 'in progress', 'in-progress', 'inreview', 'in review', 'complete', 'completed', 'close', 'closed'];
  return [...statuses].sort((a, b) => {
    const nameA = a.Status.toLowerCase().trim();
    const nameB = b.Status.toLowerCase().trim();
    const indexA = order.indexOf(nameA);
    const indexB = order.indexOf(nameB);
    const valA = indexA === -1 ? 99 : indexA;
    const valB = indexB === -1 ? 99 : indexB;
    return valA - valB;
  });
}

function boardStatusesFromFill(status: { StatusNo: number; Status: string }[] | undefined) {
  if (!status?.length) return [];
  const filtered = status.filter((s) => {
    const lower = s.Status.toLowerCase();
    return lower !== 'all' && lower !== '[all]' && lower !== 'approval in progress' && lower !== 'approval-in-progress';
  });
  return sortBoardStatuses(filtered);
}

export function Board({ onAddTask, onTaskClick, filterParams }: BoardProps) {
  const { tasks, moveTask, fetchTasks, isLoading: isTasksLoading, fetchFillValues, fillValues } = useTaskStore();
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const [statuses, setStatuses] = useState<{ StatusNo: number; Status: string }[]>(() =>
    boardStatusesFromFill(fillValues?.status)
  );
  const [isStatusesLoading, setIsStatusesLoading] = useState(() => boardStatusesFromFill(fillValues?.status).length === 0);

  useEffect(() => {
    const initBoard = async () => {
      try {
        // 1. Fetch Statuses via deduplicated fetchFillValues helper (cached → instant)
        const statusResponse = await fetchFillValues(companyNo.toString());
        if (!statusResponse) {
          setIsStatusesLoading(false);
          return;
        }

        setStatuses(boardStatusesFromFill(statusResponse.status));
        setIsStatusesLoading(false);

        // 2. Keep the same filter set as list/calendar when available
        if (filterParams && Object.keys(filterParams).length > 0) {
          await fetchTasks({ ...filterParams } as FilterParams);
        } else {
          await fetchTasks();
        }
      } catch (error) {
        console.error('Failed to initialize board:', error);
        setIsStatusesLoading(false);
      }
    };
    initBoard();
  }, [fetchTasks, fetchFillValues, companyNo, filterParams]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    moveTask(parseInt(draggableId), destination.droppableId as TaskStatus);
  };

  // Loader only on first paint when columns aren't ready yet — not on every view switch / task refresh
  if (isStatusesLoading && statuses.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <BrandLoader size="sm" message="Loading board" />
      </div>
    );
  }

  if (statuses.length === 0 && isTasksLoading && tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <BrandLoader size="sm" message="Loading board" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 h-full overflow-x-auto pb-8 pt-1 px-1 snap-x snap-mandatory">
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
