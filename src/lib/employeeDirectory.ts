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

/** Filters the payroll search API supports (besides the keyword search box). */
export interface EmployeeFilters {
  /** CompanyNo as a string ('' = all companies) */
  companyNo: string;
}

export interface EmployeeFilterOption {
  value: string;
  label: string;
}

export type EmployeeFilterOptions = Record<keyof EmployeeFilters, EmployeeFilterOption[]>;

export const EMPTY_EMPLOYEE_FILTERS: EmployeeFilters = {
  companyNo: '',
};

export function countActiveEmployeeFilters(filters: EmployeeFilters): number {
  return Object.values(filters).filter((v) => v.trim()).length;
}

/** Companies the signed-in user belongs to (auth session), as Company filter options. */
export function toCompanyOptions(companies: unknown[] | null | undefined): EmployeeFilterOption[] {
  const seen = new Set<string>();
  const options: EmployeeFilterOption[] = [];
  for (const c of companies ?? []) {
    if (!c || typeof c !== 'object') continue;
    const row = c as Record<string, unknown>;
    const value = String(row.CompanyNo ?? row.companyNo ?? '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const label = String(row.companyName || row.CompanyName || row.name || row.alias || '').trim();
    options.push({ value, label: label || `Company ${value}` });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}
