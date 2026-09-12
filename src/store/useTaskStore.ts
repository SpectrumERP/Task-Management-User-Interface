import { create } from 'zustand';
import { Task, TaskStatus } from '@/types/task';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export interface FilterParams {
  operTaskNo?: number;
  taskCode?: string;
  title?: string;
  operTaskCategoryNo?: number;
  operTaskPriorityNo?: number;
  operTaskStatusNo?: number;
  operTaskLocationNo?: number;
  operTaskTypeNo?: number;
  ownerLoginNo?: number;
  fromDueDate?: string;
  toDueDate?: string;
  companyNo?: number;
  folderNo?: number;
  isAllFolder?: boolean;
  sortingColumnName?: string;
  sortingType?: string;
  loginNo?: string;
  fromCreatedDate?: string;
  toCreatedDate?: string;
  pageSize?: number;
  pageNo?: number;
}

export interface TaskFillValues {
  taskCompany?: any[];
  priority: { OperTaskPriorityNo: number; Priority: string; Code?: string; ColorCoding?: string }[];
  type: { OperTaskTypeNo: number; "Task Type": string; Code?: string }[];
  category: { OperTaskCategoryNo: number; Category: string; Code?: string; colorCoding?: string; ColorCoding?: string }[];
  location: { OperLocationNo: number; Location: string; Code?: string }[];
  status: { StatusNo: number; Status: string; IsDefault?: boolean }[];
  folder?: { TaskFolderNo: number; "Folder Name": string; Code?: string }[];
  benefitType?: { BusinessBenefitTypeNo: number; "Business Benefit": string; Code?: string }[];
  userGroup?: { UserGroupNo: number; UserGroupName: string; Code?: string }[];
  filterType?: { FilterTypeNo: number; FilterTypeName: string }[];
  sortingColumns?: { SortingColumnName: string; DisplayName: string }[];
  frequency?: any[];
}

interface TaskState {
  tasks: Task[];
  allTasks: Task[];
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
  isLoading: boolean;
  fetchError: string | null;
  clearFetchError: () => void;
  fillValues: TaskFillValues | null;
  isLoadingFillValues: boolean;
  selectedFolder: { TaskFolderNo: number; "Folder Name": string; Code?: string } | null;
  setSelectedFolder: (folder: { TaskFolderNo: number; "Folder Name": string; Code?: string } | null) => void;
  fetchTasks: (filters?: FilterParams) => Promise<void>;
  fetchFillValues: (companyNo?: string, force?: boolean) => Promise<TaskFillValues | null>;
  addTask: (task: Task) => void;
  updateTask: (taskNo: number, updates: Partial<Task>) => void;
  deleteTask: (taskNo: number) => void;
  moveTask: (taskNo: number, newStatus: TaskStatus) => void;
}

// Cache active in-flight request promise to deduplicate synchronous concurrent requests
let activeFillValuesPromise: Promise<TaskFillValues | null> | null = null;

const getCompanyNo = () => {
  const authCompanies = useAuthStore.getState().company;
  return authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
};

const filterTasksByKeyword = (tasks: Task[], kw: string, fillValues: TaskFillValues | null): Task[] => {
  const isMatch = (task: Task): boolean => {
    const folderObj = fillValues?.folder?.find(f => f.TaskFolderNo === task.project_No);
    const folderName = task.folderName || (folderObj ? folderObj["Folder Name"] : (task.project_No?.toString() || ''));
    const createdByName = task.createdBy?.displayName || task.originatorDisplayName || '';

    return Boolean(
      (task.code && task.code.toLowerCase().includes(kw)) ||
      (task.title && task.title.toLowerCase().includes(kw)) ||
      (task.status && task.status.toLowerCase().includes(kw)) ||
      (task.categoryName && task.categoryName.toLowerCase().includes(kw)) ||
      (task.typeName && task.typeName.toLowerCase().includes(kw)) ||
      (task.priority && task.priority.toLowerCase().includes(kw)) ||
      (task.assignedDisplayName && task.assignedDisplayName.toLowerCase().includes(kw)) ||
      (folderName && folderName.toLowerCase().includes(kw)) ||
      (createdByName && createdByName.toLowerCase().includes(kw)) ||
      (task.start_date && task.start_date.toLowerCase().includes(kw)) ||
      (task.end_date && task.end_date.toLowerCase().includes(kw))
    );
  };

  const filterTree = (nodes: Task[]): Task[] => {
    const result: Task[] = [];
    for (const task of nodes) {
      const matchesSelf = isMatch(task);

      let matchingSubtasks: Task[] = [];
      if (task.subTasks && task.subTasks.length > 0) {
        matchingSubtasks = filterTree(task.subTasks);
      }

      if (matchesSelf) {
        result.push(task);
      } else if (matchingSubtasks.length > 0) {
        result.push({ ...task, subTasks: matchingSubtasks });
      }
    }
    return result;
  };

  return filterTree(tasks);
};

