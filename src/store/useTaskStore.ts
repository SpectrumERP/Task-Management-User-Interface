import { create } from 'zustand';
import { Task, TaskStatus } from '@/types/task';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';

interface FilterParams {
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
  sortingColumnName?: string;
  sortingType?: string;
  loginNo?: string;
  fromCreatedDate?: string;
  toCreatedDate?: string;
  pageSize?: number;
  pageNo?: number;
}

export interface TaskFillValues {
  priority: { OperTaskPriorityNo: number; Priority: string; Code?: string }[];
  type: { OperTaskTypeNo: number; "Task Type": string; Code?: string }[];
  category: { OperTaskCategoryNo: number; Category: string; Code?: string }[];
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
  isLoading: boolean;
  fillValues: TaskFillValues | null;
  isLoadingFillValues: boolean;
  selectedFolder: { TaskFolderNo: number; "Folder Name": string; Code?: string } | null;
  setSelectedFolder: (folder: { TaskFolderNo: number; "Folder Name": string; Code?: string } | null) => void;
  fetchTasks: (filters?: FilterParams) => Promise<void>;
  fetchFillValues: (companyNo?: string) => Promise<TaskFillValues | null>;
  addTask: (task: Task) => void;
  updateTask: (taskNo: number, updates: Partial<Task>) => void;
  deleteTask: (taskNo: number) => void;
  moveTask: (taskNo: number, newStatus: TaskStatus) => void;
}

// Cache active in-flight request promise to deduplicate synchronous concurrent requests
let activeFillValuesPromise: Promise<TaskFillValues | null> | null = null;

const getCompanyNo = () => {
  const authCompanies = useAuthStore.getState().company;
  return authCompanies?.[0]?.companyNo || authCompanies?.[0]?.CompanyNo || 2;
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  fillValues: null,
  isLoadingFillValues: false,
  selectedFolder: null,
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  fetchFillValues: async (companyNo): Promise<TaskFillValues | null> => {
    // 1. Return cached values instantly to avoid redundant API hits!
    const state = get();
    if (state.fillValues) {
      return state.fillValues;
    }

    // 2. Return the existing active pending promise if a request is already in-flight!
    if (activeFillValuesPromise) {
      return activeFillValuesPromise;
    }

    const resolvedCompanyNo = companyNo || getCompanyNo().toString();

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
    set({ isLoading: true });
    try {
      const activeFolder = get().selectedFolder;
      const searchParamsCamel: any = {
        companyNo: getCompanyNo(),
        ...(activeFolder ? { folderNo: activeFolder.TaskFolderNo } : {}),
        ...filters
      };

      const searchParamsPascal: any = {};
      
      if (searchParamsCamel.companyNo !== undefined) searchParamsPascal.CompanyNo = Number(searchParamsCamel.companyNo);
      if (searchParamsCamel.folderNo !== undefined) searchParamsPascal.FolderNo = Number(searchParamsCamel.folderNo);
      if (searchParamsCamel.operTaskNo !== undefined && !isNaN(Number(searchParamsCamel.operTaskNo))) searchParamsPascal.OperTaskNo = Number(searchParamsCamel.operTaskNo);
      if (searchParamsCamel.taskCode !== undefined && searchParamsCamel.taskCode !== '') searchParamsPascal.TaskCode = searchParamsCamel.taskCode;
      if (searchParamsCamel.title !== undefined) searchParamsPascal.Title = searchParamsCamel.title;
      if (searchParamsCamel.operTaskCategoryNo !== undefined) searchParamsPascal.OperTaskCategoryNo = Number(searchParamsCamel.operTaskCategoryNo);
      if (searchParamsCamel.operTaskPriorityNo !== undefined) searchParamsPascal.OperTaskPriorityNo = Number(searchParamsCamel.operTaskPriorityNo);
      if (searchParamsCamel.operTaskStatusNo !== undefined) searchParamsPascal.OperTaskStatusNo = Number(searchParamsCamel.operTaskStatusNo);
      if (searchParamsCamel.operTaskLocationNo !== undefined) searchParamsPascal.OperTaskLocationNo = Number(searchParamsCamel.operTaskLocationNo);
      if (searchParamsCamel.operTaskTypeNo !== undefined) searchParamsPascal.OperTaskTypeNo = Number(searchParamsCamel.operTaskTypeNo);
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
      if (response.success) {
        const mappedTasks: Task[] = response.data.map(item => ({
          taskNo: item.operTaskNo,
          code: item.code || '',
          title: item.title,
          description: item.description || '',
          priority_No: item.priority?.operTaskPriorityNo || 0,
          category_No: item.category?.operTaskCategoryNo || 0,
          type_No: item.type?.operTaskTypeNo || 0,
          project_No: item.project?.operTaskProjectNo || item.project?.projectNo || item.project?.project_No || item.project?.operTaskFolderNo || item.project?.folderNo || item.folder?.operTaskFolderNo || item.folder?.folderNo || item.folder?.TaskFolderNo || item.folder?.taskFolderNo || item.project_No || item.projectNo || item.folderNo || item.folder_No || 0,
          tags: item.tags ? item.tags.split(',') : [],
          originator_user_No: item.createdBy?.id || 0,
          owner_user_No: item.assignedTo?.id || 0,
          location_No: item.location?.operTaskLocationNo || 0,
          status_No: item.status?.operTaskStatusNo || 0,
          status: item.status?.statusName || 'Todo',
          priority: item.priority?.priorityName || 'Low',
          categoryName: item.category?.categoryName,
          typeName: item.type?.typeName,
          assignedDisplayName: item.assignedTo?.displayName,
          start_date: item.startDate,
          end_date: item.endDate,
          estimated_effort_value: item.estimatedEfforts || 0,
          is_business_benefit_applicable: item.isBusinessBenefitApplicable || false,
          collaborators: [],
          informed_to: [],
          actual_efforts: [],
          check_list: [],
          task_comments: []
        }));
        set({ tasks: mappedTasks });
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (taskNo, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.taskNo === taskNo ? { ...t, ...updates } : t)),
    })),
  deleteTask: (taskNo) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.taskNo !== taskNo),
    })),
  moveTask: (taskNo, newStatus) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.taskNo === taskNo ? { ...t, status: newStatus } : t
      ),
    })),
}));
