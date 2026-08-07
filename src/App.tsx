import { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Board } from '@/components/kanban/Board';
import { Button } from '@/components/ui/button';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import Login from '@/pages/Login';
import TaskDetail from '@/pages/TaskDetail';
import MeetingNotesPage from '@/pages/MeetingNotesPage';
import ReportPage from '@/pages/ReportPage';
import MeetingReportPage from '@/pages/MeetingReportPage';
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
import { TaskCalendarView } from '@/components/task/TaskCalendarView';
import { cn } from '@/lib/utils';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { MasterManager } from '@/components/master/MasterManager';
import { PWAInstallBanner } from '@/components/pwa/PWAInstallBanner';
import { toast, Toaster } from 'sonner';
import { DealManager } from '@/components/sales/deals/DealManager';
import { cleanupExpiredDrafts } from '@/utils/draftCleanup';
import { useFormRights } from '@/hooks/useFormRights';

function Dashboard() {
  const { isSave } = useFormRights(1547);
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
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

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

      const activeFolder = useTaskStore.getState().selectedFolder;
      const folderNo = activeFolder?.TaskFolderNo || (fillValues?.folder && fillValues.folder.length > 0
        ? fillValues.folder[0].TaskFolderNo
        : undefined);

      // Initial filters setup
      setCurrentFilters({ companyNo, folderNo });
    };
    initData();
  }, [fetchFillValues, companyNo]);

  useEffect(() => {
    if (selectedFolder) {
      setPageNo(1);
      setCurrentFilters((prev: any) => {
        if (prev && prev.folderNo === selectedFolder.TaskFolderNo) {
          return prev;
        }
        return {
          ...(prev || { companyNo }),
          folderNo: selectedFolder.TaskFolderNo
        };
      });
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl + N or Cmd + N
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        // Don't trigger if user is typing in an input, textarea, or contenteditable
        const activeElement = document.activeElement as HTMLElement | null;
        if (
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable)
        ) {
          return;
        }

        // Prevent browser from opening a new window
        e.preventDefault();
        handleCreateTask();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

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
    } else if (id === 'sales-deals') {
      navigate('/sales/deals');
    } else if (id === 'deal-monitor') {
      navigate('/task/new?category=deal%20monitor&hideSections=timeline,business_benefit,checklist,execution_note,informto&isShowTopAdditionalFields=true');
    } else if (id === 'meeting-notes') {
      navigate('/meetings');
    } else if (id === 'reports') {
      navigate('/reports');
    } else if (id === 'meeting-reports') {
      navigate('/meeting-reports');
    } else {
      setActiveTab(id);
      if (id === 'tasks') {
        navigate('/');
      }
    }
  };


  return (
    <MainLayout activeTab={activeTab} onTabChange={handleTabChange}>
      <main className="flex-1 p-0.5 sm:px-1 overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
        {/* Unified Top Control Bar */}
        <div className="">
          <TaskFilter
            onFilter={handleFilter}
            viewMode={viewMode}
            onViewModeChange={setViewModeAndStore}
            onCreateTask={isSave ? handleCreateTask : undefined}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />
        </div>

        {/* Content Area */}
        <div className={cn(
          "flex-1 min-h-0",
          viewMode === 'list' ? "flex flex-col overflow-hidden" : "flex flex-col overflow-hidden"
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

        {/* Pagination Control Bar */}
        {viewMode === 'list' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-1 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-sm shrink-0 select-none">
            {/* Left Side: Range Info */}
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

            {/* Center: Items Per Page Selector */}
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

            {/* Right Side: Page Controls */}
            <div className="flex items-center gap-1">
              {/* Previous Page Button */}
              <Button
                variant="ghost"
                size="icon"
                disabled={pageNo === 1 || isLoading}
                onClick={() => setPageNo((prev) => Math.max(1, prev - 1))}
                className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-105 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </Button>

              {/* Direct Page Numbers (only current page displayed) */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  className="h-7 w-7 rounded-lg text-[10px] font-black bg-[#006699] border border-[#006699] text-white shadow-md shadow-[#006699]/10 flex items-center justify-center cursor-default"
                >
                  {pageNo}
                </button>
              </div>

              {/* Next Page Button */}
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

        <TaskDetailModal
          taskNo={selectedTaskId}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onRefreshTasks={() => fetchTasks({ ...currentFilters, pageSize, pageNo })}
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

  const validForms = ['category', 'type', 'priority', 'folder', 'user-group', 'benefit-type', 'location', 'vessel', 'port', 'business-entity-type', 'company', "country", "state", "city", "task-company", "meeting-category", "meeting-type"];
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
        } else if (id === 'sales-deals') {
          navigate('/sales/deals');
        } else if (id === 'deal-monitor') {
          navigate('/task/new?category=deal%20monitor&hideSections=timeline,business_benefit,checklist,execution_note,informto&isShowTopAdditionalFields=true');
        } else if (id === 'meeting-notes') {
          navigate('/meetings');
        } else if (id === 'reports') {
          navigate('/reports');
        } else if (id === 'meeting-reports') {
          navigate('/meeting-reports');
        } else {
          navigate('/');
        }
      }}
    >
      <MasterManager type={form as any} />
    </MainLayout>
  );
}

