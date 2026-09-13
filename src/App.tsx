import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Board } from '@/components/kanban/Board';
import { Button } from '@/components/ui/button';
import { Clock, Download } from 'lucide-react';
import Login from '@/pages/Login';
import TaskDetail from '@/pages/TaskDetail';
import MeetingNotesPage from '@/pages/MeetingNotesPage';
import ReportPage from '@/pages/ReportPage';
import MeetingReportPage from '@/pages/MeetingReportPage';
import DealMonitorPage from '@/pages/DealMonitorPage';
import UserProfilePage from '@/pages/UserProfilePage';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/authService';
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
import { useTaskStore, type FilterParams } from '@/store/useTaskStore';
import { TaskCalendarView } from '@/components/task/TaskCalendarView';
import { cn } from '@/lib/utils';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { MasterPaginationBar } from '@/components/master/shared/MasterPaginationBar';
import { MasterManager } from '@/components/master/MasterManager';
import { type MasterType } from '@/components/master/shared/masterRoutes';
import { PWAInstallBanner } from '@/components/pwa/PWAInstallBanner';
import { toast, Toaster } from 'sonner';
import { DealManager } from '@/components/sales/deals/DealManager';
import { cleanupExpiredDrafts } from '@/utils/draftCleanup';
import { useFormRights } from '@/hooks/useFormRights';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AppErrorListeners } from '@/components/ui/AppErrorListeners';
import { RouteErrorFallback } from '@/components/ui/RouteErrorFallback';
import { exportReportToExcel } from '@/utils/exportToExcel';

