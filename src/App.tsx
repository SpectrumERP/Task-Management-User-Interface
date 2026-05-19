import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { LayoutGrid, List as ListIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { TaskDetailModal } from '@/components/task/TaskDetailModal';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [viewMode, setViewMode] = useState<'list' | 'board'>(() => {
    const saved = localStorage.getItem('glacier_task_view_mode');
    return (saved === 'list' || saved === 'board') ? saved : 'list';
  });
  const navigate = useNavigate();
  const { fetchTasks, fetchFillValues, isLoading } = useTaskStore();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsDetailModalOpen(true);
  };

  useEffect(() => {
    const initData = async () => {
      // First fetch fill values to ensure default folder is set!
      const fillValues = await fetchFillValues('2');
      const folderNo = fillValues?.folder && fillValues.folder.length > 0 
        ? fillValues.folder[0].TaskFolderNo 
        : undefined;
      
      // Initial fetch with default filters
      fetchTasks({ companyNo: 2, folderNo });
    };
    initData();
  }, [fetchTasks, fetchFillValues]);

  const handleCreateTask = () => {
    navigate('/task/new');
  };

  const handleFilter = (filters: any) => {
    fetchTasks(filters);
  };

  const setViewModeAndStore = (mode: 'list' | 'board') => {
    setViewMode(mode);
    localStorage.setItem('glacier_task_view_mode', mode);
  };

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <main className="flex-1 p-4 overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
        {/* Top Control Bar (Filters + Merged View Toggles + Create Task) */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <TaskFilter onFilter={handleFilter} />
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end xl:self-auto">
            {/* Merged View Toggle Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 px-5 rounded-2xl border-slate-200 bg-white/80 hover:bg-slate-50 font-bold text-slate-700 shadow-sm gap-2 transition-all flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2">
                    {viewMode === 'list' ? <ListIcon size={15} className="text-[#006699]" /> : <LayoutGrid size={15} className="text-[#006699]" />}
                    {viewMode === 'list' ? 'List View' : 'Board View'}
                  </span>
                  <ChevronDown size={14} className="text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border border-slate-100 p-1 min-w-[140px] shadow-xl bg-white">
                <DropdownMenuItem
                  onClick={() => setViewModeAndStore('list')}
                  className={cn(
                    "rounded-lg text-xs font-bold px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors",
                    viewMode === 'list' ? "bg-slate-100 text-[#006699]" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <ListIcon size={14} />
                  List View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setViewModeAndStore('board')}
                  className={cn(
                    "rounded-lg text-xs font-bold px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors",
                    viewMode === 'board' ? "bg-slate-100 text-[#006699]" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <LayoutGrid size={14} />
                  Board View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Create Task Button */}
            <Button
              onClick={handleCreateTask}
              className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#006699] to-[#00b4d8] hover:from-[#005580] hover:to-[#0096c7] text-white shadow-lg shadow-[#006699]/15 font-black text-xs uppercase tracking-widest gap-2 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus size={15} strokeWidth={3.5} />
              Create Task
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {viewMode === 'list' ? (
            <TaskListView tasks={useTaskStore.getState().tasks} isLoading={isLoading} onTaskClick={handleTaskClick} />
          ) : (
            <Board onAddTask={(status) => navigate(`/task/new?status=${status}`)} onTaskClick={handleTaskClick} />
          )}
        </div>

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
      <Dialog open={isSessionTimeoutOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 border-slate-100 shadow-2xl [&>button]:hidden">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <Clock className="h-6 w-6 text-red-600 animate-pulse" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-slate-900 leading-tight">
              Session Expired
            </DialogTitle>
            <DialogDescription className="text-center text-slate-600 font-medium text-xs leading-normal">
              Your session has timed out due to inactivity or invalid credentials. Please log in again to continue.
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