/**
 * When search returns assigned child tasks as top-level rows (with parentTask metadata)
 * but without nesting under the parent, wrap/attach them under the parent row so
 * General users can see context while the parent remains view-only in the UI.
 */
const nestOrphanSubtasksUnderParents = (tasks: Task[]): Task[] => {
  const byId = new Map<number, Task>();
  for (const t of tasks) {
    byId.set(t.taskNo, { ...t, subTasks: [...(t.subTasks || [])] });
  }

  const alreadyNested = new Set<number>();
  for (const t of byId.values()) {
    for (const st of t.subTasks || []) {
      if (st?.taskNo != null) alreadyNested.add(Number(st.taskNo));
    }
  }

  const orphanIds = new Set<number>();
  const syntheticParents = new Map<number, Task>();

  for (const t of tasks) {
    const parentNo = Number(t.parent_task_No || t.parentTask?.operTaskNo || 0);
    if (!parentNo || parentNo <= 0) continue;
    if (alreadyNested.has(t.taskNo)) continue;

    const existingParent = byId.get(parentNo);
    if (existingParent) {
      const childAlreadyListed = (existingParent.subTasks || []).some(
        (st: Task) => Number(st.taskNo) === t.taskNo
      );
      if (!childAlreadyListed) {
        existingParent.subTasks = [...(existingParent.subTasks || []), { ...t, parent_task_No: parentNo }];
      }
      orphanIds.add(t.taskNo);
      continue;
    }

    // Parent not in response — build a lightweight parent shell
    let synthetic = syntheticParents.get(parentNo);
    if (!synthetic) {
      const meta = t.parentTask;
      synthetic = {
        taskNo: parentNo,
        code: meta?.code || '',
        title: meta?.title || `Parent Task #${parentNo}`,
        description: '',
        priority_No: t.priority_No ?? 0,
        category_No: t.category_No ?? 0,
        type_No: t.type_No ?? 0,
        tags: [],
        originator_user_No: 0,
        owner_user_No: 0, // not assigned to current user → view-only
        parent_task_No: undefined,
        location_No: t.location_No ?? 0,
        company: t.company,
        companyName: t.companyName,
        is_business_benefit_applicable: false,
        status_No: t.status_No ?? 0,
        collaborators: [],
        informed_to: [],
        actual_efforts: [],
        check_list: [],
        task_comments: [],
        status: t.status || 'Todo',
        priority: t.priority || 'Low',
        categoryName: t.categoryName,
        typeName: t.typeName,
        folderName: t.folderName,
        assignedDisplayName: undefined,
        parentTask: meta,
        subTasks: [],
      };
      syntheticParents.set(parentNo, synthetic);
      byId.set(parentNo, synthetic);
    }
    synthetic.subTasks = [...(synthetic.subTasks || []), { ...t, parent_task_No: parentNo }];
    orphanIds.add(t.taskNo);
  }

  if (orphanIds.size === 0 && syntheticParents.size === 0) return tasks;

  const result: Task[] = [];
  const emitted = new Set<number>();

  for (const t of tasks) {
    if (orphanIds.has(t.taskNo)) continue;
    const node = byId.get(t.taskNo) || t;
    result.push(node);
    emitted.add(t.taskNo);
  }

  for (const [parentNo, synthetic] of syntheticParents) {
    if (!emitted.has(parentNo)) {
      result.push(synthetic);
      emitted.add(parentNo);
    }
  }

  return result;
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  allTasks: [],
  searchKeyword: '',
  setSearchKeyword: (keyword: string) => {
    const kw = keyword.toLowerCase();
    const fillValues = get().fillValues;
    const all = get().allTasks;
    if (!kw) {
      set({ searchKeyword: keyword, tasks: all });
      return;
    }
    const filtered = filterTasksByKeyword(all, kw, fillValues);
    set({ searchKeyword: keyword, tasks: filtered });
  },
  isLoading: false,
  fetchError: null,
  clearFetchError: () => set({ fetchError: null }),
  fillValues: null,
  isLoadingFillValues: false,
  selectedFolder: null,
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  fetchFillValues: async (companyNo, force = false): Promise<TaskFillValues | null> => {
    // 1. Return cached values instantly to avoid redundant API hits!
    const state = get();
    if (state.fillValues && !force) {
      return state.fillValues;
    }

    // 2. Return the existing active pending promise if a request is already in-flight!
    if (activeFillValuesPromise) {
      return activeFillValuesPromise;
    }
    const resolvedCompanyNo = typeof (companyNo) === 'number' ? companyNo : getCompanyNo().toString();

    // 3. Otherwise, create a new pending promise, execute it, and cache the result!
    activeFillValuesPromise = (async () => {
      set({ isLoadingFillValues: true });
      try {
        const response = await apiService.get<TaskFillValues>('/api/crm/tasks/fill-values', {
          params: { companyNo: resolvedCompanyNo }
        });
        set({ fillValues: response });

        // Select 0th index folder by default
        if (!get().selectedFolder && response.folder && response.folder.length > 0) {
          set({ selectedFolder: response.folder[0] });
        }

        return response;
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
        return null;
      } finally {
        set({ isLoadingFillValues: false });
        activeFillValuesPromise = null; // Reset the active promise once completed!
      }
    })();

    return activeFillValuesPromise;
  },
  fetchTasks: async (filters) => {
    set({ isLoading: true, fetchError: null });
    try {
      const activeFolder = get().selectedFolder;
      const { isHideType, isHideFolder } = useSettingsStore.getState().settings;

      let finalFolderNo: number | undefined = undefined;
      if (filters && filters.folderNo !== undefined && filters.folderNo !== null) {
        const parsedFolder = Number(filters.folderNo);
        if (!isNaN(parsedFolder) && parsedFolder > 0) {
          finalFolderNo = parsedFolder;
        }
      }

      if (finalFolderNo === undefined && activeFolder && !filters?.isAllFolder) {
        finalFolderNo = (activeFolder as any).taskFolderNo || activeFolder.TaskFolderNo;
      }
      console.log("finalFolderNo", finalFolderNo);
      const searchParamsCamel: any = {
        companyNo: getCompanyNo(),
        ...filters,
        ...(finalFolderNo ? { folderNo: finalFolderNo } : {})
      };

      const searchParamsPascal: any = {};

      if (searchParamsCamel.companyNo !== undefined) searchParamsPascal.CompanyNo = Number(searchParamsCamel.companyNo);
      if (!isHideFolder) {
        if (searchParamsCamel.isAllFolder) searchParamsPascal.IsAllFolder = true;
        else if (searchParamsCamel.folderNo !== undefined) searchParamsPascal.FolderNo = Number(searchParamsCamel.folderNo);
      }
      if (searchParamsCamel.operTaskNo !== undefined && !isNaN(Number(searchParamsCamel.operTaskNo))) searchParamsPascal.OperTaskNo = Number(searchParamsCamel.operTaskNo);
      if (searchParamsCamel.taskCode !== undefined && searchParamsCamel.taskCode !== '') searchParamsPascal.TaskCode = searchParamsCamel.taskCode;
      // Instead of sending title to backend, we'll use it for local keyword filtering across all columns
      // if (searchParamsCamel.title !== undefined) searchParamsPascal.Title = searchParamsCamel.title;
      if (searchParamsCamel.operTaskCategoryNo !== undefined) searchParamsPascal.OperTaskCategoryNo = Number(searchParamsCamel.operTaskCategoryNo);
      if (searchParamsCamel.operTaskPriorityNo !== undefined) searchParamsPascal.OperTaskPriorityNo = Number(searchParamsCamel.operTaskPriorityNo);

      const rawStatusNo = searchParamsCamel.operTaskStatusNo;
      const statusNoStr = typeof rawStatusNo === 'string' ? rawStatusNo : (rawStatusNo !== undefined && rawStatusNo !== null ? String(rawStatusNo) : undefined);
      const isPendingGroup = statusNoStr === 'PendingGroup';
      const isMultiStatus = statusNoStr !== undefined && statusNoStr.includes(',');

      if (!isPendingGroup && !isMultiStatus && statusNoStr !== undefined && statusNoStr !== '') {
        searchParamsPascal.OperTaskStatusNo = Number(statusNoStr);
      }

      if (searchParamsCamel.operTaskLocationNo !== undefined) searchParamsPascal.OperTaskLocationNo = Number(searchParamsCamel.operTaskLocationNo);
      if (!isHideType && searchParamsCamel.operTaskTypeNo !== undefined) searchParamsPascal.OperTaskTypeNo = Number(searchParamsCamel.operTaskTypeNo);
      if (searchParamsCamel.ownerLoginNo !== undefined) searchParamsPascal.OwnerLoginNo = Number(searchParamsCamel.ownerLoginNo);
      if (searchParamsCamel.fromDueDate !== undefined) searchParamsPascal.FromDueDate = searchParamsCamel.fromDueDate;
      if (searchParamsCamel.toDueDate !== undefined) searchParamsPascal.ToDueDate = searchParamsCamel.toDueDate;

      // Handle filterType mapping cleanly
      if (searchParamsCamel.filterType !== undefined) {
        const ftVal = searchParamsCamel.filterType;
        if (!isNaN(Number(ftVal))) {
          searchParamsPascal.FilterTypeNo = Number(ftVal);
        } else {
          const fillValues = get().fillValues;
          const matched = fillValues?.filterType?.find(ft => ft.FilterTypeName === ftVal);
          if (matched) {
            searchParamsPascal.FilterTypeNo = matched.FilterTypeNo;
          }
        }
      }

      // Handle User autocomplete selection or fall back to logged-in user
      if (searchParamsCamel.loginNo !== undefined && searchParamsCamel.loginNo !== '') {
        searchParamsPascal.LoginNo = Number(searchParamsCamel.loginNo);
      } else {
        const currentUser = useAuthStore.getState().user;
        const userLoginNo = currentUser?.LoginNo || currentUser?.loginNo;
        if (userLoginNo) {
          searchParamsPascal.LoginNo = Number(userLoginNo);
        }
      }

      // Advanced Filter Sorting Parameters
      if (searchParamsCamel.sortingColumnName !== undefined && searchParamsCamel.sortingColumnName !== '') {
        searchParamsPascal.SortingColumnName = searchParamsCamel.sortingColumnName;
      }
      if (searchParamsCamel.sortingType !== undefined && searchParamsCamel.sortingType !== '') {
        searchParamsPascal.SortingType = searchParamsCamel.sortingType;
      }

      // Advanced Filter Created Date Parameters
      if (searchParamsCamel.fromCreatedDate !== undefined) {
        searchParamsPascal.FromCreatedDate = searchParamsCamel.fromCreatedDate;
      }
      if (searchParamsCamel.toCreatedDate !== undefined) {
        searchParamsPascal.ToCreatedDate = searchParamsCamel.toCreatedDate;
      }

      // Pagination Parameters
      searchParamsPascal.PageSize = searchParamsCamel.pageSize !== undefined ? Number(searchParamsCamel.pageSize) : 100;
      searchParamsPascal.PageNo = searchParamsCamel.pageNo !== undefined ? Number(searchParamsCamel.pageNo) : 1;

      const response = await apiService.get<{ success: boolean, data: any[] }>('/api/crm/tasks/search-data', {
        params: searchParamsPascal
      });

      const mapTaskItem = (item: any): Task => ({
        taskNo: item.operTaskNo,
        code: item.code || '',
        title: item.title,
        description: item.description || '',
        priority_No: item.priority?.operTaskPriorityNo || null,
        category_No: item.category?.operTaskCategoryNo || null,
        type_No: item.type?.operTaskTypeNo || null,
        project_No: item.project?.operTaskProjectNo || item.project?.projectNo || item.project?.project_No || item.project?.operTaskFolderNo || item.project?.folderNo || item.folder?.operTaskFolderNo || item.folder?.folderNo || item.folder?.TaskFolderNo || item.folder?.taskFolderNo || item.project_No || item.projectNo || item.folderNo || item.folder_No || null,
        folderName: item.folder?.folderName || item.folder?.taskFolderName || item.folder?.FolderName || item.folder?.["Folder Name"] || item.project?.folderName || item.project?.taskFolderName || item.project?.FolderName || item.project?.["Folder Name"] || undefined,
        tags: item.tags ? item.tags.split(',') : [],
        originator_user_No: item.originator?.id || item.createdBy?.id || null,
        originatorDisplayName: item.originator?.displayName || '',
        createdBy: item.createdBy,
        createdDate: item.createdDate || item.createdBy?.createdDate || null,
        owner_user_No: item.assignedTo?.id || null,
        location_No: item.location?.operTaskLocationNo || null,
        locationName: item.location?.locationName || undefined,
        company: item.taskCompany?.taskCompanyNo || item.company || undefined,
        companyName: item.taskCompany?.taskCompanyAlias || item.taskCompany?.taskCompanyName || item.company || undefined,
        status_No: item.status?.operTaskStatusNo || null,
        status: item.status?.statusName || 'Todo',
        priority: item.priority?.priorityName || 'Low',
        categoryName: item.category?.categoryName,
        typeName: item.type?.typeName,
        assignedDisplayName: item.assignedTo?.displayName,
        parent_task_No: item.parentTask?.operTaskNo || item.parentTaskNo || item.parent_task_No || null,
        parentTask: item.parentTask
          ? {
              operTaskNo: item.parentTask.operTaskNo,
              title: item.parentTask.title,
              code: item.parentTask.code,
            }
          : undefined,
        start_date: item.startDate,
        end_date: item.endDate,
        completionDate: item.completionDate || null,
        completionRemark: item.completionRemark || '',
        isAllDay: item.isAllday ?? item.isAllDay ?? false,
        calendarColor: item.colorCoding || '',
        estimated_effort_value: item.estimatedEfforts ?? null,
        is_business_benefit_applicable: item.isBusinessBenefitApplicable || false,
        collaborators: [],
        informed_to: [],
        actual_efforts: [],
        check_list: [],
        task_comments: [],
        subTasks: item.subTasks ? item.subTasks.map(mapTaskItem) : []
      });

      if (response.success) {
        let mappedTasks: Task[] = nestOrphanSubtasksUnderParents(response.data.map(mapTaskItem));

        // Apply PendingGroup filter locally if requested
        if (isPendingGroup) {
          const pendingStatuses = ['Open', 'Draft', 'In-Progress', 'Reopen', 'In Progress', 'In-Progess'];
          mappedTasks = mappedTasks.filter(task => pendingStatuses.includes(task.status));
        } else if (isMultiStatus) {
          const selectedStatusIds = statusNoStr!.split(',').map(Number);
          mappedTasks = mappedTasks.filter(task => task.status_No !== null && selectedStatusIds.includes(task.status_No));
        }

        // Apply current search keyword if any
        let filteredTasks = mappedTasks;
        const kw = get().searchKeyword.toLowerCase();
        if (kw) {
          const fillValues = get().fillValues;
          filteredTasks = filterTasksByKeyword(mappedTasks, kw, fillValues);
        }

        set({ allTasks: mappedTasks, tasks: filteredTasks });
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to load tasks';
      set({ fetchError: message });
    } finally {
      set({ isLoading: false });
    }
  },
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (taskNo, updates) =>
    set((state) => {
      const newAllTasks = state.allTasks.map((t) => (t.taskNo === taskNo ? { ...t, ...updates } : t));
      const newTasks = state.tasks.map((t) => (t.taskNo === taskNo ? { ...t, ...updates } : t));
      return { allTasks: newAllTasks, tasks: newTasks };
    }),
  deleteTask: (taskNo) =>
    set((state) => ({
      allTasks: state.allTasks.filter((t) => t.taskNo !== taskNo),
      tasks: state.tasks.filter((t) => t.taskNo !== taskNo),
    })),
  moveTask: (taskNo, newStatus) =>
    set((state) => {
      const newAllTasks = state.allTasks.map((t) => t.taskNo === taskNo ? { ...t, status: newStatus } : t);
      const newTasks = state.tasks.map((t) => t.taskNo === taskNo ? { ...t, status: newStatus } : t);
      return { allTasks: newAllTasks, tasks: newTasks };
    }),
}));
