import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useTaskStore, type FilterParams } from '@/store/useTaskStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Column } from './Column';
import { TaskStatus, Task } from '@/types/task';
import { useState, useEffect } from 'react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { filterSelectableStatuses, STATUS_PILL_ORDER, resolveCanonicalStatus, statusMatchesPill } from '@/lib/taskStatusGroups';

interface BoardProps {
  onAddTask: (status?: string) => void;
  onTaskClick?: (taskId: number) => void;
  /** Keep board data aligned with list/calendar filters. */
  filterParams?: FilterParams | Record<string, unknown> | null;
  /** Pass in explicitly filtered tasks, fallback to store if undefined. */
  tasks?: Task[];
}

function sortBoardStatuses(statuses: { StatusNo: number; Status: string }[]) {
  return [...statuses].sort((a, b) => {
    const pillA = resolveCanonicalStatus(a.Status);
    const pillB = resolveCanonicalStatus(b.Status);
    const indexA = pillA ? STATUS_PILL_ORDER.indexOf(pillA) : 99;
    const indexB = pillB ? STATUS_PILL_ORDER.indexOf(pillB) : 99;
    return indexA - indexB;
  });
}

function boardStatusesFromFill(status: { StatusNo: number; Status: string }[] | undefined) {
  return sortBoardStatuses(filterSelectableStatuses(status));
}

export function Board({ onAddTask, onTaskClick, filterParams, tasks: propTasks }: BoardProps) {
  const { tasks: storeTasks, moveTask, fetchTasks, isLoading: isTasksLoading, fetchFillValues, fillValues } = useTaskStore();
  const tasks = propTasks ?? storeTasks;
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const [statuses, setStatuses] = useState<{ StatusNo: number; Status: string }[]>(() =>
    boardStatusesFromFill(fillValues?.status)
  );
  const [isStatusesLoading, setIsStatusesLoading] = useState(() => boardStatusesFromFill(fillValues?.status).length === 0);
  const [loadError, setLoadError] = useState(false);
  const [loadRetryKey, setLoadRetryKey] = useState(0);

  useEffect(() => {
    const initBoard = async () => {
      setLoadError(false);
      try {
        // 1. Fetch Statuses via deduplicated fetchFillValues helper (cached → instant)
        const statusResponse = await fetchFillValues(companyNo.toString());
        if (!statusResponse) {
          setIsStatusesLoading(false);
          setLoadError(true);
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
        setLoadError(true);
      }
    };
    initBoard();
  }, [fetchTasks, fetchFillValues, companyNo, filterParams, loadRetryKey]);

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
  if (isStatusesLoading && statuses.length === 0 && !loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <BrandLoader size="sm" message="Loading board" />
      </div>
    );
  }

  if (loadError && statuses.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <LoadErrorState
          title="Failed to load board"
          description="Could not load board columns or tasks. Retry uses the same filters."
          onRetry={() => {
            setIsStatusesLoading(true);
            setLoadRetryKey((k) => k + 1);
          }}
        />
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
      <div className="flex gap-3 h-full w-full min-h-0 overflow-x-auto pb-8 pt-1 px-1">
        {statuses.map((s) => (
          <Column
            key={s.StatusNo}
            status={s.Status as any}
            tasks={tasks.filter((t: Task) => {
              const columnPill = resolveCanonicalStatus(s.Status);
              if (!columnPill) return false;
              return statusMatchesPill(t.status, columnPill);
            })}
            onAddTask={() => onAddTask(s.Status)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
