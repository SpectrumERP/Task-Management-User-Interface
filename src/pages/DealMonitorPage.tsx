import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { TaskFilter } from '@/components/task/TaskFilter';
import { TaskListView } from '@/components/task/TaskListView';
import { Board } from '@/components/kanban/Board';
import { TaskCalendarView } from '@/components/task/TaskCalendarView';
import { useTaskStore } from '@/store/useTaskStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { cn } from '@/lib/utils';
import { dealMonitorTaskUrl } from '@/lib/dealMonitor';
import { exportReportToExcel } from '@/utils/exportToExcel';

const DEAL_MONITOR_FORM_NO = 1548;

export default function DealMonitorPage() {
  const { isSave } = useFormRights(DEAL_MONITOR_FORM_NO);
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list');
  const { fetchTasks, fetchFillValues, isLoading } = useTaskStore();
  const tasks = useTaskStore((state) => state.tasks);
  const fetchError = useTaskStore((state) => state.fetchError);
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
    <main
      className={cn(
        "page-shell",
        showFilters && "[--tm-filters-drawer-width:min(100vw,24rem)]"
      )}
    >
      {dealMonitorCategoryNo === null ? (
        <div className="shrink-0 mx-0 mb-2 flex items-start gap-2.5 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" strokeWidth={2.25} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-100">Deal Monitor category not found</p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-relaxed">
              No category named “Deal Monitor” is configured in fill values, so this view may not filter correctly. Ask an admin to add that category.
            </p>
          </div>
        </div>
      ) : null}

      <div className="shrink-0">
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

      {viewMode === 'list' ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-[16px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
          {tasks.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]/50 shrink-0">
              <span className="text-[11px] font-semibold text-slate-400">Total {tasks.length} Records shown</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportReportToExcel(tasks, false, 'Deal_Monitor_Tasks.csv')}
                className="h-7 px-3 text-[10px] font-semibold gap-1.5 rounded-[6px] border-[#0EA5E9]/20 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 shadow-sm"
              >
                <Download size={12} />
                Export CSV
              </Button>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            <TaskListView
              tasks={tasks}
              isLoading={isLoading}
              loadError={Boolean(fetchError)}
              onRetryLoad={() => {
                if (currentFilters) {
                  fetchTasks({
                    ...currentFilters,
                    pageSize,
                    pageNo,
                  });
                }
              }}
              onTaskClick={handleTaskClick}
              onCreateTask={isSave ? handleCreateTask : undefined}
              hideCategoryColumn
            />
          </div>

          {tasks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 border-t border-[var(--tm-border)] bg-[var(--tm-elevated)] shrink-0 select-none">
              <div className="text-[11px] text-slate-500 font-bold justify-self-center sm:justify-self-start min-w-0 truncate tabular-nums order-1 sm:order-none">
                Showing <span className="text-slate-100 font-black">{((pageNo - 1) * pageSize) + 1}</span> to{" "}
                <span className="text-slate-100 font-black">{((pageNo - 1) * pageSize) + tasks.length}</span> records
              </div>

              <div className="flex items-center gap-2 justify-self-center order-3 sm:order-none w-full sm:w-auto justify-center">
                <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">Per Page:</span>
                <div className="flex items-center gap-1 bg-[var(--tm-surface)] p-0.5 rounded-lg border border-[var(--tm-border)] shadow-sm">
                  {[10, 25, 50, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setPageSize(size);
                        setPageNo(1);
                      }}
                      className={cn(
                        "h-6 w-9 rounded-md text-[10px] font-black tabular-nums tracking-wide transition-all",
                        pageSize === size
                          ? "bg-[#0EA5E9] text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-50 hover:bg-[var(--tm-muted)]"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1 justify-self-center sm:justify-self-end order-2 sm:order-none">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pageNo === 1 || isLoading}
                  onClick={() => setPageNo((prev) => Math.max(1, prev - 1))}
                  className="h-7 w-7 rounded-lg text-slate-500 hover:bg-[var(--tm-muted)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-sm"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </Button>

                <button
                  type="button"
                  disabled
                  className="h-7 w-7 rounded-lg text-[10px] font-black bg-[#0EA5E9] border border-[#0EA5E9] text-white shadow-md shadow-[#0EA5E9]/10 flex items-center justify-center cursor-default tabular-nums shrink-0"
                >
                  {pageNo}
                </button>

                <Button
                  variant="ghost"
                  size="icon"
                  disabled={tasks.length < pageSize || isLoading}
                  onClick={() => setPageNo((prev) => prev + 1)}
                  className="h-7 w-7 rounded-lg text-slate-500 hover:bg-[var(--tm-muted)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-sm"
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={cn("flex-1 min-h-0", "flex flex-col overflow-hidden")}>
          {viewMode === 'board' ? (
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
      )}
    </main>
  );
}
