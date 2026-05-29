export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskType = 'Task' | 'Bug' | 'Feature' | 'Improvement';
export type TaskStatus = 'Todo' | 'In Progress' | 'In Review' | 'Done';

export interface Person {
  userName: string;
  displayName: string;
  email: string;
  loginNo?: number;
}

export interface ReviewRequired {
  reviewer: string;
  reviewStatus: 'Pending' | 'Approved' | 'Rejected';
}

export interface ActualEffort {
  date: string;
  hours: number;
  description: string;
}

export interface CheckListItem {
  id: string;
  description: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}
export interface DocumentAttachment {
  id: number;
  name: string;
  size?: number;
  storedFileName?: string | null;
  storedFilePath?: string | null;
  relativePath?: string | null;
  // Client-side UI helpers
  status?: 'pending' | 'uploading' | 'verifying' | 'success' | 'failed';
  errorMessage?: string;
}

export interface Task {
  taskNo: number;
  code?: string;
  title: string;
  description: string;
  priority_No: number;
  category_No: number;
  type_No: number;
  project_No?: number;
  tags: string[];
  originator_user_No: number;
  owner_user_No: number;
  parent_task_No?: number;
  location_No: number;
  company?: string;
  start_date?: string;
  end_date?: string;
  completionDate?: string;
  completionRemark?: string;
  estimated_effort_value?: number;
  estimated_effort_unit?: string;
  is_business_benefit_applicable: boolean;
  business_benefit_type_No?: number;
  business_benefit_description?: string;
  estimated_benefit_amount?: number;
  actual_benefit_amount?: number;
  benefit_period?: string;
  actual_benefit_period?: string;
  isPrivate?: boolean;
  status_No: number;
  collaborators: Person[];
  informed_to: Person[];
  actual_efforts: ActualEffort[];
  check_list: CheckListItem[];
  task_comments: Comment[];
  executionNotes?: string;
  execution_notes?: string;
  subTasks?: any[];
  isAllDay?: boolean;
  calendarColor?: string;
  recurrence?: {
    pattern: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    until?: string;
  };

  // UI helper fields
  status: TaskStatus;
  priority: Priority;
  categoryName?: string;
  typeName?: string;
  assignedDisplayName?: string;
  originatorDisplayName?: string;
  collaboratorUserGroupNo?: number;
  infromToUserGroupNo?: number;
  attachments?: DocumentAttachment[];
  customFields?: { customFieldNo: number | string; fieldValue: string }[];
}
