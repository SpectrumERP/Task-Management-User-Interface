/**
 * Employee Directory menu right. Set VITE_EMPLOYEE_DIRECTORY_FORM_NO to the form number registered in
 * /api/globaldata/forms/task-management-menu; the module then follows that form's Open / Save / Update rights
 * like every other menu item. Until it is set, every signed-in user sees the directory read-only
 * (no Add / Edit, since useFormRights grants nothing without a form number).
 */
export const EMPLOYEE_DIRECTORY_FORM_NO: number | undefined =
  Number(import.meta.env.VITE_EMPLOYEE_DIRECTORY_FORM_NO) || undefined;

export function canOpenEmployeeDirectory(accessibleForms: number[] | null): boolean {
  if (!accessibleForms) return false;
  return EMPLOYEE_DIRECTORY_FORM_NO
    ? accessibleForms.includes(EMPLOYEE_DIRECTORY_FORM_NO)
    : accessibleForms.length > 0;
}

export function employeeProfilePath(empNo: number): string {
  return `/employees/${empNo}`;
}

export interface EmployeeFilters {
  department: string;
  designation: string;
  companyName: string;
  workLocation: string;
  status: string;
}

export type EmployeeFilterOptions = Record<keyof EmployeeFilters, string[]>;

export const EMPTY_EMPLOYEE_FILTERS: EmployeeFilters = {
  department: '',
  designation: '',
  companyName: '',
  workLocation: '',
  status: '',
};

export function countActiveEmployeeFilters(filters: EmployeeFilters): number {
  return Object.values(filters).filter((v) => v.trim()).length;
}