function Dashboard() {
  const { isSave } = useFormRights(1547);
  const location = useLocation();
  const tabFromUrl = new URLSearchParams(location.search).get('tab');
  const [activeTab, setActiveTab] = useState(() => tabFromUrl || 'tasks');
  const [prevSearch, setPrevSearch] = useState(location.search);
  if (location.search !== prevSearch) {
    setPrevSearch(location.search);
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }

  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>(() => {
    const saved = localStorage.getItem('glacier_task_view_mode');
    return (saved === 'list' || saved === 'board' || saved === 'calendar') ? saved : 'list';
  });
  const navigate = useNavigate();
  const { fetchTasks, fetchFillValues, isLoading } = useTaskStore();
  const tasks = useTaskStore((state) => state.tasks);
  const fetchError = useTaskStore((state) => state.fetchError);
  const selectedFolder = useTaskStore((state) => state.selectedFolder);
  const searchKeyword = useTaskStore((state) => state.searchKeyword);

  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 10 records per page by default; page numbers come from total filtered count
  const [pageSize, setPageSize] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [currentFilters, setCurrentFilters] = useState<Record<string, unknown> | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterClearNonce, setFilterClearNonce] = useState(0);
  const [trackedFolderNo, setTrackedFolderNo] = useState<number | null>(null);

  const selectedFolderNo = selectedFolder?.TaskFolderNo ?? null;
  if (selectedFolder && selectedFolderNo !== trackedFolderNo) {
    setTrackedFolderNo(selectedFolderNo);
    setPageNo(1);
    setCurrentFilters((prev) => {
      if (prev && prev.folderNo === selectedFolder.TaskFolderNo) {
        return prev;
      }
      return {
        ...(prev || { companyNo }),
        folderNo: selectedFolder.TaskFolderNo,
      };
    });
  }

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

  // Refetch only when filters change — paging is client-side from total records
  useEffect(() => {
    if (currentFilters) {
      fetchTasks({ ...currentFilters } as FilterParams);
    }
  }, [currentFilters, fetchTasks]);

  const totalItems = tasks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
  const safePageNo = Math.min(pageNo, totalPages);

  useEffect(() => {
    if (pageNo !== safePageNo) setPageNo(safePageNo);
  }, [pageNo, safePageNo]);

  const startIndex = totalItems === 0 ? 0 : (safePageNo - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pagedTasks = useMemo(
    () => tasks.slice(startIndex, endIndex),
    [tasks, startIndex, endIndex]
  );

  const handleCreateTask = useCallback(() => {
    navigate('/task/new');
  }, [navigate]);

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
  }, [handleCreateTask]);

  const handleFilter = (filters: Record<string, unknown>) => {
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
      navigate('/deal-monitor');
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
      <main
        className={cn(
          "page-shell gap-4",
          showFilters && "[--tm-filters-drawer-width:min(100vw,18rem)]"
        )}
      >
        {/* Unified Top Control Bar */}
        <div className="shrink-0">
          <TaskFilter
            onFilter={handleFilter}
            viewMode={viewMode}
            onViewModeChange={setViewModeAndStore}
            onCreateTask={isSave ? handleCreateTask : undefined}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            clearNonce={filterClearNonce}
          />
        </div>

        {/* Content Area */}
        {viewMode === 'list' ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-[16px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
            {tasks.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]/50 shrink-0">
                <span className="text-[11px] font-semibold text-slate-400">
                  {totalItems === 1 ? '1 task' : `${totalItems} tasks`}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportReportToExcel(tasks, false, 'Tasks.csv')}
                  className="h-7 px-3 text-[10px] font-semibold gap-1.5 rounded-[6px] border-[#0EA5E9]/20 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 shadow-sm"
                >
                  <Download size={12} />
                  Export CSV
                </Button>
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-hidden">
              <TaskListView
                tasks={pagedTasks}
                isLoading={isLoading}
                loadError={Boolean(fetchError)}
                onRetryLoad={() => {
                  if (currentFilters) {
                    fetchTasks({ ...currentFilters } as FilterParams);
                  }
                }}
                onTaskClick={handleTaskClick}
                onCreateTask={handleCreateTask}
                onClearFilters={
                  (searchKeyword ||
                    currentFilters?.operTaskStatusNo ||
                    currentFilters?.operTaskPriorityNo ||
                    currentFilters?.taskCode ||
                    currentFilters?.operTaskCategoryNo ||
                    currentFilters?.ownerLoginNo ||
                    currentFilters?.fromDueDate ||
                    currentFilters?.toDueDate ||
                    currentFilters?.isAllFolder)
                    ? () => setFilterClearNonce((n) => n + 1)
                    : undefined
                }
              />
            </div>

            {totalItems > 0 ? (
              <MasterPaginationBar
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={endIndex}
                itemsPerPage={pageSize}
                onItemsPerPageChange={(size) => {
                  setPageSize(size);
                  setPageNo(1);
                }}
                currentPage={safePageNo}
                totalPages={totalPages}
                onPageChange={setPageNo}
                hideBelow={0}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            ) : null}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {viewMode === 'board' ? (
              <Board
                onAddTask={(status) => navigate(`/task/new?status=${status}`)}
                onTaskClick={handleTaskClick}
                filterParams={currentFilters}
              />
            ) : (
              <TaskCalendarView
                tasks={tasks}
                isLoading={isLoading}
                onTaskClick={handleTaskClick}
                onAddTask={(date) => {
                  const dateStr = date ? `?date=${date.toISOString()}` : '';
                  navigate(`/task/new${dateStr}`);
                }}
                onViewModeChange={setViewModeAndStore}
              />
            )}
          </div>
        )}

        <TaskDetailModal
          taskNo={selectedTaskId}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onRefreshTasks={() => currentFilters && fetchTasks({ ...currentFilters } as FilterParams)}
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
    const intervalId = setInterval(() => {
      const { token, isAuthenticated, isSessionTimeoutOpen } = useAuthStore.getState();
      if (isAuthenticated && token && !isSessionTimeoutOpen) {
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
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 border-[var(--tm-border)] shadow-2xl [&>button]:hidden">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
              <Clock className="h-6 w-6 text-red-400 animate-pulse" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-slate-50 leading-tight">
              Session Expired
            </DialogTitle>
            <DialogDescription className="text-center text-slate-300 font-medium text-xs leading-normal">
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
          navigate('/deal-monitor');
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
      <MasterManager type={form as MasterType} />
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
          navigate('/deal-monitor');
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
          navigate('/deal-monitor');
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
          navigate('/deal-monitor');
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

function DealMonitorRoute() {
  const navigate = useNavigate();
  return (
    <MainLayout
      activeTab="deal-monitor"
      onTabChange={(id) => {
        if (id.startsWith('master-')) {
          navigate(`/master/${id.replace('master-', '')}`);
        } else if (id === 'tasks') {
          navigate('/');
        } else if (id === 'sales-deals') {
          navigate('/sales/deals');
        } else if (id === 'deal-monitor') {
          navigate('/deal-monitor');
        } else if (id === 'meeting-notes') {
          navigate('/meetings');
        } else if (id === 'reports') {
          navigate('/reports');
        } else if (id === 'meeting-reports') {
          navigate('/meeting-reports');
        }
      }}
    >
      <DealMonitorPage />
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
          navigate('/deal-monitor');
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

function handleAppNav(navigate: ReturnType<typeof useNavigate>, id: string) {
  if (id.startsWith('master-')) {
    navigate(`/master/${id.replace('master-', '')}`);
  } else if (id === 'tasks') {
    navigate('/');
  } else if (id === 'sales-deals') {
    navigate('/sales/deals');
  } else if (id === 'deal-monitor') {
    navigate('/deal-monitor');
  } else if (id === 'meeting-notes') {
    navigate('/meetings');
  } else if (id === 'reports') {
    navigate('/reports');
  } else if (id === 'meeting-reports') {
    navigate('/meeting-reports');
  }
}

function UserProfileRoute() {
  const navigate = useNavigate();
  return (
    <MainLayout activeTab="tasks" onTabChange={(id) => handleAppNav(navigate, id)}>
      <UserProfilePage />
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
    errorElement: <RouteErrorFallback />,
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
      {
        path: "/deal-monitor",
        element: (
          <PrivateRoute>
            <DealMonitorRoute />
          </PrivateRoute>
        ),
      },
      {
        path: "/users/:loginNo",
        element: (
          <PrivateRoute>
            <UserProfileRoute />
          </PrivateRoute>
        ),
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);

  useEffect(() => {
    checkAuth();
    cleanupExpiredDrafts(); // Clean up old drafts on startup
  }, [checkAuth]);

  // Portal settings require an authenticated session, so only fetch once
  // checkAuth (or a fresh login) confirms the user is logged in.
  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated, fetchSettings]);

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
      <AppErrorListeners />
      <ErrorBoundary label="router">
        <RouterProvider router={router} />
      </ErrorBoundary>
      <PWAInstallBanner />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default App;
