import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TaskFilter } from '@/components/task/TaskFilter';
import { TaskListView } from '@/components/task/TaskListView';
import { Board } from '@/components/kanban/Board';
import { TaskCalendarView } from '@/components/task/TaskCalendarView';
import { useTaskStore } from '@/store/useTaskStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { cn } from '@/lib/utils';
import { dealMonitorTaskUrl } from '@/lib/dealMonitor';

const DEAL_MONITOR_FORM_NO = 1548;

export default function DealMonitorPage() {
  const { isSave } = useFormRights(DEAL_MONITOR_FORM_NO);
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list');
  const { fetchTasks, fetchFillValues, isLoading } = useTaskStore();
  const tasks = useTaskStore((state) => state.tasks);
  const selectedFolder = useTaskStore((state) => state.selectedFolder);

  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [pageSize, setPageSize] = useState(100);
  const [pageNo, setPageNo] = useState(1);
  const [currentFilters, setCurrentFilters] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  // undefined = not resolved yet, null = resolved but no matching category found, number = resolved
  const [dealMonitorCategoryNo, setDealMonitorCategoryNo] = useState<number | null | undefined>(undefined);

  const handleTaskClick = (taskId: number) => {
    navigate(dealMonitorTaskUrl(taskId));
  };

  const handleCreateTask = () => {
    navigate(dealMonitorTaskUrl('new'));
  };

  // Pin every filter/fetch to the Deal Monitor category, regardless of what else changes.
  const applyDealMonitorFilter = (filters: any, categoryNo: number | null | undefined) => ({
    ...filters,
    operTaskCategoryNo: categoryNo || undefined,
  });

  useEffect(() => {
    const initData = async () => {
      const values = await fetchFillValues(companyNo.toString());
      const categoryNo = values?.category?.find(c => c.Category?.toLowerCase() === 'deal monitor')?.OperTaskCategoryNo || null;
      setDealMonitorCategoryNo(categoryNo);

      const activeFolder = useTaskStore.getState().selectedFolder;
      const folderNo = activeFolder?.TaskFolderNo || (values?.folder && values.folder.length > 0
        ? values.folder[0].TaskFolderNo
        : undefined);

      setCurrentFilters(applyDealMonitorFilter({ companyNo, folderNo }, categoryNo));
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFillValues, companyNo]);

  useEffect(() => {
    // Skip until the Deal Monitor category has actually resolved — otherwise this would
    // briefly pin an *unpinned* filter (operTaskCategoryNo undefined) and race with initData's
    // fetchTasks call below, sometimes leaving the list showing every category.
    if (selectedFolder && dealMonitorCategoryNo !== undefined) {
      setPageNo(1);
      setCurrentFilters((prev: any) => {
        if (prev && prev.folderNo === selectedFolder.TaskFolderNo) {
          return prev;
        }
        return applyDealMonitorFilter({ ...(prev || { companyNo }), folderNo: selectedFolder.TaskFolderNo }, dealMonitorCategoryNo);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, companyNo, dealMonitorCategoryNo]);

  useEffect(() => {
    if (currentFilters) {
      fetchTasks({
        ...currentFilters,
        pageSize,
        pageNo
      });
    }
  }, [currentFilters, pageSize, pageNo, fetchTasks]);

  const handleFilter = (filters: any) => {
    setPageNo(1);
    setCurrentFilters(applyDealMonitorFilter(filters, dealMonitorCategoryNo));
  };

  const setViewModeAndStore = (mode: 'list' | 'board' | 'calendar') => {
    setViewMode(mode);
  };

  return (
    <main className="flex-1 p-0.5 sm:px-1 overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
      <div className="">
        <TaskFilter
          onFilter={handleFilter}
          viewMode={viewMode}
          onViewModeChange={setViewModeAndStore}
          onCreateTask={isSave ? handleCreateTask : undefined}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          hideCategoryFilter
        />
      </div>

      <div className={cn("flex-1 min-h-0", "flex flex-col overflow-hidden")}>
        {viewMode === 'list' ? (
          <TaskListView tasks={tasks} isLoading={isLoading} onTaskClick={handleTaskClick} hideCategoryColumn />
        ) : viewMode === 'board' ? (
          <Board onAddTask={handleCreateTask} onTaskClick={handleTaskClick} />
        ) : (
          <TaskCalendarView
            tasks={tasks}
            isLoading={isLoading}
            onTaskClick={handleTaskClick}
            onAddTask={handleCreateTask}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onViewModeChange={setViewModeAndStore}
          />
        )}
      </div>

      {viewMode === 'list' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-1 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-sm shrink-0 select-none">
          <div className="text-[11px] text-slate-500 font-bold">
            {tasks.length > 0 ? (
              <>
                Showing <span className="text-slate-800 font-black">{((pageNo - 1) * pageSize) + 1}</span> to{" "}
                <span className="text-slate-800 font-black">{((pageNo - 1) * pageSize) + tasks.length}</span> records
              </>
            ) : (
              "No records found"
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400  ">Per Page:</span>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
              {[10, 25, 50, 100].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setPageSize(size);
                    setPageNo(1);
                  }}
                  className={cn(
                    "h-6 px-2.5 rounded-md text-[10px] font-black tracking-wide uppercase transition-all",
                    pageSize === size
                      ? "bg-[#006699] text-white shadow-sm font-black"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={pageNo === 1 || isLoading}
              onClick={() => setPageNo((prev) => Math.max(1, prev - 1))}
              className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-105 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </Button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled
                className="h-7 w-7 rounded-lg text-[10px] font-black bg-[#006699] border border-[#006699] text-white shadow-md shadow-[#006699]/10 flex items-center justify-center cursor-default"
              >
                {pageNo}
              </button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              disabled={tasks.length < pageSize || isLoading}
              onClick={() => setPageNo((prev) => prev + 1)}
              className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-105 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
