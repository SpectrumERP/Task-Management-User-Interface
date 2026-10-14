import { apiService } from './apiService';
import type { Employee } from '@/types/employee';
import { MOCK_EMPLOYEES, isMockEmpNo } from '@/mocks/employeeMock';

/**
 * Where the directory gets its data (VITE_EMPLOYEE_DIRECTORY_SOURCE):
 * - auto (default): payroll API; sample data only if the API fails or returns no employees
 * - api: payroll API only (errors show the error state)
 * - mock: sample data only, no API call
 */
type SourceSetting = 'auto' | 'api' | 'mock';
const SOURCE_SETTING: SourceSetting = (() => {
  const v = String(import.meta.env.VITE_EMPLOYEE_DIRECTORY_SOURCE || 'auto').toLowerCase();
  return v === 'api' || v === 'mock' ? v : 'auto';
})();

export type EmployeeDataSource = 'api' | 'mock';

export interface EmployeeListResult {
  employees: Employee[];
  source: EmployeeDataSource;
  /** Why sample data is shown, when it is */
  fallbackReason?: 'forced' | 'empty' | 'error';
}

type Raw = Record<string, unknown>;

/** First non-empty string among the given keys (API casing differs between payroll endpoints). */
function pick(row: Raw, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      const s = String(value).trim();
      if (s) return s;
    }
  }
  return '';
}

const LIST_KEYS = ['items', 'records', 'rows', 'list', 'result', 'results', 'employees', 'data', 'content'];