function SalesDealsRoute() {
  const navigate = useNavigate();

  return (
    <MainLayout
      activeTab="sales-deals"
      onTabChange={(id) => {
        if (id.startsWith('master-')) {
          navigate(`/master/${id.replace('master-', '')}`);
        } else if (id === 'tasks') {
          navigate('/');
        } else if (id === 'sales-deals') {
          navigate('/sales/deals');
        } else if (id === 'deal-monitor') {
          navigate('/task/new?category=deal%20monitor&hideSections=timeline,business_benefit,checklist,execution_note,informto&isShowTopAdditionalFields=true');
        } else if (id === 'meeting-notes') {
          navigate('/meetings');
        } else if (id === 'reports') {
          navigate('/reports');
        } else if (id === 'meeting-reports') {
          navigate('/meeting-reports');
        }
      }}
    >
      <DealManager />
    </MainLayout>
  );
}

function MeetingNotesRoute() {
  const navigate = useNavigate();
  return (
    <MainLayout
      activeTab="meeting-notes"
      onTabChange={(id) => {
        if (id.startsWith('master-')) {
          navigate(`/master/${id.replace('master-', '')}`);
        } else if (id === 'tasks') {
          navigate('/');
        } else if (id === 'sales-deals') {
          navigate('/sales/deals');
        } else if (id === 'deal-monitor') {
          navigate('/task/new?category=deal%20monitor&hideSections=timeline,business_benefit,checklist,execution_note,informto&isShowTopAdditionalFields=true');
        } else if (id === 'meeting-notes') {
          navigate('/meetings');
        } else if (id === 'reports') {
          navigate('/reports');
        } else if (id === 'meeting-reports') {
          navigate('/meeting-reports');
        }
      }}
    >
      <Outlet />
    </MainLayout>
  );
}

function ReportRoute() {
  const navigate = useNavigate();
  return (
    <MainLayout
      activeTab="reports"
      onTabChange={(id) => {
        if (id.startsWith('master-')) {
          navigate(`/master/${id.replace('master-', '')}`);
        } else if (id === 'tasks') {
          navigate('/');
        } else if (id === 'sales-deals') {
          navigate('/sales/deals');
        } else if (id === 'deal-monitor') {
          navigate('/task/new?category=deal%20monitor&hideSections=timeline,business_benefit,checklist,execution_note,informto&isShowTopAdditionalFields=true');
        } else if (id === 'meeting-notes') {
          navigate('/meetings');
        } else if (id === 'reports') {
          navigate('/reports');
        } else if (id === 'meeting-reports') {
          navigate('/meeting-reports');
        }
      }}
    >
      <ReportPage />
    </MainLayout>
  );
}

function MeetingReportRoute() {
  const navigate = useNavigate();
  return (
    <MainLayout
      activeTab="meeting-reports"
      onTabChange={(id) => {
        if (id.startsWith('master-')) {
          navigate(`/master/${id.replace('master-', '')}`);
        } else if (id === 'tasks') {
          navigate('/');
        } else if (id === 'sales-deals') {
          navigate('/sales/deals');
        } else if (id === 'deal-monitor') {
          navigate('/task/new?category=deal%20monitor&hideSections=timeline,business_benefit,checklist,execution_note,informto&isShowTopAdditionalFields=true');
        } else if (id === 'meeting-notes') {
          navigate('/meetings');
        } else if (id === 'reports') {
          navigate('/reports');
        } else if (id === 'meeting-reports') {
          navigate('/meeting-reports');
        }
      }}
    >
      <MeetingReportPage />
    </MainLayout>
  );
}

