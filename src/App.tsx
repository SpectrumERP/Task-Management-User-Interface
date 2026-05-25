import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Board } from '@/components/kanban/Board';
import { Button } from '@/components/ui/button';
import { Plus, Clock } from 'lucide-react';
import Login from '@/pages/Login';
import TaskDetail from '@/pages/TaskDetail';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { TaskFilter } from '@/components/task/TaskFilter';
import { TaskListView } from '@/components/task/TaskListView';
import { useTaskStore } from '@/store/useTaskStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskCalendarView } from '@/components/task/TaskCalendarView';
import { cn } from '@/lib/utils';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { MasterManager } from '@/components/master/MasterManager';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>(() => {
    const saved = localStorage.getItem('glacier_task_view_mode');
    return (saved === 'list' || saved === 'board' || saved === 'calendar') ? saved : 'list';
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchTasks, fetchFillValues, isLoading } = useTaskStore();
  const tasks = useTaskStore((state) => state.tasks);
  const selectedFolder = useTaskStore((state) => state.selectedFolder);

  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = authCompanies?.[0]?.companyNo || authCompanies?.[0]?.CompanyNo || 1;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [pageSize, setPageSize] = useState(100);
  const [pageNo, setPageNo] = useState(1);
  const [currentFilters, setCurrentFilters] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsDetailModalOpen(true);
  };

  useEffect(() => {
    const initData = async () => {
      // First fetch fill values to ensure default folder is set!
      const fillValues = await fetchFillValues(companyNo.toString());
      const folderNo = fillValues?.folder && fillValues.folder.length > 0
        ? fillValues.folder[0].TaskFolderNo
        : undefined;

      // Initial filters setup
      setCurrentFilters({ companyNo, folderNo });
    };
    initData();
  }, [fetchFillValues, companyNo]);

  useEffect(() => {
    if (selectedFolder) {
      setPageNo(1);
      setCurrentFilters((prev: any) => ({
        ...(prev || { companyNo }),
        folderNo: selectedFolder.TaskFolderNo
      }));
    }
  }, [selectedFolder, companyNo]);

  useEffect(() => {
    if (currentFilters) {
      fetchTasks({
        ...currentFilters,
        pageSize,
        pageNo
      });
    }
  }, [currentFilters, pageSize, pageNo, fetchTasks]);

  const handleCreateTask = () => {
    navigate('/task/new');
  };

  const handleFilter = (filters: any) => {
    setPageNo(1); // Reset page number on filter change
    setCurrentFilters(filters);
  };

  const setViewModeAndStore = (mode: 'list' | 'board' | 'calendar') => {
    setViewMode(mode);
    localStorage.setItem('glacier_task_view_mode', mode);
  };

  const handleTabChange = (id: string) => {
    if (id.startsWith('master-')) {
      const type = id.replace('master-', '');
      navigate(`/master/${type}`);
    } else {
      setActiveTab(id);
    }
  };

  return (
    <MainLayout activeTab={activeTab} onTabChange={handleTabChange}>
      <main className="flex-1 p-4 overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
        {/* Unified Top Control Bar */}
        <div className="mb-2">
          <TaskFilter
            onFilter={handleFilter}
            viewMode={viewMode}
            onViewModeChange={setViewModeAndStore}
            onCreateTask={handleCreateTask}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />
        </div>

        {/* Content Area */}
        <div className={cn(
          "flex-1 min-h-0",
          viewMode === 'list' ? "overflow-y-auto scrollbar-hide" : "flex flex-col overflow-hidden"
        )}>
          {viewMode === 'list' ? (
            <TaskListView tasks={tasks} isLoading={isLoading} onTaskClick={handleTaskClick} />
          ) : viewMode === 'board' ? (
            <Board onAddTask={(status) => navigate(`/task/new?status=${status}`)} onTaskClick={handleTaskClick} />
          ) : (
            <TaskCalendarView
              tasks={tasks}
              isLoading={isLoading}
              onTaskClick={handleTaskClick}
              onAddTask={(date) => {
                const dateStr = date ? `?date=${date.toISOString()}` : '';
                navigate(`/task/new${dateStr}`);
              }}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              onViewModeChange={setViewModeAndStore}
            />
          )}
        </div>

        {/* Glacier Pagination Bar */}
        {viewMode === 'list' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 mt-4 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-150/80 shadow-md shadow-slate-100/30 shrink-0">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Page Size:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPageNo(1);
                  }}
                >
                  <SelectTrigger className="h-8.5 w-20 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-1 focus:ring-[#006699]/15">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="10" className="text-xs font-medium">10</SelectItem>
                    <SelectItem value="25" className="text-xs font-medium">25</SelectItem>
                    <SelectItem value="50" className="text-xs font-medium">50</SelectItem>
                    <SelectItem value="100" className="text-xs font-medium">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tasks.length > 0 ? (
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Showing {((pageNo - 1) * pageSize) + 1} - {((pageNo - 1) * pageSize) + tasks.length} records
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  No records found
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                disabled={pageNo === 1 || isLoading}
                onClick={() => setPageNo(prev => Math.max(prev - 1, 1))}
                className="h-8.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Previous
              </Button>

              <div className="h-8.5 px-4 bg-[#e1ecf7]/50 rounded-xl flex items-center justify-center border border-[#006699]/10">
                <span className="text-xs font-black text-[#006699]">Page {pageNo}</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={tasks.length < pageSize || isLoading}
                onClick={() => setPageNo(prev => prev + 1)}
                className="h-8.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <TaskDetailModal
          taskNo={selectedTaskId}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onRefreshTasks={fetchTasks}
        />
      </main>
    </MainLayout>
  );
}

