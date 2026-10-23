import { apiService } from './apiService';
import type { Employee, EmployeePage, EmployeeSearchParams } from '@/types/employee';

/* Shapes from the payroll Swagger (Task Management API v1). */

interface ApiResponse<T> {
  success?: boolean;
  message?: string | null;
  data?: T | null;
}

/** EmployeeSearchResultModel */
interface EmployeeSearchRow {
  empNo?: number;
  code?: string | null;
  empName?: string | null;
  department?: string | null;
  dateOfBirth?: string | null;
  jobDescription?: string | null;
  joiningDate?: string | null;
  companyName?: string | null;
  workLocation?: string | null;
  email?: string | null;
  phone?: string | null;
  extension?: string | null;
  status?: string | null;
  empType?: string | null;
  grade?: string | null;
  gender?: string | null;
  address?: string | null;
}

/** EmployeeSearchApiResponse — paging fields sit next to `data`. */
interface EmployeeSearchResponse extends ApiResponse<EmployeeSearchRow[]> {
  pageNo?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

/** EmployeeLoadDataModel — department / company come back as objects here. */
interface EmployeeLoadData extends Omit<EmployeeSearchRow, 'department' | 'companyName'> {
  department?: { departmentNo?: number; departmentName?: string | null; code?: string | null } | null;
  company?: { companyNo?: number; companyName?: string | null; code?: string | null } | null;
}

/** EmployeePhotoModel */
interface EmployeePhoto {
  empNo?: number;
  contentType?: string | null;
  base64?: string | null;
  dataUrl?: string | null;
}

const text = (value: string | null | undefined) => (value ?? '').trim();

/** .NET sends DateTime.MinValue (0001-01-01) for an empty date. */
const dateText = (value: string | null | undefined) => {
  const v = text(value);
  return v && !v.startsWith('0001-') ? v : '';
};

function toEmployee(
  row: Omit<EmployeeSearchRow, 'department' | 'companyName'>,
  department: string,
  companyName: string
): Employee {
  return {
    empNo: Number(row.empNo) || 0,
    empCode: text(row.code),
    empName: text(row.empName),
    department: text(department),
    jobDescription: text(row.jobDescription),
    companyName: text(companyName),
    workLocation: text(row.workLocation),
    email: text(row.email),
    phone: text(row.phone),
    extension: text(row.extension),
    status: text(row.status),
    dateOfJoining: dateText(row.joiningDate),
    employmentType: text(row.empType),
    grade: text(row.grade),
    gender: text(row.gender),
    dateOfBirth: dateText(row.dateOfBirth),
    address: text(row.address),
  };
}

export const employeeService = {
  /** One page of the directory; keyword and company are filtered by the API. */
  searchEmployees: async ({ pageNo, pageSize, keyword, companyNo }: EmployeeSearchParams): Promise<EmployeePage> => {
    const params: Record<string, string> = { PageNo: String(pageNo), PageSize: String(pageSize) };
    if (keyword?.trim()) params.KeywordSearch = keyword.trim();
    if (companyNo) params.CompanyNo = String(companyNo);

    const response = await apiService.get<EmployeeSearchResponse>('/api/payroll/employees/search-data', { params });
    if (response?.success === false) {
      throw new Error(response.message || 'Could not load employees');
    }
    const rows = Array.isArray(response?.data) ? response.data : [];
    const employees = rows.map((row) => toEmployee(row, row.department ?? '', row.companyName ?? ''));
    const totalRecords = Number(response?.totalRecords) || 0;
    return {
      employees,
      pageNo: Number(response?.pageNo) || pageNo,
      pageSize: Number(response?.pageSize) || pageSize,
      totalRecords,
      totalPages: Number(response?.totalPages) || Math.ceil(totalRecords / pageSize),
    };
  },

  /** Full record for the profile page (GET /api/payroll/employees/load-data/{id}); null when not found. */
  getEmployee: async (empNo: number, options: { silent?: boolean } = {}): Promise<Employee | null> => {
    const response = await apiService.get<ApiResponse<EmployeeLoadData>>(`/api/payroll/employees/load-data/${empNo}`, options);
    const row = response?.success === false ? null : response?.data;
    if (!row || !row.empNo) return null;
    return toEmployee(row, row.department?.departmentName ?? '', row.company?.companyName ?? '');
  },

  /** Displayable photo src (data URL), or null when the employee has none. Silent: a missing photo shows initials. */
  getEmployeePhoto: async (empNo: number): Promise<string | null> => {
    const response = await apiService.get<ApiResponse<EmployeePhoto>>(`/api/payroll/employees/photo/${empNo}`, {
      silent: true,
    });
    const photo = response?.success === false ? null : response?.data;
    if (!photo) return null;
    if (text(photo.dataUrl)) return text(photo.dataUrl);
    const base64 = text(photo.base64);
    return base64 ? `data:${text(photo.contentType) || 'image/jpeg'};base64,${base64}` : null;
  },
};
