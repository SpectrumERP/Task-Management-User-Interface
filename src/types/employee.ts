/** Employee Directory row, normalised from the payroll employees API (search-data / load-data). */
export interface Employee {
  empNo: number;
  empCode: string;
  empName: string;
  department: string;
  jobDescription: string;
  companyName: string;
  workLocation: string;
  email: string;
  phone: string;
  extension: string;
  /** e.g. Active / Inactive / Resigned — empty when the API does not send one */
  status: string;
  dateOfJoining: string;
  employmentType: string;
  grade: string;
  gender: string;
  dateOfBirth: string;
  address: string;
}

/** One page of GET /api/payroll/employees/search-data. */
export interface EmployeePage {
  employees: Employee[];
  pageNo: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface EmployeeSearchParams {
  pageNo: number;
  pageSize: number;
  keyword?: string;
  companyNo?: number;
}