function SessionTimeoutGuard({ children }: { children: React.ReactNode }) {
  const { isSessionTimeoutOpen, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check every 10 seconds in the background for active token expiration
    const intervalId = setInterval(async () => {
      const { token, isAuthenticated, isSessionTimeoutOpen } = useAuthStore.getState();
      if (isAuthenticated && token && !isSessionTimeoutOpen) {
        const { authService } = await import('@/services/authService');
        if (authService.isTokenExpired(token)) {
          useAuthStore.setState({ isSessionTimeoutOpen: true });
        }
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      {children}
      <Dialog open={isSessionTimeoutOpen} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 border-slate-100 shadow-2xl [&>button]:hidden">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <Clock className="h-6 w-6 text-red-600 animate-pulse" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-slate-900 leading-tight">
              Session Expired
            </DialogTitle>
            <DialogDescription className="text-center text-slate-600 font-medium text-xs leading-normal">
              Your session has timed out. Please log in again to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex items-center justify-center">
            <Button
              type="button"
              onClick={async () => {
                useAuthStore.setState({ isSessionTimeoutOpen: false });
                await logout();
                navigate('/login');
              }}
              className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white shadow-lg shadow-red-600/20 text-xs h-9 transition-all"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MasterPageRoute() {
  const { form } = useParams<{ form: string }>();
  const navigate = useNavigate();

  const validForms = ['category', 'type', 'priority', 'folder', 'user-group', 'benefit-type', 'location'];
  if (!form || !validForms.includes(form)) {
    return <Navigate to="/" replace />;
  }

  const activeTab = `master-${form}`;

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={(id) => {
        if (id.startsWith('master-')) {
          const type = id.replace('master-', '');
          navigate(`/master/${type}`);
        } else {
          navigate('/');
        }
      }}
    >
      <MasterManager type={form as any} />
    </MainLayout>
  );
}

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <SessionTimeoutGuard>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/master/:form"
            element={
              <PrivateRoute>
                <MasterPageRoute />
              </PrivateRoute>
            }
          />
          <Route
            path="/task/:id"
            element={
              <PrivateRoute>
                <TaskDetail />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionTimeoutGuard>
    </BrowserRouter>
  );
}

export default App;