const router = createBrowserRouter([
  {
    element: (
      <SessionTimeoutGuard>
        <Outlet />
      </SessionTimeoutGuard>
    ),
    children: [
      { path: "/login", element: <Login /> },
      {
        path: "/",
        element: (
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        ),
      },
      {
        path: "/master/:form",
        element: (
          <PrivateRoute>
            <MasterPageRoute />
          </PrivateRoute>
        ),
      },
      {
        path: "/master/:form/new",
        element: (
          <PrivateRoute>
            <MasterPageRoute />
          </PrivateRoute>
        ),
      },
      {
        path: "/master/:form/edit/:id",
        element: (
          <PrivateRoute>
            <MasterPageRoute />
          </PrivateRoute>
        ),
      },
      {
        path: "/sales/deals",
        element: (
          <PrivateRoute>
            <SalesDealsRoute />
          </PrivateRoute>
        ),
      },
      {
        path: "/sales/deals/new",
        element: (
          <PrivateRoute>
            <SalesDealsRoute />
          </PrivateRoute>
        ),
      },
      {
        path: "/sales/deals/edit/:id",
        element: (
          <PrivateRoute>
            <SalesDealsRoute />
          </PrivateRoute>
        ),
      },
      {
        path: "/sales/deals/:id",
        element: (
          <PrivateRoute>
            <SalesDealsRoute />
          </PrivateRoute>
        ),
      },
      {
        path: "/task/:id",
        element: (
          <PrivateRoute>
            <TaskDetail />
          </PrivateRoute>
        ),
      },
      {
        path: "/meetings",
        element: (
          <PrivateRoute>
            <MeetingNotesRoute />
          </PrivateRoute>
        ),
        children: [
          { path: "", element: <MeetingNotesPage isListView /> },
          { path: "new", element: <MeetingNotesPage /> },
          { path: ":id", element: <MeetingNotesPage /> },
        ]
      },
      {
        path: "/reports",
        element: (
          <PrivateRoute>
            <ReportRoute />
          </PrivateRoute>
        ),
      },
      {
        path: "/meeting-reports",
        element: (
          <PrivateRoute>
            <MeetingReportRoute />
          </PrivateRoute>
        ),
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
    cleanupExpiredDrafts(); // Clean up old drafts on startup
  }, [checkAuth]);

  // Version Cache Busting Check
  useEffect(() => {
    // Initial cleanup
    cleanupExpiredDrafts();

    // Check app version periodically
    const checkVersion = async () => {
      try {
        const response = await fetch('/version.json?t=' + new Date().getTime());
        if (response.ok) {
          const data = await response.json();
          const currentVersion = localStorage.getItem('app_version');

          if (!currentVersion) {
            localStorage.setItem('app_version', data.version.toString());
          } else if (currentVersion !== data.version.toString()) {
            // Show a toast instead of forcing an abrupt reload
            toast.info('A new version is available!', {
              description: 'Please update to get the latest features and bug fixes.',
              duration: Infinity, // Keep it open until clicked
              action: {
                label: 'Update Now',
                onClick: () => {
                  localStorage.setItem('app_version', data.version.toString());
                  // Force a hard refresh
                  window.location.href = window.location.pathname + '?v=' + new Date().getTime() + window.location.hash;
                },
              },
            });
          }
        }
      } catch (err) {
        console.error('Failed to check app version:', err);
      }
    };

    checkVersion();
    // Check version every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    // Also check when user returns to the tab
    window.addEventListener('focus', checkVersion);

    // Handle chunk load errors (when old files are deleted from the server)
    const handlePreloadError = (e: Event) => {
      e.preventDefault();
      window.location.reload();
    };
    window.addEventListener('vite:preloadError', handlePreloadError);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkVersion);
      window.removeEventListener('vite:preloadError', handlePreloadError);
    };
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <PWAInstallBanner />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default App;