function isRecord(value: unknown): value is Raw {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Rows from `[...]`, `{ data: [...] }`, `{ data: { items | records | … : [...] } }` or a single `{ data: {…} }`. */
function unwrapList(response: unknown): Raw[] {
  if (Array.isArray(response)) return response.filter(isRecord);
  if (!isRecord(response)) return [];
  const data = 'data' in response ? response.data : response;
  if (Array.isArray(data)) return data.filter(isRecord);
  if (!isRecord(data)) return [];
  for (const key of LIST_KEYS) {
    const nested = data[key];
    if (Array.isArray(nested)) return nested.filter(isRecord);
  }
  // A single employee object (e.g. ?empNo=…), not a wrapper.
  return data !== response || !('success' in response) ? [data] : [];
}

/** Short description of a response, for the fallback log (keys only — never employee data). */
function describeResponse(response: unknown): string {
  if (Array.isArray(response)) return `array(${response.length})`;
  if (!isRecord(response)) return typeof response;
  const data = response.data;
  const dataShape = Array.isArray(data) ? `array(${data.length})` : isRecord(data) ? `{${Object.keys(data).join(', ')}}` : typeof data;
  return `{${Object.keys(response).join(', ')}} data=${dataShape}${response.message ? ` message="${String(response.message)}"` : ''}`;
}

/** Known photo keys first (compared case-insensitively), then any key that looks like a photo. */
const PHOTO_KEYS = [
  'photoUrl', 'photo', 'profilePhoto', 'profilePhotoUrl', 'profilePic', 'profilePicture', 'profileImage',
  'profileImageUrl', 'empPhoto', 'employeePhoto', 'empImage', 'employeeImage', 'image', 'imageUrl', 'imagePath',
  'photoPath', 'avatar', 'avatarUrl', 'photoBase64', 'imageBase64',
].map((k) => k.toLowerCase());
const PHOTO_KEY_PATTERN = /photo|image|img|pic|avatar/i;

function findPhotoValue(row: Raw): string {
  const entries = Object.entries(row).filter(([, v]) => typeof v === 'string' && v.trim());
  for (const key of PHOTO_KEYS) {
    const hit = entries.find(([k]) => k.toLowerCase() === key);
    if (hit) return String(hit[1]).trim();
  }
  const loose = entries.find(([k]) => PHOTO_KEY_PATTERN.test(k));
  return loose ? String(loose[1]).trim() : '';
}

/**
 * Normalise whatever the API sends into something EmployeeAvatar can show:
 * data:/blob:/http(s) URLs as-is, bare base64 → data URL, and server paths as '/…'
 * (fetched with the sign-in token, see useEmployeePhoto).
 */
function toPhotoSource(value: string): string {
  if (!value) return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  const compact = value.replace(/\s+/g, '');
  if (compact.length > 100 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    const mime = compact.startsWith('iVBOR') ? 'image/png' : compact.startsWith('R0lGOD') ? 'image/gif' : 'image/jpeg';
    return `data:${mime};base64,${compact}`;
  }
  // A file path / relative URL on the API server — only if it looks like one (not a flag such as "Y").
  if (!value.includes('/') && !/\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(value)) return '';
  return value.startsWith('/') ? value : `/${value.replace(/^\.?\/+/, '')}`;
}

export function toEmployee(row: Raw): Employee {
  return {
    empNo: Number(pick(row, 'empNo', 'EmpNo', 'employeeNo', 'EmployeeNo')) || 0,
    empCode: pick(row, 'empCode', 'EmpCode', 'employeeCode', 'EmployeeCode', 'employeeId'),
    empName: pick(row, 'empName', 'EmpName', 'employeeName', 'EmployeeName', 'printingName', 'name'),
    designation: pick(row, 'designation', 'Designation', 'designationName', 'DesignationName'),
    department: pick(row, 'department', 'Department', 'departmentName', 'DepartmentName'),
    jobDescription: pick(
      row,
      'jobDescription', 'JobDescription', 'jobDesc', 'JobDesc', 'responsibility', 'Responsibility',
      'responsibilities', 'Responsibilities', 'roleDescription', 'RoleDescription'
    ),
    companyName: pick(row, 'companyName', 'CompanyName', 'company', 'Company'),
    workLocation: pick(row, 'workLocation', 'WorkLocation', 'locationName', 'LocationName', 'location', 'Location', 'branchName'),
    email: pick(row, 'email', 'Email', 'emailId', 'EmailId', 'officialEmail', 'OfficialEmail'),
    phone: pick(row, 'phone', 'Phone', 'phoneNo', 'PhoneNo', 'mobileNo', 'MobileNo', 'mobile'),
    extension: pick(row, 'extension', 'Extension', 'extensionNo', 'ExtensionNo', 'ext', 'Ext'),
    status: pick(row, 'status', 'Status', 'empStatus', 'EmpStatus', 'statusName', 'StatusName'),
    photoUrl: toPhotoSource(findPhotoValue(row)),
    reportingTo: pick(row, 'reportingTo', 'ReportingTo', 'reportTo', 'ReportTo', 'managerName', 'ManagerName'),
    dateOfJoining: pick(row, 'dateOfJoining', 'DateOfJoining', 'joiningDate', 'JoiningDate', 'doj', 'DOJ'),
    employmentType: pick(row, 'employmentType', 'EmploymentType', 'empType', 'EmpType'),
    grade: pick(row, 'grade', 'Grade', 'gradeName', 'GradeName'),
    gender: pick(row, 'gender', 'Gender'),
    dateOfBirth: pick(row, 'dateOfBirth', 'DateOfBirth', 'dob', 'DOB'),
    address: pick(row, 'address', 'Address', 'currentAddress', 'CurrentAddress'),
    raw: row,
  };
}

async function fetchEmployees(params: Record<string, string>, silent = false): Promise<Employee[]> {
  const response = await apiService.get<unknown>('/api/payroll/employees', { params, silent });
  const employees = unwrapList(response).map(toEmployee).filter((e) => e.empNo > 0 || e.empCode || e.empName);
  if (employees.length === 0) {
    console.warn(`[Employee Directory] /api/payroll/employees gave no employees. Response: ${describeResponse(response)}`);
  }
  return employees;
}

export const employeeService = {
  /** Whole directory — paging, search and filters run client-side, as on the Tasks List. */
  getEmployees: async (): Promise<EmployeeListResult> => {
    if (SOURCE_SETTING === 'mock') {
      return { employees: MOCK_EMPLOYEES, source: 'mock', fallbackReason: 'forced' };
    }
    try {
      // Auto mode stays quiet on failure: the page shows a "Sample data" badge instead of an error toast.
      const employees = await fetchEmployees({ keywordSearch: '' }, SOURCE_SETTING === 'auto');
      if (employees.length > 0 || SOURCE_SETTING === 'api') {
        return { employees, source: 'api' };
      }
      return { employees: MOCK_EMPLOYEES, source: 'mock', fallbackReason: 'empty' };
    } catch (err) {
      if (SOURCE_SETTING === 'api') throw err;
      console.warn('[Employee Directory] /api/payroll/employees failed — showing sample employees.', err);
      return { employees: MOCK_EMPLOYEES, source: 'mock', fallbackReason: 'error' };
    }
  },

  /** One employee for the full profile; sample ids resolve from the sample set. */
  getEmployee: async (empNo: number): Promise<Employee | null> => {
    if (SOURCE_SETTING === 'mock' || isMockEmpNo(empNo)) {
      return MOCK_EMPLOYEES.find((e) => e.empNo === empNo) ?? null;
    }
    const rows = await fetchEmployees({ empNo: String(empNo) });
    return rows.find((e) => e.empNo === empNo) ?? rows[0] ?? null;
  },
};
