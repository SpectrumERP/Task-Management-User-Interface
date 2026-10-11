import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';
import { Board } from '@/components/kanban/Board';
import { Button } from '@/components/ui/button';
import { Clock, Download, Plus } from 'lucide-react';
import TaskDetail from '@/pages/TaskDetail';
import MeetingNotesPage from '@/pages/MeetingNotesPage';
import ReportPage from '@/pages/ReportPage';
import MeetingReportPage from '@/pages/MeetingReportPage';
import DealMonitorPage from '@/pages/DealMonitorPage';
import UserProfilePage from '@/pages/UserProfilePage';
import NotificationsPage from '@/pages/NotificationsPage';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { CrmLoginRedirect } from '@/components/auth/CrmLoginRedirect';
import { NotificationsProvider } from '@/context/NotificationsContext';
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
import { ROUTER_BASENAME, publicUrl } from '@/lib/basePath';

/** Match the CRM: show the session prompt 15 seconds before the JWT expires. */
const SESSION_EXPIRY_SKEW_MS = 15_000;
const SESSION_EXPIRY_CHECK_MS = 60_000;
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

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

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => t.categoryName?.toLowerCase() !== 'deal monitor');
  }, [tasks]);

  const totalItems = filteredTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
  const safePageNo = Math.min(pageNo, totalPages);

  useEffect(() => {
    if (pageNo !== safePageNo) setPageNo(safePageNo);
  }, [pageNo, safePageNo]);

  const startIndex = totalItems === 0 ? 0 : (safePageNo - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  const pagedTasks = useMemo(
    () => filteredTasks.slice(startIndex, endIndex),
    [filteredTasks, startIndex, endIndex]
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
          showFilters && "lg:[--tm-filters-drawer-width:min(100vw,18rem)]"
        )}
      >
        <AppBreadcrumbBar
          items={[
            { label: 'Tasks' },
            { label: 'Tasks List', current: true },
          ]}
          guideKey="tasks"
          bleed
          className="mb-[var(--page-gap)]"
          data-page-tour="tasks-breadcrumb"
        />

        {/* CRM page header + toolbar: white band, edge to edge, line below (Spectrum CRM "Leads - 5" look) */}
        <div className="crm-page-band shrink-0 -ml-[var(--page-pad-x)] -mr-[calc(var(--page-pad-x)+var(--tm-filters-drawer-width,0px))] -mt-[var(--page-pad)] px-[var(--page-pad-x)] pt-4 pb-3 bg-[var(--tm-surface)] border-b border-[var(--tm-border)]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h1 className="text-[22px] font-bold tracking-tight text-slate-50">
              Tasks - {totalItems}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              {viewMode === 'list' && tasks.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => exportReportToExcel(filteredTasks, false, 'Tasks.csv')}
                  className="h-9 px-3.5 text-[13px] font-semibold gap-1.5 rounded-[7px] border-[var(--tm-border)] bg-[var(--tm-surface)] text-slate-500 hover:bg-[var(--tm-muted)]"
                >
                  <Download size={14} />
                  Export CSV
                </Button>
              )}
              {isSave && (
                <Button
                  type="button"
                  onClick={handleCreateTask}
                  data-page-tour="task-create"
                  className="h-9 px-4 rounded-[7px] bg-[#1E56A0] hover:bg-[#17457F] text-white text-[13px] font-semibold gap-1.5"
                >
                  <Plus size={15} strokeWidth={2.4} />
                  Add
                </Button>
              )}
            </div>
          </div>
          <TaskFilter
            onFilter={handleFilter}
            viewMode={viewMode}
            onViewModeChange={setViewModeAndStore}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            clearNonce={filterClearNonce}
          />
        </div>

        {/* Content Area */}
        {viewMode === 'list' ? (
          <div className="crm-list-page flex-1 min-h-0 flex flex-col overflow-hidden pt-3 -mb-[var(--page-pad)] -ml-[var(--page-pad-x)] -mr-[calc(var(--page-pad-x)+var(--tm-filters-drawer-width,0px))]">
            <div className="flex-1 min-h-0 overflow-hidden pl-[var(--page-pad-x)] pr-[calc(var(--page-pad-x)+var(--tm-filters-drawer-width,0px))]">
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
              <div className="mt-3">
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
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {viewMode === 'board' ? (
              <Board
                onAddTask={(status) => navigate(`/task/new?status=${status}`)}
                onTaskClick={handleTaskClick}
                filterParams={currentFilters}
                tasks={filteredTasks}
              />
            ) : (
              <TaskCalendarView
                tasks={filteredTasks}
                isLoading={isLoading}
                loadError={Boolean(fetchError)}
                onRetryLoad={() => {
                  if (currentFilters) {
                    fetchTasks({ ...currentFilters } as FilterParams);
                  }
                }}
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
  const { isSessionTimeoutOpen, isAuthenticated, token, logout } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let timeoutId: number | undefined;
    const checkExpiry = () => {
      window.clearTimeout(timeoutId);
      const { token, isAuthenticated, isSessionTimeoutOpen } = useAuthStore.getState();
      if (!isAuthenticated || !token || isSessionTimeoutOpen) return;

      const expiresAt = authService.getTokenExpiry(token);
      if (expiresAt === null || Date.now() >= expiresAt - SESSION_EXPIRY_SKEW_MS) {
        useAuthStore.setState({ isSessionTimeoutOpen: true });
        return;
      }

      timeoutId = window.setTimeout(
        checkExpiry,
        Math.min(expiresAt - SESSION_EXPIRY_SKEW_MS - Date.now(), MAX_TIMEOUT_MS),
      );
    };

    checkExpiry();
    const intervalId = window.setInterval(checkExpiry, SESSION_EXPIRY_CHECK_MS);
    const onWake = () => {
      if (document.visibilityState === 'visible') checkExpiry();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [isAuthenticated, token]);

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
              Your session has expired for your security. Please sign in again to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex items-center justify-center">
            <Button
              type="button"
              onClick={async () => {
                useAuthStore.setState({ isSessionTimeoutOpen: false });
                // Opens the Spectrum ERP login, which brings the user back to this page.
                await logout({ returnTo: `${location.pathname}${location.search}` });
              }}
              className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white shadow-lg shadow-red-600/20 text-xs h-9 transition-all"
            >
              Sign in again
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

function NotificationsRoute() {
  const navigate = useNavigate();
  return (
    <MainLayout activeTab="tasks" onTabChange={(id) => handleAppNav(navigate, id)}>
      <NotificationsPage />
    </MainLayout>
  );
}

/** Exported for src/SpectrumApp.tsx, which keeps it in step with the Spectrum ERP shell's navigation. */
// eslint-disable-next-line react-refresh/only-export-components
export const router = createBrowserRouter([
  {
    element: (
      <SessionTimeoutGuard>
        <Outlet />
      </SessionTimeoutGuard>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      // Inside the CRM there is no separate login: the CRM's sign-in is shared.
      // No login page here: the Spectrum ERP login signs in to every app.
      { path: "/login", element: <CrmLoginRedirect /> },
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
      {
        path: "/notifications",
        element: (
          <PrivateRoute>
            <NotificationsRoute />
          </PrivateRoute>
        ),
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
], { basename: ROUTER_BASENAME });

/** Prevent StrictMode remount from hitting version.json twice in the same tick window. */
let lastAppVersionCheckAt = 0;

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
    const checkVersion = async () => {
      const now = Date.now();
      if (now - lastAppVersionCheckAt < 3000) return;
      lastAppVersionCheckAt = now;

      try {
        const response = await fetch(publicUrl('version.json') + '?t=' + now);
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

    // Initial cleanup
    cleanupExpiredDrafts();

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
        <NotificationsProvider>
          <RouterProvider router={router} />
        </NotificationsProvider>
      </ErrorBoundary>
      <PWAInstallBanner />
      <Toaster position="top-right" richColors closeButton duration={4000} />
    </>
  );
}

export default App;
